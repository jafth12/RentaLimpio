import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js';

// ==========================================
// FUNCIONES AUXILIARES Y DE EXTRACCIÓN
// ==========================================
const formatearFecha = (fecha) => {
    if (!fecha) return null;
    if (fecha instanceof Date) {
        const yyyy = fecha.getFullYear();
        const mm = String(fecha.getMonth() + 1).padStart(2, '0');
        const dd = String(fecha.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return fecha.toString().split('T')[0];
};

const aMoneda = (val) => Number(val || 0).toFixed(2);
const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const extraerMes = (fechaIso, mesOriginal) => {
    if (mesOriginal && mesOriginal !== 'Importado') return mesOriginal;
    if (!fechaIso) return 'Enero';
    const partes = fechaIso.split('T')[0].split('-');
    if (partes.length < 2) return 'Enero';
    const m = parseInt(partes[1], 10);
    return meses[m - 1] || 'Enero';
};

const extraerAnio = (fechaIso, anioOriginal) => {
    if (anioOriginal && anioOriginal !== 'Importado') return anioOriginal.toString();
    if (!fechaIso) return new Date().getFullYear().toString();
    return fechaIso.split('T')[0].split('-')[0];
};

// ==========================================
// NOTA: Las funciones de exportación (exportarCompras, exportarVentasConsumidor,
// exportarVentasCredito, exportarSujetos, exportarRetenciones, exportarTodoJSON)
// fueron consolidadas en reportes.controller.js (versión con UNION que incluye
// notas de crédito/débito). Este controller solo maneja importación.
// ==========================================

// ==========================================
// 2. IMPORTACIÓN MASIVA INTELIGENTE
//    Modo: INSERT si no existe, PATCH si existe
//    (solo rellena campos nulos/vacíos)
// ==========================================

// 🛡️ REGLA MEJORADA DE PARCHEO
const buildPatch = (dbRow, candidato) => {
    const patch = {};
    for (const [col, val] of Object.entries(candidato)) {
        const dbVal = dbRow[col];
        // Reconoce inteligentemente '0.00', '0', vacíos o nulos
        const estaVacioEnDB = dbVal === null || dbVal === undefined || String(dbVal).trim() === '' || Number(dbVal) === 0;
        const tieneValorEnJSON = val !== null && val !== undefined && String(val).trim() !== '' && Number(val) !== 0;
        
        if (estaVacioEnDB && tieneValorEnJSON) {
            patch[col] = val;
        }
    }
    return patch;
};

export const importarTodoJSON = async (req, res) => {
    const info = req.body.backup_info || req.body.encabezado;
    const dataToImport = req.body.data || req.body.modulos;
    const nitFront = info?.nit || info?.nit_declarante;

    if (!nitFront || !dataToImport) {
        return res.status(400).json({ message: "Error: Estructura JSON no reconocida." });
    }

    const connection = await pool.getConnection();
    const reporte = {
        compras:       { insertados: 0, actualizados: 0 },
        ventas_ccf:    { insertados: 0, actualizados: 0 },
        ventas_cf:     { insertados: 0, actualizados: 0 },
        sujetos:       { insertados: 0, actualizados: 0 },
        retenciones:   { insertados: 0, actualizados: 0 },
        notas:         { insertados: 0, actualizados: 0 },
    };
    const limpiarCat = (val, def) => val ? (val.toString().match(/\d+/) || [def])[0] : def;

    try {
        await connection.beginTransaction();

        const [existeD] = await connection.query('SELECT iddeclaNIT FROM declarante WHERE REPLACE(iddeclaNIT, "-", "") = REPLACE(?, "-", "")', [nitFront]);
        if (existeD.length === 0) throw new Error(`El declarante ${nitFront} no existe en su base de datos.`);
        const nitDeclarante = existeD[0].iddeclaNIT;

        // ── 1. COMPRAS ──────────────────────────────────────────────────────────
        if (dataToImport.compras?.length) {
            for (const c of dataToImport.compras) {
                await connection.query('INSERT IGNORE INTO proveedor (ProvNIT, ProvNombre) VALUES (?, ?)',
                    [c.proveedor_ProvNIT || '0000', c.ComNomProve || 'Proveedor Importado']);

                const codGen  = c.ComCodGeneracion || null;
                const tipoDte = limpiarCat(c.ComTipo, '03');

                let fovial = parseFloat(c.comFovial) || 0;
                let cotrans = parseFloat(c.comCotran) || 0;
                let otro    = parseFloat(c.ComOtroAtributo) || 0;
                const listaTributos = (c.resumen?.tributos) || c.tributos || [];
                if (listaTributos.length > 0) {
                    const tribFovial  = listaTributos.find(t => t.codigo === 'D1');
                    const tribCotrans = listaTributos.find(t => t.codigo === 'C8');
                    if (tribFovial)  fovial  = parseFloat(tribFovial.valor);
                    if (tribCotrans) cotrans = parseFloat(tribCotrans.valor);
                    if (fovial > 0 || cotrans > 0) otro = parseFloat((fovial + cotrans).toFixed(2));
                }

                if (tipoDte === '05' || tipoDte === '06') {
                    // ── Nota de crédito/débito de compra ──
                    const [rows] = await connection.query(`
                        SELECT * FROM notas_credito WHERE iddeclaNIT = ? 
                        AND (
                            (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '')
                            OR
                            ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero,'-','') = REPLACE(?,'-','') AND REPLACE(NCNitContraparte,'-','') = REPLACE(?,'-',''))
                        )`, [nitDeclarante, codGen, c.ComNumero, c.proveedor_ProvNIT]);

                    if (rows.length === 0) {
                        await connection.query('INSERT INTO notas_credito SET ?', {
                            iddeclaNIT: nitDeclarante, NCFecha: formatearFecha(c.ComFecha),
                            NCClaseDoc: c.ComClase || '4', NCTipoDoc: tipoDte,
                            NCNumero: c.ComNumero, NCCodGeneracion: codGen,
                            NCNitContraparte: c.proveedor_ProvNIT, NCNombreContraparte: c.ComNomProve,
                            NCNumDocOrigen: 'N/A', NCMontoGravado: c.ComIntGrav || 0,
                            NCMontoExento: c.ComIntExe || 0, NCIva: c.ComCredFiscal || 0,
                            NCCotran: cotrans, NCFovial: fovial, NCTotal: c.ComTotal || 0, NCTipo: 'COMPRA',
                            NCMesDeclarado: extraerMes(c.ComFecha, c.ComMesDeclarado),
                            NCAnioDeclarado: extraerAnio(c.ComFecha, c.ComAnioDeclarado), NCAnexo: '3'
                        });
                        reporte.notas.insertados++;
                    } else {
                        const patch = buildPatch(rows[0], {
                            NCCodGeneracion: codGen,
                            NCFecha: formatearFecha(c.ComFecha),
                            NCMontoGravado: c.ComIntGrav || 0,
                            NCMontoExento: c.ComIntExe || 0,
                            NCIva: c.ComCredFiscal || 0,
                            NCCotran: cotrans, NCFovial: fovial, NCTotal: c.ComTotal || 0
                        });
                        if (patch.NCCodGeneracion) patch.NCClaseDoc = '4'; // Fuerza a DTE
                        if (Object.keys(patch).length > 0) {
                            await connection.query('UPDATE notas_credito SET ? WHERE idNotaCredito = ?', [patch, rows[0].idNotaCredito]);
                            reporte.notas.actualizados++;
                        }
                    }
                } else {
                    // ── Compra normal ──
                    const [rows] = await connection.query(`
                        SELECT * FROM compras WHERE iddeclaNIT = ? 
                        AND (
                            (ComCodGeneracion = ? AND ComCodGeneracion IS NOT NULL AND ComCodGeneracion != '')
                            OR
                            ((ComCodGeneracion IS NULL OR ComCodGeneracion = '') AND REPLACE(ComNumero,'-','') = REPLACE(?,'-','') AND REPLACE(proveedor_ProvNIT,'-','') = REPLACE(?,'-',''))
                        )`, [nitDeclarante, codGen, c.ComNumero, c.proveedor_ProvNIT]);

                    if (rows.length === 0) {
                        await connection.query('INSERT INTO compras SET ?', {
                            iddeclaNIT: nitDeclarante, proveedor_ProvNIT: c.proveedor_ProvNIT,
                            ComNomProve: c.ComNomProve, ComFecha: formatearFecha(c.ComFecha),
                            ComClase: c.ComClase || '4', ComTipo: tipoDte,
                            ComNumero: c.ComNumero, ComCodGeneracion: codGen,
                            ComSelloRecepcion: c.ComSelloRecepcion || null,
                            ComIntExe: c.ComIntExe || 0, ComIntGrav: c.ComIntGrav || 0,
                            ComCredFiscal: c.ComCredFiscal || 0, comFovial: fovial,
                            comCotran: cotrans, ComOtroAtributo: otro, ComTotal: c.ComTotal || 0,
                            ComMesDeclarado: extraerMes(c.ComFecha, c.ComMesDeclarado),
                            ComAnioDeclarado: extraerAnio(c.ComFecha, c.ComAnioDeclarado),
                            ComClasiRenta: limpiarCat(c.ComClasiRenta, '1'),
                            ComTipoCostoGasto: limpiarCat(c.ComTipoCostoGasto || c.ComTipoCostoGastoRenta, '2'),
                            ComTipoOpeRenta: limpiarCat(c.ComTipoOpeRenta, '1'), ComAnexo: '3'
                        });
                        reporte.compras.insertados++;
                    } else {
                        const patch = buildPatch(rows[0], {
                            ComCodGeneracion:  codGen,
                            ComSelloRecepcion: c.ComSelloRecepcion || null,
                            comFovial: fovial, comCotran: cotrans, ComOtroAtributo: otro,
                            ComIntExe: c.ComIntExe || 0, ComIntGrav: c.ComIntGrav || 0,
                            ComCredFiscal: c.ComCredFiscal || 0, ComTotal: c.ComTotal || 0
                        });
                        if (patch.ComCodGeneracion) patch.ComClase = '4'; // 🛡️ Fuerza el interruptor a DTE si encontró UUID
                        if (Object.keys(patch).length > 0) {
                            await connection.query('UPDATE compras SET ? WHERE idcompras = ?', [patch, rows[0].idcompras]);
                            reporte.compras.actualizados++;
                        }
                    }
                }
            }
        }

        // ── 2. CRÉDITO FISCAL ───────────────────────────────────────────────────
        const listaCCF = dataToImport.ventas_ccf || dataToImport.ventas_credito_fiscal || [];
        for (const v of listaCCF) {
            const codGen  = v.FiscCodGeneracion || null;
            const tipoDte = limpiarCat(v.FisTipoDoc, '03');

            if (tipoDte === '05' || tipoDte === '06') {
                const [rows] = await connection.query(`
                    SELECT * FROM notas_credito WHERE iddeclaNIT = ? 
                    AND (
                        (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '')
                        OR
                        ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero,'-','') = REPLACE(?,'-','') AND REPLACE(NCNitContraparte,'-','') = REPLACE(?,'-',''))
                    )`, [nitDeclarante, codGen, v.FiscNumDoc, v.FiscNit]);

                if (rows.length === 0) {
                    await connection.query('INSERT INTO notas_credito SET ?', {
                        iddeclaNIT: nitDeclarante, NCFecha: formatearFecha(v.FiscFecha),
                        NCClaseDoc: v.FisClasDoc || '4', NCTipoDoc: tipoDte,
                        NCNumero: v.FiscNumDoc, NCCodGeneracion: codGen,
                        NCNitContraparte: v.FiscNit, NCNombreContraparte: v.FiscNomRazonDenomi,
                        NCNumDocOrigen: 'N/A', NCMontoGravado: v.FiscVtaGravLocal || 0,
                        NCMontoExento: v.FiscVtaExen || 0, NCIva: v.FiscDebitoFiscal || 0,
                        NCTotal: v.FiscTotalVtas || 0, NCTipo: 'VENTA',
                        NCMesDeclarado: extraerMes(v.FiscFecha, v.FiscMesDeclarado),
                        NCAnioDeclarado: extraerAnio(v.FiscFecha, v.FiscAnioDeclarado), NCAnexo: '2'
                    });
                    reporte.notas.insertados++;
                } else {
                    const patch = buildPatch(rows[0], {
                        NCCodGeneracion: codGen, NCFecha: formatearFecha(v.FiscFecha),
                        NCMontoGravado: v.FiscVtaGravLocal || 0, NCMontoExento: v.FiscVtaExen || 0,
                        NCIva: v.FiscDebitoFiscal || 0, NCTotal: v.FiscTotalVtas || 0
                    });
                    if (patch.NCCodGeneracion) patch.NCClaseDoc = '4';
                    if (Object.keys(patch).length > 0) {
                        await connection.query('UPDATE notas_credito SET ? WHERE idNotaCredito = ?', [patch, rows[0].idNotaCredito]);
                        reporte.notas.actualizados++;
                    }
                }
            } else {
                const [rows] = await connection.query(`
                    SELECT * FROM credfiscal WHERE iddeclaNIT = ? 
                    AND (
                        (FiscCodGeneracion = ? AND FiscCodGeneracion IS NOT NULL AND FiscCodGeneracion != '')
                        OR
                        ((FiscCodGeneracion IS NULL OR FiscCodGeneracion = '') AND REPLACE(FiscNumDoc,'-','') = REPLACE(?,'-','') AND REPLACE(FiscNit,'-','') = REPLACE(?,'-',''))
                    )`, [nitDeclarante, codGen, v.FiscNumDoc, v.FiscNit]);

                if (rows.length === 0) {
                    await connection.query('INSERT INTO credfiscal SET ?', {
                        iddeclaNIT: nitDeclarante, FiscFecha: formatearFecha(v.FiscFecha),
                        FisClasDoc: v.FisClasDoc || '4', FisTipoDoc: tipoDte,
                        FiscNumDoc: v.FiscNumDoc, FiscCodGeneracion: codGen,
                        FiscSelloRecepcion: v.FiscSelloRecepcion || null,
                        FiscNumContInter: codGen || v.FiscNumContInter || null,
                        FiscNit: v.FiscNit, FiscNomRazonDenomi: v.FiscNomRazonDenomi,
                        FiscVtaExen: v.FiscVtaExen || 0, FiscVtaNoSujetas: v.FiscVtaNoSujetas || 0,
                        FiscVtaGravLocal: v.FiscVtaGravLocal || 0, FiscDebitoFiscal: v.FiscDebitoFiscal || 0,
                        FiscTotalVtas: v.FiscTotalVtas || 0,
                        BusFiscTipoOperaRenta:  limpiarCat(v.BusFiscTipoOperaRenta, '1'),
                        BusFiscTipoIngresoRenta: limpiarCat(v.BusFiscTipoIngresoRenta, '1'),
                        FiscMesDeclarado: extraerMes(v.FiscFecha, v.FiscMesDeclarado),
                        FiscAnioDeclarado: extraerAnio(v.FiscFecha, v.FiscAnioDeclarado), FiscNumAnexo: '2'
                    });
                    reporte.ventas_ccf.insertados++;
                } else {
                    const patch = buildPatch(rows[0], {
                        FiscCodGeneracion: codGen,
                        FiscSelloRecepcion: v.FiscSelloRecepcion || null,
                        FiscVtaExen: v.FiscVtaExen || 0, FiscVtaNoSujetas: v.FiscVtaNoSujetas || 0,
                        FiscVtaGravLocal: v.FiscVtaGravLocal || 0, FiscDebitoFiscal: v.FiscDebitoFiscal || 0,
                        FiscTotalVtas: v.FiscTotalVtas || 0
                    });
                    if (patch.FiscCodGeneracion) patch.FisClasDoc = '4';
                    if (Object.keys(patch).length > 0) {
                        await connection.query('UPDATE credfiscal SET ? WHERE idCredFiscal = ?', [patch, rows[0].idCredFiscal]);
                        reporte.ventas_ccf.actualizados++;
                    }
                }
            }
        }

        // ── 3. CONSUMIDOR FINAL ─────────────────────────────────────────────────
        const listaCF = dataToImport.ventas_cf || dataToImport.ventas_consumidor || [];
        for (const v of listaCF) {
            const codGen  = v.ConsCodGeneracion || null;
            const tipoDte = limpiarCat(v.ConsTipoDoc, '01');
            const numDoc  = v.ConsNumDocAL || v.ConsNumDocDEL;

            if (tipoDte === '05' || tipoDte === '06') {
                const [rows] = await connection.query(`
                    SELECT * FROM notas_credito WHERE iddeclaNIT = ? 
                    AND (
                        (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '')
                        OR
                        ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero,'-','') = REPLACE(?,'-',''))
                    )`, [nitDeclarante, codGen, numDoc]);

                if (rows.length === 0) {
                    await connection.query('INSERT INTO notas_credito SET ?', {
                        iddeclaNIT: nitDeclarante, NCFecha: formatearFecha(v.ConsFecha),
                        NCClaseDoc: v.ConsClaseDoc || '4', NCTipoDoc: tipoDte,
                        NCNumero: numDoc, NCCodGeneracion: codGen,
                        NCNitContraparte: v.ConsNumDocIdentCliente || '',
                        NCNombreContraparte: v.ConsNomRazonCliente || 'Cliente General',
                        NCNumDocOrigen: 'N/A', NCMontoGravado: v.ConsVtaGravLocales || 0,
                        NCMontoExento: v.ConsVtaExentas || 0, NCIva: 0,
                        NCTotal: v.ConsTotalVta || 0, NCTipo: 'VENTA',
                        NCMesDeclarado: extraerMes(v.ConsFecha, v.ConsMesDeclarado),
                        NCAnioDeclarado: extraerAnio(v.ConsFecha, v.ConsAnioDeclarado), NCAnexo: '1'
                    });
                    reporte.notas.insertados++;
                } else {
                    const patch = buildPatch(rows[0], {
                        NCCodGeneracion: codGen, NCFecha: formatearFecha(v.ConsFecha),
                        NCMontoGravado: v.ConsVtaGravLocales || 0,
                        NCMontoExento: v.ConsVtaExentas || 0, NCTotal: v.ConsTotalVta || 0
                    });
                    if (patch.NCCodGeneracion) patch.NCClaseDoc = '4';
                    if (Object.keys(patch).length > 0) {
                        await connection.query('UPDATE notas_credito SET ? WHERE idNotaCredito = ?', [patch, rows[0].idNotaCredito]);
                        reporte.notas.actualizados++;
                    }
                }
            } else {
                const [rows] = await connection.query(`
                    SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? 
                    AND (
                        (ConsCodGeneracion = ? AND ConsCodGeneracion IS NOT NULL AND ConsCodGeneracion != '')
                        OR
                        ((ConsCodGeneracion IS NULL OR ConsCodGeneracion = '') AND REPLACE(ConsNumDocAL,'-','') = REPLACE(?,'-',''))
                    )`, [nitDeclarante, codGen, numDoc]);

                if (rows.length === 0) {
                    await connection.query('INSERT INTO consumidorfinal SET ?', {
                        iddeclaNIT: nitDeclarante, ConsFecha: formatearFecha(v.ConsFecha),
                        ConsClaseDoc: v.ConsClaseDoc || '4', ConsTipoDoc: tipoDte,
                        ConsNumDocDEL: v.ConsNumDocDEL, ConsNumDocAL: numDoc,
                        ConsCodGeneracion: codGen, ConsSelloRecepcion: v.ConsSelloRecepcion || null,
                        ConsVtaExentas: v.ConsVtaExentas || 0, ConsVtaNoSujetas: v.ConsVtaNoSujetas || 0,
                        ConsVtaGravLocales: v.ConsVtaGravLocales || 0, ConsTotalVta: v.ConsTotalVta || 0,
                        ConsTipoOpera: limpiarCat(v.ConsTipoOpera, '1'),
                        ConsTipoIngreso: limpiarCat(v.ConsTipoIngreso, '1'),
                        ConsMesDeclarado: extraerMes(v.ConsFecha, v.ConsMesDeclarado),
                        ConsAnioDeclarado: extraerAnio(v.ConsFecha, v.ConsAnioDeclarado), ConsNumAnexo: '1',
                        ConsNomRazonCliente: v.ConsNomRazonCliente || 'Cliente General',
                        ConsNumDocIdentCliente: v.ConsNumDocIdentCliente || ''
                    });
                    reporte.ventas_cf.insertados++;
                } else {
                    const patch = buildPatch(rows[0], {
                        ConsCodGeneracion: codGen,
                        ConsSelloRecepcion: v.ConsSelloRecepcion || null,
                        ConsVtaExentas: v.ConsVtaExentas || 0, ConsVtaNoSujetas: v.ConsVtaNoSujetas || 0,
                        ConsVtaGravLocales: v.ConsVtaGravLocales || 0, ConsTotalVta: v.ConsTotalVta || 0
                    });
                    if (patch.ConsCodGeneracion) patch.ConsClaseDoc = '4';
                    if (Object.keys(patch).length > 0) {
                        await connection.query('UPDATE consumidorfinal SET ? WHERE idconsfinal = ?', [patch, rows[0].idconsfinal]);
                        reporte.ventas_cf.actualizados++;
                    }
                }
            }
        }

        // ── 4. SUJETOS EXCLUIDOS ────────────────────────────────────────────────
        const listaSujetos = dataToImport.sujetos_excluidos || [];
        for (const s of listaSujetos) {
            const codGen = s.ComprasSujExcluCodGeneracion || null;
            const [rows] = await connection.query(`
                SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? 
                AND (
                    (ComprasSujExcluCodGeneracion = ? AND ComprasSujExcluCodGeneracion IS NOT NULL AND ComprasSujExcluCodGeneracion != '')
                    OR
                    ((ComprasSujExcluCodGeneracion IS NULL OR ComprasSujExcluCodGeneracion = '') AND REPLACE(ComprasSujExcluNIT,'-','') = REPLACE(?,'-','') AND REPLACE(ComprasSujExcluNumDoc,'-','') = REPLACE(?,'-',''))
                )`, [nitDeclarante, codGen, s.ComprasSujExcluNIT, s.ComprasSujExcluNumDoc]);

            if (rows.length === 0) {
                await connection.query('INSERT INTO comprassujexcluidos SET ?', {
                    iddeclaNIT: nitDeclarante, ComprasSujExcluNIT: s.ComprasSujExcluNIT,
                    ComprasSujExcluNom: s.ComprasSujExcluNom,
                    ComprasSujExcluFecha: formatearFecha(s.ComprasSujExcluFecha),
                    ComprasSujExcluTipoDoc: limpiarCat(s.ComprasSujExcluTipoDoc, '14'),
                    ComprasSujExcluNumDoc: s.ComprasSujExcluNumDoc,
                    ComprasSujExcluCodGeneracion: codGen,
                    ComprasSujExcluSelloRecepcion: s.ComprasSujExcluSelloRecepcion || null,
                    ComprasSujExcluMontoOpera: s.ComprasSujExcluMontoOpera || 0,
                    ComprasSujExcluMontoReten: s.ComprasSujExcluMontoReten || 0,
                    ComprasSujExcluTipoOpera:      limpiarCat(s.ComprasSujExcluTipoOpera, '1'),
                    ComprasSujExcluClasificacion:  limpiarCat(s.ComprasSujExcluClasificacion, '2'),
                    ComprasSujExclusector:         limpiarCat(s.ComprasSujExclusector, '4'),
                    ComprasSujExcluTipoCostoGast:  limpiarCat(s.ComprasSujExcluTipoCostoGast, '2'),
                    ComprasSujExcluMesDeclarado:   extraerMes(s.ComprasSujExcluFecha, s.ComprasSujExcluMesDeclarado),
                    ComprasSujExcluAnioDeclarado:  extraerAnio(s.ComprasSujExcluFecha, s.ComprasSujExcluAnioDeclarado),
                    ComprasSujExcluAnexo: '5'
                });
                reporte.sujetos.insertados++;
            } else {
                const patch = buildPatch(rows[0], {
                    ComprasSujExcluCodGeneracion:  codGen,
                    ComprasSujExcluSelloRecepcion: s.ComprasSujExcluSelloRecepcion || null,
                    ComprasSujExcluMontoOpera: s.ComprasSujExcluMontoOpera || 0,
                    ComprasSujExcluMontoReten: s.ComprasSujExcluMontoReten || 0
                });
                if (Object.keys(patch).length > 0) {
                    await connection.query('UPDATE comprassujexcluidos SET ? WHERE idComSujExclui = ?', [patch, rows[0].idComSujExclui]);
                    reporte.sujetos.actualizados++;
                }
            }
        }

        // ── 5. RETENCIONES ──────────────────────────────────────────────────────
        const listaRetenciones = dataToImport.retenciones || [];
        for (const r of listaRetenciones) {
            const codGen = r.RetenCodGeneracion || null;
            const [rows] = await connection.query(`
                SELECT * FROM retenciones WHERE iddeclaNIT = ? 
                AND (
                    (RetenCodGeneracion = ? AND RetenCodGeneracion IS NOT NULL AND RetenCodGeneracion != '')
                    OR
                    ((RetenCodGeneracion IS NULL OR RetenCodGeneracion = '') AND REPLACE(RetenNitAgente,'-','') = REPLACE(?,'-','') AND REPLACE(RetenNumDoc,'-','') = REPLACE(?,'-',''))
                )`, [nitDeclarante, codGen, r.RetenNitAgente, r.RetenNumDoc]);

            if (rows.length === 0) {
                await connection.query('INSERT INTO retenciones SET ?', {
                    iddeclaNIT: nitDeclarante, RetenNitAgente: r.RetenNitAgente,
                    RetenNomAgente: r.RetenNomAgente || '',
                    RetenFecha: formatearFecha(r.RetenFecha),
                    RetenListTipoDoc: limpiarCat(r.RetenListTipoDoc, '07'),
                    RetenSerieDoc: r.RetenSerieDoc || '', RetenNumDoc: r.RetenNumDoc,
                    RetenCodGeneracion: codGen,
                    RetenSelloRecepcion: r.RetenSelloRecepcion || null,
                    RetenMontoSujeto: r.RetenMontoSujeto || 0,
                    RetenMontoDeReten: r.RetenMontoDeReten || 0,
                    RetenDuiDelAgente: r.RetenDuiDelAgente || '',
                    RetenMesDeclarado:  extraerMes(r.RetenFecha, r.RetenMesDeclarado),
                    RetenAnioDeclarado: extraerAnio(r.RetenFecha, r.RetenAnioDeclarado),
                    RetenNumAnexo: '4'
                });
                reporte.retenciones.insertados++;
            } else {
                const patch = buildPatch(rows[0], {
                    RetenCodGeneracion:  codGen,
                    RetenSelloRecepcion: r.RetenSelloRecepcion || null,
                    RetenMontoSujeto:  r.RetenMontoSujeto  || 0,
                    RetenMontoDeReten: r.RetenMontoDeReten || 0
                });
                if (Object.keys(patch).length > 0) {
                    await connection.query('UPDATE retenciones SET ? WHERE idRetenciones = ?', [patch, rows[0].idRetenciones]);
                    reporte.retenciones.actualizados++;
                }
            }
        }

        await connection.commit();

        // 📋 Auditoría de la importación
        const usuario = req.headers['x-usuario'] || 'Sistema';
        const totalIns = Object.values(reporte).reduce((s, m) => s + m.insertados, 0);
        const totalAct = Object.values(reporte).reduce((s, m) => s + m.actualizados, 0);
        registrarAccion(usuario, 'IMPORTACION JSON', 'TODOS LOS MÓDULOS', 
            `NIT: ${nitDeclarante} | ${totalIns} insertados, ${totalAct} actualizados`);

        // Construir resumen legible para el frontend
        const totalInsertados = Object.values(reporte).reduce((s, m) => s + m.insertados, 0);
        const totalActualizados = Object.values(reporte).reduce((s, m) => s + m.actualizados, 0);

        let mensaje = 'Importación finalizada.';
        if (totalInsertados > 0 && totalActualizados === 0)
            mensaje = `✅ Se importaron ${totalInsertados} documento(s) nuevo(s).`;
        else if (totalInsertados === 0 && totalActualizados > 0)
            mensaje = `🔄 Actualización completada: se completaron datos faltantes en ${totalActualizados} documento(s) ya existente(s).`;
        else if (totalInsertados > 0 && totalActualizados > 0)
            mensaje = `✅ ${totalInsertados} documento(s) nuevo(s) importado(s). 🔄 ${totalActualizados} documento(s) existente(s) completado(s) con datos faltantes.`;
        else
            mensaje = 'ℹ️ Todos los documentos ya están al día. No se realizaron cambios.';

        res.json({ message: mensaje, detalle: reporte });

    } catch (e) {
        await connection.rollback();
        res.status(400).json({ message: e.message });
    } finally { connection.release(); }
};
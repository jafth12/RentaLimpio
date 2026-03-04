import pool from '../config/db.js';

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
// 1. EXPORTACIONES INDIVIDUALES Y BACKUP
// ==========================================
export const exportarCompras = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ? ORDER BY ComFecha ASC', [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}` }, data: { compras: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasConsumidor = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query('SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsMesDeclarado = ? AND ConsAnioDeclarado = ? ORDER BY ConsFecha ASC', [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}` }, data: { ventas_cf: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasCredito = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscMesDeclarado = ? AND FiscAnioDeclarado = ? ORDER BY FiscFecha ASC', [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}` }, data: { ventas_ccf: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarSujetos = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query('SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluMesDeclarado = ? AND ComprasSujExcluAnioDeclarado = ? ORDER BY ComprasSujExcluFecha ASC', [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}` }, data: { sujetos_excluidos: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarRetenciones = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query('SELECT * FROM retenciones WHERE iddeclaNIT = ? AND RetenMesDeclarado = ? AND RetenAnioDeclarado = ? ORDER BY RetenFecha ASC', [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}` }, data: { retenciones: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarTodoJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    if (!nit) return res.status(400).json({ message: "Se requiere NIT para el backup." });

    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [compras] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ? ORDER BY ComFecha ASC', [nit, mes, anio]);
        const [ventasCCF] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscMesDeclarado = ? AND FiscAnioDeclarado = ? ORDER BY FiscFecha ASC', [nit, mes, anio]);
        const [ventasCF] = await pool.query('SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsMesDeclarado = ? AND ConsAnioDeclarado = ? ORDER BY ConsFecha ASC', [nit, mes, anio]);
        const [sujetos] = await pool.query('SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluMesDeclarado = ? AND ComprasSujExcluAnioDeclarado = ? ORDER BY ComprasSujExcluFecha ASC', [nit, mes, anio]);
        const [retenciones] = await pool.query('SELECT * FROM retenciones WHERE iddeclaNIT = ? AND RetenMesDeclarado = ? AND RetenAnioDeclarado = ? ORDER BY RetenFecha ASC', [nit, mes, anio]); 
        const [notas] = await pool.query('SELECT * FROM notas_credito WHERE iddeclaNIT = ? AND NCMesDeclarado = ? AND NCAnioDeclarado = ? ORDER BY NCFecha ASC', [nit, mes, anio]); 

        res.json({
            backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() },
            data: { compras, ventas_cf: ventasCF, ventas_ccf: ventasCCF, sujetos_excluidos: sujetos, retenciones, notas_credito: notas } 
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// 2. IMPORTACIÓN MASIVA INTELIGENTE
// ==========================================
export const importarTodoJSON = async (req, res) => {
    const info = req.body.backup_info || req.body.encabezado;
    const dataToImport = req.body.data || req.body.modulos;
    const nitFront = info?.nit || info?.nit_declarante;

    if (!nitFront || !dataToImport) {
        return res.status(400).json({ message: "Error: Estructura JSON no reconocida." });
    }

    const connection = await pool.getConnection();
    const reporte = { compras: 0, ventas_ccf: 0, ventas_cf: 0, sujetos: 0, retenciones: 0, notas: 0, duplicados: 0, documentos_omitidos: [] };
    const limpiarCat = (val, def) => val ? (val.toString().match(/\d+/) || [def])[0] : def;

    try {
        await connection.beginTransaction();

        const [existeD] = await connection.query('SELECT iddeclaNIT FROM declarante WHERE REPLACE(iddeclaNIT, "-", "") = REPLACE(?, "-", "")', [nitFront]);
        if (existeD.length === 0) throw new Error(`El declarante ${nitFront} no existe en su base de datos.`);
        const nitDeclarante = existeD[0].iddeclaNIT;

        // 1. COMPRAS
        if (dataToImport.compras?.length) {
            for (const c of dataToImport.compras) {
                await connection.query('INSERT IGNORE INTO proveedor (ProvNIT, ProvNombre) VALUES (?, ?)', [c.proveedor_ProvNIT || '0000', c.ComNomProve || 'Proveedor Importado']);
                const codGen = c.ComCodGeneracion || null;
                const tipoDte = limpiarCat(c.ComTipo, '03');

                let fovial = parseFloat(c.comFovial) || 0; let cotrans = parseFloat(c.comCotran) || 0; let otro = parseFloat(c.ComOtroAtributo) || 0;
                const listaTributos = (c.resumen && c.resumen.tributos) ? c.resumen.tributos : (c.tributos || []);
                if (listaTributos.length > 0) {
                    const tribFovial = listaTributos.find(t => t.codigo === 'D1'); const tribCotrans = listaTributos.find(t => t.codigo === 'C8');
                    if (tribFovial) fovial = parseFloat(tribFovial.valor); if (tribCotrans) cotrans = parseFloat(tribCotrans.valor);
                    if (fovial > 0 || cotrans > 0) otro = parseFloat((fovial + cotrans).toFixed(2));
                }

                if (tipoDte === '05' || tipoDte === '06') {
                    // 🛡️ REGLA RELAJADA: Permite si los UUID son distintos
                    const [dup] = await connection.query(`
                        SELECT idNotaCredito FROM notas_credito WHERE iddeclaNIT = ? 
                        AND (
                            (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                            OR 
                            ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(NCNitContraparte, '-', '') = REPLACE(?, '-', ''))
                        )`, [nitDeclarante, codGen, c.ComNumero, c.proveedor_ProvNIT]);
                    if (dup.length === 0) {
                        const nuevaNota = {
                            iddeclaNIT: nitDeclarante, NCFecha: formatearFecha(c.ComFecha), NCClaseDoc: c.ComClase || '4', NCTipoDoc: tipoDte,
                            NCNumero: c.ComNumero, NCCodGeneracion: codGen, NCNitContraparte: c.proveedor_ProvNIT, NCNombreContraparte: c.ComNomProve,
                            NCNumDocOrigen: 'N/A', NCMontoGravado: c.ComIntGrav || 0, NCMontoExento: c.ComIntExe || 0, NCIva: c.ComCredFiscal || 0,
                            NCCotran: cotrans, NCFovial: fovial, NCTotal: c.ComTotal || 0, NCTipo: 'COMPRA',
                            NCMesDeclarado: extraerMes(c.ComFecha, c.ComMesDeclarado), NCAnioDeclarado: extraerAnio(c.ComFecha, c.ComAnioDeclarado), NCAnexo: '3'
                        };
                        await connection.query('INSERT INTO notas_credito SET ?', nuevaNota);
                        reporte.compras++; 
                    } else { reporte.duplicados++; reporte.documentos_omitidos.push(`Nota: ${c.ComNumero}`); }
                } else {
                    const [dup] = await connection.query(`
                        SELECT idcompras FROM compras WHERE iddeclaNIT = ? 
                        AND (
                            (ComCodGeneracion = ? AND ComCodGeneracion IS NOT NULL AND ComCodGeneracion != '') 
                            OR 
                            ((ComCodGeneracion IS NULL OR ComCodGeneracion = '') AND REPLACE(ComNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(proveedor_ProvNIT, '-', '') = REPLACE(?, '-', ''))
                        )`, [nitDeclarante, codGen, c.ComNumero, c.proveedor_ProvNIT]);
                    if (dup.length === 0) {
                        const nuevaCompra = {
                            iddeclaNIT: nitDeclarante, proveedor_ProvNIT: c.proveedor_ProvNIT, ComNomProve: c.ComNomProve,
                            ComFecha: formatearFecha(c.ComFecha), ComClase: c.ComClase || '4', ComTipo: tipoDte,
                            ComNumero: c.ComNumero, ComCodGeneracion: codGen, ComIntExe: c.ComIntExe || 0, ComIntGrav: c.ComIntGrav || 0,
                            ComCredFiscal: c.ComCredFiscal || 0, comFovial: fovial, comCotran: cotrans, ComOtroAtributo: otro, ComTotal: c.ComTotal || 0,
                            ComMesDeclarado: extraerMes(c.ComFecha, c.ComMesDeclarado), ComAnioDeclarado: extraerAnio(c.ComFecha, c.ComAnioDeclarado), 
                            ComClasiRenta: limpiarCat(c.ComClasiRenta, '1'), ComTipoCostoGasto: limpiarCat(c.ComTipoCostoGasto || c.ComTipoCostoGastoRenta, '2'), 
                            ComTipoOpeRenta: limpiarCat(c.ComTipoOpeRenta, '1'), ComAnexo: '3'
                        };
                        await connection.query('INSERT INTO compras SET ?', nuevaCompra);
                        reporte.compras++;
                    } else { reporte.duplicados++; reporte.documentos_omitidos.push(`Compra: ${c.ComNumero}`); }
                }
            }
        }

        // 2. CRÉDITO FISCAL
        const listaCCF = dataToImport.ventas_ccf || dataToImport.ventas_credito_fiscal || [];
        if (listaCCF.length) {
            for (const v of listaCCF) {
                const codGen = v.FiscCodGeneracion || null;
                const tipoDte = limpiarCat(v.FisTipoDoc, '03');

                if (tipoDte === '05' || tipoDte === '06') {
                    const [dup] = await connection.query(`
                        SELECT idNotaCredito FROM notas_credito WHERE iddeclaNIT = ? 
                        AND (
                            (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                            OR 
                            ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(NCNitContraparte, '-', '') = REPLACE(?, '-', ''))
                        )`, [nitDeclarante, codGen, v.FiscNumDoc, v.FiscNit]);
                    if (dup.length === 0) {
                        const nuevaNota = {
                            iddeclaNIT: nitDeclarante, NCFecha: formatearFecha(v.FiscFecha), NCClaseDoc: v.FisClasDoc || '4', NCTipoDoc: tipoDte,
                            NCNumero: v.FiscNumDoc, NCCodGeneracion: codGen, NCNitContraparte: v.FiscNit, NCNombreContraparte: v.FiscNomRazonDenomi,
                            NCNumDocOrigen: 'N/A', NCMontoGravado: v.FiscVtaGravLocal || 0, NCMontoExento: v.FiscVtaExen || 0, NCIva: v.FiscDebitoFiscal || 0,
                            NCTotal: v.FiscTotalVtas || 0, NCTipo: 'VENTA',
                            NCMesDeclarado: extraerMes(v.FiscFecha, v.FiscMesDeclarado), NCAnioDeclarado: extraerAnio(v.FiscFecha, v.FiscAnioDeclarado), NCAnexo: '2'
                        };
                        await connection.query('INSERT INTO notas_credito SET ?', nuevaNota);
                        reporte.ventas_ccf++;
                    } else { reporte.duplicados++; reporte.documentos_omitidos.push(`Nota CCF: ${v.FiscNumDoc}`); }
                } else {
                    const [dup] = await connection.query(`
                        SELECT idCredFiscal FROM credfiscal WHERE iddeclaNIT = ? 
                        AND (
                            (FiscCodGeneracion = ? AND FiscCodGeneracion IS NOT NULL AND FiscCodGeneracion != '') 
                            OR 
                            ((FiscCodGeneracion IS NULL OR FiscCodGeneracion = '') AND REPLACE(FiscNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(FiscNit, '-', '') = REPLACE(?, '-', ''))
                        )`, [nitDeclarante, codGen, v.FiscNumDoc, v.FiscNit]);
                    if (dup.length === 0) {
                        const nuevoCCF = {
                            iddeclaNIT: nitDeclarante, FiscFecha: formatearFecha(v.FiscFecha), FisClasDoc: v.FisClasDoc || '4', FisTipoDoc: tipoDte,
                            FiscNumDoc: v.FiscNumDoc, FiscCodGeneracion: codGen, FiscNumContInter: codGen || v.FiscNumContInter || null, FiscNit: v.FiscNit, 
                            FiscNomRazonDenomi: v.FiscNomRazonDenomi, FiscVtaExen: v.FiscVtaExen || 0, FiscVtaNoSujetas: v.FiscVtaNoSujetas || 0, 
                            FiscVtaGravLocal: v.FiscVtaGravLocal || 0, FiscDebitoFiscal: v.FiscDebitoFiscal || 0, FiscTotalVtas: v.FiscTotalVtas || 0, 
                            BusFiscTipoOperaRenta: limpiarCat(v.BusFiscTipoOperaRenta, '1'), BusFiscTipoIngresoRenta: limpiarCat(v.BusFiscTipoIngresoRenta, '1'),
                            FiscMesDeclarado: extraerMes(v.FiscFecha, v.FiscMesDeclarado), FiscAnioDeclarado: extraerAnio(v.FiscFecha, v.FiscAnioDeclarado), FiscNumAnexo: '2'
                        };
                        await connection.query('INSERT INTO credfiscal SET ?', nuevoCCF);
                        reporte.ventas_ccf++;
                    } else { reporte.duplicados++; reporte.documentos_omitidos.push(`CCF: ${v.FiscNumDoc}`); }
                }
            }
        }

        // 3. CONSUMIDOR FINAL
        const listaCF = dataToImport.ventas_cf || dataToImport.ventas_consumidor || [];
        if (listaCF.length) {
            for (const v of listaCF) {
                const codGen = v.ConsCodGeneracion || null;
                const tipoDte = limpiarCat(v.ConsTipoDoc, '01');

                if (tipoDte === '05' || tipoDte === '06') {
                    const [dup] = await connection.query(`
                        SELECT idNotaCredito FROM notas_credito WHERE iddeclaNIT = ? 
                        AND (
                            (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                            OR 
                            ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero, '-', '') = REPLACE(?, '-', ''))
                        )`, [nitDeclarante, codGen, v.ConsNumDocAL || v.ConsNumDocDEL]);
                    if (dup.length === 0) {
                        const nuevaNota = {
                            iddeclaNIT: nitDeclarante, NCFecha: formatearFecha(v.ConsFecha), NCClaseDoc: v.ConsClaseDoc || '4', NCTipoDoc: tipoDte,
                            NCNumero: v.ConsNumDocAL || v.ConsNumDocDEL, NCCodGeneracion: codGen, NCNitContraparte: v.ConsNumDocIdentCliente || '', NCNombreContraparte: v.ConsNomRazonCliente || 'Cliente General',
                            NCNumDocOrigen: 'N/A', NCMontoGravado: v.ConsVtaGravLocales || 0, NCMontoExento: v.ConsVtaExentas || 0, NCIva: 0,
                            NCTotal: v.ConsTotalVta || 0, NCTipo: 'VENTA',
                            NCMesDeclarado: extraerMes(v.ConsFecha, v.ConsMesDeclarado), NCAnioDeclarado: extraerAnio(v.ConsFecha, v.ConsAnioDeclarado), NCAnexo: '1'
                        };
                        await connection.query('INSERT INTO notas_credito SET ?', nuevaNota);
                        reporte.ventas_cf++;
                    } else { reporte.duplicados++; reporte.documentos_omitidos.push(`Nota CF: ${v.ConsNumDocAL || v.ConsNumDocDEL}`); }
                } else {
                    const [dup] = await connection.query(`
                        SELECT idconsfinal FROM consumidorfinal WHERE iddeclaNIT = ? 
                        AND (
                            (ConsCodGeneracion = ? AND ConsCodGeneracion IS NOT NULL AND ConsCodGeneracion != '') 
                            OR 
                            ((ConsCodGeneracion IS NULL OR ConsCodGeneracion = '') AND REPLACE(ConsNumDocAL, '-', '') = REPLACE(?, '-', ''))
                        )`, [nitDeclarante, codGen, v.ConsNumDocAL || v.ConsNumDocDEL]);
                    if (dup.length === 0) {
                        const nuevoCF = {
                            iddeclaNIT: nitDeclarante, ConsFecha: formatearFecha(v.ConsFecha), ConsClaseDoc: v.ConsClaseDoc || '4', ConsTipoDoc: tipoDte,
                            ConsNumDocDEL: v.ConsNumDocDEL, ConsNumDocAL: v.ConsNumDocAL || v.ConsNumDocDEL, ConsCodGeneracion: codGen,
                            ConsVtaExentas: v.ConsVtaExentas || 0, ConsVtaNoSujetas: v.ConsVtaNoSujetas || 0, ConsVtaGravLocales: v.ConsVtaGravLocales || 0,
                            ConsTotalVta: v.ConsTotalVta || 0, ConsTipoOpera: limpiarCat(v.ConsTipoOpera, '1'), ConsTipoIngreso: limpiarCat(v.ConsTipoIngreso, '1'),
                            ConsMesDeclarado: extraerMes(v.ConsFecha, v.ConsMesDeclarado), ConsAnioDeclarado: extraerAnio(v.ConsFecha, v.ConsAnioDeclarado), ConsNumAnexo: '1',
                            ConsNomRazonCliente: v.ConsNomRazonCliente || 'Cliente General', // 🛡️ GUARDA EL NOMBRE
                            ConsNumDocIdentCliente: v.ConsNumDocIdentCliente || '' // 🛡️ GUARDA EL DOCUMENTO
                        };
                        await connection.query('INSERT INTO consumidorfinal SET ?', nuevoCF);
                        reporte.ventas_cf++;
                    } else { reporte.duplicados++; reporte.documentos_omitidos.push(`Consumidor Final: ${v.ConsNumDocAL || v.ConsNumDocDEL}`); }
                }
            }
        }

        // 4. SUJETOS EXCLUIDOS
        const listaSujetos = dataToImport.sujetos_excluidos || [];
        if (listaSujetos.length) {
            for (const s of listaSujetos) {
                const codGen = s.ComprasSujExcluCodGeneracion || null;
                const [dup] = await connection.query(`
                    SELECT idComSujExclui FROM comprassujexcluidos WHERE iddeclaNIT = ? 
                    AND (
                        (ComprasSujExcluCodGeneracion = ? AND ComprasSujExcluCodGeneracion IS NOT NULL AND ComprasSujExcluCodGeneracion != '') 
                        OR 
                        ((ComprasSujExcluCodGeneracion IS NULL OR ComprasSujExcluCodGeneracion = '') AND REPLACE(ComprasSujExcluNIT, '-', '') = REPLACE(?, '-', '') AND REPLACE(ComprasSujExcluNumDoc, '-', '') = REPLACE(?, '-', ''))
                    )`, [nitDeclarante, codGen, s.ComprasSujExcluNIT, s.ComprasSujExcluNumDoc]);
                if (dup.length === 0) {
                    const nuevoSujeto = {
                        iddeclaNIT: nitDeclarante, ComprasSujExcluNIT: s.ComprasSujExcluNIT, ComprasSujExcluNom: s.ComprasSujExcluNom,
                        ComprasSujExcluFecha: formatearFecha(s.ComprasSujExcluFecha), ComprasSujExcluTipoDoc: limpiarCat(s.ComprasSujExcluTipoDoc, '14'),
                        ComprasSujExcluNumDoc: s.ComprasSujExcluNumDoc, ComprasSujExcluCodGeneracion: codGen, 
                        ComprasSujExcluMontoOpera: s.ComprasSujExcluMontoOpera || 0, ComprasSujExcluMontoReten: s.ComprasSujExcluMontoReten || 0,
                        ComprasSujExcluTipoOpera: limpiarCat(s.ComprasSujExcluTipoOpera, '1'), ComprasSujExcluClasificacion: limpiarCat(s.ComprasSujExcluClasificacion, '2'),
                        ComprasSujExclusector: limpiarCat(s.ComprasSujExclusector, '4'), ComprasSujExcluTipoCostoGast: limpiarCat(s.ComprasSujExcluTipoCostoGast, '2'),
                        ComprasSujExcluMesDeclarado: extraerMes(s.ComprasSujExcluFecha, s.ComprasSujExcluMesDeclarado), ComprasSujExcluAnioDeclarado: extraerAnio(s.ComprasSujExcluFecha, s.ComprasSujExcluAnioDeclarado), ComprasSujExcluAnexo: '5'
                    };
                    await connection.query('INSERT INTO comprassujexcluidos SET ?', nuevoSujeto);
                    reporte.sujetos++;
                } else { reporte.duplicados++; }
            }
        }

        // 5. RETENCIONES 
        const listaRetenciones = dataToImport.retenciones || [];
        if (listaRetenciones.length) {
            for (const r of listaRetenciones) {
                const codGen = r.RetenCodGeneracion || null;
                const [dup] = await connection.query(`
                    SELECT idRetenciones FROM retenciones WHERE iddeclaNIT = ? 
                    AND (
                        (RetenCodGeneracion = ? AND RetenCodGeneracion IS NOT NULL AND RetenCodGeneracion != '') 
                        OR 
                        ((RetenCodGeneracion IS NULL OR RetenCodGeneracion = '') AND REPLACE(RetenNitAgente, '-', '') = REPLACE(?, '-', '') AND REPLACE(RetenNumDoc, '-', '') = REPLACE(?, '-', ''))
                    )`, [nitDeclarante, codGen, r.RetenNitAgente, r.RetenNumDoc]);
                if (dup.length === 0) {
                    const nuevaRetencion = {
                        iddeclaNIT: nitDeclarante, RetenNitAgente: r.RetenNitAgente, RetenNomAgente: r.RetenNomAgente || '', 
                        RetenFecha: formatearFecha(r.RetenFecha), RetenListTipoDoc: limpiarCat(r.RetenListTipoDoc, '07'),
                        RetenSerieDoc: r.RetenSerieDoc || '', RetenNumDoc: r.RetenNumDoc, RetenCodGeneracion: codGen, 
                        RetenMontoSujeto: r.RetenMontoSujeto || 0, RetenMontoDeReten: r.RetenMontoDeReten || 0,
                        RetenDuiDelAgente: r.RetenDuiDelAgente || '', RetenMesDeclarado: extraerMes(r.RetenFecha, r.RetenMesDeclarado), 
                        RetenAnioDeclarado: extraerAnio(r.RetenFecha, r.RetenAnioDeclarado), RetenNumAnexo: '4' 
                    };
                    await connection.query('INSERT INTO retenciones SET ?', nuevaRetencion);
                    reporte.retenciones++;
                } else { reporte.duplicados++; }
            }
        }

        await connection.commit();
        res.json({ message: "Importación finalizada con éxito.", detalle: reporte });

    } catch (e) {
        await connection.rollback();
        res.status(400).json({ message: e.message });
    } finally { connection.release(); }
};
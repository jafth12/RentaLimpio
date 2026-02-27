import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js';

// ==========================================
// FUNCIONES AUXILIARES
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

// ==========================================
// LIMPIADORES PARA EL BACKUP (Mantienen el formato numérico)
// ==========================================
const limpiarCompras = (rows) => {
    rows.forEach(r => {
        if (r.ComFecha) r.ComFecha = formatearFecha(r.ComFecha);
        r.ComIntExe = aMoneda(r.ComIntExe); r.ComInternacioExe = aMoneda(r.ComInternacioExe);
        r.ComImpExeNoSujetas = aMoneda(r.ComImpExeNoSujetas); r.ComIntGrav = aMoneda(r.ComIntGrav);
        r.ComInternacGravBienes = aMoneda(r.ComInternacGravBienes); r.ComImportGravBienes = aMoneda(r.ComImportGravBienes);
        r.ComImportGravServicios = aMoneda(r.ComImportGravServicios); r.ComCredFiscal = aMoneda(r.ComCredFiscal);
        r.comFovial = aMoneda(r.comFovial); r.comCotran = aMoneda(r.comCotran);
        r.ComOtroAtributo = aMoneda(r.ComOtroAtributo); r.ComTotal = aMoneda(r.ComTotal);
    });
};

const limpiarVentasCF = (rows) => {
    rows.forEach(r => {
        if (r.ConsFecha) r.ConsFecha = formatearFecha(r.ConsFecha);
        r.ConsVtaExentas = aMoneda(r.ConsVtaExentas); r.ConsVtaNoSujetas = aMoneda(r.ConsVtaNoSujetas);
        r.ConsVtaGravLocales = aMoneda(r.ConsVtaGravLocales); r.ConsExpDentAreaCA = aMoneda(r.ConsExpDentAreaCA);
        r.ConsExpFueraAreaCA = aMoneda(r.ConsExpFueraAreaCA); r.ConsExpServicios = aMoneda(r.ConsExpServicios);
        r.ConsVtaZonaFrancasDPA = aMoneda(r.ConsVtaZonaFrancasDPA); r.ConsVtaCtaTercNoDomici = aMoneda(r.ConsVtaCtaTercNoDomici);
        r.ConsTotalVta = aMoneda(r.ConsTotalVta);
    });
};

const limpiarVentasCCF = (rows) => {
    rows.forEach(r => {
        if (r.FiscFecha) r.FiscFecha = formatearFecha(r.FiscFecha);
        r.FiscVtaExen = aMoneda(r.FiscVtaExen); r.FiscVtaNoSujetas = aMoneda(r.FiscVtaNoSujetas);
        r.FiscVtaGravLocal = aMoneda(r.FiscVtaGravLocal); r.FiscDebitoFiscal = aMoneda(r.FiscDebitoFiscal);
        r.FiscVtaCtaTercNoDomici = aMoneda(r.FiscVtaCtaTercNoDomici); r.FiscDebFiscVtaCtaTerceros = aMoneda(r.FiscDebFiscVtaCtaTerceros);
        r.FiscTotalVtas = aMoneda(r.FiscTotalVtas);
    });
};

const limpiarSujetos = (rows) => {
    rows.forEach(r => {
        if (r.ComprasSujExcluFecha) r.ComprasSujExcluFecha = formatearFecha(r.ComprasSujExcluFecha);
        r.ComprasSujExcluMontoOpera = aMoneda(r.ComprasSujExcluMontoOpera);
        r.ComprasSujExcluMontoReten = aMoneda(r.ComprasSujExcluMontoReten);
    });
};

// ==========================================
// 1. EXPORTACIONES INDIVIDUALES APROPIADAS PARA IMPORTARSE LUEGO
// ==========================================
export const exportarCompras = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        // 🛡️ Búsqueda por el mes a declarar asignado
        const [rows] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ? ORDER BY ComFecha ASC', [nit, mes, anio]);
        limpiarCompras(rows);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}` }, data: { compras: rows, ventas_cf: [], ventas_ccf: [], sujetos_excluidos: [] } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasConsumidor = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        // 🛡️ Búsqueda por el mes a declarar asignado (Ya NO usa MONTH(fecha))
        const [rows] = await pool.query('SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsMesDeclarado = ? AND ConsAnioDeclarado = ? ORDER BY ConsFecha ASC', [nit, mes, anio]);
        limpiarVentasCF(rows);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}` }, data: { compras: [], ventas_cf: rows, ventas_ccf: [], sujetos_excluidos: [] } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasCredito = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        // 🛡️ Búsqueda por el mes a declarar asignado
        const [rows] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscMesDeclarado = ? AND FiscAnioDeclarado = ? ORDER BY FiscFecha ASC', [nit, mes, anio]);
        limpiarVentasCCF(rows);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}` }, data: { compras: [], ventas_cf: [], ventas_ccf: rows, sujetos_excluidos: [] } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarSujetos = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        // 🛡️ Búsqueda por el mes a declarar asignado
        const [rows] = await pool.query('SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluMesDeclarado = ? AND ComprasSujExcluAnioDeclarado = ? ORDER BY ComprasSujExcluFecha ASC', [nit, mes, anio]);
        limpiarSujetos(rows);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}` }, data: { compras: [], ventas_cf: [], ventas_ccf: [], sujetos_excluidos: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarTodoJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    if (!nit) return res.status(400).json({ message: "Se requiere NIT para el backup." });

    try {
        const [declarante] = await pool.query('SELECT * FROM declarante WHERE iddeclaNIT = ?', [nit]);
        
        // 🛡️ AHORA TODAS LAS TABLAS DEL BACKUP EXPORTAN EXACTAMENTE LO QUE EL USUARIO ASIGNÓ AL MES
        const [compras] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ? ORDER BY ComFecha ASC', [nit, mes, anio]);
        const [ventasCCF] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscMesDeclarado = ? AND FiscAnioDeclarado = ? ORDER BY FiscFecha ASC', [nit, mes, anio]);
        const [ventasCF] = await pool.query('SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsMesDeclarado = ? AND ConsAnioDeclarado = ? ORDER BY ConsFecha ASC', [nit, mes, anio]);
        const [sujetos] = await pool.query('SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluMesDeclarado = ? AND ComprasSujExcluAnioDeclarado = ? ORDER BY ComprasSujExcluFecha ASC', [nit, mes, anio]);

        limpiarCompras(compras); limpiarVentasCCF(ventasCCF); limpiarVentasCF(ventasCF); limpiarSujetos(sujetos);

        res.json({
            backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() },
            data: { compras, ventas_cf: ventasCF, ventas_ccf: ventasCCF, sujetos_excluidos: sujetos }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// 2. IMPORTACIÓN MASIVA
// ==========================================
export const importarTodoJSON = async (req, res) => {
    const info = req.body.backup_info || req.body.encabezado;
    const dataToImport = req.body.data || req.body.modulos;
    const nitDeclarante = info?.nit || info?.nit_declarante;

    if (!nitDeclarante || !dataToImport) {
        return res.status(400).json({ message: "Error: Estructura JSON no reconocida o NIT faltante." });
    }

    const connection = await pool.getConnection();
    const reporte = { compras: 0, ventas_ccf: 0, ventas_cf: 0, sujetos: 0, duplicados: 0, documentos_omitidos: [] };
    const limpiarCat = (val, def) => val ? (val.toString().match(/\d+/) || [def])[0] : def;

    try {
        await connection.beginTransaction();

        const [existeD] = await connection.query('SELECT iddeclaNIT FROM declarante WHERE iddeclaNIT = ?', [nitDeclarante]);
        if (existeD.length === 0) throw new Error(`El declarante ${nitDeclarante} no existe en el sistema.`);

        // 1. COMPRAS
        if (dataToImport.compras?.length) {
            for (const c of dataToImport.compras) {
                await connection.query('INSERT IGNORE INTO proveedor (ProvNIT, ProvNombre) VALUES (?, ?)', [c.proveedor_ProvNIT || '0000', c.ComNomProve || 'Proveedor Importado']);
                const codGen = c.ComCodGeneracion || null;
                const [dup] = await connection.query(`SELECT idcompras FROM compras WHERE iddeclaNIT = ? AND ((ComCodGeneracion = ? AND ComCodGeneracion IS NOT NULL AND ComCodGeneracion != '') OR (REPLACE(ComNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(proveedor_ProvNIT, '-', '') = REPLACE(?, '-', '')))`, [nitDeclarante, codGen, c.ComNumero, c.proveedor_ProvNIT]);

                if (dup.length === 0) {
                    let fovial = parseFloat(c.comFovial) || 0; let cotrans = parseFloat(c.comCotran) || 0; let otro = parseFloat(c.ComOtroAtributo) || 0;
                    const listaTributos = (c.resumen && c.resumen.tributos) ? c.resumen.tributos : (c.tributos || []);
                    if (listaTributos.length > 0) {
                        const tribFovial = listaTributos.find(t => t.codigo === 'D1'); const tribCotrans = listaTributos.find(t => t.codigo === 'C8');
                        if (tribFovial) fovial = parseFloat(tribFovial.valor); if (tribCotrans) cotrans = parseFloat(tribCotrans.valor);
                        if (fovial > 0 || cotrans > 0) otro = parseFloat((fovial + cotrans).toFixed(2));
                    }

                    const nuevaCompra = {
                        iddeclaNIT: nitDeclarante, proveedor_ProvNIT: c.proveedor_ProvNIT, ComNomProve: c.ComNomProve,
                        ComFecha: formatearFecha(c.ComFecha), ComClase: c.ComClase || '4', ComTipo: limpiarCat(c.ComTipo, '03'),
                        ComNumero: c.ComNumero, ComCodGeneracion: codGen, ComIntExe: c.ComIntExe || 0, ComIntGrav: c.ComIntGrav || 0,
                        ComCredFiscal: c.ComCredFiscal || 0, comFovial: fovial, comCotran: cotrans, ComOtroAtributo: otro, ComTotal: c.ComTotal || 0,
                        ComMesDeclarado: c.ComMesDeclarado || 'Importado', ComAnioDeclarado: c.ComAnioDeclarado || new Date().getFullYear().toString(),
                        ComClasiRenta: limpiarCat(c.ComClasiRenta, '1'), ComTipoCostoGasto: limpiarCat(c.ComTipoCostoGasto || c.ComTipoCostoGastoRenta, '2'), 
                        ComTipoOpeRenta: limpiarCat(c.ComTipoOpeRenta, '1'), ComAnexo: '3'
                    };
                    await connection.query('INSERT INTO compras SET ?', nuevaCompra);
                    reporte.compras++;
                } else { reporte.duplicados++; reporte.documentos_omitidos.push(`Compra: ${c.ComNumero || codGen}`); }
            }
        }

        // 2. CRÉDITO FISCAL
        const listaCCF = dataToImport.ventas_ccf || dataToImport.ventas_credito_fiscal || [];
        if (listaCCF.length) {
            for (const v of listaCCF) {
                const codGen = v.FiscCodGeneracion || null;
                const [dup] = await connection.query(`SELECT idCredFiscal FROM credfiscal WHERE iddeclaNIT = ? AND ((FiscCodGeneracion = ? AND FiscCodGeneracion IS NOT NULL AND FiscCodGeneracion != '') OR (REPLACE(FiscNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(FiscNit, '-', '') = REPLACE(?, '-', '')))`, [nitDeclarante, codGen, v.FiscNumDoc, v.FiscNit]);
                if (dup.length === 0) {
                    const nuevoCCF = {
                        iddeclaNIT: nitDeclarante, FiscFecha: formatearFecha(v.FiscFecha), FisClasDoc: v.FisClasDoc || '4', FisTipoDoc: limpiarCat(v.FisTipoDoc, '03'),
                        FiscNumDoc: v.FiscNumDoc, FiscCodGeneracion: codGen, FiscNumContInter: codGen, FiscNit: v.FiscNit, FiscNomRazonDenomi: v.FiscNomRazonDenomi,
                        FiscVtaExen: v.FiscVtaExen || 0, FiscVtaNoSujetas: v.FiscVtaNoSujetas || 0, FiscVtaGravLocal: v.FiscVtaGravLocal || 0, FiscDebitoFiscal: v.FiscDebitoFiscal || 0,
                        FiscTotalVtas: v.FiscTotalVtas || 0, BusFiscTipoOperaRenta: limpiarCat(v.BusFiscTipoOperaRenta, '1'), BusFiscTipoIngresoRenta: limpiarCat(v.BusFiscTipoIngresoRenta, '1'),
                        FiscMesDeclarado: v.FiscMesDeclarado || 'Importado', FiscAnioDeclarado: v.FiscAnioDeclarado || new Date().getFullYear().toString(),
                        FiscNumAnexo: '2'
                    };
                    await connection.query('INSERT INTO credfiscal SET ?', nuevoCCF);
                    reporte.ventas_ccf++;
                } else { reporte.duplicados++; reporte.documentos_omitidos.push(`CCF: ${v.FiscNumDoc || codGen}`); }
            }
        }

        // 3. CONSUMIDOR FINAL
        const listaCF = dataToImport.ventas_cf || dataToImport.ventas_consumidor || [];
        if (listaCF.length) {
            for (const v of listaCF) {
                const codGen = v.ConsCodGeneracion || null;
                const [dup] = await connection.query(`SELECT idconsfinal FROM consumidorfinal WHERE iddeclaNIT = ? AND ((ConsCodGeneracion = ? AND ConsCodGeneracion IS NOT NULL AND ConsCodGeneracion != '') OR (REPLACE(ConsNumDocAL, '-', '') = REPLACE(?, '-', '')))`, [nitDeclarante, codGen, v.ConsNumDocAL || v.ConsNumDocDEL]);
                if (dup.length === 0) {
                    const nuevoCF = {
                        iddeclaNIT: nitDeclarante, ConsFecha: formatearFecha(v.ConsFecha), ConsClaseDoc: v.ConsClaseDoc || '4', ConsTipoDoc: limpiarCat(v.ConsTipoDoc, '01'),
                        ConsNumDocDEL: v.ConsNumDocDEL, ConsNumDocAL: v.ConsNumDocAL || v.ConsNumDocDEL, ConsCodGeneracion: codGen,
                        ConsVtaExentas: v.ConsVtaExentas || 0, ConsVtaNoSujetas: v.ConsVtaNoSujetas || 0, ConsVtaGravLocales: v.ConsVtaGravLocales || 0,
                        ConsTotalVta: v.ConsTotalVta || 0, ConsTipoOpera: limpiarCat(v.ConsTipoOpera, '1'), ConsTipoIngreso: limpiarCat(v.ConsTipoIngreso, '1'),
                        ConsMesDeclarado: v.ConsMesDeclarado || 'Importado', ConsAnioDeclarado: v.ConsAnioDeclarado || new Date().getFullYear().toString(),
                        ConsNumAnexo: '1'
                    };
                    await connection.query('INSERT INTO consumidorfinal SET ?', nuevoCF);
                    reporte.ventas_cf++;
                } else { reporte.duplicados++; reporte.documentos_omitidos.push(`Cons. Final: ${v.ConsNumDocDEL || codGen}`); }
            }
        }

        // 4. SUJETOS EXCLUIDOS
        const listaSujetos = dataToImport.sujetos_excluidos || [];
        if (listaSujetos.length) {
            for (const s of listaSujetos) {
                const codGen = s.ComprasSujExcluCodGeneracion || null;
                const [dup] = await connection.query(`SELECT idComSujExclui FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ((ComprasSujExcluCodGeneracion = ? AND ComprasSujExcluCodGeneracion IS NOT NULL AND ComprasSujExcluCodGeneracion != '') OR (REPLACE(ComprasSujExcluNIT, '-', '') = REPLACE(?, '-', '') AND REPLACE(ComprasSujExcluNumDoc, '-', '') = REPLACE(?, '-', '')))`, [nitDeclarante, codGen, s.ComprasSujExcluNIT, s.ComprasSujExcluNumDoc]);
                if (dup.length === 0) {
                    const nuevoSujeto = {
                        iddeclaNIT: nitDeclarante, ComprasSujExcluNIT: s.ComprasSujExcluNIT, ComprasSujExcluNom: s.ComprasSujExcluNom,
                        ComprasSujExcluFecha: formatearFecha(s.ComprasSujExcluFecha), ComprasSujExcluTipoDoc: limpiarCat(s.ComprasSujExcluTipoDoc, '14'),
                        ComprasSujExcluNumDoc: s.ComprasSujExcluNumDoc, ComprasSujExcluCodGeneracion: codGen, 
                        ComprasSujExcluMontoOpera: s.ComprasSujExcluMontoOpera || 0, ComprasSujExcluMontoReten: s.ComprasSujExcluMontoReten || 0,
                        ComprasSujExcluTipoOpera: limpiarCat(s.ComprasSujExcluTipoOpera, '1'), ComprasSujExcluClasificacion: limpiarCat(s.ComprasSujExcluClasificacion, '2'),
                        ComprasSujExclusector: limpiarCat(s.ComprasSujExclusector, '4'), ComprasSujExcluTipoCostoGast: limpiarCat(s.ComprasSujExcluTipoCostoGast, '2'),
                        ComprasSujExcluMesDeclarado: s.ComprasSujExcluMesDeclarado || 'Importado', ComprasSujExcluAnioDeclarado: s.ComprasSujExcluAnioDeclarado || new Date().getFullYear().toString(),
                        ComprasSujExcluAnexo: '5'
                    };
                    await connection.query('INSERT INTO comprassujexcluidos SET ?', nuevoSujeto);
                    reporte.sujetos++;
                } else { reporte.duplicados++; reporte.documentos_omitidos.push(`Sujeto Exc: ${s.ComprasSujExcluNumDoc || codGen}`); }
            }
        }

        await connection.commit();
        res.json({ message: "Importación finalizada con éxito.", detalle: reporte });

    } catch (e) {
        await connection.rollback();
        res.status(400).json({ message: "Error: " + e.message });
    } finally { connection.release(); }
};
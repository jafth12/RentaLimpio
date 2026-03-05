import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js';

// --- FUNCIONES AUXILIARES ---
const obtenerNumeroMes = (m) => {
    const nombreMes = (m || "").trim();
    const mapa = { 
        "Enero":"01", "Febrero":"02", "Marzo":"03", "Abril":"04", 
        "Mayo":"05", "Junio":"06", "Julio":"07", "Agosto":"08", 
        "Septiembre":"09", "Octubre":"10", "Noviembre":"11", "Diciembre":"12" 
    };
    return mapa[nombreMes] || "01";
};

const formatearFecha = (fecha) => { if (!fecha) return null; return fecha.toString().split('T')[0]; };
const sinGuiones = (texto) => { if (!texto) return ''; return texto.toString().replace(/-/g, ''); };

// 🛡️ FECHA CSV (HACIENDA EXIGE EXACTAMENTE DD/MM/YYYY) - UTC BLINDADO
const formatoFechaCSV = (fechaValor) => {
    if (!fechaValor) return '';
    try {
        let str = fechaValor.toString();
        
        // 1. Buscamos el patrón YYYY-MM-DD
        const matchYYYYMMDD = str.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (matchYYYYMMDD) {
            const anio = matchYYYYMMDD[1];
            const mes = String(matchYYYYMMDD[2]).padStart(2, '0');
            const dia = String(matchYYYYMMDD[3]).padStart(2, '0');
            return `${dia}/${mes}/${anio}`; 
        }
        
        // 2. Buscamos el patrón DD-MM-YYYY
        const matchDDMMYYYY = str.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (matchDDMMYYYY) {
            const dia = String(matchDDMMYYYY[1]).padStart(2, '0');
            const mes = String(matchDDMMYYYY[2]).padStart(2, '0');
            const anio = matchDDMMYYYY[3];
            return `${dia}/${mes}/${anio}`;
        }

        // 3. Respaldo por objeto Date nativo (Usamos UTC para evitar desfases de horario)
        if (fechaValor instanceof Date) {
            const dia = String(fechaValor.getUTCDate()).padStart(2, '0');
            const mes = String(fechaValor.getUTCMonth() + 1).padStart(2, '0');
            const anio = fechaValor.getUTCFullYear();
            return `${dia}/${mes}/${anio}`;
        }
        
        return str; 
    } catch (error) {
        return '';
    }
};

const formatearMontoLibro = (tipoDocumento, monto) => {
    const valorAbsoluto = Math.abs(Number(monto || 0));
    if (tipoDocumento === '05' && valorAbsoluto > 0) {
        return `-${valorAbsoluto.toFixed(2)}`;
    }
    return valorAbsoluto.toFixed(2);
};

// ==========================================
// 🛡️ CONSULTAS SQL UNIFICADAS
// ==========================================
const qCompras = `
    SELECT 
      c.idcompras, c.iddeclaNIT, c.proveedor_ProvNIT, c.ComNomProve, c.ComFecha, 
      c.ComClase, c.ComTipo, c.ComNumero, c.ComCodGeneracion, c.ComIntExe, 
      c.ComInternacioExe, c.ComImpExeNoSujetas, c.ComIntGrav, c.ComInternacGravBienes, 
      c.ComImportGravBienes, c.ComImportGravServicios, c.ComCredFiscal, c.ComOtroAtributo, 
      c.ComTotal, c.ComDuiProve, c.ComTipoOpeRenta, c.ComClasiRenta, c.ComSecNum, 
      c.ComTipoCostoGasto, c.ComMesDeclarado, c.ComAnioDeclarado, c.ComAnexo, 
      c.comCotran, c.comFovial, NULL AS NCNumDocOrigen
    FROM compras c
    LEFT JOIN anuladosextraviados a 
      ON ((a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(c.ComCodGeneracion, '-', '')) OR (a.DetaDocDesde != '' AND a.DetaDocDesde = c.ComNumero)) AND a.iddeclaNIT = c.iddeclaNIT
    WHERE c.iddeclaNIT = ? AND c.ComMesDeclarado = ? AND c.ComAnioDeclarado = ? AND a.idAnuladosExtraviados IS NULL

    UNION ALL

    SELECT 
      nc.idNotaCredito AS idcompras, nc.iddeclaNIT, nc.NCNitContraparte AS proveedor_ProvNIT, 
      nc.NCNombreContraparte AS ComNomProve, nc.NCFecha AS ComFecha, nc.NCClaseDoc AS ComClase, 
      nc.NCTipoDoc AS ComTipo, nc.NCNumero AS ComNumero, nc.NCCodGeneracion AS ComCodGeneracion, 
      nc.NCMontoExento AS ComIntExe, 0.00 AS ComInternacioExe, 0.00 AS ComImpExeNoSujetas, 
      nc.NCMontoGravado AS ComIntGrav, 0.00 AS ComInternacGravBienes, 0.00 AS ComImportGravBienes, 
      0.00 AS ComImportGravServicios, nc.NCIva AS ComCredFiscal, (nc.NCCotran + nc.NCFovial) AS ComOtroAtributo, 
      nc.NCTotal AS ComTotal, NULL AS ComDuiProve, '1' AS ComTipoOpeRenta, '1' AS ComClasiRenta, 
      NULL AS ComSecNum, '2' AS ComTipoCostoGasto, nc.NCMesDeclarado AS ComMesDeclarado, 
      nc.NCAnioDeclarado AS ComAnioDeclarado, nc.NCAnexo AS ComAnexo, 
      nc.NCCotran AS comCotran, nc.NCFovial AS comFovial, nc.NCNumDocOrigen
    FROM notas_credito nc
    LEFT JOIN anuladosextraviados a 
      ON ((a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(nc.NCCodGeneracion, '-', '')) OR (a.DetaDocDesde != '' AND a.DetaDocDesde = nc.NCNumero)) AND a.iddeclaNIT = nc.iddeclaNIT
    WHERE nc.iddeclaNIT = ? AND nc.NCMesDeclarado = ? AND nc.NCAnioDeclarado = ? AND nc.NCTipo = 'COMPRA' AND a.idAnuladosExtraviados IS NULL
    ORDER BY ComFecha ASC
`;

const qVentasCF = `
    SELECT v.* FROM consumidorfinal v
    LEFT JOIN anuladosextraviados a 
      ON ((a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(v.ConsCodGeneracion, '-', '')) OR (a.DetaDocDesde != '' AND a.DetaDocDesde = v.ConsNumDocAL)) AND a.iddeclaNIT = v.iddeclaNIT
    WHERE v.iddeclaNIT = ? AND v.ConsMesDeclarado = ? AND v.ConsAnioDeclarado = ? AND a.idAnuladosExtraviados IS NULL
    ORDER BY v.ConsFecha ASC
`;

const qVentasCCF = `
    SELECT 
      f.idCredFiscal, f.iddeclaNIT, f.FiscFecha, f.FisClasDoc, f.FisTipoDoc, 
      f.FiscNumResol, f.FiscSerieDoc, f.FiscNumDoc, f.FiscCodGeneracion, 
      f.FiscSelloRecepcion, /* 🛡️ AÑADIDO: EXTRAMOS EL SELLO */
      f.FiscNumContInter, f.FiscNit, f.FiscNomRazonDenomi, f.ClienNom, 
      f.FiscVtaExen, f.FiscVtaNoSujetas, f.FiscVtaGravLocal, f.FiscDebitoFiscal, 
      f.FiscVtaCtaTercNoDomici, f.FiscDebFiscVtaCtaTerceros, f.FiscTotalVtas, 
      f.FiscNumDuiClien, f.BusFiscTipoOperaRenta, f.BusFiscTipoIngresoRenta, 
      f.FiscNumAnexo, f.FiscMesDeclarado, f.FiscAnioDeclarado, NULL AS NCNumDocOrigen
    FROM credfiscal f
    LEFT JOIN anuladosextraviados a 
      ON ((a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(f.FiscCodGeneracion, '-', '')) OR (a.DetaDocDesde != '' AND a.DetaDocDesde = f.FiscNumDoc)) AND a.iddeclaNIT = f.iddeclaNIT
    WHERE f.iddeclaNIT = ? AND f.FiscMesDeclarado = ? AND f.FiscAnioDeclarado = ? AND a.idAnuladosExtraviados IS NULL

    UNION ALL

    SELECT 
      nc.idNotaCredito AS idCredFiscal, nc.iddeclaNIT, nc.NCFecha AS FiscFecha, nc.NCClaseDoc AS FisClasDoc, nc.NCTipoDoc AS FisTipoDoc, 
      NULL AS FiscNumResol, NULL AS FiscSerieDoc, nc.NCNumero AS FiscNumDoc, nc.NCCodGeneracion AS FiscCodGeneracion, 
      NULL AS FiscSelloRecepcion, /* 🛡️ AÑADIDO: COMPATIBILIDAD CON NOTAS */
      NULL AS FiscNumContInter, nc.NCNitContraparte AS FiscNit, nc.NCNombreContraparte AS FiscNomRazonDenomi, NULL AS ClienNom, 
      nc.NCMontoExento AS FiscVtaExen, 0.00 AS FiscVtaNoSujetas, nc.NCMontoGravado AS FiscVtaGravLocal, nc.NCIva AS FiscDebitoFiscal, 
      0.00 AS FiscVtaCtaTercNoDomici, 0.00 AS FiscDebFiscVtaCtaTerceros, nc.NCTotal AS FiscTotalVtas, 
      NULL AS FiscNumDuiClien, '1' AS BusFiscTipoOperaRenta, '1' AS BusFiscTipoIngresoRenta, 
      nc.NCAnexo AS FiscNumAnexo, nc.NCMesDeclarado AS FiscMesDeclarado, nc.NCAnioDeclarado AS FiscAnioDeclarado, nc.NCNumDocOrigen
    FROM notas_credito nc
    LEFT JOIN anuladosextraviados a 
      ON ((a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(nc.NCCodGeneracion, '-', '')) OR (a.DetaDocDesde != '' AND a.DetaDocDesde = nc.NCNumero)) AND a.iddeclaNIT = nc.iddeclaNIT
    WHERE nc.iddeclaNIT = ? AND nc.NCMesDeclarado = ? AND nc.NCAnioDeclarado = ? AND nc.NCTipo = 'VENTA' AND a.idAnuladosExtraviados IS NULL
    ORDER BY FiscFecha ASC
`;

const qSujetos = `SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluMesDeclarado = ? AND ComprasSujExcluAnioDeclarado = ? ORDER BY ComprasSujExcluFecha ASC`;

const qRetenciones = `
    SELECT * FROM retenciones 
    WHERE iddeclaNIT = ? AND RetenMesDeclarado = ? AND RetenAnioDeclarado = ? AND RetenNumDoc NOT LIKE '%ANULADO%' 
    ORDER BY RetenFecha ASC
`;

// ==========================================
// 1. EXPORTACIONES INDIVIDUALES JSON (Backup)
// ==========================================
export const exportarCompras = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query(qCompras, [nit, mes, anio, nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() }, data: { compras: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasConsumidor = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query(qVentasCF, [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() }, data: { ventas_cf: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasCredito = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query(qVentasCCF, [nit, mes, anio, nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() }, data: { ventas_ccf: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarSujetos = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query(qSujetos, [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() }, data: { sujetos_excluidos: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarRetenciones = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query(qRetenciones, [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() }, data: { retenciones: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarTodoJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    if (!nit) return res.status(400).json({ message: "NIT requerido." });
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [compras] = await pool.query(qCompras, [nit, mes, anio, nit, mes, anio]);
        const [ventasCCF] = await pool.query(qVentasCCF, [nit, mes, anio, nit, mes, anio]);
        const [ventasCF] = await pool.query(qVentasCF, [nit, mes, anio]);
        const [sujetos] = await pool.query(qSujetos, [nit, mes, anio]);
        const [retenciones] = await pool.query(qRetenciones, [nit, mes, anio]);

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'EXPORTACION JSON', 'TODOS LOS MÓDULOS (BACKUP)', `Periodo: ${mes}/${anio} - NIT: ${nit}`);

        res.json({
            backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() },
            data: { compras, ventas_cf: ventasCF, ventas_ccf: ventasCCF, sujetos_excluidos: sujetos, retenciones }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 0. GENERADOR DEL JSON GENERAL PARA PDF/EXCEL ---
export const generarAnexosHaciendaJSON = async (req, res) => {
    const { nit, mes, anio } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Parámetros obligatorios faltantes." });

    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const nombreEmpresa = declarante[0]?.declarante || 'Empresa No Registrada';
        const mesNum = obtenerNumeroMes(mes);

        const [anexo1] = await pool.query(qVentasCF, [nit, mes, anio]);
        const [anexo2] = await pool.query(qVentasCCF, [nit, mes, anio, nit, mes, anio]);
        const [anexo3] = await pool.query(qCompras, [nit, mes, anio, nit, mes, anio]);
        const [anexo5] = await pool.query(qSujetos, [nit, mes, anio]);
        const [anexo4] = await pool.query(qRetenciones, [nit, mes, anio]);
        const [anexo7] = await pool.query(`SELECT * FROM anuladosextraviados WHERE iddeclaNIT = ? AND AnulMesDeclarado = ? AND AnulAnioDeclarado = ? ORDER BY DetaDocFecha ASC`, [nit, mes, anio]);

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'EXPORTACION REPORTE', 'PDF/EXCEL', `Periodo: ${mes}/${anio} - Empresa: ${nombreEmpresa}`);

        const reporte = {
            identificacion: {
                nit: sinGuiones(nit), razon_social: nombreEmpresa, periodo: `${mesNum}/${anio}`,
                fecha_generacion: new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador' })
            },
            anexo1_consumidor_final: anexo1.map(v => ({
                fecha: v.ConsFecha, clase: v.ConsClaseDoc, tipo: v.ConsTipoDoc,
                resolucion: sinGuiones(v.ConsNumResolu), serie: v.ConsNumSerie || '',
                del: sinGuiones(v.ConsNumDocDEL), al: sinGuiones(v.ConsNumDocAL),
                codigo_generacion: v.ConsCodGeneracion || '', 
                exentas: formatearMontoLibro(v.ConsTipoDoc, v.ConsVtaExentas), 
                gravadas: formatearMontoLibro(v.ConsTipoDoc, v.ConsVtaGravLocales), 
                total: formatearMontoLibro(v.ConsTipoDoc, v.ConsTotalVta)
            })),
            anexo2_credito_fiscal: anexo2.map(v => ({
                fecha: v.FiscFecha, tipo: v.FisTipoDoc, numero: sinGuiones(v.FiscNumDoc),
                codigo_generacion: v.FiscCodGeneracion || '', 
                nit_cliente: sinGuiones(v.FiscNit) || '0000', nrc_cliente: sinGuiones(v.FiscNumContInter) || '0', nombre: v.FiscNomRazonDenomi,
                documento_origen: sinGuiones(v.NCNumDocOrigen) || '',
                exentas: formatearMontoLibro(v.FisTipoDoc, v.FiscVtaExen), 
                gravadas: formatearMontoLibro(v.FisTipoDoc, v.FiscVtaGravLocal),
                debito_fiscal: formatearMontoLibro(v.FisTipoDoc, v.FiscDebitoFiscal), 
                total: formatearMontoLibro(v.FisTipoDoc, v.FiscTotalVtas)
            })),
            anexo3_compras: anexo3.map(c => ({
                fecha: c.ComFecha, clase: c.ComClase, tipo: c.ComTipo, numero: sinGuiones(c.ComNumero),
                codigo_generacion: c.ComCodGeneracion || '', 
                nit_proveedor: sinGuiones(c.proveedor_ProvNIT) || '0000', nombre_proveedor: c.ComNomProve,
                documento_origen: sinGuiones(c.NCNumDocOrigen) || '',
                internas_exentas: formatearMontoLibro(c.ComTipo, c.ComIntExe), 
                internas_gravadas: formatearMontoLibro(c.ComTipo, c.ComIntGrav),
                importaciones_exentas: formatearMontoLibro(c.ComTipo, (parseFloat(c.ComInternacioExe) || 0) + (parseFloat(c.ComImpExeNoSujetas) || 0)),
                importaciones_gravadas: formatearMontoLibro(c.ComTipo, (parseFloat(c.ComInternacGravBienes) || 0) + (parseFloat(c.ComImportGravBienes) || 0) + (parseFloat(c.ComImportGravServicios) || 0)),
                iva_percibido: "0.00", sujetos_excluidos: "0.00", 
                credito_fiscal: formatearMontoLibro(c.ComTipo, c.ComCredFiscal), 
                otros_montos: formatearMontoLibro(c.ComTipo, c.ComOtroAtributo), 
                total: formatearMontoLibro(c.ComTipo, c.ComTotal)
            })),
            anexo4_retenciones: anexo4.map(r => ({
                fecha: r.RetenFecha, nit_agente: sinGuiones(r.RetenNitAgente), 
                documento: sinGuiones(r.RetenNumDoc), codigo_generacion: r.RetenCodGeneracion || '',
                monto_sujeto: Math.abs(Number(r.RetenMontoSujeto || 0)).toFixed(2), 
                monto_retenido: Math.abs(Number(r.RetenMontoDeReten || 0)).toFixed(2)
            })),
            anexo5_sujetos_excluidos: anexo5.map(s => ({
                fecha: s.ComprasSujExcluFecha, nit: sinGuiones(s.ComprasSujExcluNIT), nombre: s.ComprasSujExcluNom,
                documento: sinGuiones(s.ComprasSujExcluNumDoc), 
                codigo_generacion: s.ComprasSujExcluCodGeneracion || '', 
                monto: Math.abs(Number(s.ComprasSujExcluMontoOpera || 0)).toFixed(2), 
                retencion: Math.abs(Number(s.ComprasSujExcluMontoReten || 0)).toFixed(2)
            })),
            anexo7_anulados: anexo7.map(a => ({
                fecha: a.DetaDocFecha,
                tipo_doc: a.DetaDocTipoDoc || '01',
                tipo_deta: a.DetaDocTipoDeta || '1',
                resolucion: sinGuiones(a.DetaDocResolu),
                serie: sinGuiones(a.DetaDocSerie),
                desde: sinGuiones(a.DetaDocDesde),
                hasta: sinGuiones(a.DetaDocHasta),
                codigo_generacion: sinGuiones(a.DetaDocCodGeneracion)
            }))
        };
        res.json(reporte);
    } catch (error) { res.status(500).json({ message: "Error técnico en reportes", error: error.message }); }
};

// ========================================================================
// 🛡️ EXPORTACIÓN CSV ANEXO 1 (CONSUMIDOR FINAL) - CLON APROBADO HACIENDA
// ========================================================================
export const descargarAnexo1CSV = async (req, res) => {
    const { nit, mes, anio } = req.query;
    try {
        const [rows] = await pool.query(qVentasCF, [nit, mes, anio]);
        if (rows.length === 0) return res.status(404).json({ message: "Sin datos operantes para este periodo." });
        
        const csvRows = rows.map(v => {
            const esFisico = v.ConsClaseDoc !== '4';
            let resolucion, serie, del, al, maquina, uuidCol;

            if (esFisico) {
                // 🖨️ FACTURAS FÍSICAS
                resolucion = sinGuiones(v.ConsNumResolu) || '0';
                serie = sinGuiones(v.ConsSerieDoc) || '';
                del = sinGuiones(v.ConsNumDocDEL) || '0';
                al = sinGuiones(v.ConsNumDocAL) || '0';
                maquina = sinGuiones(v.ConsNumMaqRegistro) || '';
                uuidCol = '';
            } else {
                // 🌐 DTEs (CLASE 4)
                const numControlLimpio = sinGuiones(v.ConsNumDocAL) || sinGuiones(v.ConsNumDocDEL);
                const selloLimpio = sinGuiones(v.ConsSelloRecepcion) || sinGuiones(v.ConsCodGeneracion) || numControlLimpio;
                
                resolucion = numControlLimpio;    
                serie = selloLimpio;              
                del = selloLimpio;                
                al = selloLimpio;                 
                maquina = selloLimpio;            
                uuidCol = selloLimpio;            
            }

            const dui = ''; 
            
            const tipoOpera = v.ConsTipoOpera ? String(v.ConsTipoOpera).padStart(2, '0') : '01';
            const tipoIngreso = v.ConsTipoIngreso ? String(v.ConsTipoIngreso).padStart(2, '0') : '01';

            const columnas = [
                formatoFechaCSV(v.ConsFecha),               
                v.ConsClaseDoc || '4',                      
                (v.ConsTipoDoc || "01").padStart(2, '0'),   
                resolucion,                                 
                serie,                                      
                del,                                        
                al,                                         
                maquina,                                    
                uuidCol,                                    
                dui,                                        
                Math.abs(v.ConsVtaExentas).toFixed(2),      
                '0.00',                                     
                '0.00',                                     
                Math.abs(v.ConsVtaGravLocales).toFixed(2),  
                '0.00',                                     
                '0.00',                                     
                '0.00',                                     
                '0.00',                                     
                Math.abs(v.ConsVtaNoSujetas).toFixed(2),    
                Math.abs(v.ConsTotalVta).toFixed(2),        
                tipoOpera,                                  
                tipoIngreso,                                
                '2'                                         
            ];
            return columnas.join(';');
        });
        
        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo1_ConsumidorFinal_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n'));
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// ========================================================================
// 🛡️ EXPORTACIÓN CSV ANEXO 2 (CRÉDITO FISCAL) - CLON APROBADO
// ========================================================================
export const descargarAnexo2CSV = async (req, res) => {
    const { nit, mes, anio } = req.query;
    try {
        const [rows] = await pool.query(qVentasCCF, [nit, mes, anio, nit, mes, anio]);
        if (rows.length === 0) return res.status(404).json({ message: "Sin datos." });
        
        const csvRows = rows.map(v => {
            const esFisico = v.FisClasDoc !== '4';
            let resolucion, serie, numDoc, uuidVal;
            
            const numControlLimpio = sinGuiones(v.FiscNumDoc) || '0';

            if (esFisico) {
                // 🖨️ FÍSICOS: Mantiene formato original
                resolucion = sinGuiones(v.FiscNumResol) || '0';
                serie = sinGuiones(v.FiscSerieDoc) || '0';
                numDoc = numControlLimpio;
                uuidVal = '';
            } else {
                // 🌐 DTEs (CLASE 4) - REGLAS SEGÚN EL CSV APROBADO 
                const selloLimpio = sinGuiones(v.FiscSelloRecepcion) || sinGuiones(v.FiscCodGeneracion) || numControlLimpio;
                
                resolucion = numControlLimpio;    // Col 4: DTE repetido
                serie = selloLimpio;              // Col 5: SELLO
                numDoc = numControlLimpio;        // Col 6: DTE repetido
                uuidVal = numControlLimpio;       // Col 7: DTE repetido
            }

            // 🚨 ELIMINACIÓN DE DUI: Forçado a vazio conforme o modelo aprovado da Fazenda
            const duiClien = '';
            
            // 🚨 HACIENDA ODIA LAS COMILLAS Y SALTOS (Limpeza total)
            const nombreCliente = (v.FiscNomRazonDenomi || "").toUpperCase().replace(/"/g, '').replace(/[\r\n]+/g, ' ').trim();

            const tipoOpera = v.BusFiscTipoOperaRenta ? String(v.BusFiscTipoOperaRenta).padStart(2, '0') : '01';
            const tipoIngreso = v.BusFiscTipoIngresoRenta ? String(v.BusFiscTipoIngresoRenta).padStart(2, '0') : '03';

            const columnas = [
                formatoFechaCSV(v.FiscFecha),                 // 1
                v.FisClasDoc || '4',                          // 2
                (v.FisTipoDoc || "03").padStart(2, '0'),      // 3
                resolucion,                                   // 4
                serie,                                        // 5
                numDoc,                                       // 6
                uuidVal,                                      // 7
                sinGuiones(v.FiscNit),                        // 8
                nombreCliente,                                // 9
                Math.abs(v.FiscVtaExen).toFixed(2),           // 10
                Math.abs(v.FiscVtaNoSujetas).toFixed(2),      // 11
                Math.abs(v.FiscVtaGravLocal).toFixed(2),      // 12
                Math.abs(v.FiscDebitoFiscal).toFixed(2),      // 13
                '0.00',                                       // 14
                '0.00',                                       // 15
                Math.abs(v.FiscTotalVtas).toFixed(2),         // 16
                duiClien,                                     // 17
                tipoOpera,                                    // 18
                tipoIngreso,                                  // 19
                '1'                                           // 20 🛡️ MUDANÇA: Fixo como '1' igual ao modelo aceito
            ];
            return columnas.join(';');
        });
        
        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo2_CreditoFiscal_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n'));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// ========================================================================
// 🛡️ EXPORTACIÓN CSV ANEXO 3 (COMPRAS)
// ========================================================================
export const descargarAnexo3CSV = async (req, res) => {
    const { nit, mes, anio } = req.query;
    try {
        const [rows] = await pool.query(qCompras, [nit, mes, anio, nit, mes, anio]);
        if (rows.length === 0) return res.status(404).json({ message: "Sin datos." });
        
        const csvRows = rows.map(c => {
            const numDoc = sinGuiones(c.ComNumero) || '0';
            const nitProv = sinGuiones(c.proveedor_ProvNIT) || '';
            const duiProv = sinGuiones(c.ComDuiProve) || '';
            const nombreProv = (c.ComNomProve || "").toUpperCase().replace(/"/g, '');

            const exentas = Math.abs(parseFloat(c.ComIntExe) || 0);
            const intExentas = Math.abs(parseFloat(c.ComInternacioExe) || 0);
            const impExentas = Math.abs(parseFloat(c.ComImpExeNoSujetas) || 0);
            const gravadas = Math.abs(parseFloat(c.ComIntGrav) || 0);
            const intGravadas = Math.abs(parseFloat(c.ComInternacGravBienes) || 0);
            const impGravadasB = Math.abs(parseFloat(c.ComImportGravBienes) || 0);
            const impGravadasS = Math.abs(parseFloat(c.ComImportGravServicios) || 0);
            
            const cf = Math.abs(parseFloat(c.ComCredFiscal) || 0).toFixed(2);
            
            const totalHacienda = (exentas + intExentas + impExentas + gravadas + intGravadas + impGravadasB + impGravadasS).toFixed(2);

            const columnas = [
                formatoFechaCSV(c.ComFecha),            
                c.ComClase || '4',                      
                (c.ComTipo || "03").padStart(2, '0'),   
                numDoc,                                 
                nitProv,                                
                nombreProv,                             
                exentas.toFixed(2),                     
                intExentas.toFixed(2),                  
                impExentas.toFixed(2),                  
                gravadas.toFixed(2),                    
                intGravadas.toFixed(2),                 
                impGravadasB.toFixed(2),                
                impGravadasS.toFixed(2),                
                cf,                                     
                totalHacienda,                          
                duiProv,                                
                c.ComTipoOpeRenta || '1',               
                c.ComClasiRenta || '2',                 
                c.ComSecNum || '2',                     
                c.ComTipoCostoGasto || '1',             
                '3'                                     
            ];
            return columnas.join(';');
        });
        
        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo3_Compras_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n')); 

    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// ========================================================================
// 🛡️ EXPORTACIÓN CSV ANEXO 5 (SUJETOS EXCLUIDOS)
// ========================================================================
export const descargarAnexo5CSV = async (req, res) => {
    const { nit, mes, anio } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Faltan parámetros." });

    try {
        const [rows] = await pool.query(qSujetos, [nit, mes, anio]);
        if (rows.length === 0) return res.status(404).json({ message: "No hay registros." });

        const csvRows = rows.map(s => {
            const uuidVal = sinGuiones(s.ComprasSujExcluCodGeneracion) || sinGuiones(s.ComprasSujExcluNumDoc);
            
            const columnas = [
                formatoFechaCSV(s.ComprasSujExcluFecha), s.ComprasSujExcluTipoDoc || '14', sinGuiones(s.ComprasSujExcluNIT),
                s.ComprasSujExcluNom ? `"${s.ComprasSujExcluNom.toUpperCase()}"` : '""',
                sinGuiones(s.ComprasSujExcluSerieDoc), uuidVal,
                Math.abs(Number(s.ComprasSujExcluMontoOpera || 0)).toFixed(2), Math.abs(Number(s.ComprasSujExcluMontoReten || 0)).toFixed(2),
                s.ComprasSujExcluTipoOpera || '1', s.ComprasSujExcluClasificacion || '2',
                s.ComprasSujExclusector || '4', s.ComprasSujExcluTipoCostoGast || '2', s.ComprasSujExcluAnexo || '5'
            ];
            return columnas.join(';');
        });

        // 🚨 CAMBIO APLICADO: latin1 y \r\n
        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo5_SujetosExcluidos_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n'));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// ========================================================================
// 🛡️ EXPORTACIÓN CSV RETENCIONES 1% (CASILLA 162 / F-14) - CLON APROBADO
// ========================================================================
export const exportarRetencionesCSV = async (req, res) => {
    const { mes, anio, nit } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Faltan parámetros." });

    try {
        const [rows] = await pool.query(qRetenciones, [nit, mes, anio]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "No hay retenciones operantes para este periodo." });
        }

        const csvRows = rows.map(r => {
            // 🛡️ ESTRUCTURA EXACTA DE 9 COLUMNAS SEGÚN CASILLA 162
            const nitLimpio = sinGuiones(r.RetenNitAgente);
            const fecha = formatoFechaCSV(r.RetenFecha);
            const tipoDoc = '07';
            
            // Columna 4: UUID o Serie (Pasa tal cual está en la base, con o sin guiones)
            const serieOuuid = r.RetenCodGeneracion || ''; 
            
            // Columna 5: Número de documento (DTE sin guiones)
            const numDocLimpio = sinGuiones(r.RetenNumDoc);
            
            const montoSujeto = Math.abs(Number(r.RetenMontoSujeto || 0)).toFixed(2);
            const montoRetenido = Math.abs(Number(r.RetenMontoDeReten || 0)).toFixed(2);

            const columnas = [
                nitLimpio,        // 1. NIT Agente (Sin guiones)
                fecha,            // 2. Fecha (DD/MM/YYYY)
                tipoDoc,          // 3. Tipo (07)
                serieOuuid,       // 4. Serie o UUID 
                numDocLimpio,     // 5. Número de Comprobante (DTE)
                montoSujeto,      // 6. Monto Sujeto
                montoRetenido,    // 7. Monto Retenido (1%)
                '',               // 8. Vacío
                '7'               // 9. Número Fijo (7 para Casilla 162)
            ];
            return columnas.join(';');
        });

        // 🚨 CODIFICACIÓN LATIN1 Y SALTO DE LÍNEA WINDOWS (\r\n)
        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Retenciones_Casilla162_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n'));

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ========================================================================
// 🛡️ EXPORTACIÓN CSV ANEXO 7 (ANULADOS Y EXTRAVIADOS) - FORMATO EXACTO 8 COLUMNAS
// ========================================================================
export const exportarAnuladosCSV = async (req, res) => {
    const { mes, anio, nit } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Faltan parámetros." });

    try {
        const [rows] = await pool.query(`SELECT * FROM anuladosextraviados WHERE iddeclaNIT = ? AND AnulMesDeclarado = ? AND AnulAnioDeclarado = ? ORDER BY DetaDocFecha ASC`, [nit, mes, anio]);

        if (rows.length === 0) return res.status(404).json({ message: "No hay documentos anulados operantes para este periodo." });

        const csvRows = rows.map(a => {
            // Determinamos si es DTE (4) o Físico (1, 2, etc)
            const claseDoc = a.DetaDocClase || '4';
            const esFisico = claseDoc !== '4';
            
            let resolucion, serie, identificador1, identificador2;

            if (esFisico) {
                // 🖨️ FÍSICOS: Llevan Resolución, Serie y Rangos (Desde / Hasta)
                resolucion = sinGuiones(a.DetaDocNumResolu || a.DetaDocResolu) || '0';
                serie = sinGuiones(a.DetaDocSerie) || '';
                identificador1 = sinGuiones(a.DetaDocDesde) || '0';
                identificador2 = sinGuiones(a.DetaDocHasta) || '0';
            } else {
                // 🌐 DTEs: Resolución y Serie vacíos. Usa Sello y UUID.
                resolucion = ''; 
                serie = '';      
                identificador1 = a.DetaDocSelloRecepcion || ''; // Sello de Recepción
                identificador2 = a.DetaDocCodGeneracion || '';  // UUID (Mantiene los guiones)
            }

            const tipoDoc = (a.DetaDocTipo || a.DetaDocTipoDoc || "01").padStart(2, '0');
            const anexoRelacionado = a.DetaDocAnexo || '1';

            // 🛡️ ESTRUCTURA EXACTA DE 8 COLUMNAS
            const columnas = [
                formatoFechaCSV(a.DetaDocFecha), // 1 (A). Fecha
                claseDoc,                        // 2 (B). Clase (1 o 4)
                tipoDoc,                         // 3 (C). Tipo de Documento (01, 03, etc.)
                resolucion,                      // 4 (D). Resolución (Vacío en DTE)
                serie,                           // 5 (E). Serie (Vacío en DTE)
                identificador1,                  // 6 (F). Sello Recepción (DTE) / Número Desde (Físico)
                identificador2,                  // 7 (G). UUID (DTE) / Número Hasta (Físico)
                anexoRelacionado                 // 8 (H). Anexo Original (1, 2 o 3)
            ];
            return columnas.join(';');
        });

        // 🚨 CODIFICACIÓN LATIN1 Y SALTO DE LÍNEA WINDOWS (\r\n)
        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo7_Anulados_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n'));

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const exportarAnuladosJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query(`SELECT * FROM anuladosextraviados WHERE iddeclaNIT = ? AND AnulMesDeclarado = ? AND AnulAnioDeclarado = ? ORDER BY DetaDocFecha ASC`, [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() }, data: { anulados: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
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
      f.FiscSelloRecepcion, /* 🛡️ AÑADIDO: EXTRAEMOS EL SELLO */
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
// 🛡️ EXPORTACIÓN CSV ANEXO 1 (CONSUMIDOR FINAL)
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
                resolucion = sinGuiones(v.ConsNumResolu) || '0';
                serie = sinGuiones(v.ConsSerieDoc) || '';
                del = sinGuiones(v.ConsNumDocDEL) || '0';
                al = sinGuiones(v.ConsNumDocAL) || '0';
                maquina = sinGuiones(v.ConsNumMaqRegistro) || '';
                uuidCol = '';
            } else {
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
                '0.00', '0.00',                                     
                Math.abs(v.ConsVtaGravLocales).toFixed(2),  
                '0.00', '0.00', '0.00', '0.00',                                     
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
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// ========================================================================
// 🛡️ EXPORTACIÓN CSV ANEXO 2 (CRÉDITO FISCAL)
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
                resolucion = sinGuiones(v.FiscNumResol) || '0';
                serie = sinGuiones(v.FiscSerieDoc) || '0';
                numDoc = numControlLimpio;
                uuidVal = '';
            } else {
                const selloLimpio = sinGuiones(v.FiscSelloRecepcion) || sinGuiones(v.FiscCodGeneracion) || numControlLimpio;
                resolucion = numControlLimpio;    
                serie = selloLimpio;              
                numDoc = numControlLimpio;        
                uuidVal = numControlLimpio;       
            }

            const duiClien = '';
            const nombreCliente = (v.FiscNomRazonDenomi || "").toUpperCase().replace(/"/g, '').replace(/[\r\n]+/g, ' ').trim();
            const tipoOpera = v.BusFiscTipoOperaRenta ? String(v.BusFiscTipoOperaRenta).padStart(2, '0') : '01';
            const tipoIngreso = v.BusFiscTipoIngresoRenta ? String(v.BusFiscTipoIngresoRenta).padStart(2, '0') : '03';

            const columnas = [
                formatoFechaCSV(v.FiscFecha),                 
                v.FisClasDoc || '4',                          
                (v.FisTipoDoc || "03").padStart(2, '0'),      
                resolucion,                                   
                serie,                                        
                numDoc,                                       
                uuidVal,                                      
                sinGuiones(v.FiscNit),                        
                nombreCliente,                                
                Math.abs(v.FiscVtaExen).toFixed(2),           
                Math.abs(v.FiscVtaNoSujetas).toFixed(2),      
                Math.abs(v.FiscVtaGravLocal).toFixed(2),      
                Math.abs(v.FiscDebitoFiscal).toFixed(2),      
                '0.00', '0.00',                                       
                Math.abs(v.FiscTotalVtas).toFixed(2),         
                duiClien,                                     
                tipoOpera,                                    
                tipoIngreso,                                  
                '1'                                           
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
                numDoc, nitProv, nombreProv,                             
                exentas.toFixed(2), intExentas.toFixed(2), impExentas.toFixed(2),                  
                gravadas.toFixed(2), intGravadas.toFixed(2),                 
                impGravadasB.toFixed(2), impGravadasS.toFixed(2),                
                cf, totalHacienda, duiProv,                                
                c.ComTipoOpeRenta || '1', c.ComClasiRenta || '2',                 
                c.ComSecNum || '2', c.ComTipoCostoGasto || '1',             
                '3'                                     
            ];
            return columnas.join(';');
        });
        
        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo3_Compras_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n')); 
    } catch (error) { res.status(500).json({ error: error.message }); }
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

        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo5_SujetosExcluidos_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n'));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// ========================================================================
// 🛡️ EXPORTACIÓN CSV RETENCIONES 1% (CASILLA 162 / F-14)
// ========================================================================
export const exportarRetencionesCSV = async (req, res) => {
    const { mes, anio, nit } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Faltan parámetros." });

    try {
        const [rows] = await pool.query(qRetenciones, [nit, mes, anio]);
        if (rows.length === 0) return res.status(404).json({ message: "No hay retenciones operantes para este periodo." });

        const csvRows = rows.map(r => {
            const nitLimpio = sinGuiones(r.RetenNitAgente);
            const fecha = formatoFechaCSV(r.RetenFecha);
            const tipoDoc = '07';
            const serieOuuid = r.RetenCodGeneracion || ''; 
            const numDocLimpio = sinGuiones(r.RetenNumDoc);
            const montoSujeto = Math.abs(Number(r.RetenMontoSujeto || 0)).toFixed(2);
            const montoRetenido = Math.abs(Number(r.RetenMontoDeReten || 0)).toFixed(2);

            const columnas = [ nitLimpio, fecha, tipoDoc, serieOuuid, numDocLimpio, montoSujeto, montoRetenido, '', '7' ];
            return columnas.join(';');
        });

        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Retenciones_Casilla162_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n'));
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

// ========================================================================
// 🛡️ EXPORTACIÓN CSV ANEXO 7 (ANULADOS Y EXTRAVIADOS)
// ========================================================================
export const exportarAnuladosCSV = async (req, res) => {
    const { mes, anio, nit } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Faltan parámetros." });

    try {
        const [rows] = await pool.query(`SELECT * FROM anuladosextraviados WHERE iddeclaNIT = ? AND AnulMesDeclarado = ? AND AnulAnioDeclarado = ? ORDER BY DetaDocFecha ASC`, [nit, mes, anio]);
        if (rows.length === 0) return res.status(404).json({ message: "No hay documentos anulados operantes para este periodo." });

        const csvRows = rows.map(a => {
            const claseDoc = a.DetaDocClase || '4';
            const esFisico = claseDoc !== '4';
            const tipoDoc = (a.DetaDocTipo || a.DetaDocTipoDoc || "01").padStart(2, '0');
            
            let resolucion, serie, uuid_gen, tipoDetalle;

            if (esFisico) {
                resolucion = sinGuiones(a.DetaDocNumResolu || a.DetaDocResolu) || '0';
                serie = sinGuiones(a.DetaDocSerie) || '';
                uuid_gen = ''; 
                tipoDetalle = a.DetaDocTipoDeta || '1'; 
            } else {
                resolucion = sinGuiones(a.DetaDocDesde);       
                serie = sinGuiones(a.DetaDocSelloRecepcion);   
                uuid_gen = sinGuiones(a.DetaDocCodGeneracion); 
                tipoDetalle = '4';                             
            }

            const columnas = [ resolucion, claseDoc, tipoDoc, tipoDetalle, serie, uuid_gen ];
            return columnas.join(';');
        });

        res.setHeader('Content-Type', 'text/csv; charset=latin1');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo7_Anulados_${mes}_${anio}.csv"`);
        res.status(200).send(csvRows.join('\r\n'));
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

export const exportarAnuladosJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [rows] = await pool.query(`SELECT * FROM anuladosextraviados WHERE iddeclaNIT = ? AND AnulMesDeclarado = ? AND AnulAnioDeclarado = ? ORDER BY DetaDocFecha ASC`, [nit, mes, anio]);
        res.json({ backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() }, data: { anulados: rows } });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// 2. IMPORTACIÓN MASIVA INTELIGENTE (CON EXTRACCIÓN DE SELLO DE RECEPCIÓN)
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

    const mesesArray = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const extraerMes = (fechaIso, mesOriginal) => {
        if (mesOriginal && mesOriginal !== 'Importado') return mesOriginal;
        if (!fechaIso) return 'Enero';
        const partes = fechaIso.split('T')[0].split('-');
        if (partes.length < 2) return 'Enero';
        const m = parseInt(partes[1], 10);
        return mesesArray[m - 1] || 'Enero';
    };

    const extraerAnio = (fechaIso, anioOriginal) => {
        if (anioOriginal && anioOriginal !== 'Importado') return anioOriginal.toString();
        if (!fechaIso) return new Date().getFullYear().toString();
        return fechaIso.split('T')[0].split('-')[0];
    };

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

        // 2. CRÉDITO FISCAL (CON EXTRACCIÓN DE SELLO DE RECEPCIÓN)
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
                            FiscNumDoc: v.FiscNumDoc, FiscCodGeneracion: codGen, 
                            FiscSelloRecepcion: v.FiscSelloRecepcion || null, // 🛡️ EXTRACCIÓN DEL SELLO AQUÍ
                            FiscNumContInter: codGen || v.FiscNumContInter || null, FiscNit: v.FiscNit, 
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

        // 3. CONSUMIDOR FINAL (CON EXTRACCIÓN DE SELLO DE RECEPCIÓN)
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
                            ConsSelloRecepcion: v.ConsSelloRecepcion || null, // 🛡️ EXTRACCIÓN DEL SELLO AQUÍ
                            ConsVtaExentas: v.ConsVtaExentas || 0, ConsVtaNoSujetas: v.ConsVtaNoSujetas || 0, ConsVtaGravLocales: v.ConsVtaGravLocales || 0,
                            ConsTotalVta: v.ConsTotalVta || 0, ConsTipoOpera: limpiarCat(v.ConsTipoOpera, '1'), ConsTipoIngreso: limpiarCat(v.ConsTipoIngreso, '1'),
                            ConsMesDeclarado: extraerMes(v.ConsFecha, v.ConsMesDeclarado), ConsAnioDeclarado: extraerAnio(v.ConsFecha, v.ConsAnioDeclarado), ConsNumAnexo: '1',
                            ConsNomRazonCliente: v.ConsNomRazonCliente || 'Cliente General',
                            ConsNumDocIdentCliente: v.ConsNumDocIdentCliente || ''
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
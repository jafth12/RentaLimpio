import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js';

// --- FUNCIONES AUXILIARES ---
const obtenerNumeroMes = (m) => {
    const mapa = {
        "Enero":"01", "Febrero":"02", "Marzo":"03", "Abril":"04", "Mayo":"05", "Junio":"06",
        "Julio":"07", "Agosto":"08", "Septiembre":"09", "Octubre":"10", "Noviembre":"11", "Diciembre":"12"
    };
    return mapa[m] || "01";
};

// Tijera para evitar el error de MySQL "Incorrect date value"
const formatearFecha = (fecha) => {
    if (!fecha) return null;
    return fecha.toString().split('T')[0];
};

const sinGuiones = (texto) => {
    if (!texto) return '';
    return texto.toString().replace(/-/g, '');
};

// ==========================================
// 1. EXPORTACIONES INDIVIDUALES JSON (Backup)
// ==========================================
export const exportarCompras = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ? ORDER BY ComFecha ASC', [nit, mes, anio]);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasConsumidor = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query('SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND MONTH(ConsFecha) = ? AND YEAR(ConsFecha) = ? ORDER BY ConsFecha ASC', [nit, obtenerNumeroMes(mes), anio]);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasCredito = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND MONTH(FiscFecha) = ? AND YEAR(FiscFecha) = ? ORDER BY FiscFecha ASC', [nit, obtenerNumeroMes(mes), anio]);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarSujetos = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query('SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND MONTH(ComprasSujExcluFecha) = ? AND YEAR(ComprasSujExcluFecha) = ? ORDER BY ComprasSujExcluFecha ASC', [nit, obtenerNumeroMes(mes), anio]);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarTodoJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    if (!nit) return res.status(400).json({ message: "Se requiere NIT para el backup." });

    try {
        const [declarante] = await pool.query('SELECT * FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const mesNum = obtenerNumeroMes(mes);
        const [compras] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ? ORDER BY ComFecha ASC', [nit, mes, anio]);
        const [ventasCCF] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND MONTH(FiscFecha) = ? AND YEAR(FiscFecha) = ? ORDER BY FiscFecha ASC', [nit, mesNum, anio]);
        const [ventasCF] = await pool.query('SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND MONTH(ConsFecha) = ? AND YEAR(ConsFecha) = ? ORDER BY ConsFecha ASC', [nit, mesNum, anio]);
        const [sujetos] = await pool.query('SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND MONTH(ComprasSujExcluFecha) = ? AND YEAR(ComprasSujExcluFecha) = ? ORDER BY ComprasSujExcluFecha ASC', [nit, mesNum, anio]);

        // 🛡️ SENSOR: AUDITORÍA EXPORTACIÓN JSON
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'EXPORTACION JSON', 'TODOS LOS MÓDULOS (BACKUP)', `Periodo: ${mes}/${anio} - NIT: ${nit}`);

        res.json({
            backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() },
            data: { compras, ventas_cf: ventasCF, ventas_ccf: ventasCCF, sujetos_excluidos: sujetos }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};


// --- 0. GENERADOR DEL JSON GENERAL DE HACIENDA (F-07) ---
export const generarAnexosHaciendaJSON = async (req, res) => {
    const { nit, mes, anio } = req.query;

    if (!nit || !mes || !anio) {
        return res.status(400).json({ message: "Auditoría: NIT, Mes y Año son obligatorios." });
    }

    try {
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const nombreEmpresa = declarante[0]?.declarante || 'Empresa No Registrada';
        const mesNum = obtenerNumeroMes(mes);
        const filtroFecha = `${anio}-${mesNum}`; 

        const [anexo1] = await pool.query(`SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsFecha LIKE ? ORDER BY ConsFecha ASC`, [nit, `${filtroFecha}%`]);
        const [anexo2] = await pool.query(`SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscFecha LIKE ? ORDER BY FiscFecha ASC`, [nit, `${filtroFecha}%`]);
        const [anexo3] = await pool.query(`SELECT * FROM compras WHERE iddeclaNIT = ? AND ComFecha LIKE ? ORDER BY ComFecha ASC`, [nit, `${filtroFecha}%`]);
        const [anexo5] = await pool.query(`SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluFecha LIKE ? ORDER BY ComprasSujExcluFecha ASC`, [nit, `${filtroFecha}%`]);

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'EXPORTACION JSON', 'F-07 HACIENDA', `Periodo: ${mes}/${anio} - Empresa: ${nombreEmpresa}`);

        const reporteHacienda = {
            identificacion: {
                nit: sinGuiones(nit), razon_social: nombreEmpresa, periodo: `${mesNum}/${anio}`,
                fecha_generacion: new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador' })
            },
            anexo1_consumidor_final: anexo1.map(v => ({
                fecha: v.ConsFecha, clase: v.ConsClaseDoc, tipo: v.ConsTipoDoc,
                resolucion: sinGuiones(v.ConsNumResolu), serie: v.ConsNumSerie || '',
                del: sinGuiones(v.ConsNumDocDEL), al: sinGuiones(v.ConsNumDocAL),
                exentas: Number(v.ConsVtaExentas || 0).toFixed(2), gravadas: Number(v.ConsVtaGravLocales || 0).toFixed(2), total: Number(v.ConsTotalVta || 0).toFixed(2)
            })),
            anexo2_credito_fiscal: anexo2.map(v => ({
                fecha: v.FiscFecha, tipo: v.FisTipoDoc, numero: sinGuiones(v.FiscNumDoc),
                nit_cliente: sinGuiones(v.FiscNit) || '0000', nrc_cliente: sinGuiones(v.FiscNumContInter) || '0', nombre: v.FiscNomRazonDenomi,
                exentas: Number(v.FiscVtaExenta || 0).toFixed(2), gravadas: Number(v.FiscVtaGravLocal || 0).toFixed(2),
                debito_fiscal: Number(v.FiscDebitoFiscal || 0).toFixed(2), total: Number(v.FiscTotalVtas || 0).toFixed(2)
            })),
            anexo3_compras: anexo3.map(c => ({
                fecha: c.ComFecha, clase: c.ComClase, tipo: c.ComTipo, numero: sinGuiones(c.ComNumero),
                nit_proveedor: sinGuiones(c.proveedor_ProvNIT) || '0000', nombre_proveedor: c.ComNomProve,
                internas_exentas: Number(c.ComIntExe || 0).toFixed(2), 
                internas_gravadas: Number(c.ComIntGrav || 0).toFixed(2),
                // 🛡️ AQUÍ VAN LAS NUEVAS COLUMNAS MAPDEADAS:
                importaciones_exentas: Number((parseFloat(c.ComInternacioExe) || 0) + (parseFloat(c.ComImpExeNoSujetas) || 0)).toFixed(2),
                importaciones_gravadas: Number((parseFloat(c.ComInternacGravBienes) || 0) + (parseFloat(c.ComImportGravBienes) || 0) + (parseFloat(c.ComImportGravServicios) || 0)).toFixed(2),
                iva_percibido: "0.00", 
                sujetos_excluidos: "0.00",
                credito_fiscal: Number(c.ComCredFiscal || 0).toFixed(2), 
                total: Number(c.ComTotal || 0).toFixed(2)
            })),
            anexo5_sujetos_excluidos: anexo5.map(s => ({
                fecha: s.ComprasSujExcluFecha, nit: sinGuiones(s.ComprasSujExcluNIT), nombre: s.ComprasSujExcluNom,
                documento: sinGuiones(s.ComprasSujExcluNumDoc), monto: Number(s.ComprasSujExcluMontoOpera || 0).toFixed(2), retencion: Number(s.ComprasSujExcluMontoReten || 0).toFixed(2)
            }))
        };
        res.json(reporteHacienda);
    } catch (error) {
        res.status(500).json({ message: "Error técnico al generar reporte fiscal", error: error.message });
    }
};

// --- 1. GENERADOR DEL CSV ANEXO 1 (CONSUMIDOR FINAL) ---
export const descargarAnexo1CSV = async (req, res) => {
    const { nit, mes, anio } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Faltan parámetros." });

    try {
        const mesNum = obtenerNumeroMes(mes);
        const filtroFecha = `${anio}-${mesNum}`;
        const [rows] = await pool.query('SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsFecha LIKE ? ORDER BY ConsFecha ASC', [nit, `${filtroFecha}%`]);

        if (rows.length === 0) return res.status(404).json({ message: "No hay registros." });

        // 🛡️ ORDENAMIENTO ASCENDENTE (Menor a Mayor)
        rows.sort((a, b) => new Date(a.ConsFecha) - new Date(b.ConsFecha));

        const csvRows = rows.map(v => {
            const d = new Date(v.ConsFecha);
            const fechaLimpia = d.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            let claseDoc = v.ConsClaseDoc;
            if (!claseDoc || claseDoc.toString().toUpperCase() === 'DTE') claseDoc = '4';

            const limpiarCod = (t) => t ? (t.toString().match(/\d+/) || ["1"])[0] : "1";

            const columnas = [
                fechaLimpia,                                              // 1
                claseDoc,                                                // 2
                limpiarCod(v.ConsTipoDoc),                                // 3
                '',                                                      // 4. NumResol (vacio en DTE)
                '',                                                      // 5. Serie (vacio en DTE)
                sinGuiones(v.ConsCodGeneracion),                          // 6. UUID Interno
                sinGuiones(v.ConsCodGeneracion),                          // 7. UUID Externo
                sinGuiones(v.ConsNumDocDEL),                              // 8. DTE DEL
                sinGuiones(v.ConsNumDocAL),                               // 9. DTE AL
                sinGuiones(v.ConsNumMaqRegistro),                         // 10
                (parseFloat(v.ConsVtaExentas) || 0).toFixed(2),           // 11
                (parseFloat(v.ConsVtaIntExenNoSujProporcio) || 0).toFixed(2), // 12
                (parseFloat(v.ConsVtaNoSujetas) || 0).toFixed(2),         // 13
                (parseFloat(v.ConsVtaGravLocales) || 0).toFixed(2),       // 14
                (parseFloat(v.ConsExpDentAreaCA) || 0).toFixed(2),        // 15
                (parseFloat(v.ConsExpFueraAreaCA) || 0).toFixed(2),       // 16
                (parseFloat(v.ConsExpServicios) || 0).toFixed(2),         // 17
                (parseFloat(v.ConsVtaZonaFrancasDPA) || 0).toFixed(2),    // 18
                (parseFloat(v.ConsVtaCtaTercNoDomici) || 0).toFixed(2),   // 19
                (parseFloat(v.ConsTotalVta) || 0).toFixed(2),             // 20
                limpiarCod(v.ConsTipoOpera),                              // 21
                limpiarCod(v.ConsTipoIngreso),                            // 22
                v.ConsNumAnexo || '1'                                     // 23
            ];
            return columnas.join(';');
        });

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'EXPORTACION CSV', 'CONSUMIDOR FINAL (ANEXO 1)', `Periodo: ${mes}/${anio} - NIT: ${nit}`);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo1_ConsumidorFinal_${mes}_${anio}.csv"`);
        res.status(200).send('\uFEFF' + csvRows.join('\n'));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- 2. GENERADOR DEL CSV ANEXO 2 (CRÉDITO FISCAL) ---
export const descargarAnexo2CSV = async (req, res) => {
    const { nit, mes, anio } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Faltan parámetros." });

    try {
        const mesNum = obtenerNumeroMes(mes);
        const filtroFecha = `${anio}-${mesNum}`;
        const [rows] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscFecha LIKE ? ORDER BY FiscFecha ASC', [nit, `${filtroFecha}%`]);

        if (rows.length === 0) return res.status(404).json({ message: "No hay registros." });

        // 🛡️ ORDENAMIENTO ASCENDENTE (Menor a Mayor)
        rows.sort((a, b) => new Date(a.FiscFecha) - new Date(b.FiscFecha));

        const csvRows = rows.map(v => {
            const d = new Date(v.FiscFecha);
            const fechaLimpia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            const columnas = [
                fechaLimpia,
                v.FisClasDoc || '4',
                parseInt(v.FisTipoDoc || '03', 10),
                sinGuiones(v.FiscNumResol),
                sinGuiones(v.FiscSerieDoc),
                sinGuiones(v.FiscNumDoc),
                sinGuiones(v.FiscNumContInter),
                sinGuiones(v.FiscNit),
                v.FiscNomRazonDenomi ? `"${v.FiscNomRazonDenomi.toUpperCase()}"` : '""',
                Number(v.FiscVtaExen || 0).toFixed(2),
                Number(v.FiscVtaNoSujetas || 0).toFixed(2),
                Number(v.FiscVtaGravLocal || 0).toFixed(2),
                Number(v.FiscDebitoFiscal || 0).toFixed(2),
                Number(v.FiscVtaCtaTercNoDomici || 0).toFixed(2),
                Number(v.FiscDebFiscVtaCtaTerceros || 0).toFixed(2),
                Number(v.FiscTotalVtas || 0).toFixed(2),
                v.BusFiscTipoOperaRenta || '1',
                v.BusFiscTipoIngresoRenta || '1',
                v.FiscNumAnexo || '2'
            ];
            return columnas.join(';');
        });

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'EXPORTACION CSV', 'CREDITO FISCAL (ANEXO 2)', `Periodo: ${mes}/${anio} - NIT: ${nit}`);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo2_CreditoFiscal_${mes}_${anio}.csv"`);
        res.status(200).send('\uFEFF' + csvRows.join('\n'));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- 3. GENERADOR DEL ARCHIVO CSV DE COMPRAS (ANEXO 3) ---
export const descargarAnexo3CSV = async (req, res) => {
    const { nit, mes, anio } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Faltan parámetros (NIT, Mes, Año)." });

    try {
        const mesNum = obtenerNumeroMes(mes);
        const filtroFecha = `${anio}-${mesNum}`;
        const [rows] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComFecha LIKE ? ORDER BY ComFecha ASC', [nit, `${filtroFecha}%`]);

        if (rows.length === 0) return res.status(404).json({ message: "No hay compras registradas para este periodo." });

        // 🛡️ ORDENAMIENTO ASCENDENTE (Menor a Mayor)
        rows.sort((a, b) => new Date(a.ComFecha) - new Date(b.ComFecha));

        const csvRows = rows.map(c => {
            const d = new Date(c.ComFecha);
            const fechaLimpia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            const numDocLimpio = sinGuiones(c.ComCodGeneracion) || sinGuiones(c.ComNumero);
            const nombreProv = c.ComNomProve ? `"${c.ComNomProve.toUpperCase()}"` : '""';

            const sumBase = (parseFloat(c.ComIntGrav) || 0) + (parseFloat(c.ComInternacGravBienes) || 0) +
                (parseFloat(c.ComImportGravBienes) || 0) + (parseFloat(c.ComImportGravServicios) || 0) +
                (parseFloat(c.ComIntExe) || 0) + (parseFloat(c.ComInternacioExe) || 0) + (parseFloat(c.ComImpExeNoSujetas) || 0);

            const columnas = [
                fechaLimpia,                                          
                c.ComClase || '4',                                    
                parseInt(c.ComTipo || '03', 10),                      
                numDocLimpio,                                               
                sinGuiones(c.proveedor_ProvNIT),                                            
                nombreProv,                                           
                (parseFloat(c.ComIntExe) || 0).toFixed(2),                       
                (parseFloat(c.ComInternacioExe) || 0).toFixed(2),                
                0,                                                    
                (parseFloat(c.ComIntGrav) || 0).toFixed(2),                      
                (parseFloat(c.ComInternacGravBienes) || 0).toFixed(2),           
                (parseFloat(c.ComImportGravBienes) || 0).toFixed(2),             
                (parseFloat(c.ComImportGravServicios) || 0).toFixed(2),          
                (parseFloat(c.ComCredFiscal) || 0).toFixed(2),                   
                sumBase.toFixed(2),                                   
                '',                                                   
                c.ComClasiRenta || '1',                               
                c.ComTipoCostoGastoRenta || '2',                      
                c.ComTipoOpeRenta || '2',                             
                (parseFloat(c.ComImpExeNoSujetas) || 0) > 0 ? 1 : 1,  
                '3'                                                   
            ];
            return columnas.join(';'); 
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo3_Compras_${mes}_${anio}.csv"`);
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'EXPORTACION CSV', 'COMPRAS (ANEXO 3)', `Periodo: ${mes}/${anio} - NIT: ${nit}`);
        
        res.status(200).send(csvContent);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor' }); }
};

// --- 5. GENERADOR DEL CSV ANEXO 5 (SUJETOS EXCLUIDOS) ---
export const descargarAnexo5CSV = async (req, res) => {
    const { nit, mes, anio } = req.query;
    if (!nit || !mes || !anio) return res.status(400).json({ message: "Faltan parámetros." });

    try {
        const mesNum = obtenerNumeroMes(mes);
        const filtroFecha = `${anio}-${mesNum}`;
        const [rows] = await pool.query('SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluFecha LIKE ? ORDER BY ComprasSujExcluFecha ASC', [nit, `${filtroFecha}%`]);

        if (rows.length === 0) return res.status(404).json({ message: "No hay registros." });

        // 🛡️ ORDENAMIENTO ASCENDENTE (Menor a Mayor)
        rows.sort((a, b) => new Date(a.ComprasSujExcluFecha) - new Date(b.ComprasSujExcluFecha));

        const csvRows = rows.map(s => {
            const d = new Date(s.ComprasSujExcluFecha);
            const fechaLimpia = d.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const columnas = [
                fechaLimpia,
                s.ComprasSujExcluTipoDoc || '14',
                sinGuiones(s.ComprasSujExcluNIT),
                s.ComprasSujExcluNom ? `"${s.ComprasSujExcluNom.toUpperCase()}"` : '""',
                sinGuiones(s.ComprasSujExcluSerieDoc),
                sinGuiones(s.ComprasSujExcluNumDoc),
                Number(s.ComprasSujExcluMontoOpera || 0).toFixed(2),
                Number(s.ComprasSujExcluMontoReten || 0).toFixed(2),
                s.ComprasSujExcluTipoOpera || '1',
                s.ComprasSujExcluClasificacion || '2',
                s.ComprasSujExclusector || '4',
                s.ComprasSujExcluTipoCostoGast || '2',
                s.ComprasSujExcluAnexo || '5'
            ];
            return columnas.join(';');
        });

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'EXPORTACION CSV', 'SUJETOS EXCLUIDOS (ANEXO 5)', `Periodo: ${mes}/${anio} - NIT: ${nit}`);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo5_SujetosExcluidos_${mes}_${anio}.csv"`);
        res.status(200).send('\uFEFF' + csvRows.join('\n'));
    } catch (error) { res.status(500).json({ error: error.message }); }
};
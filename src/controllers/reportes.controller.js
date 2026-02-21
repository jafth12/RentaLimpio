import pool from '../config/db.js';

// --- FUNCIONES AUXILIARES ---
const obtenerNumeroMes = (m) => {
    const mapa = {
        "Enero":"01", "Febrero":"02", "Marzo":"03", "Abril":"04", "Mayo":"05", "Junio":"06",
        "Julio":"07", "Agosto":"08", "Septiembre":"09", "Octubre":"10", "Noviembre":"11", "Diciembre":"12"
    };
    return mapa[m] || "01";
};

// --- 1. GENERADOR DEL JSON GENERAL DE HACIENDA (F-07) ---
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

        const [anexo1] = await pool.query(`SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsFecha LIKE ?`, [nit, `${filtroFecha}%`]);
        const [anexo2] = await pool.query(`SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscFecha LIKE ?`, [nit, `${filtroFecha}%`]);
        const [anexo3] = await pool.query(`SELECT * FROM compras WHERE iddeclaNIT = ? AND ComFecha LIKE ?`, [nit, `${filtroFecha}%`]);
        const [anexo5] = await pool.query(`SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluFecha LIKE ?`, [nit, `${filtroFecha}%`]);

        const reporteHacienda = {
            identificacion: {
                nit: nit, razon_social: nombreEmpresa, periodo: `${mesNum}/${anio}`,
                fecha_generacion: new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador' })
            },
            anexo1_consumidor_final: anexo1.map(v => ({
                fecha: v.ConsFecha, clase: v.ConsClaseDoc, tipo: v.ConsTipoDoc,
                resolucion: v.ConsNumResolu || '', serie: v.ConsNumSerie || '',
                del: v.ConsNumDocDEL, al: v.ConsNumDocAL,
                exentas: Number(v.ConsVtaExentas || 0).toFixed(2), gravadas: Number(v.ConsVtaGravLocales || 0).toFixed(2), total: Number(v.ConsTotalVta || 0).toFixed(2)
            })),
            anexo2_credito_fiscal: anexo2.map(v => ({
                fecha: v.FiscFecha, tipo: v.FisTipoDoc, numero: v.FiscNumDoc,
                nit_cliente: v.FiscNit || '0000', nrc_cliente: v.FiscNumContInter || '0', nombre: v.FiscNomRazonDenomi,
                exentas: Number(v.FiscVtaExenta || 0).toFixed(2), gravadas: Number(v.FiscVtaGravLocal || 0).toFixed(2),
                debito_fiscal: Number(v.FiscDebitoFiscal || 0).toFixed(2), total: Number(v.FiscTotalVtas || 0).toFixed(2)
            })),
            anexo3_compras: anexo3.map(c => ({
                fecha: c.ComFecha, clase: c.ComClase, tipo: c.ComTipo, numero: c.ComNumero,
                nit_proveedor: c.proveedor_ProvNIT || '0000', nombre_proveedor: c.ComNomProve,
                internas_exentas: Number(c.ComIntExe || 0).toFixed(2), internas_gravadas: Number(c.ComIntGrav || 0).toFixed(2),
                credito_fiscal: Number(c.ComCredFiscal || 0).toFixed(2), total: Number(c.ComTotal || 0).toFixed(2)
            })),
            anexo5_sujetos_excluidos: anexo5.map(s => ({
                fecha: s.ComprasSujExcluFecha, nit: s.ComprasSujExcluNIT, nombre: s.ComprasSujExcluNom,
                documento: s.ComprasSujExcluNumDoc, monto: Number(s.ComprasSujExcluMontoOpera || 0).toFixed(2), retencion: Number(s.ComprasSujExcluMontoReten || 0).toFixed(2)
            }))
        };
        res.json(reporteHacienda);
    } catch (error) {
        res.status(500).json({ message: "Error técnico al generar reporte fiscal", error: error.message });
    }
};

// --- 2. GENERADOR DEL ARCHIVO CSV DE COMPRAS (ANEXO 3) ---
export const descargarAnexo3CSV = async (req, res) => {
    const { nit, mes, anio } = req.query;
    
    if (!nit || !mes || !anio) {
        return res.status(400).json({ message: "Faltan parámetros (NIT, Mes, Año)." });
    }

    try {
        const mesNum = obtenerNumeroMes(mes);
        const filtroFecha = `${anio}-${mesNum}`;
        
        const [rows] = await pool.query(
            'SELECT * FROM compras WHERE iddeclaNIT = ? AND ComFecha LIKE ?',
            [nit, `${filtroFecha}%`]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "No hay compras registradas para este periodo." });
        }

        const csvRows = rows.map(c => {
            const d = new Date(c.ComFecha);
            const fechaLimpia = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            
            const codGenLimpio = c.ComCodGeneracion ? c.ComCodGeneracion.replace(/-/g, '') : '';
            const numDoc = codGenLimpio || (c.ComNumero ? c.ComNumero.replace(/-/g, '') : '');

            const sumBase = (parseFloat(c.ComIntGrav) || 0) + (parseFloat(c.ComInternacGravBienes) || 0) +
                (parseFloat(c.ComImportGravBienes) || 0) + (parseFloat(c.ComImportGravServicios) || 0) +
                (parseFloat(c.ComIntExe) || 0) + (parseFloat(c.ComInternacioExe) || 0) + (parseFloat(c.ComImpExeNoSujetas) || 0);

            const columnas = [
                fechaLimpia, c.ComClase || '4', c.ComTipo || '03', numDoc, '', c.proveedor_ProvNIT || '',
                (c.ComNomProve || '').toUpperCase(), (parseFloat(c.ComIntGrav) || 0).toFixed(2),
                (parseFloat(c.ComInternacGravBienes) || 0).toFixed(2), (parseFloat(c.ComImportGravBienes) || 0).toFixed(2),
                (parseFloat(c.ComImportGravServicios) || 0).toFixed(2), (parseFloat(c.ComIntExe) || 0).toFixed(2),
                (parseFloat(c.ComInternacioExe) || 0).toFixed(2), '0.00', (parseFloat(c.ComCredFiscal) || 0).toFixed(2),
                sumBase.toFixed(2), (parseFloat(c.ComImpExeNoSujetas) || 0).toFixed(2), '0.00',
                c.ComTipoOpeRenta || '1', c.ComClasiRenta || '2', '3'
            ];
            return columnas.join(';');
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Anexo3_Compras_${mes}_${anio}.csv"`);
        res.status(200).send(csvContent);

    } catch (error) {
        console.error("Error al exportar CSV:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
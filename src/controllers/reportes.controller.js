import pool from '../config/db.js';

// Función auxiliar
const obtenerNumeroMes = (m) => {
    const mapa = {
        "Enero":"01", "Febrero":"02", "Marzo":"03", "Abril":"04", "Mayo":"05", "Junio":"06",
        "Julio":"07", "Agosto":"08", "Septiembre":"09", "Octubre":"10", "Noviembre":"11", "Diciembre":"12"
    };
    return mapa[m] || "01";
};

export const generarAnexosHaciendaJSON = async (req, res) => {
    const { nit, mes, anio } = req.query;

    if (!nit || !mes || !anio) {
        return res.status(400).json({ message: "Auditoría: NIT, Mes y Año son obligatorios." });
    }

    try {
        // 1. Identidad Fiscal
        const [declarante] = await pool.query('SELECT declarante FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const nombreEmpresa = declarante[0]?.declarante || 'Empresa No Registrada';

        const mesNum = obtenerNumeroMes(mes);
        const filtroFecha = `${anio}-${mesNum}`; // '2026-02'

        // 2. Extracción de Datos
        
        // ANEXO 1: Ventas Consumidor (Filtrado por fecha ISO)
        const [anexo1] = await pool.query(
            `SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsFecha LIKE ?`,
            [nit, `${filtroFecha}%`]
        );

        // ANEXO 2: Crédito Fiscal
        const [anexo2] = await pool.query(
            `SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscFecha LIKE ?`,
            [nit, `${filtroFecha}%`]
        );

        // ANEXO 3: Compras
        // CORRECCIÓN: Usamos 'ComFecha' con LIKE para ser consistentes con las ventas.
        // Si prefieres usar las columnas de mes declarado, asegúrate de enviar mes o mesNum según corresponda.
        // Aquí uso el método más seguro (Fecha real del documento):
        const [anexo3] = await pool.query(
            `SELECT * FROM compras WHERE iddeclaNIT = ? AND ComFecha LIKE ?`,
            [nit, `${filtroFecha}%`]
        );
        /* NOTA: Si prefieres tu método anterior, verifica qué guarda la BD.
           Si la BD guarda '02', usa: ... AND ComMesDeclarado = ? ... [nit, mesNum, anio]
           Si la BD guarda 'Febrero', usa: ... AND ComMesDeclarado = ? ... [nit, mes, anio]
        */

        // ANEXO 5: Sujetos Excluidos
        const [anexo5] = await pool.query(
            `SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluFecha LIKE ?`,
            [nit, `${filtroFecha}%`]
        );

        // 3. Estructura Final
        const reporteHacienda = {
            identificacion: {
                nit: nit,
                razon_social: nombreEmpresa,
                periodo: `${mesNum}/${anio}`,
                // Usamos toLocaleDateString para evitar desfase de zona horaria UTC
                fecha_generacion: new Date().toLocaleString('es-SV', { timeZone: 'America/El_Salvador' })
            },
            anexo1_consumidor_final: anexo1.map(v => ({
                fecha: v.ConsFecha, // Asegura que sea string YYYY-MM-DD
                clase: v.ConsClaseDoc,
                tipo: v.ConsTipoDoc,
                resolucion: v.ConsNumResolu || '',
                serie: v.ConsNumSerie || '',
                del: v.ConsNumDocDEL,
                al: v.ConsNumDocAL,
                exentas: Number(v.ConsVtaExentas || 0).toFixed(2),
                gravadas: Number(v.ConsVtaGravLocales || 0).toFixed(2),
                total: Number(v.ConsTotalVta || 0).toFixed(2)
            })),
            anexo2_credito_fiscal: anexo2.map(v => ({
                fecha: v.FiscFecha,
                tipo: v.FisTipoDoc,
                numero: v.FiscNumDoc,
                nit_cliente: v.FiscNit || '0000',
                nrc_cliente: v.FiscNumContInter || '0',
                nombre: v.FiscNomRazonDenomi,
                exentas: Number(v.FiscVtaExenta || 0).toFixed(2),
                gravadas: Number(v.FiscVtaGravLocal || 0).toFixed(2),
                debito_fiscal: Number(v.FiscDebitoFiscal || 0).toFixed(2),
                total: Number(v.FiscTotalVtas || 0).toFixed(2)
            })),
            anexo3_compras: anexo3.map(c => ({
                fecha: c.ComFecha,
                clase: c.ComClase,
                tipo: c.ComTipo,
                numero: c.ComNumero,
                nit_proveedor: c.proveedor_ProvNIT || '0000',
                nombre_proveedor: c.ComNomProve,
                internas_exentas: Number(c.ComIntExe || 0).toFixed(2),
                internas_gravadas: Number(c.ComIntGrav || 0).toFixed(2),
                credito_fiscal: Number(c.ComCredFiscal || 0).toFixed(2),
                total: Number(c.ComTotal || 0).toFixed(2)
            })),
            anexo5_sujetos_excluidos: anexo5.map(s => ({
                fecha: s.ComprasSujExcluFecha,
                nit: s.ComprasSujExcluNIT,
                nombre: s.ComprasSujExcluNom,
                documento: s.ComprasSujExcluNumDoc,
                monto: Number(s.ComprasSujExcluMontoOpera || 0).toFixed(2),
                retencion: Number(s.ComprasSujExcluMontoReten || 0).toFixed(2)
            }))
        };

        res.json(reporteHacienda);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error técnico al generar reporte fiscal", error: error.message });
    }
};
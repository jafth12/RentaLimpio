import pool from '../config/db.js';

// Función auxiliar (Definida antes para evitar errores de hoisting)
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
        const filtroFecha = `${anio}-${mesNum}`; 

        // 2. Extracción de Datos
        // ANEXO 1: Ventas Consumidor (Filtrado por fecha string YYYY-MM)
        const [anexo1] = await pool.query(
            `SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsFecha LIKE ?`,
            [nit, `${filtroFecha}%`]
        );

        // ANEXO 2: Crédito Fiscal
        const [anexo2] = await pool.query(
            `SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscFecha LIKE ?`,
            [nit, `${filtroFecha}%`]
        );

        // ANEXO 3: Compras (Usa columnas específicas de mes/año)
        const [anexo3] = await pool.query(
            `SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ?`,
            [nit, mes, anio]
        );

        // ANEXO 5: Sujetos Excluidos
        const [anexo5] = await pool.query(
            `SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluFecha LIKE ?`,
            [nit, `${filtroFecha}%`]
        );

        // 3. Estructura Final (Mapeo limpio)
        const reporteHacienda = {
            identificacion: {
                nit: nit,
                razon_social: nombreEmpresa,
                periodo: `${mesNum}/${anio}`,
                fecha_generacion: new Date().toISOString()
            },
            // Mapeamos solo lo necesario para no exponer basura de la BD
            anexo1_consumidor_final: anexo1.map(v => ({
                fecha: v.ConsFecha,
                clase: v.ConsClaseDoc,
                tipo: v.ConsTipoDoc,
                resolucion: v.ConsNumResolu,
                serie: v.ConsNumSerie,
                del: v.ConsNumDocDEL,
                al: v.ConsNumDocAL,
                exentas: v.ConsVtaExentas || 0,
                gravadas: v.ConsVtaGravLocales || 0,
                total: v.ConsTotalVta || 0
            })),
            anexo2_credito_fiscal: anexo2.map(v => ({
                fecha: v.FiscFecha,
                tipo: v.FisTipoDoc,
                numero: v.FiscNumDoc,
                nit_cliente: v.FiscNit,
                nrc_cliente: v.FiscNumContInter,
                nombre: v.FiscNomRazonDenomi,
                exentas: v.FiscVtaExenta || 0,
                gravadas: v.FiscVtaGravLocal || 0,
                debito_fiscal: v.FiscDebitoFiscal || 0,
                total: v.FiscTotalVtas || 0
            })),
            anexo3_compras: anexo3.map(c => ({
                fecha: c.ComFecha,
                clase: c.ComClase,
                tipo: c.ComTipo,
                numero: c.ComNumero,
                nit_proveedor: c.proveedor_ProvNIT,
                nombre_proveedor: c.ComNomProve,
                internas_exentas: c.ComIntExe || 0,
                internas_gravadas: c.ComIntGrav || 0,
                credito_fiscal: c.ComCredFiscal || 0,
                total: c.ComTotal || 0
            })),
            anexo5_sujetos_excluidos: anexo5.map(s => ({
                fecha: s.ComprasSujExcluFecha,
                nit: s.ComprasSujExcluNIT,
                nombre: s.ComprasSujExcluNom,
                documento: s.ComprasSujExcluNumDoc,
                monto: s.ComprasSujExcluMontoOpera || 0,
                retencion: s.ComprasSujExcluMontoReten || 0
            }))
        };

        res.json(reporteHacienda);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error técnico al generar reporte fiscal", error: error.message });
    }
};
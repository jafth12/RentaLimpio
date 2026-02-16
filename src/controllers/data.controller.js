import pool from '../config/db.js';

// --- UTILIDADES ---
const formatearNit = (nit) => {
    const n = nit.replace(/[^0-9]/g, '');
    if (n.length === 14) {
        return `${n.substring(0, 4)}-${n.substring(4, 10)}-${n.substring(10, 13)}-${n.substring(13, 14)}`;
    }
    return nit;
};

const formatearFecha = (fecha) => {
    if (!fecha) return new Date().toISOString().split('T')[0];
    if (fecha.includes('/')) {
        const [dia, mes, anio] = fecha.split('/');
        return `${anio}-${mes}-${dia}`;
    }
    return fecha.substring(0, 10);
};

// --- 1. EXPORTAR TODO (Indispensable para que el servidor arranque) ---
export const exportarTodoJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT * FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [compras] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ?', [nit, mes, anio]);
        
        res.json({
            encabezado: { nit_declarante: nit, nombre: declarante[0]?.declarante, periodo: { mes, anio } },
            modulos: { compras: compras, ventas_consumidor: [], ventas_credito_fiscal: [] }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- 2. IMPORTAR TODO (La lógica del Lector) ---
export const importarTodoJSON = async (req, res) => {
    const data = req.body;
    if (!data || !data.encabezado) return res.status(400).json({ message: 'JSON inválido' });

    const { nit_declarante, periodo } = data.encabezado;
    const nitReal = nit_declarante.replace(/[^0-9]/g, '');

    try {
        const [declarante] = await pool.query('SELECT iddeclaNIT FROM declarante WHERE iddeclaNIT LIKE ?', [`%${nitReal}%`]);
        if (declarante.length === 0) return res.status(404).json({ message: 'Empresa no encontrada en declarante' });

        const nitFinal = declarante[0].iddeclaNIT;
        let reporte = { compras: 0, errores: 0 };

        if (data.modulos?.compras?.length > 0) {
            for (const c of data.modulos.compras) {
                try {
                    await pool.query(`INSERT IGNORE INTO proveedor (ProvNIT, ProvNombre) VALUES (?, ?)`, [c.proveedor_nit, c.proveedor_nombre]);
                    await pool.query(`
                        INSERT INTO compras 
                        (ComFecha, ComTipo, ComNumero, proveedor_ProvNIT, ComNomProve, iddeclaNIT, ComMesDeclarado, ComAnioDeclarado, ComIntGrav, ComCredFiscal, ComTotal, ComClase, ComTipoOpeRenta, ComClasiRenta, ComSecNum, ComTipoCostoGasto)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '4. DOCUMENTO TRIBUTARIO DTE', '1', '1', '1', '1')
                    `, [formatearFecha(c.fecha), c.tipo_doc, c.numero, c.proveedor_nit, c.proveedor_nombre, nitFinal, periodo.mes, periodo.anio, c.valores?.gravado, c.valores?.iva, c.valores?.total]);
                    reporte.compras++;
                } catch (e) { reporte.errores++; }
            }
        }
        res.json({ message: "Importación finalizada", detalle: reporte });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
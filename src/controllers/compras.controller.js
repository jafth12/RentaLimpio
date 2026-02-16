import pool from '../config/db.js';

const obtenerMesDesdeFecha = (fecha) => {
    if (!fecha) return 'Desconocido';
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const numeroMes = parseInt(fecha.split('-')[1]) - 1; 
    return meses[numeroMes] || 'Desconocido';
};

export const getCompras = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT c.*, p.ProvNombre FROM compras c LEFT JOIN proveedor p ON c.proveedor_ProvNIT = p.ProvNIT ORDER BY c.idcompras DESC`);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const createCompra = async (req, res) => {
    const data = req.body;
    const mesFinal = data.mesDeclarado || obtenerMesDesdeFecha(data.fecha);
    const anioFinal = data.anioDeclarado || data.fecha.split('-')[0];
    try {
        const [result] = await pool.query(
            `INSERT INTO compras (ComFecha, ComNumero, proveedor_ProvNIT, ComNomProve, iddeclaNIT, ComMesDeclarado, ComAnioDeclarado, ComIntGrav, ComCredFiscal, ComTotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.fecha, data.numero, data.nitProveedor, data.nombreProveedor, data.iddeclaNIT, mesFinal, anioFinal, data.internasGravadas, data.iva, data.total]
        );
        res.status(201).json({ message: 'Guardado', id: result.insertId });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// ESTA FUNCIÓN FALTABA (SEGÚN TU LOG)
export const updateCompra = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(`UPDATE compras SET ComFecha=?, ComNumero=?, ComIntGrav=?, ComTotal=? WHERE idcompras=?`, [data.fecha, data.numero, data.internasGravadas, data.total, id]);
        res.json({ message: 'Actualizado' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// ESTA FUNCIÓN FALTABA (SEGÚN TU LOG)
export const deleteCompra = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM compras WHERE idcompras = ?', [id]);
        res.json({ message: 'Eliminado' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const exportarComprasJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query(`SELECT * FROM compras WHERE iddeclaNIT=? AND ComMesDeclarado=? AND ComAnioDeclarado=?`, [nit, mes, anio]);
        res.json({ lista_compras: rows });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
import pool from "../config/db.js";

export const getSujetos = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM comprassujexcluidos ORDER BY ComprasSujExcluFecha DESC');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener registros', error: error.message });
    }
};

export const createSujeto = async (req, res) => {
    const {
        fecha, tipoDoc, nit, nombre, serie, numeroDoc,
        monto, retencion,
        tipoOp, clasificacion, sector, costoGasto, anexo
    } = req.body;

    if (!fecha || !nit || !monto) {
        return res.status(400).json({ message: 'Faltan datos obligatorios (Fecha, Nit o Monto)'});
    }
    try {
        const [result] = await pool.query(
            `INSERT INTO comprassujexcluidos 
            (ComprasSujExcluFecha, ComprasSujExcluTipoDoc, ComprasSujExcluNIT, ComprasSujExcluNom, 
             ComprasSujExcluSerieDoc, ComprasSujExcluNumDoc, 
             ComprasSujExcluMontoOpera, ComprasSujExcluMontoReten, 
             ComprasSujExcluTipoOpera, ComprasSujExcluClasificacion, ComprasSujExclusector, 
             ComprasSujExcluTipoCostoGast, ComprasSujExcluAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fecha, tipoDoc, nit, nombre,
                serie, numeroDoc, 
                monto, retencion,
                tipoOp, clasificacion, sector,
                costoGasto, anexo || 5
            ]
        );
        res.status(201).json({ message: 'Sujeto Excluido guardado con exito', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar', error: error.message });
    }
};


export const updateSujeto = async (req, res) => {
    const { id } =req.params;
    const {
        fecha, tipoDoc, nit, nombre, serie, numeroDoc,
        monto, retencion,
        tipoOp, clasificacion, sector, costoGasto, anexo
    } = req.body;
    try {
        const [result] = await pool.query(
            `UPDATE comprassujexcluidos SET 
            ComprasSujExcluFecha = ?, ComprasSujExcluTipoDoc = ?, ComprasSujExcluNIT = ?, ComprasSujExcluNom = ?, 
            ComprasSujExcluSerieDoc = ?, ComprasSujExcluNumDoc = ?, 
            ComprasSujExcluMontoOpera = ?, ComprasSujExcluMontoReten = ?, 
            ComprasSujExcluTipoOpera = ?, ComprasSujExcluClasificacion = ?, ComprasSujExclusector = ?, 
            ComprasSujExcluTipoCostoGast = ?, ComprasSujExcluAnexo = ?
            WHERE idComSujExclui = ?`,
            [
                fecha, tipoDoc, nit, nombre,
                serie, numeroDoc, 
                monto, retencion,
                tipoOp, clasificacion, sector,
                costoGasto, anexo,
                id
            ]
        );
        
        if (result.affectedRows === 0)  return res.status(404).json({ message: 'Registro no encontrado' });
        res.json({ message: 'Actualizado correctamente' });
    } catch (error) {
        return res.status(500).json ({ message: 'Error al actualizar', error: error.message });
    }
};

export const deleteSujeto = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM comprassujexcluidos WHERE idComSujExclui = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado'});
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({message: 'Error al eliminar', error: error.message});
    }
};
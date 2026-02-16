import pool from "../config/db.js";

// Obtener todas las ventas
export const getVentas = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vtagravterdomici ORDER BY VtaGraTerFecha DESC');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener registros', error: error.message });
    }
};

// Crear nueva venta
export const createVenta = async (req, res) => {
    const {
        VtaGraTerNit, VtaGraTerNom, VtaGraTerFecha, LisVtaGraTerTipoDoc,
        VtaGraTerNumSerie, VtaGraTerNumResolu, VtaGraTerNumDoc,
        VtaGraTerMontoOper, VtaGraTerIVAOper,
        VtaGraTerSerieCompLiq, VtaGraTerNumCompLiq, VtaGraTerFechaCompLiq,
        VtaGraTerAnexo
    } = req.body;

    // Validación básica (Igual que en tu ejemplo de sujetos)
    if (!VtaGraTerFecha || !VtaGraTerNit || !VtaGraTerMontoOper) {
        return res.status(400).json({ message: 'Faltan datos obligatorios (Fecha, Nit o Monto)'});
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO vtagravterdomici 
            (VtaGraTerNit, VtaGraTerNom, VtaGraTerFecha, LisVtaGraTerTipoDoc, 
             VtaGraTerNumSerie, VtaGraTerNumResolu, VtaGraTerNumDoc, 
             VtaGraTerMontoOper, VtaGraTerIVAOper, 
             VtaGraTerSerieCompLiq, VtaGraTerNumCompLiq, VtaGraTerFechaCompLiq, VtaGraTerAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                VtaGraTerNit, VtaGraTerNom, VtaGraTerFecha, LisVtaGraTerTipoDoc,
                VtaGraTerNumSerie, VtaGraTerNumResolu, VtaGraTerNumDoc,
                VtaGraTerMontoOper, VtaGraTerIVAOper,
                VtaGraTerSerieCompLiq, VtaGraTerNumCompLiq, VtaGraTerFechaCompLiq, VtaGraTerAnexo
            ]
        );
        res.status(201).json({ message: 'Venta a Terceros guardada con éxito', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar', error: error.message });
    }
};

// Actualizar venta
export const updateVenta = async (req, res) => {
    const { id } = req.params;
    const {
        VtaGraTerNit, VtaGraTerNom, VtaGraTerFecha, LisVtaGraTerTipoDoc,
        VtaGraTerNumSerie, VtaGraTerNumResolu, VtaGraTerNumDoc,
        VtaGraTerMontoOper, VtaGraTerIVAOper,
        VtaGraTerSerieCompLiq, VtaGraTerNumCompLiq, VtaGraTerFechaCompLiq,
        VtaGraTerAnexo
    } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE vtagravterdomici SET 
            VtaGraTerNit=?, VtaGraTerNom=?, VtaGraTerFecha=?, LisVtaGraTerTipoDoc=?, 
            VtaGraTerNumSerie=?, VtaGraTerNumResolu=?, VtaGraTerNumDoc=?, 
            VtaGraTerMontoOper=?, VtaGraTerIVAOper=?, 
            VtaGraTerSerieCompLiq=?, VtaGraTerNumCompLiq=?, VtaGraTerFechaCompLiq=?, VtaGraTerAnexo=?
            WHERE idVtaGravTerDomici = ?`,
            [
                VtaGraTerNit, VtaGraTerNom, VtaGraTerFecha, LisVtaGraTerTipoDoc,
                VtaGraTerNumSerie, VtaGraTerNumResolu, VtaGraTerNumDoc,
                VtaGraTerMontoOper, VtaGraTerIVAOper,
                VtaGraTerSerieCompLiq, VtaGraTerNumCompLiq, VtaGraTerFechaCompLiq, VtaGraTerAnexo, 
                id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' });
        res.json({ message: 'Actualizado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// Eliminar venta
export const deleteVenta = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM vtagravterdomici WHERE idVtaGravTerDomici = ?', [id]);
        
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado'});
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
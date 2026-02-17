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
    const data = req.body;

    // Validación de Auditoría: No permitimos registros sin identidad
    if (!data.iddeclaNIT || !data.VtaGraTerFecha || !data.VtaGraTerNit) {
        return res.status(400).json({ message: 'Auditoría: ID Declarante, Fecha y NIT son obligatorios.'});
    }

    try {
        // Aseguramos que el dinero llegue como número para la PowerEdge
        const monto = parseFloat(data.VtaGraTerMontoOper) || 0;
        const iva = data.VtaGraTerIVAOper ? parseFloat(data.VtaGraTerIVAOper) : (monto * 0.13);

        const [result] = await pool.query(
            `INSERT INTO vtagravterdomici 
            (iddeclaNIT, VtaGraTerNit, VtaGraTerNom, VtaGraTerFecha, LisVtaGraTerTipoDoc, 
             VtaGraTerNumSerie, VtaGraTerNumResolu, VtaGraTerNumDoc, 
             VtaGraTerMontoOper, VtaGraTerIVAOper, 
             VtaGraTerSerieCompLiq, VtaGraTerResolCompLiq, VtaGraTerNumCompLiq, 
             VtaGraTerFechaCompLiq, VtaGraTerDUI, VtaGraTerAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.iddeclaNIT, data.VtaGraTerNit, data.VtaGraTerNom, data.VtaGraTerFecha, 
                data.LisVtaGraTerTipoDoc || '03', data.VtaGraTerNumSerie, data.VtaGraTerNumResolu, 
                data.VtaGraTerNumDoc, monto, iva,
                data.VtaGraTerSerieCompLiq, data.VtaGraTerResolCompLiq, data.VtaGraTerNumCompLiq, 
                data.VtaGraTerFechaCompLiq, data.VtaGraTerDUI, data.VtaGraTerAnexo || '3'
            ]
        );
        res.status(201).json({ message: 'Venta a Terceros Certificada', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Falla en la Integridad de Datos', error: error.message });
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
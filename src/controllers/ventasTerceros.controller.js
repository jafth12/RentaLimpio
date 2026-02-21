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

    // Validación de Auditoría: Adaptada a los nombres del frontend
    if (!data.iddeclaNIT || !data.fecha || !data.nitMandante) {
        return res.status(400).json({ message: 'Auditoría: ID Declarante, Fecha y NIT son obligatorios.'});
    }

    try {
        // Aseguramos que el dinero llegue como número
        const monto = parseFloat(data.gravadas) || 0; // En la vista es 'gravadas'
        const iva = data.comision ? parseFloat(data.comision) : (monto * 0.13); // En la vista es 'comision'

        const [result] = await pool.query(
            `INSERT INTO vtagravterdomici 
            (iddeclaNIT, VtaGraTerNit, VtaGraTerNom, VtaGraTerFecha, LisVtaGraTerTipoDoc, 
             VtaGraTerNumSerie, VtaGraTerNumResolu, VtaGraTerNumDoc, 
             VtaGraTerMontoOper, VtaGraTerIVAOper, 
             VtaGraTerSerieCompLiq, VtaGraTerResolCompLiq, VtaGraTerNumCompLiq, 
             VtaGraTerFechaCompLiq, VtaGraTerDUI, VtaGraTerAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.iddeclaNIT, 
                data.nitMandante, // 🛡️ Mapeado desde Vue
                data.nombreMandante, // 🛡️ Mapeado desde Vue
                data.fecha, // 🛡️ Mapeado desde Vue
                data.LisVtaGraTerTipoDoc || '03', 
                data.serie || null, // 🛡️ Mapeado desde Vue
                data.VtaGraTerNumResolu || null, 
                data.numero, // 🛡️ EL DTE UNIFICADO (Mapeado desde Vue)
                monto, 
                iva,
                data.VtaGraTerSerieCompLiq || null, 
                data.VtaGraTerResolCompLiq || null, 
                data.VtaGraTerNumCompLiq || null, 
                data.VtaGraTerFechaCompLiq || null, 
                data.VtaGraTerDUI || null, 
                data.VtaGraTerAnexo || '4' // 4 es el anexo de terceros
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
    const data = req.body;

    try {
        const monto = parseFloat(data.gravadas) || 0;
        const iva = parseFloat(data.comision) || 0;

        const [result] = await pool.query(
            `UPDATE vtagravterdomici SET 
            iddeclaNIT=?, VtaGraTerNit=?, VtaGraTerNom=?, VtaGraTerFecha=?, LisVtaGraTerTipoDoc=?, 
            VtaGraTerNumSerie=?, VtaGraTerNumResolu=?, VtaGraTerNumDoc=?, 
            VtaGraTerMontoOper=?, VtaGraTerIVAOper=?, 
            VtaGraTerSerieCompLiq=?, VtaGraTerNumCompLiq=?, VtaGraTerFechaCompLiq=?, VtaGraTerAnexo=?
            WHERE idVtaGravTerDomici = ?`,
            [
                data.iddeclaNIT,
                data.nitMandante, 
                data.nombreMandante, 
                data.fecha, 
                data.LisVtaGraTerTipoDoc || '03',
                data.serie || null, 
                data.VtaGraTerNumResolu || null, 
                data.numero, // 🛡️ DTE UNIFICADO ACTUALIZADO
                monto, 
                iva,
                data.VtaGraTerSerieCompLiq || null, 
                data.VtaGraTerNumCompLiq || null, 
                data.VtaGraTerFechaCompLiq || null, 
                data.VtaGraTerAnexo || '4', 
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
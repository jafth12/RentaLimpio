import pool from "../config/db.js";

// 1. Obtener todo el historial (Solo para el Admin)
export const getHistorial = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM historial_acciones ORDER BY fecha_hora DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener historial', error: error.message });
    }
};

// 2. FUNCIÓN INTERNA: Para registrar acciones desde los otros controladores
export const registrarAccion = async (usuario, accion, modulo, detalles) => {
    try {
        const detJSON = typeof detalles === 'object' ? JSON.stringify(detalles) : detalles;
        await pool.query(
            'INSERT INTO historial_acciones (usuario, accion, modulo, detalles) VALUES (?, ?, ?, ?)',
            [usuario || 'Usuario Desconocido', accion, modulo, detJSON]
        );
    } catch (error) {
        console.error("🚨 Error al guardar en historial:", error.message);
    }
};

// 3. NUEVA FUNCIÓN: Para recibir reportes desde el Frontend (Ej: PDFs generados)
export const registrarHistorialWeb = async (req, res) => {
    try {
        const { modulo, detalles } = req.body;
        const usuario = req.headers['x-usuario'] || 'Sistema';
        
        // Llamamos a la función interna para guardar en la BD
        await registrarAccion(usuario, 'EXPORTACION PDF', modulo, detalles);
        
        res.status(200).json({ message: 'Acción registrada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar historial web', error: error.message });
    }
};
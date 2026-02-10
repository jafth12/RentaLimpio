import pool from '../config/db.js';

export const getDeclarantes = async (req, res) => {
    try {
        // Consultamos la tabla 'declarante' (según tu base de datos)
        const [rows] = await pool.query('SELECT * FROM declarante');
        res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener declarantes', error: error.message });
    }
};
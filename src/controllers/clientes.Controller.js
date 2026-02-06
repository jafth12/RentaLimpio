import pool from '../config/db.js';

export const getClientes = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clientes');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio mal', error: error.message});
    }
};
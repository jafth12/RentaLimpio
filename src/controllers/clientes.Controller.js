import pool from '../config/db.js';

export const getClientes = async (req, res) => {
    try {
        // Seleccionamos TODOS los clientes
        const [rows] = await pool.query('SELECT * FROM clientes');
        
        // Verificación en consola del servidor (aparecerá en tu terminal)
        console.log(`✅ Clientes encontrados en BD: ${rows.length}`);
        
        res.json(rows);
    } catch (error) {
        console.error('❌ Error al obtener clientes:', error);
        res.status(500).json({ message: 'Error interno', error: error.message });
    }
};
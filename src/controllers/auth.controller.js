import pool from '../config/db.js'

export const login = async (req, res) => {
    const {UsuaNombre, UsuarioPassword } = req.body;
 
    try {
        const [rows] =await pool.query(
            'SELECT * FROM usuarios WHERE UsuaNombre = ? AND UsuarioPassword = ?',
            [UsuaNombre, UsuarioPassword]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Usuario o contraseña Incorrectos'});
        }

        res.json({ message: 'Login exitoso', UsuaNombre: rows[0].UsuaNombre });
    } catch (error) {
        return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
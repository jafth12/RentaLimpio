import pool from '../config/db.js'

export const login = async (req, res) => {
    const { UsuaNombre, UsuarioPassword } = req.body;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE UsuaNombre = ? AND UsuarioPassword = ?',
            [UsuaNombre, UsuarioPassword]
        );

        if (rows.length > 0) {
            const usuario = rows[0];
            
            return res.json({ 
                message: 'Login exitoso', 
                rol: usuario.Rol,   
                usuario: usuario.UsuaNombre 
            });
        } else {
            return res.status(401).json({ message: 'Usuario o contraseña Incorrectos' });
        }

    } catch (error) {
        return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
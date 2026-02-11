import pool from '../config/db.js';

export const getEmpleados = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM empleados ORDER BY idempleado DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createEmpleado = async (req, res) => {
    const { EmpleNombre, EmpleDUI, EmpleCorreo, EmpleaTel, EmpleDirec } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO empleados (EmpleNombre, EmpleDUI, EmpleCorreo, EmpleaTel, EmpleDirec) VALUES (?, ?, ?, ?, ?)',
            [EmpleNombre, EmpleDUI, EmpleCorreo, EmpleaTel, EmpleDirec]
        );
        res.status(201).json({ 
            id: result.insertId, 
            nombre: EmpleNombre,
            message: 'Empleado creado' 
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateEmpleado = async (req, res) => {
    const { id } = req.params;
    const { EmpleNombre, EmpleDUI, EmpleCorreo, EmpleaTel, EmpleDirec } = req.body;
    try {
        await pool.query(
            'UPDATE empleados SET EmpleNombre=?, EmpleDUI=?, EmpleCorreo=?, EmpleaTel=?, EmpleDirec=? WHERE idempleado=?',
            [EmpleNombre, EmpleDUI, EmpleCorreo, EmpleaTel, EmpleDirec, id]
        );
        res.json({ message: 'Empleado actualizado' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteEmpleado = async (req, res) => {
    const { id } = req.params;
    try {
        // Validar si tiene usuario asignado
        const [users] = await pool.query('SELECT idUsuario FROM usuarios WHERE empleados_idempleado = ?', [id]);
        if(users.length > 0) {
            return res.status(400).json({ message: 'No se puede eliminar: El empleado tiene un usuario activo.' });
        }
        await pool.query('DELETE FROM empleados WHERE idempleado = ?', [id]);
        res.json({ message: 'Empleado eliminado' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getUsuarios = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.*, e.EmpleNombre 
            FROM usuarios u 
            LEFT JOIN empleados e ON u.empleados_idempleado = e.idempleado
        `);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createUsuario = async (req, res) => {
    const { UsuaNombre, UsuarioPassword, Rol, empleados_idempleado } = req.body;
    try {
        await pool.query(
            'INSERT INTO usuarios (UsuaNombre, UsuarioPassword, Rol, empleados_idempleado) VALUES (?, ?, ?, ?)',
            [UsuaNombre, UsuarioPassword, Rol, empleados_idempleado]
        );
        res.json({ message: 'Usuario creado correctamente' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM usuarios WHERE idUsuario = ?', [id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
import pool from '../config/db.js';

// 1. OBTENER TODOS LOS CLIENTES
export const getClientes = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clientes');
        res.json(rows);
    } catch (error) {
        console.error('❌ Error al obtener clientes:', error);
        res.status(500).json({ message: 'Error interno', error: error.message });
    }
};

// 2. CREAR UN CLIENTE
export const createCliente = async (req, res) => {
    // Extraemos los datos y asignamos valores por defecto ('') si vienen vacíos
    const { 
        nit, 
        nombre, 
        direccion = '', 
        departamento = '', 
        giro = '', 
        registro = '', 
        tel1 = '', 
        tel2 = '', 
        correo = '', 
        observacion = '' 
    } = req.body;

    // Validación mínima obligatoria
    if (!nit || !nombre) {
        return res.status(400).json({ message: 'El NIT y el Nombre del cliente son obligatorios.' });
    }

    try {
        // Verificar si ya existe
        const [existente] = await pool.query('SELECT ClienNIT FROM clientes WHERE ClienNIT = ?', [nit]);
        if (existente.length > 0) {
            return res.status(400).json({ message: 'El NIT ya está registrado en clientes.' });
        }

        const [result] = await pool.query(
            `INSERT INTO clientes 
            (ClienNIT, ClienNom, ClienDirec, ClienDepto, ClienGiro, ClienNumReg, ClienTel1, ClienTel2, ClienCorreo, ClienObserv) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nit, 
                nombre, 
                direccion || '', 
                departamento || '', 
                giro || '', 
                registro || '', 
                tel1 || '', 
                tel2 || '', 
                correo || '', 
                observacion || ''
            ]
        );

        res.json({ message: 'Cliente registrado exitosamente', id: result.insertId });
    } catch (error) {
        console.error('❌ Error al crear cliente:', error);
        res.status(500).json({ message: 'Error al guardar cliente', error: error.message });
    }
};

// 3. ACTUALIZAR UN CLIENTE
export const updateCliente = async (req, res) => {
    const { id } = req.params; // NIT original para el WHERE
    const { 
        nit, 
        nombre, 
        direccion, 
        departamento, 
        giro, 
        registro, 
        tel1, 
        tel2, 
        correo, 
        observacion 
    } = req.body;

    if (!nit || !nombre) {
        return res.status(400).json({ message: 'El NIT y el Nombre son obligatorios.' });
    }

    try {
        const [result] = await pool.query(
            `UPDATE clientes SET 
            ClienNIT = ?, 
            ClienNom = ?, 
            ClienDirec = ?, 
            ClienDepto = ?, 
            ClienGiro = ?, 
            ClienNumReg = ?, 
            ClienTel1 = ?, 
            ClienTel2 = ?, 
            ClienCorreo = ?, 
            ClienObserv = ?
            WHERE ClienNIT = ?`,
            [
                nit, 
                nombre, 
                direccion || '', 
                departamento || '', 
                giro || '', 
                registro || '', 
                tel1 || '', 
                tel2 || '', 
                correo || '', 
                observacion || '', 
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error('❌ Error al actualizar cliente:', error);
        res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// 4. ELIMINAR UN CLIENTE
export const deleteCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM clientes WHERE ClienNIT = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('❌ Error al eliminar cliente:', error);
        res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
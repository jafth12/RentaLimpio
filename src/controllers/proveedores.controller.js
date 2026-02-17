import pool from '../config/db.js';

// 1. OBTENER PROVEEDORES
export const getProveedores = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM proveedor');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener proveedores', error: error.message});
    }
};

// 2. CREAR PROVEEDOR
export const createProveedor = async (req, res) => {
    const { nit, nombre, direccion, departamento, nrc, giro } = req.body;
    
    if(!nit || !nombre) {
        return res.status(400).json({message: 'Auditoría: El NIT y el Nombre son obligatorios.' });
    }

    try {
        // Usamos || '' para evitar valores NULL
        const [result] = await pool.query(
            'INSERT INTO proveedor (ProvNit, ProvNombre, ProvDirec, ProvDepto, ProvNRC, ProvGiro) VALUES (?, ?, ?, ?, ?, ?)',
            [nit, nombre, direccion || '', departamento || '', nrc || '', giro || '']
        );
        res.status(201).json({message: 'Proveedor registrado con éxito fiscal', id: nit });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Error de integridad: Este NIT ya está registrado' });
        }
        return res.status(500).json({ message: 'Falla en el servidor de base de datos', error: error.message });
    }
};

// 3. ACTUALIZAR PROVEEDOR
export const updateProveedor = async (req, res) => {
    const { nitOriginal } = req.params;
    const { nit, nombre, direccion, departamento, nrc, giro } = req.body;

    if (!nit || !nombre) {
        return res.status(400).json({ message: 'Auditoría: El NIT y el Nombre no pueden estar vacíos!' });
    }
    
    try {
        const [result] = await pool.query(
            `UPDATE proveedor SET 
                ProvNIT=?, ProvNombre=?, ProvDirec=?, ProvDepto=?, ProvNRC=?, ProvGiro=? 
             WHERE ProvNIT=?`,
            [nit, nombre, direccion || '', departamento || '', nrc || '', giro || '', nitOriginal]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Proveedor no localizado en el catálogo' });
        }
        res.json({ message: 'Datos del proveedor actualizados correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar registro fiscal', error: error.message });
    }
};

// 4. ELIMINAR PROVEEDOR (¡ESTA ES LA QUE FALTABA!)
export const deleteProveedor = async (req, res) => {
    const { nit } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM proveedor WHERE ProvNIT = ?', [nit]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Proveedor no encontrado para eliminar' });
        }

        res.json({ message: 'Proveedor eliminado correctamente del sistema' });
    } catch (error) {
        // Manejo de error de llave foránea (Si el proveedor tiene compras, no se puede borrar)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(400).json({ message: 'No se puede eliminar: El proveedor tiene compras registradas.' });
        }
        return res.status(500).json({ message: 'Error al eliminar proveedor', error: error.message });
    }
};
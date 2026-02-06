import pool from '../config/db.js';

export const getProveedores = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM proveedor');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener proveedores', error: error.message});
    }
};

export const createProveedor = async (req, res) => {
    const {nit, nombre, direccion, departamento} = req.body;
    if(!nit || !nombre) {
        return res.status(400).json({message: 'El NIT y el Nombre son obligatorios.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO proveedor (ProvNit, ProvNombre, ProvDirec, ProvDepto) VALUES (?, ?, ?, ?)',
            [nit, nombre, direccion || null, departamento || null]
        );
        res.status(201).json({message: 'Proveedor registrado con exito', id: nit });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Este NIT ya esta registrado', error: error.message });
        }
        return res.status(500).json({ message: 'Error al guardar proveedor', error: error.message });
    }
};

export const updateProveedor = async (req, res) => {
    const { nitOriginal } = req.params;
    const{ nit, nombre, direccion, departamento } = req.body;

    if (!nit || !nombre) {
        return res.status(400).json({ message: 'El NIT y el Nombre son obligatorios!' });
    }
    
    try {
        const [result] = await pool.query(
            'UPDATE proveedor SET ProvNIT=?, ProvNombre=?, ProvDirec=?, ProvDepto=? WHERE ProvNIT=?',
            [nit, nombre, direccion || null, departamento || null, nitOriginal]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Proveedor no encontrado' });
        }

        res.json({ message: 'Proveedor actualizado correctamente' })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El NIT ya esta siendo usado por otro proveedor. '});
        }
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

export const deleteProveedor = async (req, res) => {
    const { nit } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM proveedor WHERE ProvNIT = ?', [nit]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Proveedor no encontrado' });
        }

        res.json ({ message: 'Proveedor eliminado correctamente' });
    } catch (error) {
        if (error.code ===  'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(400).json ({ message: 'No se puede eliminar: Este proveedor tiene compras asociadas.' });
        }
        console.error("Error SQL al eliminar:", error);
        return res.status(500).json({ message: 'Error al eliminar', error:error.message });
    }

};
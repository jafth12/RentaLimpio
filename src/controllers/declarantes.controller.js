import pool from '../config/db.js';

// 1. OBTENER TODAS LAS EMPRESAS (DECLARANTES)
export const getDeclarantes = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM declarante ORDER BY declarante ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error de Auditoría al obtener empresas', error: error.message });
    }
};

// 2. REGISTRAR NUEVA EMPRESA
export const createDeclarante = async (req, res) => {
    const { nit, nombre, nrc, giro, direccion } = req.body;
    
    if (!nit || !nombre) {
        return res.status(400).json({ message: 'NIT y Nombre son obligatorios para la identidad fiscal.' });
    }

    try {
        await pool.query(
            'INSERT INTO declarante (iddeclaNIT, declarante, declaNRC, declaGiro, declaDireccion) VALUES (?, ?, ?, ?, ?)',
            [nit, nombre, nrc || '', giro || '', direccion || '']
        );
        res.status(201).json({ message: 'Empresa Declarante registrada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Falla al guardar identidad fiscal', error: error.message });
    }
};

// 3. ACTUALIZAR FICHA DE LA EMPRESA
export const updateDeclarante = async (req, res) => {
    const { id } = req.params; // NIT original
    const { nombre, nrc, giro, direccion } = req.body;

    try {
        const [result] = await pool.query(
            'UPDATE declarante SET declarante=?, declaNRC=?, declaGiro=?, declaDireccion=? WHERE iddeclaNIT=?',
            [nombre, nrc || '', giro || '', direccion || '', id]
        );
        
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Empresa no encontrada' });
        res.json({ message: 'Ficha legal actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar ficha', error: error.message });
    }
};

// 4. ELIMINAR EMPRESA DECLARANTE
export const deleteDeclarante = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM declarante WHERE iddeclaNIT = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }
        res.json({ message: 'Empresa eliminada correctamente' });
    } catch (error) {
        // Error común: llave foránea (si ya hay facturas con este declarante)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(400).json({ message: 'No se puede eliminar: Esta empresa tiene documentos asociados.' });
        }
        res.status(500).json({ message: 'Error al eliminar empresa', error: error.message });
    }
};
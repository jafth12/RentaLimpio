import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js';

// --- 1. OBTENER TODAS LAS COMPRAS ---
export const getCompras = async (req, res) => {
    try {
        // 🛡️ Ordenado de menor a mayor (ASC)
        const [rows] = await pool.query('SELECT * FROM compras ORDER BY ComFecha ASC');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener compras', error: error.message });
    }
};

// --- 2. OBTENER UNA COMPRA POR ID ---
export const getCompraById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM compras WHERE idCompras = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Compra no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener la compra', error: error.message });
    }
};

// --- 3. CREAR NUEVA COMPRA ---
export const createCompra = async (req, res) => {
    const d = req.body;
    try {
        // Validación obligatoria
        if (!d.iddeclaNIT || !d.fecha || !d.numero_control || !d.nit_proveedor) {
            return res.status(400).json({ message: 'Empresa, Fecha, DTE y NIT del Proveedor son obligatorios.'});
        }

        const gravadas = parseFloat(d.gravadas) || 0;
        const iva = d.iva !== undefined ? parseFloat(d.iva) : (gravadas * 0.13);
        const exentas = parseFloat(d.exentas) || 0;
        const total = parseFloat(d.total) || 0;

        const [result] = await pool.query(
            `INSERT INTO compras 
            (iddeclaNIT, ComFecha, ComClase, ComTipo, ComNumero, ComCodGeneracion,
             proveedor_ProvNIT, ComNomProve, ComIntExe, ComIntGrav, ComCredFiscal, ComTotal,
             ComClasiRenta, ComTipoCostoGastoRenta, ComTipoOpeRenta, ComAnexo) 
            VALUES (?, ?, '4', '03', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '3')`,
            [
                d.iddeclaNIT, 
                d.fecha, 
                d.numero_control,   // 🛡️ DTE
                d.uuid_dte,         // 🛡️ UUID
                d.nit_proveedor,    // NIT del proveedor
                d.nombre_proveedor, // Nombre del proveedor
                exentas, 
                gravadas, 
                iva, 
                total,
                d.clasificacion || '1', 
                d.costo_gasto || '2', 
                d.tipo_operacion || '1'
            ]
        );
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
     registrarAccion(usuario, 'CREACION', 'COMPRAS', `DTE: ${d.numero_control} - Total: $${total}`);
        res.status(201).json({ message: 'Compra registrada en BD con éxito', id: result.insertId });
    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- 4. ACTUALIZAR COMPRA ---
export const updateCompra = async (req, res) => {
    const { id } = req.params;
    const d = req.body;
    try {
        const gravadas = parseFloat(d.gravadas) || 0;
        const iva = d.iva !== undefined ? parseFloat(d.iva) : (gravadas * 0.13);
        const exentas = parseFloat(d.exentas) || 0;
        const total = parseFloat(d.total) || 0;

        const [result] = await pool.query(
            `UPDATE compras SET 
            iddeclaNIT=?, ComFecha=?, ComNumero=?, ComCodGeneracion=?, 
            proveedor_ProvNIT=?, ComNomProve=?, ComIntExe=?, ComIntGrav=?, ComCredFiscal=?, ComTotal=?,
            ComClasiRenta=?, ComTipoCostoGastoRenta=?, ComTipoOpeRenta=?
            WHERE idCompras = ?`,
            [
                d.iddeclaNIT, 
                d.fecha, 
                d.numero_control,   // 🛡️ DTE ACTUALIZADO
                d.uuid_dte,         // 🛡️ UUID ACTUALIZADO
                d.nit_proveedor, 
                d.nombre_proveedor, 
                exentas, 
                gravadas, 
                iva, 
                total,
                d.clasificacion || '1', 
                d.costo_gasto || '2', 
                d.tipo_operacion || '1',
                id
            ]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Compra no encontrada' });
        const usuario = req.headers['x-usuario'] || 'Sistema';
     registrarAccion(usuario, 'MODIFICACION', 'COMPRAS', `DTE Actualizado: ${d.numero_control} - Total: $${total}`);
        res.json({ message: 'Compra actualizada correctamente' });
    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// --- 5. ELIMINAR COMPRA ---
export const deleteCompra = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM compras WHERE idCompras = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Compra no encontrada' });
        const usuario = req.headers['x-usuario'] || 'Sistema';
     registrarAccion(usuario, 'ELIMINACION', 'COMPRAS', `Registro ID Eliminado: ${id}`);
        res.json({ message: 'Compra eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
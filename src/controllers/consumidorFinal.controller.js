import pool from "../config/db.js";
import { registrarAccion } from './historial.controller.js';

// --- 1. OBTENER TODAS LAS VENTAS ---
export const getVentasConsumidor = async (req, res) => { 
    try {
        const [rows] = await pool.query('SELECT * FROM consumidorfinal ORDER BY ConsFecha ASC');
        res.json(rows); 
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
    }
};

// --- 2. OBTENER UNA VENTA POR ID ---
export const getVentaConsumidorById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM consumidorfinal WHERE idconsfinal = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener la venta', error: error.message });
    }
};

// --- 3. CREAR NUEVA VENTA (CON ANTIDUPLICADOS) ---
export const createVentaConsumidor = async (req, res) => {
    const d = req.body;
    try {
        // Validación Obligatoria
        if (!d.iddeclaNIT || !d.numero_control) {
            return res.status(400).json({ message: 'Auditoría: Empresa y Número DTE son obligatorios.' });
        }

        // 🛡️ REGLA ANTIDUPLICADOS
        const [duplicado] = await pool.query(
            `SELECT idconsfinal FROM consumidorfinal 
             WHERE iddeclaNIT = ? 
             AND (
                 (ConsCodGeneracion = ? AND ConsCodGeneracion IS NOT NULL AND ConsCodGeneracion != '') 
                 OR 
                 (REPLACE(ConsNumDocAL, '-', '') = REPLACE(?, '-', ''))
             )`,
            [d.iddeclaNIT, d.uuid_dte, d.numero_control]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Documento duplicado. Esta Factura de Consumidor Final ya se encuentra registrada.' });
        }

        const [result] = await pool.query(
            `INSERT INTO consumidorfinal 
            (iddeclaNIT, ConsFecha, ConsMesDeclarado, ConsAnioDeclarado, ConsClaseDoc, ConsTipoDoc, ConsSerieDoc, 
             ConsNumDocDEL, ConsNumDocAL, ConsCodGeneracion, 
             ConsTipoOpera, ConsTipoIngreso, ConsVtaExentas, ConsVtaNoSujetas, ConsVtaGravLocales, 
             ConsTotalVta, ConsNumAnexo) 
            VALUES (?, ?, ?, ?, '4', '01', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1')`, 
            [
                d.iddeclaNIT, 
                d.fecha, 
                d.mesDeclarado,
                d.anioDeclarado,
                d.serie || null,
                d.numero_control, // DTE DEL
                d.numero_control, // DTE AL
                d.uuid_dte,       // UUID
                d.tipo_operacion || '1',
                d.tipo_ingreso || '1',
                d.exentas || 0, 
                d.noSujetas || 0, 
                d.gravadas || 0, 
                d.total || 0
            ]
        );
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'CREACION', 'CONSUMIDOR FINAL', `DTE: ${d.numero_control} - Total: $${d.total || 0}`);
        
        res.status(201).json({ message: 'Venta guardada en Base de Datos', id: result.insertId });
    } catch (error) {
        console.error("Error en DB:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- 4. ACTUALIZAR VENTA (CON ANTIDUPLICADOS) ---
export const updateVentaConsumidor = async (req, res) => {
    const { id } = req.params;
    const d = req.body;

    try {
        // 🛡️ REGLA ANTIDUPLICADOS PARA ACTUALIZAR
        const [duplicado] = await pool.query(
            `SELECT idconsfinal FROM consumidorfinal 
             WHERE iddeclaNIT = ? 
             AND idconsfinal != ?
             AND (
                 (ConsCodGeneracion = ? AND ConsCodGeneracion IS NOT NULL AND ConsCodGeneracion != '') 
                 OR 
                 (REPLACE(ConsNumDocAL, '-', '') = REPLACE(?, '-', ''))
             )`,
            [d.iddeclaNIT, id, d.uuid_dte, d.numero_control]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Conflicto de Documento. Ya existe OTRA Factura con ese mismo Número o UUID.' });
        }

        const [result] = await pool.query(
            `UPDATE consumidorfinal SET 
            iddeclaNIT=?, ConsFecha=?, ConsMesDeclarado=?, ConsAnioDeclarado=?, ConsSerieDoc=?, 
            ConsNumDocDEL=?, ConsNumDocAL=?, ConsCodGeneracion=?, 
            ConsTipoOpera=?, ConsTipoIngreso=?, 
            ConsVtaExentas=?, ConsVtaNoSujetas=?, ConsVtaGravLocales=?, 
            ConsTotalVta=?
            WHERE idconsfinal = ?`,
            [
                d.iddeclaNIT,
                d.fecha, 
                d.mesDeclarado,
                d.anioDeclarado,
                d.serie || null, 
                d.numero_control, // DTE DEL
                d.numero_control, // DTE AL
                d.uuid_dte,       
                d.tipo_operacion || '1', 
                d.tipo_ingreso || '1', 
                d.exentas || 0, 
                d.noSujetas || 0, 
                d.gravadas || 0,
                d.total || 0,
                id
            ]
        );
          
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'MODIFICACION', 'CONSUMIDOR FINAL', `DTE Actualizado: ${d.numero_control} - Total: $${d.total || 0}`);
        
        res.json({ message: 'Venta actualizada correctamente'});
    } catch (error) {
        console.error("Error en DB:", error);
        return res.status(500).json({ message: 'Error al actualizar', error: error.message});
    }
};

// --- 5. ELIMINAR VENTA ---
export const deleteVentaConsumidor = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM consumidorfinal WHERE idconsfinal = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({message: 'Venta no encontrada' });
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ELIMINACION', 'CONSUMIDOR FINAL', `Registro ID Eliminado: ${id}`);
        
        res.json({ message: 'Venta eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
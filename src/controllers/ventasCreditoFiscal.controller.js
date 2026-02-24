import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js'; // 🛡️ Importación de Auditoría

// --- 1. OBTENER TODAS LAS VENTAS CCF ---
export const getVentasCCF = async (req, res) => {
    try {
        // 🛡️ Cambiado de DESC a ASC (De menor a mayor)
        const [rows] = await pool.query('SELECT * FROM credfiscal ORDER BY FiscFecha ASC');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener ventas CCF', error: error.message });
    }
};

// --- 2. OBTENER UNA VENTA (PARA EDITAR) ---
export const getVentaCCFById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM credfiscal WHERE idCredFiscal = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener venta', error: error.message });
    }
};

// --- 3. CREAR NUEVA VENTA CCF ---
export const createVentasCCF = async (req, res) => {
    try {
        const d = req.body;

        // Validación Obligatoria
        if (!d.iddeclaNIT || !d.nrc || !d.numero_control) {
            return res.status(400).json({ message: 'Auditoría: Empresa, NRC de Cliente y Número DTE son obligatorios.' });
        }

        // Procesamiento Numérico
        const gravada = parseFloat(d.gravadas) || 0;
        const debito = d.debitoFiscal !== undefined ? parseFloat(d.debitoFiscal) : (gravada * 0.13);
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;

        const query = `
            INSERT INTO credfiscal 
            (
                iddeclaNIT, FiscFecha, FisClasDoc, FisTipoDoc, FiscSerieDoc, 
                FiscNumDoc, FiscCodGeneracion, FiscNumContInter, FiscNit, FiscNomRazonDenomi, 
                FiscVtaExen, FiscVtaNoSujetas, FiscVtaGravLocal, FiscDebitoFiscal, 
                FiscTotalVtas, BusFiscTipoOperaRenta, BusFiscTipoIngresoRenta, FiscNumAnexo
            ) VALUES (?, ?, '4', '03', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2')
        `;

        const values = [
            d.iddeclaNIT, 
            d.fecha, 
            d.serie || null, 
            d.numero_control, // 🛡️ DTE
            d.uuid_dte,       // 🛡️ UUID en Cod Generacion
            d.uuid_dte,       // 🛡️ UUID en Control Interno
            d.nrc,            // 🛡️ NRC
            d.cliente,        // 🛡️ NOMBRE DEL CLIENTE
            exentas, 
            noSujetas, 
            gravada, 
            debito,
            total,
            d.tipo_operacion || '1', 
            d.tipo_ingreso || '1'
        ];

        const [result] = await pool.query(query, values);
        
        // 🛡️ SENSOR DE AUDITORÍA (CREACIÓN)
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'CREACION', 'CREDITO FISCAL', `DTE: ${d.numero_control} - Total: $${total}`);

        res.status(201).json({ message: 'CCF Guardado Exitosamente', id: result.insertId });

    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Error en la Base de Datos', error: error.message });
    }
};

// --- 4. ACTUALIZAR VENTA CCF ---
export const updateVentasCCF = async (req, res) => {
    const { id } = req.params;
    try {
        const d = req.body;
        
        const gravada = parseFloat(d.gravadas) || 0;
        const debito = d.debitoFiscal !== undefined ? parseFloat(d.debitoFiscal) : (gravada * 0.13);
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;

        const query = `
            UPDATE credfiscal SET 
                iddeclaNIT=?, FiscFecha=?, FiscSerieDoc=?, 
                FiscNumDoc=?, FiscCodGeneracion=?, FiscNumContInter=?, FiscNit=?, FiscNomRazonDenomi=?, 
                FiscVtaExen=?, FiscVtaNoSujetas=?, FiscVtaGravLocal=?, FiscDebitoFiscal=?, 
                FiscTotalVtas=?, BusFiscTipoOperaRenta=?, BusFiscTipoIngresoRenta=?
            WHERE idCredFiscal = ?
        `;

        const values = [
            d.iddeclaNIT,
            d.fecha, 
            d.serie || null,
            d.numero_control, // 🛡️ DTE
            d.uuid_dte,       // 🛡️ UUID
            d.uuid_dte,       // 🛡️ UUID
            d.nrc,            // 🛡️ NRC
            d.cliente,        // 🛡️ NOMBRE DEL CLIENTE
            exentas, 
            noSujetas, 
            gravada, 
            debito,
            total,
            d.tipo_operacion || '1', 
            d.tipo_ingreso || '1', 
            id
        ];

        const [result] = await pool.query(query, values);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        
        // 🛡️ SENSOR DE AUDITORÍA (MODIFICACIÓN)
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'MODIFICACION', 'CREDITO FISCAL', `DTE Actualizado: ${d.numero_control} - Total: $${total}`);

        res.json({ message: 'CCF actualizado correctamente' });

    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// --- 5. ELIMINAR VENTA CCF ---
export const deleteVentasCCF = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM credfiscal WHERE idCredFiscal = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        
        // 🛡️ SENSOR DE AUDITORÍA (ELIMINACIÓN)
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ELIMINACION', 'CREDITO FISCAL', `Registro ID Eliminado: ${id}`);

        res.json({ message: 'Venta eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
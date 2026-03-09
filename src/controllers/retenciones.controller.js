import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js';

// 📅 Función para limpiar la fecha al enviarla al frontend
const formatearFecha = (fecha) => {
    if (!fecha) return null;
    if (fecha instanceof Date) {
        const yyyy = fecha.getFullYear();
        const mm = String(fecha.getMonth() + 1).padStart(2, '0');
        const dd = String(fecha.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return fecha.toString().split('T')[0];
};

// --- 1. OBTENER TODAS LAS RETENCIONES ---
export const getRetenciones = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM retenciones ORDER BY idRetenciones DESC');
        
        // Limpiamos las fechas antes de mandarlas al frontend
        rows.forEach(r => {
            if (r.RetenFecha) r.RetenFecha = formatearFecha(r.RetenFecha);
        });

        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener retenciones', error: error.message });
    }
};

// --- 2. CREAR NUEVA RETENCIÓN ---
export const createRetencion = async (req, res) => {
    const d = req.body;

    if (!d.numDoc || !d.iddeclaNIT || !d.mesDeclarado || !d.anioDeclarado) {
        return res.status(400).json({ message: 'Empresa, Periodo y Documento son obligatorios' });
    }

    // 🛡️ Forzar la conversión a número decimal
    const montoSujeto = parseFloat(d.montoSujeto) || 0.00;
    const montoRetenido = parseFloat(d.montoRetenido) || 0.00;

    try {
        // 🛡️ SE INYECTA RetenSelloRecepcion EN EL INSERT
        const [result] = await pool.query(
            `INSERT INTO retenciones 
            (RetenNitAgente, RetenNomAgente, RetenFecha, RetenListTipoDoc, RetenSerieDoc, RetenNumDoc, RetenCodGeneracion, RetenSelloRecepcion, RetenMontoSujeto, RetenMontoDeReten, RetenDuiDelAgente, RetenNumAnexo, iddeclaNIT, RetenMesDeclarado, RetenAnioDeclarado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                d.nitAgente || '', d.nomAgente || '', d.fecha, d.tipoDoc || '07', d.serie || '', 
                d.numDoc, d.codGeneracion || '', d.sello_recepcion || null, montoSujeto, montoRetenido, d.duiAgente || '', 
                d.anexo || '4', d.iddeclaNIT, d.mesDeclarado, d.anioDeclarado
            ]
        );
        
        // 🛡️ AUDITORÍA
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'CREACION', 'RETENCIONES', `Empresa: ${d.iddeclaNIT} | Doc: ${d.numDoc} | Retenido: $${montoRetenido}`);

        res.status(201).json({ message: 'Retención registrada con éxito', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar retención', error: error.message });
    }
};

// --- 3. ACTUALIZAR RETENCIÓN ---
export const updateRetencion = async (req, res) => {
    const { id } = req.params;
    const d = req.body;

    // 🛡️ Forzar la conversión a número decimal
    const montoSujeto = parseFloat(d.montoSujeto) || 0.00;
    const montoRetenido = parseFloat(d.montoRetenido) || 0.00;

    try {
        // 🛡️ SE INYECTA RetenSelloRecepcion EN EL UPDATE
        const [result] = await pool.query(
            `UPDATE retenciones SET 
            RetenNitAgente=?, RetenNomAgente=?, RetenFecha=?, RetenListTipoDoc=?, RetenSerieDoc=?, RetenNumDoc=?, RetenCodGeneracion=?, RetenSelloRecepcion=?, RetenMontoSujeto=?, RetenMontoDeReten=?, RetenDuiDelAgente=?, RetenNumAnexo=?, iddeclaNIT=?, RetenMesDeclarado=?, RetenAnioDeclarado=? 
            WHERE idRetenciones=?`,
            [
                d.nitAgente || '', d.nomAgente || '', d.fecha, d.tipoDoc || '07', d.serie || '', 
                d.numDoc, d.codGeneracion || '', d.sello_recepcion || null, montoSujeto, montoRetenido, d.duiAgente || '', 
                d.anexo || '4', d.iddeclaNIT, d.mesDeclarado, d.anioDeclarado, id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Retención no encontrada' });
        
        // 🛡️ AUDITORÍA
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'MODIFICACION', 'RETENCIONES', `Empresa: ${d.iddeclaNIT} | Doc Actualizado: ${d.numDoc}`);

        res.json({ message: 'Retención actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar retención', error: error.message });
    }
};

// --- 4. ELIMINAR RETENCIÓN ---
export const deleteRetencion = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM retenciones WHERE idRetenciones = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Retención no encontrada' });
        
        // 🛡️ AUDITORÍA
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ELIMINACION', 'RETENCIONES', `Registro ID Eliminado: ${id}`);

        res.json({ message: 'Retención eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar retención', error: error.message });
    }
};

// --- 5. ANULAR RETENCIÓN ---
export const anularRetencion = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Obtener los datos actuales antes de anular (para el historial)
        const [rows] = await pool.query('SELECT * FROM retenciones WHERE idRetenciones = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Retención no encontrada' });
        
        const retencion = rows[0];

        // 2. Marcar como anulado (Montos a 0 y concatenar ANULADO al documento)
        const numDocAnulado = retencion.RetenNumDoc.includes('ANULADO') 
            ? retencion.RetenNumDoc 
            : `${retencion.RetenNumDoc} (ANULADO)`;

        const [result] = await pool.query(
            `UPDATE retenciones SET 
            RetenNumDoc = ?, 
            RetenMontoSujeto = 0.00, 
            RetenMontoDeReten = 0.00 
            WHERE idRetenciones = ?`,
            [numDocAnulado, id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'No se pudo anular la retención' });

        // 3. Registrar la acción en el historial
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ANULACION', 'RETENCIONES', `Documento Anulado: ${retencion.RetenNumDoc} | Empresa: ${retencion.iddeclaNIT}`);

        res.json({ message: 'Retención anulada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al anular retención', error: error.message });
    }
};
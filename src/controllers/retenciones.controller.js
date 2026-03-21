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
    const { nit, mes, anio } = req.query;
    try {
        let query = 'SELECT * FROM retenciones';
        const params = [];
        const condiciones = [];

        if (nit)  { condiciones.push('iddeclaNIT = ?');  params.push(nit); }
        if (mes)  { condiciones.push('RetenMesDeclarado = ?');  params.push(mes); }
        if (anio) { condiciones.push('RetenAnioDeclarado = ?'); params.push(anio); }

        if (condiciones.length > 0) {
            query += ' WHERE ' + condiciones.join(' AND ');
        }
        query += ' ORDER BY idRetenciones DESC';

        const [rows] = await pool.query(query, params);
        
        // Limpiamos las fechas antes de mandarlas al frontend
        rows.forEach(r => {
            if (r.RetenFecha) r.RetenFecha = formatearFecha(r.RetenFecha);
        });

        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener retenciones', error: error.message });
    }
};

// --- 2. CREAR NUEVA RETENCIÓN (CON ANTIDUPLICADOS) ---
export const createRetencion = async (req, res) => {
    const d = req.body;

    if (!d.numDoc || !d.iddeclaNIT || !d.mesDeclarado || !d.anioDeclarado || !d.nitAgente) {
        return res.status(400).json({ message: '⚠️ Empresa, Periodo, Documento y NIT del Agente son obligatorios' });
    }

    try {
        // 🛡️ IDENTIFICACIÓN DTE vs FÍSICO
        const esFisico = !d.codGeneracion || d.codGeneracion.trim() === '';
        const uuidDte = esFisico ? null : d.codGeneracion;
        const selloRec = esFisico ? null : (d.sello_recepcion || null);

        // 🛡️ REGLA ANTIDUPLICADOS MEJORADA
        const [duplicado] = await pool.query(
            `SELECT idRetenciones FROM retenciones 
             WHERE iddeclaNIT = ? 
             AND (
                 (RetenCodGeneracion = ? AND RetenCodGeneracion IS NOT NULL AND RetenCodGeneracion != '') 
                 OR 
                 ((RetenCodGeneracion IS NULL OR RetenCodGeneracion = '') AND REPLACE(RetenNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(RetenNitAgente, '-', '') = REPLACE(?, '-', ''))
             )`,
            [d.iddeclaNIT, uuidDte, d.numDoc, d.nitAgente]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Comprobante duplicado. Esta retención ya se encuentra registrada en la base de datos.' });
        }

        const montoSujeto = parseFloat(d.montoSujeto) || 0.00;
        const montoRetenido = parseFloat(d.montoRetenido) || 0.00;

        // 🛡️ INSERCIÓN BLINDADA
        const [result] = await pool.query(
            `INSERT INTO retenciones 
            (RetenNitAgente, RetenNomAgente, RetenFecha, RetenListTipoDoc, RetenSerieDoc, RetenNumDoc, RetenCodGeneracion, RetenSelloRecepcion, RetenMontoSujeto, RetenMontoDeReten, RetenDuiDelAgente, RetenNumAnexo, iddeclaNIT, RetenMesDeclarado, RetenAnioDeclarado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                d.nitAgente || '', d.nomAgente || '', d.fecha, d.tipoDoc || '07', d.serie || '', 
                d.numDoc, uuidDte, selloRec, montoSujeto, montoRetenido, d.duiAgente || '', 
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

// --- 3. ACTUALIZAR RETENCIÓN (CON ANTIDUPLICADOS) ---
export const updateRetencion = async (req, res) => {
    const { id } = req.params;
    const d = req.body;

    try {
        // 🛡️ IDENTIFICACIÓN DTE vs FÍSICO
        const esFisico = !d.codGeneracion || d.codGeneracion.trim() === '';
        const uuidDte = esFisico ? null : d.codGeneracion;
        const selloRec = esFisico ? null : (d.sello_recepcion || null);

        // 🛡️ REGLA ANTIDUPLICADOS PARA ACTUALIZAR
        const [duplicado] = await pool.query(
            `SELECT idRetenciones FROM retenciones 
             WHERE iddeclaNIT = ? AND idRetenciones != ?
             AND (
                 (RetenCodGeneracion = ? AND RetenCodGeneracion IS NOT NULL AND RetenCodGeneracion != '') 
                 OR 
                 ((RetenCodGeneracion IS NULL OR RetenCodGeneracion = '') AND REPLACE(RetenNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(RetenNitAgente, '-', '') = REPLACE(?, '-', ''))
             )`,
            [d.iddeclaNIT, id, uuidDte, d.numDoc, d.nitAgente]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRO comprobante con ese mismo Número o UUID.' });
        }

        const montoSujeto = parseFloat(d.montoSujeto) || 0.00;
        const montoRetenido = parseFloat(d.montoRetenido) || 0.00;

        // 🛡️ ACTUALIZACIÓN BLINDADA
        const [result] = await pool.query(
            `UPDATE retenciones SET 
            RetenNitAgente=?, RetenNomAgente=?, RetenFecha=?, RetenListTipoDoc=?, RetenSerieDoc=?, RetenNumDoc=?, RetenCodGeneracion=?, RetenSelloRecepcion=?, RetenMontoSujeto=?, RetenMontoDeReten=?, RetenDuiDelAgente=?, RetenNumAnexo=?, iddeclaNIT=?, RetenMesDeclarado=?, RetenAnioDeclarado=? 
            WHERE idRetenciones=?`,
            [
                d.nitAgente || '', d.nomAgente || '', d.fecha, d.tipoDoc || '07', d.serie || '', 
                d.numDoc, uuidDte, selloRec, montoSujeto, montoRetenido, d.duiAgente || '', 
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
        const [rows] = await pool.query('SELECT * FROM retenciones WHERE idRetenciones = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Retención no encontrada' });
        
        const retencion = rows[0];

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

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ANULACION', 'RETENCIONES', `Documento Anulado: ${retencion.RetenNumDoc} | Empresa: ${retencion.iddeclaNIT}`);

        res.json({ message: 'Retención anulada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al anular retención', error: error.message });
    }
};
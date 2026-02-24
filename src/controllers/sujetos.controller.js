import pool from "../config/db.js";
import { registrarAccion } from './historial.controller.js'; // 🛡️ Importación de Auditoría

// 1. OBTENER REGISTROS
export const getSujetos = async (req, res) => {
    try {
        // 🛡️ Ordenado de menor a mayor (ASC)
        const [rows] = await pool.query('SELECT * FROM comprassujexcluidos ORDER BY ComprasSujExcluFecha ASC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener registros', error: error.message });
    }
};

// 2. CREAR REGISTRO
export const createSujeto = async (req, res) => {
    const data = req.body;

    // Validación estricta de campos obligatorios
    if (!data.iddeclaNIT || !data.fecha || !data.nit || !data.monto) {
        return res.status(400).json({ message: 'Auditoría: Empresa, Fecha, NIT/DUI y Monto son obligatorios.'});
    }

    // Cálculo seguro de retención (10% en Sujetos Excluidos)
    const monto = parseFloat(data.monto) || 0;
    const retencion = data.retencion !== undefined ? parseFloat(data.retencion) : (monto * 0.10);

    try {
        const [result] = await pool.query(
            `INSERT INTO comprassujexcluidos 
            (iddeclaNIT, ComprasSujExcluFecha, ComprasSujExcluTipoDoc, ComprasSujExcluNIT, ComprasSujExcluNom, 
             ComprasSujExcluSerieDoc, ComprasSujExcluNumDoc, ComprasSujExcluCodGeneracion,
             ComprasSujExcluMontoOpera, ComprasSujExcluMontoReten, 
             ComprasSujExcluTipoOpera, ComprasSujExcluClasificacion, ComprasSujExclusector, 
             ComprasSujExcluTipoCostoGast, ComprasSujExcluAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.iddeclaNIT, 
                data.fecha, 
                data.tipoDoc || '14', 
                data.nit, 
                data.nombre || '', 
                data.serie || null, 
                data.numero_control, // 🛡️ DTE
                data.uuid_dte,       // 🛡️ UUID de Generación
                monto, 
                retencion, 
                data.tipoOp || '1', 
                data.clasificacion || '2', 
                data.sector || '4',
                data.costoGasto || '2', 
                data.anexo || '5' 
            ]
        );
        
        // 🛡️ SENSOR DE AUDITORÍA (CREACIÓN)
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'CREACION', 'SUJETOS EXCLUIDOS', `DTE: ${data.numero_control} - Sujeto: ${data.nombre} - Monto: $${monto}`);

        res.status(201).json({ message: 'Registro de Sujeto Excluido Guardado en BD', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Falla en la persistencia', error: error.message });
    }
};

// 3. ACTUALIZAR REGISTRO
export const updateSujeto = async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        const monto = parseFloat(data.monto) || 0;
        const retencion = data.retencion !== undefined ? parseFloat(data.retencion) : (monto * 0.10);

        const [result] = await pool.query(
            `UPDATE comprassujexcluidos SET 
                iddeclaNIT = ?, ComprasSujExcluFecha = ?, ComprasSujExcluTipoDoc = ?, 
                ComprasSujExcluNIT = ?, ComprasSujExcluNom = ?, ComprasSujExcluSerieDoc = ?, 
                ComprasSujExcluNumDoc = ?, ComprasSujExcluCodGeneracion = ?,
                ComprasSujExcluMontoOpera = ?, ComprasSujExcluMontoReten = ?, 
                ComprasSujExcluTipoOpera = ?, ComprasSujExcluClasificacion = ?, ComprasSujExclusector = ?, 
                ComprasSujExcluTipoCostoGast = ?, ComprasSujExcluAnexo = ?
            WHERE idComSujExclui = ?`,
            [
                data.iddeclaNIT, 
                data.fecha, 
                data.tipoDoc || '14', 
                data.nit, 
                data.nombre, 
                data.serie || null, 
                data.numero_control, // 🛡️ DTE ACTUALIZADO
                data.uuid_dte,       // 🛡️ UUID ACTUALIZADO
                monto, 
                retencion, 
                data.tipoOp || '1', 
                data.clasificacion || '2', 
                data.sector || '4',
                data.costoGasto || '2', 
                data.anexo || '5',
                id
            ]
        );
        
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' });
        
        // 🛡️ SENSOR DE AUDITORÍA (MODIFICACIÓN)
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'MODIFICACION', 'SUJETOS EXCLUIDOS', `DTE Actualizado: ${data.numero_control} - Sujeto: ${data.nombre} - Monto: $${monto}`);

        res.json({ message: 'Registro Actualizado Exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// 4. ELIMINAR REGISTRO
export const deleteSujeto = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM comprassujexcluidos WHERE idComSujExclui = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado'});
        
        // 🛡️ SENSOR DE AUDITORÍA (ELIMINACIÓN)
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ELIMINACION', 'SUJETOS EXCLUIDOS', `Registro ID Eliminado: ${id}`);

        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Error al eliminar', error: error.message});
    }
};
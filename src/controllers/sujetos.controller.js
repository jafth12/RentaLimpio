import pool from "../config/db.js";
import { registrarAccion } from './historial.controller.js';

// 1. OBTENER REGISTROS
export const getSujetos = async (req, res) => {
    const { nit, mes, anio } = req.query;
    try {
        let query = 'SELECT * FROM comprassujexcluidos';
        const params = [];
        const condiciones = [];

        if (nit)  { condiciones.push('iddeclaNIT = ?');  params.push(nit); }
        if (mes)  { condiciones.push('ComprasSujExcluMesDeclarado = ?');  params.push(mes); }
        if (anio) { condiciones.push('ComprasSujExcluAnioDeclarado = ?'); params.push(anio); }

        if (condiciones.length > 0) {
            query += ' WHERE ' + condiciones.join(' AND ');
        }
        query += ' ORDER BY ComprasSujExcluFecha ASC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener registros', error: error.message });
    }
};

// 2. CREAR REGISTRO (CON ANTIDUPLICADOS INTELIGENTE)
export const createSujeto = async (req, res) => {
    const data = req.body;

    if (!data.iddeclaNIT || !data.numero_control || !data.nit || !data.monto) {
        return res.status(400).json({ message: '⚠️ Auditoría: Empresa, Documento, NIT/DUI y Monto son obligatorios.'});
    }

    try {
        // 🛡️ IDENTIFICACIÓN DTE vs FÍSICO
        const esFisico = !data.uuid_dte || data.uuid_dte.trim() === '';
        const uuidDte = esFisico ? null : data.uuid_dte;
        const selloRec = esFisico ? null : (data.sello_recepcion || null);

        // 🛡️ REGLA ANTIDUPLICADOS MEJORADA (Incluye NIT para los físicos)
        const [duplicado] = await pool.query(
            `SELECT idComSujExclui FROM comprassujexcluidos 
             WHERE iddeclaNIT = ? 
             AND (
                 (ComprasSujExcluCodGeneracion = ? AND ComprasSujExcluCodGeneracion IS NOT NULL AND ComprasSujExcluCodGeneracion != '') 
                 OR 
                 ((ComprasSujExcluCodGeneracion IS NULL OR ComprasSujExcluCodGeneracion = '') AND REPLACE(ComprasSujExcluNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(ComprasSujExcluNIT, '-', '') = REPLACE(?, '-', ''))
             )`,
            [data.iddeclaNIT, uuidDte, data.numero_control, data.nit]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Documento duplicado. Esta retención a Sujeto Excluido ya se encuentra registrada en la base de datos.' });
        }

        const monto = parseFloat(data.monto) || 0;
        const retencion = data.retencion !== undefined ? parseFloat(data.retencion) : (monto * 0.10);

        // 🛡️ INSERCIÓN BLINDADA
        const [result] = await pool.query(
            `INSERT INTO comprassujexcluidos 
            (iddeclaNIT, ComprasSujExcluFecha, ComprasSujExcluMesDeclarado, ComprasSujExcluAnioDeclarado, ComprasSujExcluTipoDoc, 
             ComprasSujExcluNIT, ComprasSujExcluNom, ComprasSujExcluSerieDoc, ComprasSujExcluNumDoc, 
             ComprasSujExcluCodGeneracion, ComprasSujExcluSelloRecepcion, ComprasSujExcluMontoOpera, ComprasSujExcluMontoReten, 
             ComprasSujExcluTipoOpera, ComprasSujExcluClasificacion, ComprasSujExclusector, 
             ComprasSujExcluTipoCostoGast, ComprasSujExcluAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.iddeclaNIT, data.fecha, data.mesDeclarado, data.anioDeclarado, data.tipoDoc || '14', 
                data.nit, data.nombre || '', data.serie || null, 
                data.numero_control, uuidDte, selloRec, 
                monto, retencion, data.tipoOp || '1', data.clasificacion || '2', 
                data.sector || '4', data.costoGasto || '2', data.anexo || '5' 
            ]
        );
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'CREACION', 'SUJETOS EXCLUIDOS', `Doc: ${data.numero_control} - Sujeto: ${data.nombre} - Monto: $${monto}`);

        res.status(201).json({ message: 'Registro de Sujeto Excluido Guardado en BD', id: result.insertId });
    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Falla en la persistencia', error: error.message });
    }
};

// 3. ACTUALIZAR REGISTRO (CON ANTIDUPLICADOS)
export const updateSujeto = async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        // 🛡️ IDENTIFICACIÓN DTE vs FÍSICO
        const esFisico = !data.uuid_dte || data.uuid_dte.trim() === '';
        const uuidDte = esFisico ? null : data.uuid_dte;
        const selloRec = esFisico ? null : (data.sello_recepcion || null);

        // 🛡️ REGLA ANTIDUPLICADOS PARA ACTUALIZAR
        const [duplicado] = await pool.query(
            `SELECT idComSujExclui FROM comprassujexcluidos 
             WHERE iddeclaNIT = ? AND idComSujExclui != ?
             AND (
                 (ComprasSujExcluCodGeneracion = ? AND ComprasSujExcluCodGeneracion IS NOT NULL AND ComprasSujExcluCodGeneracion != '') 
                 OR 
                 ((ComprasSujExcluCodGeneracion IS NULL OR ComprasSujExcluCodGeneracion = '') AND REPLACE(ComprasSujExcluNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(ComprasSujExcluNIT, '-', '') = REPLACE(?, '-', ''))
             )`,
            [data.iddeclaNIT, id, uuidDte, data.numero_control, data.nit]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRO registro de Sujeto Excluido con ese mismo Número o UUID.' });
        }

        const monto = parseFloat(data.monto) || 0;
        const retencion = data.retencion !== undefined ? parseFloat(data.retencion) : (monto * 0.10);

        // 🛡️ ACTUALIZACIÓN BLINDADA
        const [result] = await pool.query(
            `UPDATE comprassujexcluidos SET 
                iddeclaNIT = ?, ComprasSujExcluFecha = ?, ComprasSujExcluMesDeclarado = ?, ComprasSujExcluAnioDeclarado = ?,
                ComprasSujExcluTipoDoc = ?, ComprasSujExcluNIT = ?, ComprasSujExcluNom = ?, 
                ComprasSujExcluSerieDoc = ?, ComprasSujExcluNumDoc = ?, ComprasSujExcluCodGeneracion = ?, ComprasSujExcluSelloRecepcion = ?,
                ComprasSujExcluMontoOpera = ?, ComprasSujExcluMontoReten = ?, 
                ComprasSujExcluTipoOpera = ?, ComprasSujExcluClasificacion = ?, ComprasSujExclusector = ?, 
                ComprasSujExcluTipoCostoGast = ?, ComprasSujExcluAnexo = ?
            WHERE idComSujExclui = ?`,
            [
                data.iddeclaNIT, data.fecha, data.mesDeclarado, data.anioDeclarado, data.tipoDoc || '14', 
                data.nit, data.nombre, data.serie || null, 
                data.numero_control, uuidDte, selloRec, 
                monto, retencion, data.tipoOp || '1', data.clasificacion || '2', 
                data.sector || '4', data.costoGasto || '2', data.anexo || '5', id
            ]
        );
        
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' });
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'MODIFICACION', 'SUJETOS EXCLUIDOS', `Doc Actualizado: ${data.numero_control} - Sujeto: ${data.nombre} - Monto: $${monto}`);

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
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ELIMINACION', 'SUJETOS EXCLUIDOS', `Registro ID Eliminado: ${id}`);

        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Error al eliminar', error: error.message});
    }
};
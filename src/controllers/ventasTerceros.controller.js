import pool from "../config/db.js";
import { registrarAccion } from './historial.controller.js'; 

// 1. OBTENER REGISTROS
export const getVentas = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vtagravterdomici ORDER BY VtaGraTerFecha ASC');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener registros', error: error.message });
    }
};

// 2. CREAR REGISTRO (CON ANTIDUPLICADOS HÍBRIDO)
export const createVenta = async (req, res) => {
    const data = req.body;

    if (!data.iddeclaNIT || !data.fecha || !data.nitMandante || !data.numero_final) {
        return res.status(400).json({ message: 'Auditoría: Empresa, Fecha, NIT de Mandante y Documento son obligatorios.'});
    }

    try {
        const esFisico = !data.uuid_dte || data.uuid_dte.trim() === '';
        const uuidDte = esFisico ? null : data.uuid_dte;
        const selloRec = esFisico ? null : (data.sello_recepcion || null);

        // 🛡️ REGLA ANTIDUPLICADOS INTELIGENTE
        const [duplicado] = await pool.query(
            `SELECT idVtaGravTerDomici FROM vtagravterdomici 
             WHERE iddeclaNIT = ? 
             AND (
                 (VtaGraTerCodGeneracion = ? AND VtaGraTerCodGeneracion IS NOT NULL AND VtaGraTerCodGeneracion != '') 
                 OR 
                 ((VtaGraTerCodGeneracion IS NULL OR VtaGraTerCodGeneracion = '') AND REPLACE(VtaGraTerNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(VtaGraTerNit, '-', '') = REPLACE(?, '-', ''))
             )`,
            [data.iddeclaNIT, uuidDte, data.numero_final, data.nitMandante]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Documento duplicado. Esta Venta a Terceros ya se encuentra registrada.' });
        }

        const monto = parseFloat(data.gravadas) || 0; 
        const iva = data.comision !== undefined ? parseFloat(data.comision) : (monto * 0.13); 

        const [result] = await pool.query(
            `INSERT INTO vtagravterdomici 
            (iddeclaNIT, VtaGraTerNit, VtaGraTerNom, VtaGraTerFecha, VtaGraTerMesDeclarado, VtaGraTerAnioDeclarado,
             LisVtaGraTerTipoDoc, VtaGraTerNumSerie, VtaGraTerNumResolu, VtaGraTerNumDoc, VtaGraTerCodGeneracion, VtaGraTerSelloRecepcion,
             VtaGraTerMontoOper, VtaGraTerIVAOper, 
             VtaGraTerSerieCompLiq, VtaGraTerResolCompLiq, VtaGraTerNumCompLiq, 
             VtaGraTerFechaCompLiq, VtaGraTerDUI, VtaGraTerAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '4')`,
            [
                data.iddeclaNIT, 
                data.nitMandante, 
                data.nombreMandante, 
                data.fecha, 
                data.mesDeclarado,
                data.anioDeclarado,
                data.LisVtaGraTerTipoDoc || '03', 
                data.serie || null, 
                data.resolucion || null, 
                data.numero_final, 
                uuidDte,
                selloRec, 
                monto, 
                iva,
                data.VtaGraTerSerieCompLiq || null, 
                data.VtaGraTerResolCompLiq || null, 
                data.VtaGraTerNumCompLiq || null, 
                data.VtaGraTerFechaCompLiq || null, 
                data.VtaGraTerDUI || null
            ]
        );

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'CREACION', 'VENTA TERCEROS', `Doc: ${data.numero_final} - Mandante: ${data.nombreMandante}`);

        res.status(201).json({ message: 'Venta a Terceros Guardada', id: result.insertId });
    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Falla en la Integridad de Datos', error: error.message });
    }
};

// 3. ACTUALIZAR REGISTRO
export const updateVenta = async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        const esFisico = !data.uuid_dte || data.uuid_dte.trim() === '';
        const uuidDte = esFisico ? null : data.uuid_dte;
        const selloRec = esFisico ? null : (data.sello_recepcion || null);

        const [duplicado] = await pool.query(
            `SELECT idVtaGravTerDomici FROM vtagravterdomici 
             WHERE iddeclaNIT = ? 
             AND idVtaGravTerDomici != ?
             AND (
                 (VtaGraTerCodGeneracion = ? AND VtaGraTerCodGeneracion IS NOT NULL AND VtaGraTerCodGeneracion != '') 
                 OR 
                 ((VtaGraTerCodGeneracion IS NULL OR VtaGraTerCodGeneracion = '') AND REPLACE(VtaGraTerNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(VtaGraTerNit, '-', '') = REPLACE(?, '-', ''))
             )`,
            [data.iddeclaNIT, id, uuidDte, data.numero_final, data.nitMandante]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRO registro con ese Documento/UUID.' });
        }

        const monto = parseFloat(data.gravadas) || 0;
        const iva = parseFloat(data.comision) || 0;

        const [result] = await pool.query(
            `UPDATE vtagravterdomici SET 
            iddeclaNIT=?, VtaGraTerNit=?, VtaGraTerNom=?, VtaGraTerFecha=?, VtaGraTerMesDeclarado=?, VtaGraTerAnioDeclarado=?,
            LisVtaGraTerTipoDoc=?, VtaGraTerNumSerie=?, VtaGraTerNumResolu=?, VtaGraTerNumDoc=?, VtaGraTerCodGeneracion=?, VtaGraTerSelloRecepcion=?,
            VtaGraTerMontoOper=?, VtaGraTerIVAOper=?, 
            VtaGraTerSerieCompLiq=?, VtaGraTerResolCompLiq=?, VtaGraTerNumCompLiq=?, VtaGraTerFechaCompLiq=?, VtaGraTerDUI=?, VtaGraTerAnexo='4'
            WHERE idVtaGravTerDomici = ?`,
            [
                data.iddeclaNIT, data.nitMandante, data.nombreMandante, data.fecha, data.mesDeclarado, data.anioDeclarado,
                data.LisVtaGraTerTipoDoc || '03', data.serie || null, data.resolucion || null, data.numero_final, uuidDte, selloRec,
                monto, iva, data.VtaGraTerSerieCompLiq || null, data.VtaGraTerResolCompLiq || null, data.VtaGraTerNumCompLiq || null, data.VtaGraTerFechaCompLiq || null, data.VtaGraTerDUI || null, id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' });

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'MODIFICACION', 'VENTA TERCEROS', `Doc Actualizado: ${data.numero_final}`);

        res.json({ message: 'Actualizado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// 4. ELIMINAR REGISTRO
export const deleteVenta = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM vtagravterdomici WHERE idVtaGravTerDomici = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado'});

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ELIMINACION', 'VENTA TERCEROS', `Registro ID Eliminado: ${id}`);

        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
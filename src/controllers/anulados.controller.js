import pool from "../config/db.js";
import { registrarAccion } from './historial.controller.js';

export const getAnulados = async (req, res) => {
        const { nit, mes, anio } = req.query;
    try {
        let query = 'SELECT * FROM anuladosextraviados';
        const params = [];
        const condiciones = [];

        if (nit)  { condiciones.push('iddeclaNIT = ?');  params.push(nit); }
        if (mes)  { condiciones.push('AnulMesDeclarado = ?');  params.push(mes); }
        if (anio) { condiciones.push('AnulAnioDeclarado = ?'); params.push(anio); }

        if (condiciones.length > 0) {
            query += ' WHERE ' + condiciones.join(' AND ');
        }
        query += ' ORDER BY DetaDocFecha ASC';

        const [rows] = await pool.query(query, params);;
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener anulados', error: error.message });
    }
};

export const createAnulacion = async (req, res) => {
    const d = req.body;

    if (!d.iddeclaNIT || !d.fecha || !d.tipoDoc || !d.tipoDeta) {
        return res.status(400).json({ message: 'Auditoría: Empresa, Fecha, Tipo de Documento y Tipo de Detalle son obligatorios.'});
    }

    try {
        // 🛡️ LIMPIEZA DE DATOS MAESTRA
        const uuidLimpio = d.uuid_dte ? d.uuid_dte.replace(/-/g, '') : null;
        // 🛡️ Sello sin guiones para la BD
        const selloLimpio = d.sello_recepcion ? d.sello_recepcion.replace(/-/g, '') : null; 
        const fechaLimpia = d.fecha ? d.fecha.split('T')[0] : null; 

        // 🛡️ REGLA ANTIDUPLICADOS
        const [duplicado] = await pool.query(
            `SELECT idAnuladosExtraviados FROM anuladosextraviados 
             WHERE iddeclaNIT = ? AND DetaDocTipoDoc = ? 
             AND (
                 (DetaDocCodGeneracion = ? AND DetaDocCodGeneracion IS NOT NULL AND DetaDocCodGeneracion != '') 
                 OR 
                 (DetaDocDesde = ? AND DetaDocHasta = ?)
             )`,
            [d.iddeclaNIT, d.tipoDoc, uuidLimpio, d.desde, d.hasta]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Este documento o rango ya se encuentra registrado como Anulado/Extraviado.' });
        }

        // 🛡️ INSERT CON SELLO DE RECEPCIÓN
        const [result] = await pool.query(
            `INSERT INTO anuladosextraviados 
            (iddeclaNIT, DetaDocFecha, AnulMesDeclarado, AnulAnioDeclarado, DetaDocTipoDoc, 
             DetaDocSerie, DetaDocResolu, DetaDocDesde, DetaDocHasta, 
             DetaDocCodGeneracion, DetaDocSelloRecepcion, DetaDocTipoDeta, DetaDocAnexo, DetaDocClase) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                d.iddeclaNIT, fechaLimpia, d.mesDeclarado, d.anioDeclarado, d.tipoDoc, 
                d.serie || null, d.resolucion || null, d.desde, d.hasta || d.desde,
                uuidLimpio, selloLimpio, d.tipoDeta, d.anexo || '1', d.clase || '4'
            ]
        );

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'CREACION', 'ANULADOS/EXTRAVIADOS', `Doc: ${d.desde} - Tipo: ${d.tipoDeta === '1' ? 'Anulado' : 'Extraviado'}`);

        res.status(201).json({ message: 'Registro de Invalidación Guardado', id: result.insertId });
    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Falla al guardar', error: error.message });
    }
};

export const updateAnulacion = async (req, res) => {
    const { id } = req.params;
    const d = req.body;

    try {
        const uuidLimpio = d.uuid_dte ? d.uuid_dte.replace(/-/g, '') : null;
        const selloLimpio = d.sello_recepcion ? d.sello_recepcion.replace(/-/g, '') : null;

        const [result] = await pool.query(
            `UPDATE anuladosextraviados SET 
            iddeclaNIT=?, DetaDocFecha=?, AnulMesDeclarado=?, AnulAnioDeclarado=?, DetaDocTipoDoc=?, 
            DetaDocSerie=?, DetaDocResolu=?, DetaDocDesde=?, DetaDocHasta=?, 
            DetaDocCodGeneracion=?, DetaDocSelloRecepcion=?, DetaDocTipoDeta=?, DetaDocAnexo=?, DetaDocClase=?
            WHERE idAnuladosExtraviados = ?`,
            [
                d.iddeclaNIT, d.fecha, d.mesDeclarado, d.anioDeclarado, d.tipoDoc,
                d.serie || null, d.resolucion || null, d.desde, d.hasta || d.desde,
                uuidLimpio, selloLimpio, d.tipoDeta, d.anexo || '1', d.clase || '4', id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' });

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'MODIFICACION', 'ANULADOS/EXTRAVIADOS', `Doc Actualizado: ${d.desde}`);

        res.json({ message: 'Actualizado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

export const deleteAnulacion = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM anuladosextraviados WHERE idAnuladosExtraviados = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado'});

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ELIMINACION', 'ANULADOS/EXTRAVIADOS', `Registro ID: ${id}`);

        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};

// 🛡️ REPARADO: Ahora esta función también extrae el SELLO de las tablas originales
export const buscarDocumentoInteligente = async (req, res) => {
    const { tipo, termino, nit } = req.query;
    if (!termino || !tipo || !nit) return res.status(400).json({message: "Faltan parámetros."});

    try {
        let query = "";
        const searchTerm = `%${termino.replace(/-/g, '')}%`;

        if (tipo === '01') { // Consumidor Final
            query = `SELECT ConsFecha as fecha, ConsCodGeneracion as uuid, ConsNumDocAL as dte, ConsSelloRecepcion as sello 
                     FROM consumidorfinal 
                     WHERE iddeclaNIT = ? AND (REPLACE(ConsCodGeneracion, '-', '') LIKE ? OR REPLACE(ConsNumDocAL, '-', '') LIKE ?) LIMIT 1`;
        } else if (tipo === '03-V') { // Ventas CCF
            query = `SELECT FiscFecha as fecha, FiscCodGeneracion as uuid, FiscNumDoc as dte, FiscSelloRecepcion as sello 
                     FROM credfiscal 
                     WHERE iddeclaNIT = ? AND (REPLACE(FiscCodGeneracion, '-', '') LIKE ? OR REPLACE(FiscNumDoc, '-', '') LIKE ?) LIMIT 1`;
        } else if (tipo === 'Compra') { // Compras
            query = `SELECT ComFecha as fecha, ComCodGeneracion as uuid, ComNumero as dte, NULL as sello 
                     FROM compras 
                     WHERE iddeclaNIT = ? AND (REPLACE(ComCodGeneracion, '-', '') LIKE ? OR REPLACE(ComNumero, '-', '') LIKE ?) LIMIT 1`;
        }

        if (query) {
            const [rows] = await pool.query(query, [nit, searchTerm, searchTerm]);
            return res.json(rows[0] || null);
        }
        res.json(null);
    } catch (error) {
        res.status(500).json({ message: "Error en búsqueda", error: error.message });
    }
};
import pool from "../config/db.js";
import { registrarAccion } from './historial.controller.js'; 

// 1. OBTENER REGISTROS
export const getVentas = async (req, res) => {
        const { nit, mes, anio } = req.query;
    try {
        let query = 'SELECT * FROM vtagravterdomici';
        const params = [];
        const condiciones = [];

        if (nit)  { condiciones.push('iddeclaNIT = ?');  params.push(nit); }
        if (mes)  { condiciones.push('VtaGraTerMesDeclarado = ?');  params.push(mes); }
        if (anio) { condiciones.push('VtaGraTerAnioDeclarado = ?'); params.push(anio); }

        if (condiciones.length > 0) {
            query += ' WHERE ' + condiciones.join(' AND ');
        }
        query += ' ORDER BY VtaGraTerFecha ASC';

        const [rows] = await pool.query(query, params);;
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener registros', error: error.message });
    }
};

// 2. CREAR REGISTRO (CON ANTIDUPLICADOS)
export const createVenta = async (req, res) => {
    const data = req.body;

    if (!data.iddeclaNIT || !data.fecha || !data.nitMandante || !data.numero) {
        return res.status(400).json({ message: 'Auditoría: Empresa, Fecha, NIT de Mandante y DTE son obligatorios.'});
    }

    try {
        // 🛡️ REGLA ANTIDUPLICADOS
        const [duplicado] = await pool.query(
            `SELECT idVtaGravTerDomici FROM vtagravterdomici 
             WHERE iddeclaNIT = ? 
             AND (
                 (VtaGraTerCodGeneracion = ? AND VtaGraTerCodGeneracion IS NOT NULL AND VtaGraTerCodGeneracion != '') 
                 OR 
                 (REPLACE(VtaGraTerNumDoc, '-', '') = REPLACE(?, '-', ''))
             )`,
            [data.iddeclaNIT, data.uuid_dte, data.numero]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Documento duplicado. Esta Venta a Terceros ya se encuentra registrada.' });
        }

        const monto = parseFloat(data.gravadas) || 0; 
        const iva = data.comision !== undefined ? parseFloat(data.comision) : (monto * 0.13); 

        // 🛡️ SE INYECTA VtaGraTerSelloRecepcion EN EL INSERT
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
                data.VtaGraTerNumResolu || null, 
                data.numero, 
                data.uuid_dte,
                data.sello_recepcion || null, // 🛡️ NUEVO CAMPO CAPTURADO
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
        registrarAccion(usuario, 'CREACION', 'VENTA TERCEROS', `DTE: ${data.numero} - Mandante: ${data.nombreMandante} - Monto: $${monto}`);

        res.status(201).json({ message: 'Venta a Terceros Certificada', id: result.insertId });
    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Falla en la Integridad de Datos', error: error.message });
    }
};

// 3. ACTUALIZAR REGISTRO (CON ANTIDUPLICADOS)
export const updateVenta = async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        // 🛡️ REGLA ANTIDUPLICADOS PARA ACTUALIZAR
        const [duplicado] = await pool.query(
            `SELECT idVtaGravTerDomici FROM vtagravterdomici 
             WHERE iddeclaNIT = ? 
             AND idVtaGravTerDomici != ?
             AND (
                 (VtaGraTerCodGeneracion = ? AND VtaGraTerCodGeneracion IS NOT NULL AND VtaGraTerCodGeneracion != '') 
                 OR 
                 (REPLACE(VtaGraTerNumDoc, '-', '') = REPLACE(?, '-', ''))
             )`,
            [data.iddeclaNIT, id, data.uuid_dte, data.numero]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Conflicto de Documento. Ya existe OTRO registro con ese DTE/UUID.' });
        }

        const monto = parseFloat(data.gravadas) || 0;
        const iva = parseFloat(data.comision) || 0;

        // 🛡️ SE INYECTA VtaGraTerSelloRecepcion EN EL UPDATE
        const [result] = await pool.query(
            `UPDATE vtagravterdomici SET 
            iddeclaNIT=?, VtaGraTerNit=?, VtaGraTerNom=?, VtaGraTerFecha=?, VtaGraTerMesDeclarado=?, VtaGraTerAnioDeclarado=?,
            LisVtaGraTerTipoDoc=?, VtaGraTerNumSerie=?, VtaGraTerNumResolu=?, VtaGraTerNumDoc=?, VtaGraTerCodGeneracion=?, VtaGraTerSelloRecepcion=?,
            VtaGraTerMontoOper=?, VtaGraTerIVAOper=?, 
            VtaGraTerSerieCompLiq=?, VtaGraTerResolCompLiq=?, VtaGraTerNumCompLiq=?, VtaGraTerFechaCompLiq=?, VtaGraTerDUI=?, VtaGraTerAnexo='4'
            WHERE idVtaGravTerDomici = ?`,
            [
                data.iddeclaNIT,
                data.nitMandante, 
                data.nombreMandante, 
                data.fecha, 
                data.mesDeclarado,
                data.anioDeclarado,
                data.LisVtaGraTerTipoDoc || '03',
                data.serie || null, 
                data.VtaGraTerNumResolu || null, 
                data.numero, 
                data.uuid_dte,
                data.sello_recepcion || null, // 🛡️ NUEVO CAMPO CAPTURADO
                monto, 
                iva,
                data.VtaGraTerSerieCompLiq || null, 
                data.VtaGraTerResolCompLiq || null, 
                data.VtaGraTerNumCompLiq || null, 
                data.VtaGraTerFechaCompLiq || null, 
                data.VtaGraTerDUI || null,
                id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' });

        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'MODIFICACION', 'VENTA TERCEROS', `DTE Actualizado: ${data.numero} - Monto: $${monto}`);

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
import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js';

// --- 1. OBTENER TODAS LAS VENTAS CF Y NOTAS (UNION ALL) ---
export const getVentasCF = async (req, res) => {
    try {
        // 🛡️ CORREGIDO: Se inyectan NULL y 'Cliente General' en consumidorfinal para empatar con la tabla notas_credito
        const query = `
            SELECT 
                idconsfinal, iddeclaNIT, ConsFecha, ConsClaseDoc, ConsTipoDoc, ConsSerieDoc, 
                ConsNumDocDEL, ConsNumDocAL, ConsCodGeneracion, 
                NULL AS ConsNumDocIdentCliente, 'Cliente General' AS ConsNomRazonCliente, 
                ConsVtaExentas, ConsVtaNoSujetas, ConsVtaGravLocales, ConsTotalVta, 
                ConsTipoOpera, ConsTipoIngreso, ConsNumAnexo, ConsMesDeclarado, ConsAnioDeclarado, 
                'consumidorfinal' AS OrigenTabla 
            FROM consumidorfinal 
            
            UNION ALL 
            
            SELECT 
                idNotaCredito as idconsfinal, iddeclaNIT, NCFecha as ConsFecha, NCClaseDoc as ConsClaseDoc, 
                NCTipoDoc as ConsTipoDoc, NULL as ConsSerieDoc, NCNumero as ConsNumDocDEL, NCNumero as ConsNumDocAL, 
                NCCodGeneracion as ConsCodGeneracion, NCNitContraparte as ConsNumDocIdentCliente, 
                NCNombreContraparte as ConsNomRazonCliente, NCMontoExento as ConsVtaExentas, 0.00 as ConsVtaNoSujetas, 
                NCMontoGravado as ConsVtaGravLocales, NCTotal as ConsTotalVta, '1' as ConsTipoOpera, 
                '1' as ConsTipoIngreso, NCAnexo as ConsNumAnexo, NCMesDeclarado as ConsMesDeclarado, 
                NCAnioDeclarado as ConsAnioDeclarado, 'notas_credito' AS OrigenTabla 
            FROM notas_credito 
            WHERE NCTipo = 'VENTA' AND NCAnexo = '1'
            
            ORDER BY ConsFecha ASC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener ventas CF', error: error.message });
    }
};

// --- 2. OBTENER UNA VENTA CF O NOTA ---
export const getVentaCFById = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query; // 🛡️ RECIBIMOS LA TABLA DE ORIGEN
    try {
        if (origen === 'notas_credito') {
            const [rows] = await pool.query('SELECT * FROM notas_credito WHERE idNotaCredito = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            res.json(rows[0]);
        } else {
            const [rows] = await pool.query('SELECT * FROM consumidorfinal WHERE idconsfinal = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Venta no encontrada' });
            res.json(rows[0]);
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener venta', error: error.message });
    }
};

// --- 3. CREAR NUEVA VENTA CF, NC o ND (ENRUTAMIENTO INTELIGENTE) ---
export const createVentasCF = async (req, res) => {
    try {
        const d = req.body;

        if (!d.iddeclaNIT || !d.numero_control) {
            return res.status(400).json({ message: 'Empresa y Número DTE son obligatorios.' });
        }

        const gravadas = parseFloat(d.gravadas) || 0;
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;
        const tipoDoc = d.tipoDocumento || '01';
        const usuario = req.headers['x-usuario'] || 'Sistema';

        if (tipoDoc === '05' || tipoDoc === '06') {
            // 🛡️ ENRUTAMIENTO A NOTAS DE CRÉDITO (Anexo 1)
            const [duplicado] = await pool.query(
                `SELECT idNotaCredito FROM notas_credito 
                 WHERE iddeclaNIT = ? AND (
                     (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                     OR (REPLACE(NCNumero, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, d.uuid_dte, d.numero_control]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Documento duplicado en Notas de Crédito.' });

            const query = `
                INSERT INTO notas_credito 
                (iddeclaNIT, NCFecha, NCClaseDoc, NCTipoDoc, NCNumero, NCCodGeneracion, NCNitContraparte, NCNombreContraparte, NCNumDocOrigen, NCMontoGravado, NCMontoExento, NCIva, NCTotal, NCTipo, NCMesDeclarado, NCAnioDeclarado, NCAnexo) 
                VALUES (?, ?, '4', ?, ?, ?, ?, ?, 'N/A', ?, ?, 0, ?, 'VENTA', ?, ?, '1')
            `;
            // Para CF, el DUI/NIT de contraparte puede ser nulo o vacío
            const docCliente = d.documentoCliente || '';
            const nomCliente = d.cliente || 'Cliente General';
            const values = [d.iddeclaNIT, d.fecha, tipoDoc, d.numero_control, d.uuid_dte, docCliente, nomCliente, gravadas, exentas, total, d.mesDeclarado, d.anioDeclarado];
            
            const [result] = await pool.query(query, values);
            registrarAccion(usuario, 'CREACION', 'ANEXO 1 (NOTAS)', `Doc: ${d.numero_control} - Total: $${total}`);
            res.status(201).json({ message: 'Nota Guardada Exitosamente', id: result.insertId });

        } else {
            // 🛡️ ENRUTAMIENTO A CONSUMIDOR FINAL (Anexo 1 normal)
            const [duplicado] = await pool.query(
                `SELECT idconsfinal FROM consumidorfinal 
                 WHERE iddeclaNIT = ? AND (
                     (ConsCodGeneracion = ? AND ConsCodGeneracion IS NOT NULL AND ConsCodGeneracion != '') 
                     OR (REPLACE(ConsNumDocAL, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, d.uuid_dte, d.numero_control]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Documento duplicado. Este documento ya se encuentra registrado.' });

            // 🛡️ CORREGIDO: SE QUITARON LAS COLUMNAS FANTASMA DE ESTE INSERT
            const query = `
                INSERT INTO consumidorfinal 
                (iddeclaNIT, ConsFecha, ConsMesDeclarado, ConsAnioDeclarado, ConsClaseDoc, ConsTipoDoc, ConsSerieDoc, ConsNumDocDEL, ConsNumDocAL, ConsCodGeneracion, ConsVtaExentas, ConsVtaNoSujetas, ConsVtaGravLocales, ConsTotalVta, ConsTipoOpera, ConsTipoIngreso, ConsNumAnexo) 
                VALUES (?, ?, ?, ?, '4', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1')
            `;
            const values = [d.iddeclaNIT, d.fecha, d.mesDeclarado, d.anioDeclarado, tipoDoc, d.serie || null, d.numero_control, d.numero_control, d.uuid_dte, exentas, noSujetas, gravadas, total, d.tipo_operacion || '1', d.tipo_ingreso || '1'];

            const [result] = await pool.query(query, values);
            registrarAccion(usuario, 'CREACION', 'ANEXO 1', `Doc: ${d.numero_control} - Total: $${total}`);
            res.status(201).json({ message: 'Documento Guardado Exitosamente', id: result.insertId });
        }

    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Error en la Base de Datos', error: error.message });
    }
};

// --- 4. ACTUALIZAR VENTA CF, NC o ND ---
export const updateVentasCF = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query; // 🛡️ RECIBIMOS LA TABLA DE ORIGEN
    try {
        const d = req.body;
        
        const gravadas = parseFloat(d.gravadas) || 0;
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;
        const tipoDoc = d.tipoDocumento || '01';
        const usuario = req.headers['x-usuario'] || 'Sistema';

        if (origen === 'notas_credito') {
            const [duplicado] = await pool.query(
                `SELECT idNotaCredito FROM notas_credito 
                 WHERE iddeclaNIT = ? AND idNotaCredito != ? AND (
                     (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                     OR (REPLACE(NCNumero, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, id, d.uuid_dte, d.numero_control]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRA Nota con ese mismo Número o UUID.' });

            const query = `
                UPDATE notas_credito SET 
                    iddeclaNIT=?, NCFecha=?, NCTipoDoc=?, NCNumero=?, NCCodGeneracion=?, NCNitContraparte=?, NCNombreContraparte=?, NCMontoGravado=?, NCMontoExento=?, NCTotal=?, NCMesDeclarado=?, NCAnioDeclarado=?
                WHERE idNotaCredito = ?
            `;
            const docCliente = d.documentoCliente || '';
            const nomCliente = d.cliente || 'Cliente General';
            const values = [d.iddeclaNIT, d.fecha, tipoDoc, d.numero_control, d.uuid_dte, docCliente, nomCliente, gravadas, exentas, total, d.mesDeclarado, d.anioDeclarado, id];

            const [result] = await pool.query(query, values);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            registrarAccion(usuario, 'MODIFICACION', 'ANEXO 1 (NOTAS)', `DTE: ${d.numero_control}`);
            res.json({ message: 'Nota actualizada correctamente' });

        } else {
            const [duplicado] = await pool.query(
                `SELECT idconsfinal FROM consumidorfinal 
                 WHERE iddeclaNIT = ? AND idconsfinal != ? AND (
                     (ConsCodGeneracion = ? AND ConsCodGeneracion IS NOT NULL AND ConsCodGeneracion != '') 
                     OR (REPLACE(ConsNumDocAL, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, id, d.uuid_dte, d.numero_control]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRO documento con ese mismo Número o UUID.' });

            // 🛡️ CORREGIDO: SE QUITARON LAS COLUMNAS FANTASMA DE ESTE UPDATE
            const query = `
                UPDATE consumidorfinal SET 
                    iddeclaNIT=?, ConsFecha=?, ConsMesDeclarado=?, ConsAnioDeclarado=?, ConsTipoDoc=?, ConsSerieDoc=?, ConsNumDocDEL=?, ConsNumDocAL=?, ConsCodGeneracion=?, ConsVtaExentas=?, ConsVtaNoSujetas=?, ConsVtaGravLocales=?, ConsTotalVta=?, ConsTipoOpera=?, ConsTipoIngreso=?
                WHERE idconsfinal = ?
            `;
            const values = [d.iddeclaNIT, d.fecha, d.mesDeclarado, d.anioDeclarado, tipoDoc, d.serie || null, d.numero_control, d.numero_control, d.uuid_dte, exentas, noSujetas, gravadas, total, d.tipo_operacion || '1', d.tipo_ingreso || '1', id];

            const [result] = await pool.query(query, values);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Documento no encontrado' });
            registrarAccion(usuario, 'MODIFICACION', 'ANEXO 1', `DTE: ${d.numero_control}`);
            res.json({ message: 'Documento actualizado correctamente' });
        }

    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// --- 5. ELIMINAR VENTA CF O NOTA ---
export const deleteVentasCF = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query; // 🛡️ RECIBIMOS LA TABLA DE ORIGEN
    try {
        const usuario = req.headers['x-usuario'] || 'Sistema';

        if (origen === 'notas_credito') {
            const [result] = await pool.query('DELETE FROM notas_credito WHERE idNotaCredito = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            registrarAccion(usuario, 'ELIMINACION', 'ANEXO 1 (NOTAS)', `Registro ID Eliminado: ${id}`);
        } else {
            const [result] = await pool.query('DELETE FROM consumidorfinal WHERE idconsfinal = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Documento no encontrado' });
            registrarAccion(usuario, 'ELIMINACION', 'ANEXO 1', `Registro ID Eliminado: ${id}`);
        }

        res.json({ message: 'Documento eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
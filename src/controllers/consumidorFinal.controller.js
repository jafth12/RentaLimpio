import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js';

// --- 1. OBTENER TODAS LAS VENTAS CF Y NOTAS (UNION ALL) ---
export const getVentasCF = async (req, res) => {
    try {
        const query = `
            SELECT 
                idconsfinal, iddeclaNIT, ConsFecha, ConsClaseDoc, ConsTipoDoc, ConsSerieDoc, 
                ConsNumDocDEL, ConsNumDocAL, ConsCodGeneracion, 
                ConsNumResolu, ConsNumMaqRegistro, 
                ConsNumDocIdentCliente, ConsNomRazonCliente, 
                ConsVtaExentas, ConsVtaNoSujetas, ConsVtaGravLocales, ConsTotalVta, 
                ConsTipoOpera, ConsTipoIngreso, ConsNumAnexo, ConsMesDeclarado, ConsAnioDeclarado, 
                ConsSelloRecepcion, /* 🛡️ NUEVO */
                'consumidorfinal' AS OrigenTabla 
            FROM consumidorfinal 
            
            UNION ALL 
            
            SELECT 
                idNotaCredito as idconsfinal, iddeclaNIT, NCFecha as ConsFecha, NCClaseDoc as ConsClaseDoc, 
                NCTipoDoc as ConsTipoDoc, NULL as ConsSerieDoc, NCNumero as ConsNumDocDEL, NCNumero as ConsNumDocAL, 
                NCCodGeneracion as ConsCodGeneracion, 
                NULL as ConsNumResolu, NULL as ConsNumMaqRegistro, 
                NCNitContraparte as ConsNumDocIdentCliente, 
                NCNombreContraparte as ConsNomRazonCliente, NCMontoExento as ConsVtaExentas, 0.00 as ConsVtaNoSujetas, 
                NCMontoGravado as ConsVtaGravLocales, NCTotal as ConsTotalVta, '1' as ConsTipoOpera, 
                '1' as ConsTipoIngreso, NCAnexo as ConsNumAnexo, NCMesDeclarado as ConsMesDeclarado, 
                NCAnioDeclarado as ConsAnioDeclarado, 
                NULL as ConsSelloRecepcion, /* 🛡️ RELLENO PARA NOTAS DE CRÉDITO */
                'notas_credito' AS OrigenTabla 
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
    const { origen } = req.query; 
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

// --- 3. CREAR NUEVA VENTA CF, NC o ND ---
export const createVentasCF = async (req, res) => {
    try {
        const d = req.body;

        if (!d.iddeclaNIT) {
            return res.status(400).json({ message: 'La Empresa / Declarante es obligatoria.' });
        }

        const gravadas = parseFloat(d.gravadas) || 0;
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;
        const tipoDoc = d.tipoDocumento || '01';
        const usuario = req.headers['x-usuario'] || 'Sistema';

        const docCliente = d.documentoCliente || '';
        const nomCliente = d.cliente || 'Cliente General';
        
        const esFisico = d.modoIngreso === 'fisico';
        const claseDoc = esFisico ? (d.maquina ? '2' : '1') : '4'; 
        
        const numDel = esFisico ? d.desde : d.numero_control;
        const numAl = esFisico ? d.hasta : d.numero_control;
        const uuidDte = esFisico ? null : (d.uuid_dte || '');
        const selloRec = esFisico ? null : (d.sello_recepcion || null); // 🛡️ NUEVO: Capturamos el Sello
        const serie = d.serie || null;
        const resolucion = esFisico ? d.resolucion : null;
        const maquina = esFisico ? d.maquina : null;

        if (esFisico) {
            if (!numDel || !numAl) return res.status(400).json({ message: '⚠️ Los correlativos DEL y AL son obligatorios para los documentos Físicos.' });
            if (!resolucion) return res.status(400).json({ message: '⚠️ El número de Resolución es obligatorio para los documentos Físicos.' });
        } else {
            if (!numDel || !uuidDte) return res.status(400).json({ message: '⚠️ El Número de Control y el UUID son obligatorios para los documentos Electrónicos (DTE).' });
        }

        if (tipoDoc === '05' || tipoDoc === '06') {
            const [duplicado] = await pool.query(
                `SELECT idNotaCredito FROM notas_credito 
                 WHERE iddeclaNIT = ? AND (
                     (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                     OR ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, uuidDte, numDel]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Este documento o rango ya fue registrado en Notas de Crédito.' });

            const query = `
                INSERT INTO notas_credito 
                (iddeclaNIT, NCFecha, NCClaseDoc, NCTipoDoc, NCNumero, NCCodGeneracion, NCNitContraparte, NCNombreContraparte, NCNumDocOrigen, NCMontoGravado, NCMontoExento, NCIva, NCTotal, NCTipo, NCMesDeclarado, NCAnioDeclarado, NCAnexo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'N/A', ?, ?, 0, ?, 'VENTA', ?, ?, '1')
            `;
            const values = [d.iddeclaNIT, d.fecha, claseDoc, tipoDoc, numDel, uuidDte, docCliente, nomCliente, gravadas, exentas, total, d.mesDeclarado, d.anioDeclarado];
            
            const [result] = await pool.query(query, values);
            registrarAccion(usuario, 'CREACION', 'ANEXO 1 (NOTAS)', `Doc: ${numDel} - Total: $${total}`);
            res.status(201).json({ message: 'Nota Guardada Exitosamente', id: result.insertId });

        } else {
            const [duplicado] = await pool.query(
                `SELECT idconsfinal FROM consumidorfinal 
                 WHERE iddeclaNIT = ? AND (
                     (ConsCodGeneracion = ? AND ConsCodGeneracion IS NOT NULL AND ConsCodGeneracion != '') 
                     OR ((ConsCodGeneracion IS NULL OR ConsCodGeneracion = '') AND REPLACE(ConsNumDocDEL, '-', '') = REPLACE(?, '-', '') AND REPLACE(ConsNumDocAL, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, uuidDte, numDel, numAl]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Este Documento Físico o Rango ya se encuentra registrado en el sistema.' });

            // 🛡️ NUEVO: Añadido ConsSelloRecepcion al query
            const query = `
                INSERT INTO consumidorfinal 
                (iddeclaNIT, ConsFecha, ConsMesDeclarado, ConsAnioDeclarado, ConsClaseDoc, ConsTipoDoc, ConsSerieDoc, ConsNumResolu, ConsNumMaqRegistro, ConsNumDocDEL, ConsNumDocAL, ConsCodGeneracion, ConsSelloRecepcion, ConsVtaExentas, ConsVtaNoSujetas, ConsVtaGravLocales, ConsTotalVta, ConsTipoOpera, ConsTipoIngreso, ConsNumAnexo, ConsNomRazonCliente, ConsNumDocIdentCliente) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1', ?, ?)
            `;
            // 🛡️ NUEVO: Añadido selloRec a los values
            const values = [d.iddeclaNIT, d.fecha, d.mesDeclarado, d.anioDeclarado, claseDoc, tipoDoc, serie, resolucion, maquina, numDel, numAl, uuidDte, selloRec, exentas, noSujetas, gravadas, total, d.tipo_operacion || '1', d.tipo_ingreso || '1', nomCliente, docCliente];

            const [result] = await pool.query(query, values);
            registrarAccion(usuario, 'CREACION', 'ANEXO 1', `Doc/Rango: ${numDel} - Total: $${total}`);
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
    const { origen } = req.query; 
    try {
        const d = req.body;
        
        const gravadas = parseFloat(d.gravadas) || 0;
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;
        const tipoDoc = d.tipoDocumento || '01';
        const usuario = req.headers['x-usuario'] || 'Sistema';

        const docCliente = d.documentoCliente || '';
        const nomCliente = d.cliente || 'Cliente General';
        
        const esFisico = d.modoIngreso === 'fisico';
        const claseDoc = esFisico ? (d.maquina ? '2' : '1') : '4';
        
        const numDel = esFisico ? d.desde : d.numero_control;
        const numAl = esFisico ? d.hasta : d.numero_control;
        const uuidDte = esFisico ? null : (d.uuid_dte || '');
        const selloRec = esFisico ? null : (d.sello_recepcion || null); // 🛡️ NUEVO: Capturamos el sello en la edición
        const serie = d.serie || null;
        const resolucion = esFisico ? d.resolucion : null;
        const maquina = esFisico ? d.maquina : null;

        if (esFisico) {
            if (!numDel || !numAl) return res.status(400).json({ message: '⚠️ Los correlativos DEL y AL son obligatorios.' });
            if (!resolucion) return res.status(400).json({ message: '⚠️ El número de Resolución es obligatorio.' });
        } else {
            if (!numDel || !uuidDte) return res.status(400).json({ message: '⚠️ El Número de Control y el UUID son obligatorios.' });
        }

        if (origen === 'notas_credito') {
            const [duplicado] = await pool.query(
                `SELECT idNotaCredito FROM notas_credito 
                 WHERE iddeclaNIT = ? AND idNotaCredito != ? AND (
                     (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                     OR ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, id, uuidDte, numDel]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRA Nota registrada igual.' });

            const query = `
                UPDATE notas_credito SET 
                    iddeclaNIT=?, NCFecha=?, NCClaseDoc=?, NCTipoDoc=?, NCNumero=?, NCCodGeneracion=?, NCNitContraparte=?, NCNombreContraparte=?, NCMontoGravado=?, NCMontoExento=?, NCTotal=?, NCMesDeclarado=?, NCAnioDeclarado=?
                WHERE idNotaCredito = ?
            `;
            const values = [d.iddeclaNIT, d.fecha, claseDoc, tipoDoc, numDel, uuidDte, docCliente, nomCliente, gravadas, exentas, total, d.mesDeclarado, d.anioDeclarado, id];

            const [result] = await pool.query(query, values);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            registrarAccion(usuario, 'MODIFICACION', 'ANEXO 1 (NOTAS)', `DTE: ${numDel}`);
            res.json({ message: 'Nota actualizada correctamente' });

        } else {
            const [duplicado] = await pool.query(
                `SELECT idconsfinal FROM consumidorfinal 
                 WHERE iddeclaNIT = ? AND idconsfinal != ? AND (
                     (ConsCodGeneracion = ? AND ConsCodGeneracion IS NOT NULL AND ConsCodGeneracion != '') 
                     OR ((ConsCodGeneracion IS NULL OR ConsCodGeneracion = '') AND REPLACE(ConsNumDocDEL, '-', '') = REPLACE(?, '-', '') AND REPLACE(ConsNumDocAL, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, id, uuidDte, numDel, numAl]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRO documento o rango registrado igual.' });

            // 🛡️ NUEVO: Añadido ConsSelloRecepcion=? al query
            const query = `
                UPDATE consumidorfinal SET 
                    iddeclaNIT=?, ConsFecha=?, ConsMesDeclarado=?, ConsAnioDeclarado=?, ConsClaseDoc=?, ConsTipoDoc=?, ConsSerieDoc=?, ConsNumResolu=?, ConsNumMaqRegistro=?, ConsNumDocDEL=?, ConsNumDocAL=?, ConsCodGeneracion=?, ConsSelloRecepcion=?, ConsVtaExentas=?, ConsVtaNoSujetas=?, ConsVtaGravLocales=?, ConsTotalVta=?, ConsTipoOpera=?, ConsTipoIngreso=?, ConsNomRazonCliente=?, ConsNumDocIdentCliente=?
                WHERE idconsfinal = ?
            `;
            // 🛡️ NUEVO: Añadido selloRec a los values
            const values = [d.iddeclaNIT, d.fecha, d.mesDeclarado, d.anioDeclarado, claseDoc, tipoDoc, serie, resolucion, maquina, numDel, numAl, uuidDte, selloRec, exentas, noSujetas, gravadas, total, d.tipo_operacion || '1', d.tipo_ingreso || '1', nomCliente, docCliente, id];

            const [result] = await pool.query(query, values);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Documento no encontrado' });
            registrarAccion(usuario, 'MODIFICACION', 'ANEXO 1', `DTE/Rango: ${numDel}`);
            res.json({ message: 'Documento actualizado correctamente' });
        }

    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// --- 5. ELIMINAR VENTA CF O NOTA ---
export const deleteVentasCF = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query;
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
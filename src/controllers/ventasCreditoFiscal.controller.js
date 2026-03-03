import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js'; 

// --- 1. OBTENER TODAS LAS VENTAS CCF Y NOTAS (UNION) ---
export const getVentasCCF = async (req, res) => {
    try {
        // 🛡️ CORRECCIÓN: Se eliminó la columna fantasma 'NCCodGenOrigen' y se reemplazó con 'NULL'
        const query = `
            SELECT 
                idCredFiscal, iddeclaNIT, FiscFecha, FisClasDoc, FisTipoDoc, FiscSerieDoc, 
                FiscNumDoc, FiscCodGeneracion, FiscNumContInter, FiscNit, FiscNomRazonDenomi, 
                FiscVtaExen, FiscVtaNoSujetas, FiscVtaGravLocal, FiscDebitoFiscal, FiscTotalVtas, 
                BusFiscTipoOperaRenta, BusFiscTipoIngresoRenta, FiscMesDeclarado, FiscAnioDeclarado, 
                'credfiscal' AS OrigenTabla 
            FROM credfiscal 
            
            UNION ALL 
            
            SELECT 
                idNotaCredito as idCredFiscal, iddeclaNIT, NCFecha as FiscFecha, NCClaseDoc as FisClasDoc, 
                NCTipoDoc as FisTipoDoc, NULL as FiscSerieDoc, NCNumero as FiscNumDoc, 
                NCCodGeneracion as FiscCodGeneracion, NULL as FiscNumContInter, 
                NCNitContraparte as FiscNit, NCNombreContraparte as FiscNomRazonDenomi, 
                NCMontoExento as FiscVtaExen, 0.00 as FiscVtaNoSujetas, NCMontoGravado as FiscVtaGravLocal, 
                NCIva as FiscDebitoFiscal, NCTotal as FiscTotalVtas, '1' as BusFiscTipoOperaRenta, 
                '1' as BusFiscTipoIngresoRenta, NCMesDeclarado as FiscMesDeclarado, 
                NCAnioDeclarado as FiscAnioDeclarado, 'notas_credito' AS OrigenTabla 
            FROM notas_credito 
            WHERE NCTipo = 'VENTA' AND NCAnexo = '2'
            
            ORDER BY FiscFecha ASC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener ventas CCF', error: error.message });
    }
};

// --- 2. OBTENER UNA VENTA O NOTA ---
export const getVentaCCFById = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query; // 🛡️ RECIBIMOS LA TABLA DE ORIGEN
    try {
        if (origen === 'notas_credito') {
            const [rows] = await pool.query('SELECT * FROM notas_credito WHERE idNotaCredito = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            res.json(rows[0]);
        } else {
            const [rows] = await pool.query('SELECT * FROM credfiscal WHERE idCredFiscal = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Venta no encontrada' });
            res.json(rows[0]);
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener venta', error: error.message });
    }
};

// --- 3. CREAR NUEVA VENTA CCF, NC o ND (ENRUTAMIENTO INTELIGENTE) ---
export const createVentasCCF = async (req, res) => {
    try {
        const d = req.body;

        if (!d.iddeclaNIT || !d.numero_control) {
            return res.status(400).json({ message: 'Empresa y Número DTE son obligatorios.' });
        }

        const gravada = parseFloat(d.gravadas) || 0;
        const debito = d.debitoFiscal !== undefined ? parseFloat(d.debitoFiscal) : (gravada * 0.13);
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;
        const tipoDoc = d.tipoDocumento || '03';
        const usuario = req.headers['x-usuario'] || 'Sistema';

        // 🛡️ ENRUTAMIENTO: Si es NC (05) o ND (06), va a notas_credito
        if (tipoDoc === '05' || tipoDoc === '06') {
            const [duplicado] = await pool.query(
                `SELECT idNotaCredito FROM notas_credito 
                 WHERE iddeclaNIT = ? AND (
                     (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                     OR (REPLACE(NCNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(NCNitContraparte, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, d.uuid_dte, d.numero_control, d.nrc]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Documento duplicado en Notas de Crédito.' });

            const query = `
                INSERT INTO notas_credito 
                (iddeclaNIT, NCFecha, NCClaseDoc, NCTipoDoc, NCNumero, NCCodGeneracion, NCNitContraparte, NCNombreContraparte, NCNumDocOrigen, NCMontoGravado, NCMontoExento, NCIva, NCTotal, NCTipo, NCMesDeclarado, NCAnioDeclarado, NCAnexo) 
                VALUES (?, ?, '4', ?, ?, ?, ?, ?, 'N/A', ?, ?, ?, ?, 'VENTA', ?, ?, '2')
            `;
            const values = [d.iddeclaNIT, d.fecha, tipoDoc, d.numero_control, d.uuid_dte, d.nrc, d.cliente, gravada, exentas, debito, total, d.mesDeclarado, d.anioDeclarado];
            
            const [result] = await pool.query(query, values);
            registrarAccion(usuario, 'CREACION', 'ANEXO 2 (NOTAS)', `Doc: ${d.numero_control} - Total: $${total}`);
            res.status(201).json({ message: 'Nota Guardada Exitosamente', id: result.insertId });

        } else {
            // 🛡️ ENRUTAMIENTO: Si es CCF (03), va a credfiscal
            const [duplicado] = await pool.query(
                `SELECT idCredFiscal FROM credfiscal 
                 WHERE iddeclaNIT = ? AND (
                     (FiscCodGeneracion = ? AND FiscCodGeneracion IS NOT NULL AND FiscCodGeneracion != '') 
                     OR (REPLACE(FiscNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(FiscNit, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, d.uuid_dte, d.numero_control, d.nrc]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Documento duplicado en Crédito Fiscal.' });

            const query = `
                INSERT INTO credfiscal 
                (iddeclaNIT, FiscFecha, FiscMesDeclarado, FiscAnioDeclarado, FisClasDoc, FisTipoDoc, FiscSerieDoc, FiscNumDoc, FiscCodGeneracion, FiscNumContInter, FiscNit, FiscNomRazonDenomi, FiscVtaExen, FiscVtaNoSujetas, FiscVtaGravLocal, FiscDebitoFiscal, FiscTotalVtas, BusFiscTipoOperaRenta, BusFiscTipoIngresoRenta, FiscNumAnexo) 
                VALUES (?, ?, ?, ?, '4', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2')
            `;
            const values = [d.iddeclaNIT, d.fecha, d.mesDeclarado, d.anioDeclarado, tipoDoc, d.serie || null, d.numero_control, d.uuid_dte, d.uuid_dte, d.nrc, d.cliente, exentas, noSujetas, gravada, debito, total, d.tipo_operacion || '1', d.tipo_ingreso || '1'];

            const [result] = await pool.query(query, values);
            registrarAccion(usuario, 'CREACION', 'ANEXO 2', `Doc: ${d.numero_control} - Total: $${total}`);
            res.status(201).json({ message: 'CCF Guardado Exitosamente', id: result.insertId });
        }

    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Error en la Base de Datos', error: error.message });
    }
};

// --- 4. ACTUALIZAR VENTA CCF, NC o ND ---
export const updateVentasCCF = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query; // 🛡️ RECIBIMOS LA TABLA DE ORIGEN
    try {
        const d = req.body;
        
        const gravada = parseFloat(d.gravadas) || 0;
        const debito = d.debitoFiscal !== undefined ? parseFloat(d.debitoFiscal) : (gravada * 0.13);
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;
        const tipoDoc = d.tipoDocumento || '03';
        const usuario = req.headers['x-usuario'] || 'Sistema';

        if (origen === 'notas_credito') {
            const [duplicado] = await pool.query(
                `SELECT idNotaCredito FROM notas_credito 
                 WHERE iddeclaNIT = ? AND idNotaCredito != ? AND (
                     (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                     OR (REPLACE(NCNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(NCNitContraparte, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, id, d.uuid_dte, d.numero_control, d.nrc]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRA Nota con ese mismo Número o UUID.' });

            const query = `
                UPDATE notas_credito SET 
                    iddeclaNIT=?, NCFecha=?, NCTipoDoc=?, NCNumero=?, NCCodGeneracion=?, NCNitContraparte=?, NCNombreContraparte=?, NCMontoGravado=?, NCMontoExento=?, NCIva=?, NCTotal=?, NCMesDeclarado=?, NCAnioDeclarado=?
                WHERE idNotaCredito = ?
            `;
            const values = [d.iddeclaNIT, d.fecha, tipoDoc, d.numero_control, d.uuid_dte, d.nrc, d.cliente, gravada, exentas, debito, total, d.mesDeclarado, d.anioDeclarado, id];

            const [result] = await pool.query(query, values);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            registrarAccion(usuario, 'MODIFICACION', 'ANEXO 2 (NOTAS)', `DTE: ${d.numero_control}`);
            res.json({ message: 'Nota actualizada correctamente' });

        } else {
            const [duplicado] = await pool.query(
                `SELECT idCredFiscal FROM credfiscal 
                 WHERE iddeclaNIT = ? AND idCredFiscal != ? AND (
                     (FiscCodGeneracion = ? AND FiscCodGeneracion IS NOT NULL AND FiscCodGeneracion != '') 
                     OR (REPLACE(FiscNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(FiscNit, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, id, d.uuid_dte, d.numero_control, d.nrc]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRO CCF con ese mismo Número o UUID.' });

            const query = `
                UPDATE credfiscal SET 
                    iddeclaNIT=?, FiscFecha=?, FiscMesDeclarado=?, FiscAnioDeclarado=?, FisTipoDoc=?, FiscSerieDoc=?, FiscNumDoc=?, FiscCodGeneracion=?, FiscNumContInter=?, FiscNit=?, FiscNomRazonDenomi=?, FiscVtaExen=?, FiscVtaNoSujetas=?, FiscVtaGravLocal=?, FiscDebitoFiscal=?, FiscTotalVtas=?, BusFiscTipoOperaRenta=?, BusFiscTipoIngresoRenta=?
                WHERE idCredFiscal = ?
            `;
            const values = [d.iddeclaNIT, d.fecha, d.mesDeclarado, d.anioDeclarado, tipoDoc, d.serie || null, d.numero_control, d.uuid_dte, d.uuid_dte, d.nrc, d.cliente, exentas, noSujetas, gravada, debito, total, d.tipo_operacion || '1', d.tipo_ingreso || '1', id];

            const [result] = await pool.query(query, values);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'CCF no encontrado' });
            registrarAccion(usuario, 'MODIFICACION', 'ANEXO 2', `DTE: ${d.numero_control}`);
            res.json({ message: 'CCF actualizado correctamente' });
        }

    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// --- 5. ELIMINAR VENTA CCF O NOTA ---
export const deleteVentasCCF = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query; // 🛡️ RECIBIMOS LA TABLA DE ORIGEN
    try {
        const usuario = req.headers['x-usuario'] || 'Sistema';

        if (origen === 'notas_credito') {
            const [result] = await pool.query('DELETE FROM notas_credito WHERE idNotaCredito = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            registrarAccion(usuario, 'ELIMINACION', 'ANEXO 2 (NOTAS)', `Registro ID Eliminado: ${id}`);
        } else {
            const [result] = await pool.query('DELETE FROM credfiscal WHERE idCredFiscal = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Documento no encontrado' });
            registrarAccion(usuario, 'ELIMINACION', 'ANEXO 2', `Registro ID Eliminado: ${id}`);
        }

        res.json({ message: 'Documento eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
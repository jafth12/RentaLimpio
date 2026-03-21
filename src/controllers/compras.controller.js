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

// --- 1. OBTENER TODAS LAS COMPRAS ---
export const getCompras = async (req, res) => {
    const { nit, mes, anio } = req.query;
    try {
        let query = 'SELECT * FROM compras';
        const params = [];
        const condiciones = [];

        if (nit)  { condiciones.push('iddeclaNIT = ?');  params.push(nit); }
        if (mes)  { condiciones.push('ComMesDeclarado = ?');  params.push(mes); }
        if (anio) { condiciones.push('ComAnioDeclarado = ?'); params.push(anio); }

        if (condiciones.length > 0) {
            query += ' WHERE ' + condiciones.join(' AND ');
        }
        query += ' ORDER BY ComFecha ASC';

        const [rows] = await pool.query(query, params);
        rows.forEach(r => {
            if (r.ComFecha) r.ComFecha = formatearFecha(r.ComFecha);
        });
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener compras', error: error.message });
    }
};

// --- 2. OBTENER UNA COMPRA POR ID ---
export const getCompraById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM compras WHERE idcompras = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Compra no encontrada' });
        
        const compra = rows[0];
        if (compra.ComFecha) compra.ComFecha = formatearFecha(compra.ComFecha);
        
        res.json(compra);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener la compra', error: error.message });
    }
};

// --- 3. CREAR NUEVA COMPRA (CON PROTECCIÓN ANTIDUPLICADOS) ---
export const createCompra = async (req, res) => {
    const d = req.body;
    try {
        // 🛡️ IDENTIFICACIÓN INTELIGENTE (FÍSICO VS DTE)
        const esFisico = d.ComClase !== '4';
        const numDoc = d.ComNumero;
        const uuidDte = esFisico ? null : (d.ComCodGeneracion || '');
        const selloRec = esFisico ? null : (d.ComSelloRecepcion || null);

        // 🚨 VALIDACIONES ESTRICTAS
        if (!d.iddeclaNIT || !d.ComFecha || !numDoc || !d.proveedor_ProvNIT || !d.ComMesDeclarado) {
            return res.status(400).json({ message: '⚠️ Empresa, Fecha, Mes, Número de Documento y NIT del Proveedor son obligatorios.'});
        }
        if (!esFisico && !uuidDte) {
            return res.status(400).json({ message: '⚠️ El Código UUID es obligatorio para las compras electrónicas (DTE).' });
        }

        // 🛡️ REGLA ANTIDUPLICADOS MEJORADA
        const [duplicado] = await pool.query(
            `SELECT idcompras FROM compras 
             WHERE iddeclaNIT = ? 
             AND (
                 (ComCodGeneracion = ? AND ComCodGeneracion IS NOT NULL AND ComCodGeneracion != '') 
                 OR 
                 ((ComCodGeneracion IS NULL OR ComCodGeneracion = '') AND REPLACE(ComNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(proveedor_ProvNIT, '-', '') = REPLACE(?, '-', ''))
             )`,
            [d.iddeclaNIT, uuidDte, numDoc, d.proveedor_ProvNIT]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Documento duplicado. Esta compra ya se encuentra registrada en la base de datos.' });
        }

        // LÓGICA DE CÁLCULO PARA IMPUESTOS AL COMBUSTIBLE (Proporción 2 a 1)
        const montoCombustible = parseFloat(d.ComOtroAtributo) || 0;
        let montoFovial = 0;
        let montoCotrans = 0;

        if (montoCombustible > 0) {
            montoFovial = parseFloat((montoCombustible * 2 / 3).toFixed(2));
            montoCotrans = parseFloat((montoCombustible - montoFovial).toFixed(2));
        }

        // 🛡️ INSERCIÓN BLINDADA
        const [result] = await pool.query(
            `INSERT INTO compras 
            (iddeclaNIT, ComFecha, ComMesDeclarado, ComAnioDeclarado, ComClase, ComTipo, ComNumero, ComCodGeneracion, ComSelloRecepcion,
             proveedor_ProvNIT, ComNomProve, ComIntExe, ComInternacioExe, ComImpExeNoSujetas, 
             ComIntGrav, ComInternacGravBienes, ComImportGravBienes, ComImportGravServicios, 
             ComCredFiscal, comFovial, comCotran, ComOtroAtributo, ComTotal, ComClasiRenta, ComTipoCostoGasto, ComTipoOpeRenta, ComSecNum, ComAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '3')`,
            [
                d.iddeclaNIT, d.ComFecha, d.ComMesDeclarado, d.ComAnioDeclarado, d.ComClase || '4', d.ComTipo || '03',
                numDoc, uuidDte, selloRec, d.proveedor_ProvNIT, d.ComNomProve, 
                d.ComIntExe || 0, d.ComInternacioExe || 0, d.ComImpExeNoSujetas || 0,
                d.ComIntGrav || 0, d.ComInternacGravBienes || 0, d.ComImportGravBienes || 0, d.ComImportGravServicios || 0,
                d.ComCredFiscal || 0, montoFovial, montoCotrans, montoCombustible, d.ComTotal || 0,
                d.ComClasiRenta || '1', d.ComTipoCostoGasto || '2', d.ComTipoOpeRenta || '1', d.ComSecNum || '2'
            ]
        );
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'CREACION', 'COMPRAS', `DTE/Doc: ${numDoc} - Total: $${d.ComTotal}`);
        res.status(201).json({ message: 'Compra registrada en BD con éxito', id: result.insertId });
    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- 4. ACTUALIZAR COMPRA ---
export const updateCompra = async (req, res) => {
    const { id } = req.params;
    const d = req.body;
    try {
        // 🛡️ IDENTIFICACIÓN INTELIGENTE (FÍSICO VS DTE)
        const esFisico = d.ComClase !== '4';
        const numDoc = d.ComNumero;
        const uuidDte = esFisico ? null : (d.ComCodGeneracion || '');
        const selloRec = esFisico ? null : (d.ComSelloRecepcion || null);

        // 🚨 VALIDACIONES ESTRICTAS
        if (!d.iddeclaNIT || !d.ComFecha || !numDoc || !d.proveedor_ProvNIT) {
            return res.status(400).json({ message: '⚠️ Empresa, Fecha, Número de Documento y NIT del Proveedor son obligatorios.'});
        }
        if (!esFisico && !uuidDte) {
            return res.status(400).json({ message: '⚠️ El Código UUID es obligatorio para DTE.' });
        }

        // 🛡️ REGLA ANTIDUPLICADOS AL ACTUALIZAR
        const [duplicado] = await pool.query(
            `SELECT idcompras FROM compras 
             WHERE iddeclaNIT = ? AND idcompras != ?
             AND (
                 (ComCodGeneracion = ? AND ComCodGeneracion IS NOT NULL AND ComCodGeneracion != '') 
                 OR 
                 ((ComCodGeneracion IS NULL OR ComCodGeneracion = '') AND REPLACE(ComNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(proveedor_ProvNIT, '-', '') = REPLACE(?, '-', ''))
             )`,
            [d.iddeclaNIT, id, uuidDte, numDoc, d.proveedor_ProvNIT]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRA compra con ese mismo Número de Documento o UUID.' });
        }

        // LÓGICA DE CÁLCULO PARA IMPUESTOS AL COMBUSTIBLE
        const montoCombustible = parseFloat(d.ComOtroAtributo) || 0;
        let montoFovial = 0;
        let montoCotrans = 0;

        if (montoCombustible > 0) {
            montoFovial = parseFloat((montoCombustible * 2 / 3).toFixed(2));
            montoCotrans = parseFloat((montoCombustible - montoFovial).toFixed(2));
        }

        // 🛡️ ACTUALIZACIÓN BLINDADA
        const [result] = await pool.query(
            `UPDATE compras SET 
            iddeclaNIT=?, ComFecha=?, ComMesDeclarado=?, ComAnioDeclarado=?, ComClase=?, ComTipo=?, ComNumero=?, ComCodGeneracion=?, ComSelloRecepcion=?, 
            proveedor_ProvNIT=?, ComNomProve=?, ComIntExe=?, ComInternacioExe=?, ComImpExeNoSujetas=?,
            ComIntGrav=?, ComInternacGravBienes=?, ComImportGravBienes=?, ComImportGravServicios=?,
            ComCredFiscal=?, comFovial=?, comCotran=?, ComOtroAtributo=?, ComTotal=?, ComClasiRenta=?, ComTipoCostoGasto=?, ComTipoOpeRenta=?, ComSecNum=?
            WHERE idcompras = ?`,
            [
                d.iddeclaNIT, d.ComFecha, d.ComMesDeclarado, d.ComAnioDeclarado, d.ComClase, d.ComTipo,
                numDoc, uuidDte, selloRec, d.proveedor_ProvNIT, d.ComNomProve, 
                d.ComIntExe || 0, d.ComInternacioExe || 0, d.ComImpExeNoSujetas || 0,
                d.ComIntGrav || 0, d.ComInternacGravBienes || 0, d.ComImportGravBienes || 0, d.ComImportGravServicios || 0,
                d.ComCredFiscal || 0, montoFovial, montoCotrans, montoCombustible, d.ComTotal || 0,
                d.ComClasiRenta || '1', d.ComTipoCostoGasto || '2', d.ComTipoOpeRenta || '1', d.ComSecNum || '2', id
            ]
        );
        
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Compra no encontrada' });
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'MODIFICACION', 'COMPRAS', `Doc Actualizado: ${numDoc} - Total: $${d.ComTotal}`);
        res.json({ message: 'Compra actualizada correctamente' });
    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// --- 5. ELIMINAR COMPRA ---
export const deleteCompra = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM compras WHERE idcompras = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Compra no encontrada' });
        
        const usuario = req.headers['x-usuario'] || 'Sistema';
        registrarAccion(usuario, 'ELIMINACION', 'COMPRAS', `Registro ID Eliminado: ${id}`);
        res.json({ message: 'Compra eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
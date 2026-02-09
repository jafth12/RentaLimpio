import pool from '../config/db.js';

// --- OBTENER TODAS LAS VENTAS (PARA LA TABLA) ---
export const getVentasCCF = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                idCredFiscal,
                FiscFecha,
                FiscNumDoc,
                FiscNit,
                FiscNomRazonDenomi,
                FiscTotalVtas,
                FiscDebitoFiscal,
                FiscVtaGravLocal
            FROM credfiscal
            ORDER BY FiscFecha DESC
            LIMIT 50
        `);
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener ventas', error: error.message});
    }
};

// --- OBTENER UNA VENTA POR ID (PARA EDITAR) ---
export const getVentaCCFById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT 
                idCredFiscal as id,
                FiscFecha as fecha,
                FisClasDoc as claseDocumento,
                FisTipoDoc as tipoDocumento,
                FiscNumResol as numeroResolucion,
                FiscSerieDoc as serieDocumento,
                FiscNumDoc as numeroDocumento,
                FiscNumContInter as controlInterno,
                FiscNit as nit,
                FiscNomRazonDenomi as nombreCliente,
                FiscNumDuiClien as duiCliente,
                FiscVtaExen as ventasExentas,
                FiscVtaNoSujetas as ventasNoSujetas,
                FiscVtaGravLocal as ventasGravadas,
                FiscDebitoFiscal as debitoFiscal,
                FiscVtaCtaTercNoDomici as ventasTerceros,
                FiscDebFiscVtaCtaTerceros as debitoTerceros,
                FiscTotalVtas as totalVentas,
                BusFiscTipoOperaRenta as tipoOperacion,
                BusFiscTipoIngresoRenta as tipoIngreso,
                FiscNumAnexo as numeroAnexo
            FROM credfiscal
            WHERE idCredFiscal = ?
        `, [id]);

        if (rows.length === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        
        res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener la venta', error: error.message });
    }
};

// --- CREAR NUEVA VENTA ---
export const createVentasCCF = async (req, res) => {
    // console.log("Datos recibidos CCF:", req.body);
    const { 
        fecha, claseDocumento, tipoDocumento, numeroResolucion, serieDocumento,
        numeroDocumento, controlInterno, nit, nombreCliente, duiCliente,
        ventasExentas, ventasNoSujetas, ventasGravadas, debitoFiscal,
        ventasTerceros, debitoTerceros, totalVentas, tipoOperacion, tipoIngreso, numeroAnexo
    } = req.body;

    // Validación básica: Campos obligatorios mínimos
    if (!fecha || !numeroDocumento || !nit) {
        return res.status(400).json({message: 'Faltan datos obligatorios (Fecha, No. Documento, Cliente)'});
    }

    try {
        const query = `
            INSERT INTO credfiscal 
            (
                FiscFecha, FisClasDoc, FisTipoDoc, FiscNumResol, FiscSerieDoc, 
                FiscNumDoc, FiscNumContInter, FiscNit, FiscNomRazonDenomi, FiscNumDuiClien, 
                FiscVtaExen, FiscVtaNoSujetas, FiscVtaGravLocal, FiscDebitoFiscal, 
                FiscVtaCtaTercNoDomici, FiscDebFiscVtaCtaTerceros, FiscTotalVtas, 
                BusFiscTipoOperaRenta, BusFiscTipoIngresoRenta, FiscNumAnexo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            fecha, claseDocumento, tipoDocumento, numeroResolucion, serieDocumento,
            numeroDocumento, controlInterno, nit, nombreCliente, duiCliente,
            ventasExentas || 0, ventasNoSujetas || 0, ventasGravadas || 0, debitoFiscal || 0,
            ventasTerceros || 0, debitoTerceros || 0, totalVentas || 0, tipoOperacion, tipoIngreso, numeroAnexo
        ];

        const [result] = await pool.query(query, values);
        res.status(201).json({ message: 'Comprobante guardado correctamente', id: result.insertId });

    } catch (error) {
        console.error('Error al guardar:', error);
        res.status(500).json({ message: 'Error al guardar en BD', error: error.message });
    }
};

// --- ACTUALIZAR VENTA ---
export const updateVentasCCF = async (req, res) => {
    const { id } = req.params;
    const { 
        fecha, claseDocumento, tipoDocumento, numeroResolucion, serieDocumento,
        numeroDocumento, controlInterno, nit, nombreCliente, duiCliente,
        ventasExentas, ventasNoSujetas, ventasGravadas, debitoFiscal,
        ventasTerceros, debitoTerceros, totalVentas, tipoOperacion, tipoIngreso, numeroAnexo
    } = req.body;

    try {
        const query = `
            UPDATE credfiscal SET 
                FiscFecha = ?, FisClasDoc = ?, FisTipoDoc = ?, FiscNumResol = ?, FiscSerieDoc = ?, 
                FiscNumDoc = ?, FiscNumContInter = ?, FiscNit = ?, FiscNomRazonDenomi = ?, FiscNumDuiClien = ?, 
                FiscVtaExen = ?, FiscVtaNoSujetas = ?, FiscVtaGravLocal = ?, FiscDebitoFiscal = ?, 
                FiscVtaCtaTercNoDomici = ?, FiscDebFiscVtaCtaTerceros = ?, FiscTotalVtas = ?, 
                BusFiscTipoOperaRenta = ?, BusFiscTipoIngresoRenta = ?, FiscNumAnexo = ?
            WHERE idCredFiscal = ?
        `;

        const values = [
            fecha, claseDocumento, tipoDocumento, numeroResolucion, serieDocumento,
            numeroDocumento, controlInterno, nit, nombreCliente, duiCliente,
            ventasExentas || 0, ventasNoSujetas || 0, ventasGravadas || 0, debitoFiscal || 0,
            ventasTerceros || 0, debitoTerceros || 0, totalVentas || 0, tipoOperacion, tipoIngreso, numeroAnexo,
            id
        ];

        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Venta no encontrada' });

        res.json({ message: 'Comprobante actualizado correctamente' });

    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// --- ELIMINAR VENTA ---
export const deleteVentasCCF = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM credfiscal WHERE idCredFiscal = ?', [id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Venta no encontrada' });

        res.json({ message: 'Comprobante eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
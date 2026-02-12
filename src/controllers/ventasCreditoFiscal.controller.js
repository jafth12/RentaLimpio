import pool from '../config/db.js';

// --- OBTENER TODAS LAS VENTAS ---
export const getVentasCCF = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM credfiscal ORDER BY idCredFiscal DESC LIMIT 100');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
    }
};

// --- OBTENER UNA VENTA (PARA EDITAR) ---
export const getVentaCCFById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM credfiscal WHERE idCredFiscal = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener venta', error: error.message });
    }
};

// --- CREAR VENTA ---
export const createVentasCCF = async (req, res) => {
    try {
        const data = req.body;
        
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
            data.FiscFecha, data.FisClasDoc, data.FisTipoDoc, data.FiscNumResol, data.FiscSerieDoc,
            data.FiscNumDoc, data.FiscNumContInter, data.FiscNit, data.FiscNomRazonDenomi, data.FiscNumDuiClien,
            data.FiscVtaExen || 0, data.FiscVtaNoSujetas || 0, data.FiscVtaGravLocal || 0, data.FiscDebitoFiscal || 0,
            data.FiscVtaCtaTercNoDomici || 0, data.FiscDebFiscVtaCtaTerceros || 0, data.FiscTotalVtas || 0,
            data.BusFiscTipoOperaRenta, data.BusFiscTipoIngresoRenta, data.FiscNumAnexo
        ];

        const [result] = await pool.query(query, values);
        res.status(201).json({ message: 'Venta guardada correctamente', id: result.insertId });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al guardar venta', error: error.message });
    }
};

// --- ACTUALIZAR VENTA ---
export const updateVentasCCF = async (req, res) => {
    const { id } = req.params;
    try {
        const data = req.body;
        const query = `
            UPDATE credfiscal SET 
                FiscFecha=?, FisClasDoc=?, FisTipoDoc=?, FiscNumResol=?, FiscSerieDoc=?, 
                FiscNumDoc=?, FiscNumContInter=?, FiscNit=?, FiscNomRazonDenomi=?, FiscNumDuiClien=?, 
                FiscVtaExen=?, FiscVtaNoSujetas=?, FiscVtaGravLocal=?, FiscDebitoFiscal=?, 
                FiscVtaCtaTercNoDomici=?, FiscDebFiscVtaCtaTerceros=?, FiscTotalVtas=?, 
                BusFiscTipoOperaRenta=?, BusFiscTipoIngresoRenta=?, FiscNumAnexo=?
            WHERE idCredFiscal = ?
        `;

        const values = [
            data.FiscFecha, data.FisClasDoc, data.FisTipoDoc, data.FiscNumResol, data.FiscSerieDoc,
            data.FiscNumDoc, data.FiscNumContInter, data.FiscNit, data.FiscNomRazonDenomi, data.FiscNumDuiClien,
            data.FiscVtaExen, data.FiscVtaNoSujetas, data.FiscVtaGravLocal, data.FiscDebitoFiscal,
            data.FiscVtaCtaTercNoDomici, data.FiscDebFiscVtaCtaTerceros, data.FiscTotalVtas,
            data.BusFiscTipoOperaRenta, data.BusFiscTipoIngresoRenta, data.FiscNumAnexo,
            id
        ];

        const [result] = await pool.query(query, values);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        
        res.json({ message: 'Venta actualizada correctamente' });

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
        res.json({ message: 'Venta eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
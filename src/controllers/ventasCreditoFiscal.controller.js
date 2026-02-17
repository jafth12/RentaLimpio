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

        // Validación de Auditoría: Campos de Identidad Obligatorios
        if (!data.iddeclaNIT || !data.FiscNit || !data.FiscNumDoc) {
            return res.status(400).json({ message: 'Auditoría: ID Declarante, NIT de Cliente y Número de Doc son obligatorios.' });
        }

        // Procesamiento Numérico (Aseguramos que el dinero sea dinero)
        const gravada = parseFloat(data.FiscVtaGravLocal) || 0;
        const debito = data.FiscDebitoFiscal !== undefined ? parseFloat(data.FiscDebitoFiscal) : (gravada * 0.13);

        const query = `
            INSERT INTO credfiscal 
            (
                iddeclaNIT, FiscFecha, FisClasDoc, FisTipoDoc, FiscNumResol, FiscSerieDoc, 
                FiscNumDoc, FiscNumContInter, FiscNit, FiscNomRazonDenomi, FiscNumDuiClien, 
                FiscVtaExen, FiscVtaNoSujetas, FiscVtaGravLocal, FiscDebitoFiscal, 
                FiscVtaCtaTercNoDomici, FiscDebFiscVtaCtaTerceros, FiscTotalVtas, 
                BusFiscTipoOperaRenta, BusFiscTipoIngresoRenta, FiscNumAnexo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            data.iddeclaNIT, data.FiscFecha, data.FisClasDoc || '4', data.FisTipoDoc || '03', 
            data.FiscNumResol, data.FiscSerieDoc, data.FiscNumDoc, data.FiscNumContInter, 
            data.FiscNit, data.FiscNomRazonDenomi, data.FiscNumDuiClien,
            data.FiscVtaExen || 0, data.FiscVtaNoSujetas || 0, gravada, debito,
            data.FiscVtaCtaTercNoDomici || 0, data.FiscDebFiscVtaCtaTerceros || 0, data.FiscTotalVtas || 0,
            data.BusFiscTipoOperaRenta || '1', data.BusFiscTipoIngresoRenta || '1', data.FiscNumAnexo || '1'
        ];

        const [result] = await pool.query(query, values);
        res.status(201).json({ message: 'Venta Pro Guardada y Certificada', id: result.insertId });

    } catch (error) {
        res.status(500).json({ message: 'Falla en la Persistencia Fiscal', error: error.message });
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
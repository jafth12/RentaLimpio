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

        // 🛡️ Validación ajustada: Ahora esperamos "numero" (DTE) y "nrc"
        if (!data.iddeclaNIT || !data.nrc || !data.numero) {
            return res.status(400).json({ message: 'Auditoría: ID Declarante, NRC de Cliente y Número de Doc son obligatorios.' });
        }

        // Procesamiento Numérico
        const gravada = parseFloat(data.gravadas) || 0;
        const debito = data.debitoFiscal !== undefined ? parseFloat(data.debitoFiscal) : (gravada * 0.13);
        const exentas = parseFloat(data.exentas) || 0;
        const noSujetas = parseFloat(data.noSujetas) || 0;
        const total = parseFloat(data.total) || 0;

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
            data.iddeclaNIT, 
            data.fecha, // Viene del frontend
            data.FisClasDoc || '4', // 4 = DTE
            data.FisTipoDoc || '03', // 03 = CCF
            data.resolucion || null, 
            data.serie || null, 
            data.numero, // 🛡️ AQUÍ VA EL DTE UNIFICADO
            data.FiscNumContInter || null, 
            data.nrc, // 🛡️ NRC (NIT del cliente)
            data.cliente, // 🛡️ NOMBRE DEL CLIENTE
            data.FiscNumDuiClien || null,
            exentas, 
            noSujetas, 
            gravada, 
            debito,
            data.FiscVtaCtaTercNoDomici || 0, 
            data.FiscDebFiscVtaCtaTerceros || 0, 
            total,
            data.BusFiscTipoOperaRenta || '1', 
            data.BusFiscTipoIngresoRenta || '1', 
            data.FiscNumAnexo || '2' // 2 = Anexo 2 para CCF
        ];

        const [result] = await pool.query(query, values);
        res.status(201).json({ message: 'Venta CCF Guardada Exitosamente', id: result.insertId });

    } catch (error) {
        res.status(500).json({ message: 'Error en la Base de Datos', error: error.message });
    }
};

// --- ACTUALIZAR VENTA ---
export const updateVentasCCF = async (req, res) => {
    const { id } = req.params;
    try {
        const data = req.body;
        
        const gravada = parseFloat(data.gravadas) || 0;
        const debito = parseFloat(data.debitoFiscal) || 0;
        const exentas = parseFloat(data.exentas) || 0;
        const noSujetas = parseFloat(data.noSujetas) || 0;
        const total = parseFloat(data.total) || 0;

        const query = `
            UPDATE credfiscal SET 
                iddeclaNIT=?, FiscFecha=?, FisClasDoc=?, FisTipoDoc=?, FiscNumResol=?, FiscSerieDoc=?, 
                FiscNumDoc=?, FiscNumContInter=?, FiscNit=?, FiscNomRazonDenomi=?, FiscNumDuiClien=?, 
                FiscVtaExen=?, FiscVtaNoSujetas=?, FiscVtaGravLocal=?, FiscDebitoFiscal=?, 
                FiscVtaCtaTercNoDomici=?, FiscDebFiscVtaCtaTerceros=?, FiscTotalVtas=?, 
                BusFiscTipoOperaRenta=?, BusFiscTipoIngresoRenta=?, FiscNumAnexo=?
            WHERE idCredFiscal = ?
        `;

        const values = [
            data.iddeclaNIT,
            data.fecha, 
            data.FisClasDoc || '4', 
            data.FisTipoDoc || '03', 
            data.resolucion || null, 
            data.serie || null,
            data.numero, // 🛡️ ACTUALIZACIÓN DEL DTE
            data.FiscNumContInter || null, 
            data.nrc, // 🛡️ ACTUALIZACIÓN DEL NRC
            data.cliente, // 🛡️ ACTUALIZACIÓN DEL CLIENTE
            data.FiscNumDuiClien || null,
            exentas, 
            noSujetas, 
            gravada, 
            debito,
            data.FiscVtaCtaTercNoDomici || 0, 
            data.FiscDebFiscVtaCtaTerceros || 0, 
            total,
            data.BusFiscTipoOperaRenta || '1', 
            data.BusFiscTipoIngresoRenta || '1', 
            data.FiscNumAnexo || '2',
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
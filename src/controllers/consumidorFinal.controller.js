import pool from "../config/db.js";

// --- 1. OBTENER TODAS LAS VENTAS ---
export const getVentasConsumidor = async (req, res) => { 
    try {
        const [rows] = await pool.query('SELECT * FROM consumidorfinal ORDER BY ConsFecha DESC');
        res.json(rows); 
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
    }
};

// --- 2. OBTENER UNA VENTA POR ID ---
export const getVentaConsumidorById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM consumidorfinal WHERE idconsfinal = ?', [id]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        
        res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener la venta', error: error.message });
    }
};

// --- 3. CREAR NUEVA VENTA ---
export const createVentaConsumidor = async (req, res) => {
    const data = req.body;

    // Validación: El frontend nos manda "numero", que es el DTE ya armado.
    if (!data.fecha || !data.numero || !data.iddeclaNIT) {
        return res.status(400).json({message: 'Auditoría: Fecha, Número de Documento e ID Declarante son obligatorios.'});
    }
    
    try {
        const [result] = await pool.query(
            `INSERT INTO consumidorfinal 
            (iddeclaNIT, ConsFecha, ConsClaseDoc, ConsTipoDoc, ConsNumResolu, ConsSerieDoc, 
             ConsNumContIntDEL, ConsNumContIntAL, ConsNumDocDEL, ConsNumDocAL, ConsNumMaqRegistro,
             ConsVtaExentas, ConsVtaIntExenNoSujProporcio, ConsVtaNoSujetas, ConsVtaGravLocales, 
             ConsExpDentAreaCA, ConsExpFueraAreaCA, ConsExpServicios, 
             ConsVtaZonaFrancasDPA, ConsVtaCtaTercNoDomici, ConsTotalVta, 
             ConsTipoOpera, ConsTipoIngreso, ConsNumAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [
                data.iddeclaNIT, 
                data.fecha, 
                data.claseDoc || '4', // En el SV, 4 = DTE
                data.tipoDoc || '01', 
                data.resolucion || null, 
                data.serie || null, 
                data.controlDel || null, 
                data.controlAl || null, 
                data.numero, // 🛡️ AQUÍ GUARDAMOS EL DTE EN ConsNumDocDEL
                data.numero, // 🛡️ Y EN ConsNumDocAL (Es el mismo en DTE)
                data.maqRegistro || null,
                data.exentas || 0, 
                data.exentasNoSujetasProp || 0, 
                data.noSujetas || 0, 
                data.gravadas || 0,
                data.expCentroAmerica || 0, 
                data.expFueraCentroAmerica || 0, 
                data.expServicios || 0,
                data.ventasZonaFranca || 0, 
                data.ventasTerceros || 0, 
                data.total || 0,
                data.tipoOpera || '1', 
                data.tipoIngreso || '1', 
                data.anexo || '1'
            ]
        );
        res.status(201).json({ message: 'Venta Consumidor Final Certificada', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Falla en el Servidor de Datos', error: error.message});
    }
};

// --- 4. ACTUALIZAR VENTA ---
export const updateVentaConsumidor = async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE consumidorfinal SET 
            iddeclaNIT=?, ConsFecha=?, ConsClaseDoc=?, ConsTipoDoc=?, ConsNumResolu=?, ConsSerieDoc=?, 
            ConsNumContIntDEL=?, ConsNumContIntAL=?, ConsNumDocDEL=?, ConsNumDocAL=?, ConsNumMaqRegistro=?,
            ConsVtaExentas=?, ConsVtaIntExenNoSujProporcio=?, ConsVtaNoSujetas=?, ConsVtaGravLocales=?, 
            ConsExpDentAreaCA=?, ConsExpFueraAreaCA=?, ConsExpServicios=?, 
            ConsVtaZonaFrancasDPA=?, ConsVtaCtaTercNoDomici=?, ConsTotalVta=?, 
            ConsTipoOpera=?, ConsTipoIngreso=?, ConsNumAnexo=?
            WHERE idconsfinal = ?`,
            [
                data.iddeclaNIT,
                data.fecha, 
                data.claseDoc || '4', 
                data.tipoDoc || '01', 
                data.resolucion || null, 
                data.serie || null,
                data.controlDel || null, 
                data.controlAl || null, 
                data.numero, // 🛡️ SE ACTUALIZA EL DTE (DEL)
                data.numero, // 🛡️ SE ACTUALIZA EL DTE (AL)
                data.maqRegistro || null,
                data.exentas || 0, 
                data.exentasNoSujetasProp || 0, 
                data.noSujetas || 0, 
                data.gravadas || 0,
                data.expCentroAmerica || 0, 
                data.expFueraCentroAmerica || 0, 
                data.expServicios || 0,
                data.ventasZonaFranca || 0, 
                data.ventasTerceros || 0, 
                data.total || 0,
                data.tipoOpera || '1', 
                data.tipoIngreso || '1', 
                data.anexo || '1', 
                id
            ]
        );
          
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        res.json({ message: 'Venta actualizada correctamente'});
    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message});
    }
};

// --- 5. ELIMINAR VENTA ---
export const deleteVentaConsumidor = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM consumidorfinal WHERE idconsfinal = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({message: 'Venta no encontrada' });
        res.json({ message: 'Venta eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
import pool from "../config/db.js";

export const getVentasConsumidor = async (req, res) => { 
    try {
        const [rows] = await pool.query('SELECT * FROM consumidorfinal ORDER BY ConsFecha DESC');
        res.json(rows); 
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
    }
};

export const createVentaConsumidor = async (req, res) => {
    const {
        fecha, claseDoc, tipoDoc, resolucion, serie,
        controlDel, controlAl, docDel, docAl, maqRegistro,
        exentas, exentasNoSujetasProp, noSujetas, gravadas,
        expCentroAmerica, expFueraCentroAmerica, expServicios,
        ventasZonaFranca, ventasTerceros, total,
        tipoOpera, tipoIngreso, anexo
    } = req.body;

    // Validación básica
    if (!fecha || !docDel || !docAl) {
        return res.status(400).json({message: 'Faltan datos obligatorios (Fecha, Del, Al)'});
    }
    
    try {
        const [result] = await pool.query(
            `INSERT INTO consumidorfinal 
            (ConsFecha, ConsClaseDoc, ConsTipoDoc, ConsNumResolu, ConsSerieDoc, 
             ConsNumContIntDEL, ConsNumContIntAL, ConsNumDocDEL, ConsNumDocAL, ConsNumMaqRegistro,
             ConsVtaExentas, ConsVtaIntExenNoSujProporcio, ConsVtaNoSujetas, ConsVtaGravLocales, 
             ConsExpDentAreaCA, ConsExpFueraAreaCA, ConsExpServicios, 
             ConsVtaZonaFrancasDPA, ConsVtaCtaTercNoDomici, ConsTotalVta, 
             ConsTipoOpera, ConsTipoIngreso, ConsNumAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [
                fecha, claseDoc, tipoDoc, resolucion, serie,
                controlDel, controlAl, docDel, docAl, maqRegistro,
                exentas || 0, exentasNoSujetasProp || 0, noSujetas || 0, gravadas || 0,
                expCentroAmerica || 0, expFueraCentroAmerica || 0, expServicios || 0,
                ventasZonaFranca || 0, ventasTerceros || 0, total || 0,
                tipoOpera, tipoIngreso, anexo
            ]
        );
        res.status(201).json({ message: 'Venta registrada con éxito', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al guardar venta', error: error.message});
    }
};

export const updateVentaConsumidor = async (req, res) => {
    const { id } = req.params;
    const {
        fecha, claseDoc, tipoDoc, resolucion, serie,
        controlDel, controlAl, docDel, docAl, maqRegistro,
        exentas, exentasNoSujetasProp, noSujetas, gravadas,
        expCentroAmerica, expFueraCentroAmerica, expServicios,
        ventasZonaFranca, ventasTerceros, total,
        tipoOpera, tipoIngreso, anexo
    } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE consumidorfinal SET 
            ConsFecha=?, ConsClaseDoc=?, ConsTipoDoc=?, ConsNumResolu=?, ConsSerieDoc=?, 
            ConsNumContIntDEL=?, ConsNumContIntAL=?, ConsNumDocDEL=?, ConsNumDocAL=?, ConsNumMaqRegistro=?,
            ConsVtaExentas=?, ConsVtaIntExenNoSujProporcio=?, ConsVtaNoSujetas=?, ConsVtaGravLocales=?, 
            ConsExpDentAreaCA=?, ConsExpFueraAreaCA=?, ConsExpServicios=?, 
            ConsVtaZonaFrancasDPA=?, ConsVtaCtaTercNoDomici=?, ConsTotalVta=?, 
            ConsTipoOpera=?, ConsTipoIngreso=?, ConsNumAnexo=?
            WHERE idconsfinal = ?`,
            [
                fecha, claseDoc, tipoDoc, resolucion, serie,
                controlDel, controlAl, docDel, docAl, maqRegistro,
                exentas, exentasNoSujetasProp, noSujetas, gravadas,
                expCentroAmerica, expFueraCentroAmerica, expServicios,
                ventasZonaFranca, ventasTerceros, total,
                tipoOpera, tipoIngreso, anexo, id
            ]
        );
          
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Venta no encontrada' });
        res.json({ message: 'Venta actualizada correctamente'});
    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message});
    }
};

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
import pool from "../config/db.js";

// 1. OBTENER REGISTROS
export const getSujetos = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM comprassujexcluidos ORDER BY ComprasSujExcluFecha DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener registros', error: error.message });
    }
};

// 2. CREAR REGISTRO
export const createSujeto = async (req, res) => {
    const data = req.body;

    // Validación estricta de campos obligatorios
    if (!data.iddeclaNIT || !data.fecha || !data.nit || !data.monto) {
        return res.status(400).json({ message: 'Auditoría: Declarante, Fecha, NIT y Monto son obligatorios.'});
    }

    // Cálculo seguro de retención
    const monto = parseFloat(data.monto) || 0;
    const retencion = data.retencion ? parseFloat(data.retencion) : (monto * 0.10);

    try {
        const [result] = await pool.query(
            `INSERT INTO comprassujexcluidos 
            (iddeclaNIT, ComprasSujExcluFecha, ComprasSujExcluTipoDoc, ComprasSujExcluNIT, ComprasSujExcluNom, 
             ComprasSujExcluSerieDoc, ComprasSujExcluNumDoc, 
             ComprasSujExcluMontoOpera, ComprasSujExcluMontoReten, 
             ComprasSujExcluTipoOpera, ComprasSujExcluClasificacion, ComprasSujExclusector, 
             ComprasSujExcluTipoCostoGast, ComprasSujExcluAnexo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.iddeclaNIT, // 🛡️ GUARDADO DEL DECLARANTE (Para el filtro multitenant)
                data.fecha, 
                data.tipoDoc || '14', 
                data.nit, 
                data.nombre || '', 
                data.serie || null, 
                data.numeroDoc, // 🛡️ EL DTE UNIFICADO DESDE VUE
                monto, 
                retencion, 
                data.tipoOp || '1', 
                data.clasificacion || '2', 
                data.sector || '4',
                data.costoGasto || '2', 
                data.anexo || '5' // Anexo de Sujetos
            ]
        );
        res.status(201).json({ message: 'Registro de Sujeto Excluido Certificado', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Falla en la persistencia contable', error: error.message });
    }
};

// 3. ACTUALIZAR REGISTRO
export const updateSujeto = async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        const monto = parseFloat(data.monto) || 0;
        const retencion = data.retencion !== undefined ? parseFloat(data.retencion) : (monto * 0.10);

        await pool.query(
            `UPDATE comprassujexcluidos SET 
                iddeclaNIT = ?, ComprasSujExcluFecha = ?, ComprasSujExcluTipoDoc = ?, 
                ComprasSujExcluNIT = ?, ComprasSujExcluNom = ?, ComprasSujExcluSerieDoc = ?, 
                ComprasSujExcluNumDoc = ?, ComprasSujExcluMontoOpera = ?, ComprasSujExcluMontoReten = ?, 
                ComprasSujExcluTipoOpera = ?, ComprasSujExcluClasificacion = ?, ComprasSujExclusector = ?, 
                ComprasSujExcluTipoCostoGast = ?, ComprasSujExcluAnexo = ?
            WHERE idComSujExclui = ?`,
            [
                data.iddeclaNIT, // 🛡️ ACTUALIZACIÓN DEL DECLARANTE
                data.fecha, 
                data.tipoDoc || '14', 
                data.nit, 
                data.nombre, 
                data.serie || null, 
                data.numeroDoc, // 🛡️ DTE ACTUALIZADO
                monto, 
                retencion, 
                data.tipoOp || '1', 
                data.clasificacion || '2', 
                data.sector || '4',
                data.costoGasto || '2', 
                data.anexo || '5',
                id
            ]
        );
        
        res.json({ message: 'Registro de Sujeto Excluido Actualizado y Auditado' });
    } catch (error) {
        res.status(500).json({ message: 'Error de Integridad en Update', error: error.message });
    }
};

// 4. ELIMINAR REGISTRO
export const deleteSujeto = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM comprassujexcluidos WHERE idComSujExclui = ?', [id]);
        
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado'});
        
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Error al eliminar', error: error.message});
    }
};
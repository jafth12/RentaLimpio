import pool from '../config/db.js';

const obtenerMesDesdeFecha = (fecha) => {
    if (!fecha) return 'Desconocido';
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const numeroMes = parseInt(fecha.split('-')[1]) - 1; 
    return meses[numeroMes] || 'Desconocido';
};

export const getCompras = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT c.*, p.ProvNombre FROM compras c LEFT JOIN proveedor p ON c.proveedor_ProvNIT = p.ProvNIT ORDER BY c.idcompras DESC`);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const createCompra = async (req, res) => {
    const data = req.body;
    const mesFinal = data.mesDeclarado || obtenerMesDesdeFecha(data.fecha);
    const anioFinal = data.anioDeclarado || data.fecha.split('-')[0];
    
    try {
        const [result] = await pool.query(
            `INSERT INTO compras (
                ComFecha, ComClase, ComTipo, ComNumero, proveedor_ProvNIT, 
                ComNomProve, iddeclaNIT, ComIntExe, ComIntGrav, ComCredFiscal, 
                ComTotal, ComTipoOpeRenta, ComClasiRenta, ComSecNum, 
                ComTipoCostoGasto, ComMesDeclarado, ComAnioDeclarado, ComOtroAtributo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.fecha, data.claseDocumento, data.tipoDocumento, data.numero, data.nitProveedor,
                data.nombreProveedor, data.iddeclaNIT, data.internasExentas || 0, data.internasGravadas || 0, data.iva || 0,
                data.total || 0, data.tipoOperacion, data.clasificacion, data.sector,
                data.tipoCostoGasto, mesFinal, anioFinal, data.otroAtributo || 0
            ]
        );
        res.status(201).json({ message: 'Registro Contable Guardado Correctamente', id: result.insertId });
    } catch (error) { res.status(500).json({ error: "Falla de Auditoría: " + error.message }); }
};

export const updateCompra = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await pool.query(
            `UPDATE compras SET 
             ComFecha=?, ComClase=?, ComTipo=?, ComNumero=?, ComIntExe=?, 
             ComIntGrav=?, ComCredFiscal=?, ComTotal=?, ComTipoOpeRenta=?, 
              ComClasiRenta=?, ComSecNum=?, ComTipoCostoGasto=?, ComOtroAtributo=?,
             ComNomProve=?, proveedor_ProvNIT=?, iddeclaNIT=?
             WHERE idcompras=?`, 
        [
        data.fecha, data.claseDocumento, data.tipoDocumento, data.numero, data.internasExentas,
        data.internasGravadas, data.iva, data.total, data.tipoOperacion,
        data.clasificacion, data.sector, data.tipoCostoGasto, data.otroAtributo,
        data.nombreProveedor, data.nitProveedor, data.iddeclaNIT, id
        ]
);
        res.json({ message: 'Registro Actualizado y Auditado' });
    } catch (error) { res.status(500).json({ error: "Error Crítico al Actualizar: " + error.message }); }
};

export const deleteCompra = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM compras WHERE idcompras = ?', [id]);
        res.json({ message: 'Eliminado' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

export const exportarComprasJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query(`SELECT * FROM compras WHERE iddeclaNIT=? AND ComMesDeclarado=? AND ComAnioDeclarado=?`, [nit, mes, anio]);
        res.json({ lista_compras: rows });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
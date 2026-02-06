import pool from '../config/db.js';

// Helper para obtener el nombre del mes automáticamente desde la fecha
const obtenerMesDesdeFecha = (fecha) => {
    if (!fecha) return 'Desconocido';
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const numeroMes = parseInt(fecha.split('-')[1]) - 1; 
    return meses[numeroMes] || 'Desconocido';
};

export const getCompras = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM compras ORDER BY ComFecha DESC');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener compras', error: error.message });
    }
};

export const createCompra = async (req, res) => {
    const {
        fecha, numero, nitProveedor, nombreProveedor, duiProveedor,
        claseDocumento, tipoDocumento, tipoOperacion, clasificacion, sector, tipoCostoGasto,
        internasExentas, internacionalesExentas, importacionesNoSujetas,
        internasGravadas, internacionalesGravBienes, importacionesGravBienes, importacionesGravServicios,
        iva, total
    } = req.body;

    // --- VALIDACIÓN ESTRICTA ---
    // 1. Fecha
    // 2. Número CCF (ComNumero)
    // 3. NIT Proveedor
    // 4. Internas Gravadas (Debe ser un número válido, aunque sea 0, pero verifiquemos que se envió)
    
    if (!fecha || !numero || !nitProveedor) {
        return res.status(400).json({ message: 'Faltan datos obligatorios: Fecha, Número CCF o NIT del Proveedor.' });
    }

    // Validación extra: Si es CCF, solemos requerir monto gravado, pero a veces es exento.
    // Lo importante es que el backend reciba algo.

    const mesCalculado = obtenerMesDesdeFecha(fecha);

    try {
        const [result] = await pool.query(
            `INSERT INTO compras 
            (ComFecha, ComNumero, proveedor_ProvNIT, ComNomProve, ComDuiProve, ComMesDeclarado,
             ComClase, ComTipo, ComTipoOpeRenta, ComClasiRenta, ComSecNum, ComTipoCostoGasto,
             ComIntExe, ComInternacioExe, ComImpExeNoSujetas, 
             ComIntGrav, ComInternacGravBienes, ComImportGravBienes, ComImportGravServicios, 
             ComCredFiscal, ComTotal) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fecha, numero, nitProveedor, nombreProveedor, duiProveedor || null, mesCalculado,
                claseDocumento, tipoDocumento, tipoOperacion, clasificacion, sector, tipoCostoGasto,
                internasExentas || 0, internacionalesExentas || 0, importacionesNoSujetas || 0,
                internasGravadas || 0, internacionalesGravBienes || 0, importacionesGravBienes || 0, importacionesGravServicios || 0,
                iva || 0, total || 0
            ]
        );

        res.status(201).json({ message: 'Compra registrada con éxito', id: result.insertId });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al guardar en base de datos', error: error.message });
    }
};

export const updateCompra = async (req, res) => {
    const { id } = req.params;
    const {
        fecha, numero, nitProveedor, nombreProveedor, duiProveedor,
        claseDocumento, tipoDocumento, tipoOperacion, clasificacion, sector, tipoCostoGasto,
        internasExentas, internacionalesExentas, importacionesNoSujetas,
        internasGravadas, internacionalesGravBienes, importacionesGravBienes, importacionesGravServicios,
        iva, total
    } = req.body;

    if (!fecha || !numero || !nitProveedor) {
        return res.status(400).json({ message: 'Faltan datos obligatorios para actualizar.' });
    }

    const mesCalculado = obtenerMesDesdeFecha(fecha);

    try {
        const [result] = await pool.query(
            `UPDATE compras SET 
            ComFecha = ?, ComNumero = ?, proveedor_ProvNIT = ?, ComNomProve = ?, ComDuiProve = ?, ComMesDeclarado = ?,
            ComClase = ?, ComTipo = ?, ComTipoOpeRenta = ?, ComClasiRenta = ?, ComSecNum = ?, ComTipoCostoGasto = ?,
            ComIntExe = ?, ComInternacioExe = ?, ComImpExeNoSujetas = ?,
            ComIntGrav = ?, ComInternacGravBienes = ?, ComImportGravBienes = ?, ComImportGravServicios = ?,
            ComCredFiscal = ?, ComTotal = ?
            WHERE idcompras = ?`,
            [
                fecha, numero, nitProveedor, nombreProveedor, duiProveedor || null, mesCalculado,
                claseDocumento, tipoDocumento, tipoOperacion, clasificacion, sector, tipoCostoGasto,
                internasExentas, internacionalesExentas, importacionesNoSujetas,
                internasGravadas, internacionalesGravBienes, importacionesGravBienes, importacionesGravServicios,
                iva, total,
                id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Compra no encontrada' });
        res.json({ message: 'Compra actualizada correctamente'});
    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

export const deleteCompra = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM compras WHERE idcompras= ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Compra no encontrada' });
        res.json({ message: 'Compra eliminada correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message});
    }
};
import pool from '../config/db.js';

// Helper para obtener el nombre del mes automáticamente (como respaldo)
const obtenerMesDesdeFecha = (fecha) => {
    if (!fecha) return 'Desconocido';
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const numeroMes = parseInt(fecha.split('-')[1]) - 1; 
    return meses[numeroMes] || 'Desconocido';
};

export const getCompras = async (req, res) => {
    try {
        // MODIFICACIÓN: Ordenar por ID de compra (descendente) según la DB
        const [rows] = await pool.query('SELECT * FROM compras ORDER BY idcompras DESC');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener compras', error: error.message });
    }
};

export const createCompra = async (req, res) => {
    const {
        fecha, numero, nitProveedor, nombreProveedor, duiProveedor, 
        iddeclaNIT, 
        mesDeclarado, anioDeclarado, // <--- NUEVO CAMPO AÑO
        claseDocumento, tipoDocumento, tipoOperacion, clasificacion, sector, tipoCostoGasto,
        internasExentas, internacionalesExentas, importacionesNoSujetas,
        internasGravadas, internacionalesGravBienes, importacionesGravBienes, importacionesGravServicios,
        iva, total,
        otroAtributo // <--- NUEVO CAMPO OTRO ATRIBUTO (Impuesto Gasolina)
    } = req.body;

    // --- VALIDACIÓN ESTRICTA ---
    if (!fecha || !numero || !nitProveedor || !iddeclaNIT) {
        return res.status(400).json({ message: 'Faltan datos obligatorios: Fecha, Número CCF, Declarante o Proveedor.' });
    }

    // LÓGICA DE MES: Prioridad al manual, si no existe, calculamos.
    const mesFinal = mesDeclarado || obtenerMesDesdeFecha(fecha);
    // LÓGICA DE AÑO: Si no envían año, tomamos el de la fecha
    const anioFinal = anioDeclarado || fecha.split('-')[0];

    try {
        const [result] = await pool.query(
            `INSERT INTO compras 
            (ComFecha, ComNumero, proveedor_ProvNIT, ComNomProve, ComDuiProve, iddeclaNIT, 
             ComMesDeclarado, ComAnioDeclarado,
             ComClase, ComTipo, ComTipoOpeRenta, ComClasiRenta, ComSecNum, ComTipoCostoGasto,
             ComIntExe, ComInternacioExe, ComImpExeNoSujetas, 
             ComIntGrav, ComInternacGravBienes, ComImportGravBienes, ComImportGravServicios, 
             ComCredFiscal, ComTotal, ComOtroAtributo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fecha, numero, nitProveedor, nombreProveedor, duiProveedor || null, iddeclaNIT, 
                mesFinal, anioFinal,
                claseDocumento, tipoDocumento, tipoOperacion, clasificacion, sector, tipoCostoGasto,
                internasExentas || 0, internacionalesExentas || 0, importacionesNoSujetas || 0,
                internasGravadas || 0, internacionalesGravBienes || 0, importacionesGravBienes || 0, importacionesGravServicios || 0,
                iva || 0, total || 0, 
                otroAtributo || 0 // Insertamos el otro atributo
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
        iddeclaNIT, 
        mesDeclarado, anioDeclarado,
        claseDocumento, tipoDocumento, tipoOperacion, clasificacion, sector, tipoCostoGasto,
        internasExentas, internacionalesExentas, importacionesNoSujetas,
        internasGravadas, internacionalesGravBienes, importacionesGravBienes, importacionesGravServicios,
        iva, total,
        otroAtributo
    } = req.body;

    if (!fecha || !numero || !nitProveedor) {
        return res.status(400).json({ message: 'Faltan datos obligatorios para actualizar.' });
    }

    const mesFinal = mesDeclarado || obtenerMesDesdeFecha(fecha);
    const anioFinal = anioDeclarado || fecha.split('-')[0];

    try {
        const [result] = await pool.query(
            `UPDATE compras SET 
            ComFecha = ?, ComNumero = ?, proveedor_ProvNIT = ?, ComNomProve = ?, ComDuiProve = ?, iddeclaNIT = ?, 
            ComMesDeclarado = ?, ComAnioDeclarado = ?,
            ComClase = ?, ComTipo = ?, ComTipoOpeRenta = ?, ComClasiRenta = ?, ComSecNum = ?, ComTipoCostoGasto = ?,
            ComIntExe = ?, ComInternacioExe = ?, ComImpExeNoSujetas = ?,
            ComIntGrav = ?, ComInternacGravBienes = ?, ComImportGravBienes = ?, ComImportGravServicios = ?,
            ComCredFiscal = ?, ComTotal = ?, ComOtroAtributo = ?
            WHERE idcompras = ?`,
            [
                fecha, numero, nitProveedor, nombreProveedor, duiProveedor || null, iddeclaNIT, 
                mesFinal, anioFinal,
                claseDocumento, tipoDocumento, tipoOperacion, clasificacion, sector, tipoCostoGasto,
                internasExentas, internacionalesExentas, importacionesNoSujetas,
                internasGravadas, internacionalesGravBienes, importacionesGravBienes, importacionesGravServicios,
                iva, total, otroAtributo,
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
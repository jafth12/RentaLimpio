import pool from '../config/db.js';

// Helper para obtener el nombre del mes
const obtenerMesDesdeFecha = (fecha) => {
    if (!fecha) return 'Desconocido';
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const numeroMes = parseInt(fecha.split('-')[1]) - 1; 
    return meses[numeroMes] || 'Desconocido';
};

// 1. Obtener Compras
export const getCompras = async (req, res) => {
    try {
        const query = `
            SELECT c.*, p.ProvNombre 
            FROM compras c 
            LEFT JOIN proveedor p ON c.proveedor_ProvNIT = p.ProvNIT 
            ORDER BY c.idcompras DESC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener compras', error: error.message });
    }
};

// 2. Crear Compra
export const createCompra = async (req, res) => {
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

    if (!fecha || !numero || !nitProveedor || !iddeclaNIT) {
        return res.status(400).json({ message: 'Faltan datos obligatorios.' });
    }

    const mesFinal = mesDeclarado || obtenerMesDesdeFecha(fecha);
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
                otroAtributo || 0
            ]
        );
        res.status(201).json({ message: 'Compra registrada con éxito', id: result.insertId });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al guardar', error: error.message });
    }
};

// 3. Actualizar Compra
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

// 4. Eliminar Compra
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

// 5. EXPORTAR JSON (¡ESTA ES LA PARTE QUE FALTA!)
export const exportarComprasJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;

    if (!mes || !anio || !nit) {
        return res.status(400).json({ message: 'Faltan parámetros: mes, anio o nit.' });
    }

    try {
        const [declarante] = await pool.query(
            'SELECT iddeclaNIT, declarante FROM declarante WHERE iddeclaNIT = ?', 
            [nit]
        );

        if (declarante.length === 0) {
            return res.status(404).json({ message: 'Declarante no encontrado.' });
        }

        const query = `
            SELECT c.*, p.ProvNombre 
            FROM compras c 
            INNER JOIN proveedor p ON c.proveedor_ProvNIT = p.ProvNIT 
            WHERE c.iddeclaNIT = ? AND c.ComMesDeclarado = ? AND c.ComAnioDeclarado = ?
            ORDER BY c.ComFecha ASC
        `;
        const [compras] = await pool.query(query, [nit, mes, anio]);

        const jsonFinal = {
            documento_identidad: {
                tipo_reporte: "Anexo de Compras (IVA)",
                mes_reportado: mes,
                anio_reportado: anio,
                generado_el: new Date().toISOString()
            },
            empresa_compradora: {
                nit: declarante[0].iddeclaNIT,
                nombre: declarante[0].declarante
            },
            lista_compras: compras.map(c => ({
                fecha: c.ComFecha,
                tipo_documento: c.ComTipo,
                numero_documento: c.ComNumero,
                proveedor: {
                    nit: c.proveedor_ProvNIT,
                    nombre: c.ComNomProve
                },
                detalle_economico: {
                    monto_gravado: parseFloat(c.ComIntGrav),
                    iva_credito: parseFloat(c.ComCredFiscal),
                    total_compra: parseFloat(c.ComTotal)
                },
                clasificacion: {
                    costo_gasto: c.ComTipoCostoGasto,
                    tipo_operacion: c.ComTipoOpeRenta
                }
            })),
            totales_periodo: {
                total_gravado: compras.reduce((acc, cur) => acc + parseFloat(cur.ComIntGrav), 0).toFixed(2),
                total_iva: compras.reduce((acc, cur) => acc + parseFloat(cur.ComCredFiscal), 0).toFixed(2),
                cantidad_items: compras.length
            }
        };

        res.json(jsonFinal);

    } catch (error) {
        res.status(500).json({ message: 'Error al generar JSON', error: error.message });
    }
};
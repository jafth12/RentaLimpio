import pool from '../config/db.js';

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================
const obtenerMes = (m) => {
    const mapa = { "Enero":1,"Febrero":2,"Marzo":3,"Abril":4,"Mayo":5,"Junio":6,"Julio":7,"Agosto":8,"Septiembre":9,"Octubre":10,"Noviembre":11,"Diciembre":12 };
    return mapa[m] || 1;
};

// Tijera para evitar el error de MySQL "Incorrect date value"
const formatearFecha = (fecha) => {
    if (!fecha) return null;
    return fecha.toString().split('T')[0];
};

// ==========================================
// 1. EXPORTACIONES INDIVIDUALES
// ==========================================
export const exportarCompras = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ?', [nit, mes, anio]);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasConsumidor = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query('SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND MONTH(ConsFecha) = ? AND YEAR(ConsFecha) = ?', [nit, obtenerMes(mes), anio]);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasCredito = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND MONTH(FiscFecha) = ? AND YEAR(FiscFecha) = ?', [nit, obtenerMes(mes), anio]);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarSujetos = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query('SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND MONTH(ComprasSujExcluFecha) = ? AND YEAR(ComprasSujExcluFecha) = ?', [nit, obtenerMes(mes), anio]);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarTodoJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    if (!nit) return res.status(400).json({ message: "Se requiere NIT para el backup." });

    try {
        const [declarante] = await pool.query('SELECT * FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const mesNum = obtenerMes(mes);
        const [compras] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ?', [nit, mes, anio]);
        const [ventasCCF] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND MONTH(FiscFecha) = ? AND YEAR(FiscFecha) = ?', [nit, mesNum, anio]);
        const [ventasCF] = await pool.query('SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND MONTH(ConsFecha) = ? AND YEAR(ConsFecha) = ?', [nit, mesNum, anio]);
        const [sujetos] = await pool.query('SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND MONTH(ComprasSujExcluFecha) = ? AND YEAR(ComprasSujExcluFecha) = ?', [nit, mesNum, anio]);

        res.json({
            backup_info: { nit, empresa: declarante[0]?.declarante, periodo: `${mes}/${anio}`, fecha_respaldo: new Date().toISOString() },
            data: { compras, ventas_cf: ventasCF, ventas_ccf: ventasCCF, sujetos_excluidos: sujetos }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// 2. IMPORTACIÓN AUDITADA (Guardando UUIDs)
// ==========================================
export const importarTodoJSON = async (req, res) => {
    const info = req.body.backup_info || req.body.encabezado;
    const dataToImport = req.body.data || req.body.modulos;
    const nitDeclarante = info?.nit || info?.nit_declarante;

    if (!nitDeclarante || !dataToImport) {
        return res.status(400).json({ message: "Error: Estructura JSON no reconocida o NIT faltante." });
    }

    const connection = await pool.getConnection();
    const reporte = { compras: 0, ventas_ccf: 0, ventas_cf: 0, sujetos: 0, duplicados: 0 };

    try {
        await connection.beginTransaction();

        const [existeD] = await connection.query('SELECT iddeclaNIT FROM declarante WHERE iddeclaNIT = ?', [nitDeclarante]);
        if (existeD.length === 0) throw new Error(`El declarante ${nitDeclarante} no existe en el sistema.`);

        // 1. COMPRAS
        if (dataToImport.compras?.length) {
            for (const c of dataToImport.compras) {
                await connection.query('INSERT IGNORE INTO proveedor (ProvNIT, ProvNombre) VALUES (?, ?)', 
                    [c.proveedor_ProvNIT || '0000', c.ComNomProve || 'Proveedor Importado']);

                const [dup] = await connection.query(
                    'SELECT idcompras FROM compras WHERE iddeclaNIT = ? AND (ComCodGeneracion = ? OR (ComNumero = ? AND proveedor_ProvNIT = ?))',
                    [nitDeclarante, c.ComCodGeneracion || 'N/A', c.ComNumero, c.proveedor_ProvNIT]
                );

                if (dup.length === 0) {
                    const nuevaCompra = {
                        iddeclaNIT: nitDeclarante,
                        proveedor_ProvNIT: c.proveedor_ProvNIT,
                        ComNomProve: c.ComNomProve,
                        ComFecha: formatearFecha(c.ComFecha), 
                        ComClase: c.ComClase,
                        ComTipo: c.ComTipo,
                        ComNumero: c.ComNumero,
                        ComCodGeneracion: c.ComCodGeneracion || null, // 🛡️ AHORA SÍ LO GUARDA
                        ComIntExe: c.ComIntExe || 0,
                        ComIntGrav: c.ComIntGrav || 0,
                        ComCredFiscal: c.ComCredFiscal || 0,
                        ComTotal: c.ComTotal || 0,
                        ComMesDeclarado: c.ComMesDeclarado || 'Importado',
                        ComAnioDeclarado: c.ComAnioDeclarado || new Date().getFullYear().toString()
                    };
                    await connection.query('INSERT INTO compras SET ?', nuevaCompra);
                    reporte.compras++;
                } else { reporte.duplicados++; }
            }
        }

        // 2. CRÉDITO FISCAL
        const listaCCF = dataToImport.ventas_ccf || dataToImport.ventas_credito_fiscal || [];
        if (listaCCF.length) {
            for (const v of listaCCF) {
                const [dup] = await connection.query(
                    'SELECT idCredFiscal FROM credfiscal WHERE iddeclaNIT = ? AND (FiscCodGeneracion = ? OR (FiscNumDoc = ? AND FiscNit = ?))',
                    [nitDeclarante, v.FiscCodGeneracion || 'N/A', v.FiscNumDoc, v.FiscNit]
                );
                if (dup.length === 0) {
                    const nuevoCCF = {
                        iddeclaNIT: nitDeclarante,
                        FiscFecha: formatearFecha(v.FiscFecha), 
                        FisClasDoc: v.FisClasDoc,
                        FisTipoDoc: v.FisTipoDoc,
                        FiscNumDoc: v.FiscNumDoc,
                        FiscCodGeneracion: v.FiscCodGeneracion || null, // 🛡️ AHORA SÍ LO GUARDA
                        FiscNit: v.FiscNit,
                        FiscNomRazonDenomi: v.FiscNomRazonDenomi,
                        FiscVtaGravLocal: v.FiscVtaGravLocal || 0,
                        FiscDebitoFiscal: v.FiscDebitoFiscal || 0,
                        FiscTotalVtas: v.FiscTotalVtas || 0,
                        FiscNumAnexo: v.FiscNumAnexo || '2'
                    };
                    await connection.query('INSERT INTO credfiscal SET ?', nuevoCCF);
                    reporte.ventas_ccf++;
                } else { reporte.duplicados++; }
            }
        }

        // 3. CONSUMIDOR FINAL
        const listaCF = dataToImport.ventas_cf || dataToImport.ventas_consumidor || [];
        if (listaCF.length) {
            for (const v of listaCF) {
                const [dup] = await connection.query(
                    'SELECT idconsfinal FROM consumidorfinal WHERE iddeclaNIT = ? AND (ConsCodGeneracion = ? OR (ConsFecha = ? AND ConsNumDocDEL = ?))',
                    [nitDeclarante, v.ConsCodGeneracion || 'N/A', formatearFecha(v.ConsFecha), v.ConsNumDocDEL]
                );
                if (dup.length === 0) {
                    const nuevoCF = {
                        iddeclaNIT: nitDeclarante,
                        ConsFecha: formatearFecha(v.ConsFecha), 
                        ConsClaseDoc: v.ConsClaseDoc,
                        ConsTipoDoc: v.ConsTipoDoc,
                        ConsNumDocDEL: v.ConsNumDocDEL,
                        ConsNumDocAL: v.ConsNumDocAL,
                        ConsCodGeneracion: v.ConsCodGeneracion || null, // 🛡️ AHORA SÍ LO GUARDA
                        ConsVtaGravLocales: v.ConsVtaGravLocales || 0,
                        ConsTotalVta: v.ConsTotalVta || 0,
                        ConsNumAnexo: v.ConsNumAnexo || '1'
                    };
                    await connection.query('INSERT INTO consumidorfinal SET ?', nuevoCF);
                    reporte.ventas_cf++;
                } else { reporte.duplicados++; }
            }
        }

        // 4. SUJETOS EXCLUIDOS
        const listaSujetos = dataToImport.sujetos_excluidos || [];
        if (listaSujetos.length) {
            for (const s of listaSujetos) {
                const [dup] = await connection.query(
                    'SELECT idComSujExclui FROM comprassujexcluidos WHERE iddeclaNIT = ? AND (ComprasSujExcluCodGeneracion = ? OR (ComprasSujExcluNIT = ? AND ComprasSujExcluNumDoc = ?))',
                    [nitDeclarante, s.ComprasSujExcluCodGeneracion || 'N/A', s.ComprasSujExcluNIT, s.ComprasSujExcluNumDoc]
                );
                if (dup.length === 0) {
                    const nuevoSujeto = {
                        iddeclaNIT: nitDeclarante,
                        ComprasSujExcluNIT: s.ComprasSujExcluNIT,
                        ComprasSujExcluNom: s.ComprasSujExcluNom,
                        ComprasSujExcluFecha: formatearFecha(s.ComprasSujExcluFecha), 
                        ComprasSujExcluNumDoc: s.ComprasSujExcluNumDoc,
                        ComprasSujExcluCodGeneracion: s.ComprasSujExcluCodGeneracion || null, // 🛡️ AHORA SÍ LO GUARDA
                        ComprasSujExcluMontoOpera: s.ComprasSujExcluMontoOpera || 0,
                        ComprasSujExcluMontoReten: s.ComprasSujExcluMontoReten || 0,
                        ComprasSujExcluAnexo: s.ComprasSujExcluAnexo || '5'
                    };
                    await connection.query('INSERT INTO comprassujexcluidos SET ?', nuevoSujeto);
                    reporte.sujetos++;
                } else { reporte.duplicados++; }
            }
        }

        await connection.commit();
        res.json({ message: "Importación finalizada con éxito.", detalle: reporte });

    } catch (e) {
        await connection.rollback();
        console.error("Error Importación:", e.message);
        res.status(400).json({ message: "Error: " + e.message });
    } finally { connection.release(); }
};
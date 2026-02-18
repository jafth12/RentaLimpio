import pool from '../config/db.js';

// Auxiliar para convertir nombre de mes a número
const obtenerMes = (m) => {
    const mapa = { "Enero":1,"Febrero":2,"Marzo":3,"Abril":4,"Mayo":5,"Junio":6,"Julio":7,"Agosto":8,"Septiembre":9,"Octubre":10,"Noviembre":11,"Diciembre":12 };
    return mapa[m] || 1;
};

// ==========================================
// 1. EXPORTACIONES INDIVIDUALES (Rutas de descarga por módulo)
// ==========================================

export const exportarCompras = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ?', 
            [nit, mes, anio]
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasConsumidor = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND MONTH(ConsFecha) = ? AND YEAR(ConsFecha) = ?', 
            [nit, obtenerMes(mes), anio]
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarVentasCredito = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND MONTH(FiscFecha) = ? AND YEAR(FiscFecha) = ?', 
            [nit, obtenerMes(mes), anio]
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const exportarSujetos = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND MONTH(ComprasSujExcluFecha) = ? AND YEAR(ComprasSujExcluFecha) = ?', 
            [nit, obtenerMes(mes), anio]
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// 2. EXPORTACIÓN COMPLETA (Backup JSON)
// ==========================================

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
// 3. IMPORTACIÓN AUDITADA (Restauración)
// ==========================================

export const importarTodoJSON = async (req, res) => {
    const { backup_info, data } = req.body;
    if (!backup_info?.nit || !data) return res.status(400).json({ message: "JSON de respaldo inválido o incompleto." });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction(); 
        const nitDeclarante = backup_info.nit;
        let reporte = { compras: 0, ventas_ccf: 0, ventas_cf: 0, sujetos: 0, errores: 0, duplicados: 0 };

        // Validar Declarante
        const [existeDeclarante] = await connection.query('SELECT iddeclaNIT FROM declarante WHERE iddeclaNIT = ?', [nitDeclarante]);
        if (existeDeclarante.length === 0) {
            throw new Error(`El declarante con NIT ${nitDeclarante} no existe en la base de datos. Regístrelo primero.`);
        }

        // --- IMPORTAR COMPRAS ---
        if (data.compras?.length) {
            for (const c of data.compras) {
                // Crear proveedor si no existe
                await connection.query('INSERT IGNORE INTO proveedor (ProvNIT, ProvNombre) VALUES (?, ?)', 
                    [c.proveedor_ProvNIT || '0000', c.ComNomProve || 'Proveedor Importado']);

                const [existeCompra] = await connection.query(
                    'SELECT idcompras FROM compras WHERE iddeclaNIT = ? AND ComNumero = ? AND proveedor_ProvNIT = ?',
                    [nitDeclarante, c.ComNumero, c.proveedor_ProvNIT]
                );

                if (existeCompra.length === 0) {
                    const nuevaCompra = {
                        iddeclaNIT: nitDeclarante,
                        proveedor_ProvNIT: c.proveedor_ProvNIT,
                        ComNomProve: c.ComNomProve,
                        ComFecha: c.ComFecha,
                        ComClase: c.ComClase,
                        ComTipo: c.ComTipo,
                        ComNumero: c.ComNumero,
                        ComIntExe: c.ComIntExe || 0,
                        ComIntGrav: c.ComIntGrav || 0,
                        ComCredFiscal: c.ComCredFiscal || 0,
                        ComTotal: c.ComTotal || 0,
                        ComMesDeclarado: c.ComMesDeclarado || 'Importado',
                        ComAnioDeclarado: c.ComAnioDeclarado || new Date().getFullYear()
                    };
                    await connection.query('INSERT INTO compras SET ?', nuevaCompra);
                    reporte.compras++;
                } else { reporte.duplicados++; }
            }
        }

        // --- VENTAS CCF ---
        if (data.ventas_ccf?.length) {
            for (const v of data.ventas_ccf) {
                const [existeVenta] = await connection.query('SELECT idCredFiscal FROM credfiscal WHERE iddeclaNIT = ? AND FiscNumDoc = ? AND FiscNit = ?', [nitDeclarante, v.FiscNumDoc, v.FiscNit]);
                if (existeVenta.length === 0) {
                    const nuevoCCF = {
                        iddeclaNIT: nitDeclarante,
                        FiscFecha: v.FiscFecha,
                        FisClasDoc: v.FisClasDoc,
                        FisTipoDoc: v.FisTipoDoc,
                        FiscNumDoc: v.FiscNumDoc,
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

        // --- VENTAS CONSUMIDOR ---
        if (data.ventas_cf?.length) {
            for (const v of data.ventas_cf) {
                const [existeCF] = await connection.query('SELECT idconsfinal FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsFecha = ? AND ConsNumDocDEL = ?', [nitDeclarante, v.ConsFecha, v.ConsNumDocDEL]);
                if (existeCF.length === 0) {
                    const nuevoCF = {
                        iddeclaNIT: nitDeclarante,
                        ConsFecha: v.ConsFecha,
                        ConsClaseDoc: v.ConsClaseDoc,
                        ConsTipoDoc: v.ConsTipoDoc,
                        ConsNumDocDEL: v.ConsNumDocDEL,
                        ConsNumDocAL: v.ConsNumDocAL,
                        ConsVtaGravLocales: v.ConsVtaGravLocales || 0,
                        ConsTotalVta: v.ConsTotalVta || 0,
                        ConsNumAnexo: v.ConsNumAnexo || '1'
                    };
                    await connection.query('INSERT INTO consumidorfinal SET ?', nuevoCF);
                    reporte.ventas_cf++;
                } else { reporte.duplicados++; }
            }
        }

        // --- SUJETOS EXCLUIDOS ---
        if (data.sujetos_excluidos?.length) {
            for (const s of data.sujetos_excluidos) {
                const [existeSujeto] = await connection.query('SELECT idComSujExclui FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluNIT = ? AND ComprasSujExcluNumDoc = ?', [nitDeclarante, s.ComprasSujExcluNIT, s.ComprasSujExcluNumDoc]);
                if (existeSujeto.length === 0) {
                    const nuevoSujeto = {
                        iddeclaNIT: nitDeclarante,
                        ComprasSujExcluNIT: s.ComprasSujExcluNIT,
                        ComprasSujExcluNom: s.ComprasSujExcluNom,
                        ComprasSujExcluFecha: s.ComprasSujExcluFecha,
                        ComprasSujExcluNumDoc: s.ComprasSujExcluNumDoc,
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
        console.error("🚨 Error:", e.message);
        res.status(500).json({ message: "Falla en Restauración: " + e.message });
    } finally { connection.release(); }
};
import pool from '../config/db.js';

// Auxiliar para convertir nombre de mes a número
const obtenerMes = (m) => {
    const mapa = { "Enero":1,"Febrero":2,"Marzo":3,"Abril":4,"Mayo":5,"Junio":6,"Julio":7,"Agosto":8,"Septiembre":9,"Octubre":10,"Noviembre":11,"Diciembre":12 };
    return mapa[m] || 1;
};

// ✅ NUEVO: Función "Tijera" para limpiar fechas
const formatearFecha = (fecha) => {
    if (!fecha) return null;
    // Convierte '2025-12-01T06:00:00.000Z' -> '2025-12-01'
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

// ==========================================
// 2. EXPORTACIÓN COMPLETA (Backup)
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
// 3. IMPORTACIÓN AUDITADA (Con Corrección de Fechas)
// ==========================================
export const importarTodoJSON = async (req, res) => {
    const info = req.body.backup_info || req.body.encabezado;
    const dataToImport = req.body.data || req.body.modulos;
    const nitDeclarante = info?.nit || info?.nit_declarante;

    if (!nitDeclarante || !dataToImport) {
        return res.status(400).json({ message: "Estructura de JSON no reconocida. Se requiere NIT y datos." });
    }

    const connection = await pool.getConnection();
    const reporte = { compras: 0, ventas_ccf: 0, ventas_cf: 0, sujetos: 0, duplicados: 0 };

    try {
        await connection.beginTransaction();

        // 1. Validar Declarante
        const [existeDeclarante] = await connection.query('SELECT iddeclaNIT FROM declarante WHERE iddeclaNIT = ?', [nitDeclarante]);
        if (existeDeclarante.length === 0) {
            throw new Error(`El declarante con NIT ${nitDeclarante} no existe. Regístrelo primero en el sistema.`);
        }

        // 2. Importar Compras
        const listaCompras = dataToImport.compras || [];
        if (listaCompras.length) {
            for (const c of listaCompras) {
                await connection.query('INSERT IGNORE INTO proveedor (ProvNIT, ProvNombre) VALUES (?, ?)', 
                    [c.proveedor_ProvNIT || '0000', c.ComNomProve || 'Proveedor Importado']);

                const [existe] = await connection.query(
                    'SELECT idcompras FROM compras WHERE iddeclaNIT = ? AND ComNumero = ? AND proveedor_ProvNIT = ?', 
                    [nitDeclarante, c.ComNumero, c.proveedor_ProvNIT]
                );

                if (existe.length === 0) {
                    const nuevaCompra = {
                        iddeclaNIT: nitDeclarante,
                        proveedor_ProvNIT: c.proveedor_ProvNIT,
                        ComNomProve: c.ComNomProve,
                        ComFecha: formatearFecha(c.ComFecha), // 🛠️ CORRECCIÓN DE FECHA
                        ComClase: c.ComClase,
                        ComTipo: c.ComTipo,
                        ComNumero: c.ComNumero,
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

        // 3. Ventas CCF
        const listaCCF = dataToImport.ventas_ccf || dataToImport.ventas_credito_fiscal || [];
        if (listaCCF.length) {
            for (const v of listaCCF) {
                const [existe] = await connection.query('SELECT idCredFiscal FROM credfiscal WHERE iddeclaNIT = ? AND FiscNumDoc = ? AND FiscNit = ?', [nitDeclarante, v.FiscNumDoc, v.FiscNit]);
                if (existe.length === 0) {
                    const { idCredFiscal, ...resto } = v;
                    // Limpieza y formato de fecha
                    const nuevoCCF = { ...resto, iddeclaNIT: nitDeclarante };
                    if (nuevoCCF.FiscFecha) nuevoCCF.FiscFecha = formatearFecha(nuevoCCF.FiscFecha); // 🛠️ CORRECCIÓN

                    await connection.query('INSERT INTO credfiscal SET ?', nuevoCCF);
                    reporte.ventas_ccf++;
                } else { reporte.duplicados++; }
            }
        }

        // 4. Ventas Consumidor
        const listaCF = dataToImport.ventas_cf || dataToImport.ventas_consumidor || [];
        if (listaCF.length) {
            for (const v of listaCF) {
                const [existe] = await connection.query('SELECT idconsfinal FROM consumidorfinal WHERE iddeclaNIT = ? AND ConsFecha = ? AND ConsNumDocDEL = ?', [nitDeclarante, v.ConsFecha, v.ConsNumDocDEL]);
                if (existe.length === 0) {
                    const { idconsfinal, ...resto } = v;
                    // Limpieza y formato de fecha
                    const nuevoCF = { ...resto, iddeclaNIT: nitDeclarante };
                    if (nuevoCF.ConsFecha) nuevoCF.ConsFecha = formatearFecha(nuevoCF.ConsFecha); // 🛠️ CORRECCIÓN

                    await connection.query('INSERT INTO consumidorfinal SET ?', nuevoCF);
                    reporte.ventas_cf++;
                } else { reporte.duplicados++; }
            }
        }

        // 5. Sujetos Excluidos
        const listaSujetos = dataToImport.sujetos_excluidos || [];
        if (listaSujetos.length) {
            for (const s of listaSujetos) {
                const [existe] = await connection.query('SELECT idComSujExclui FROM comprassujexcluidos WHERE iddeclaNIT = ? AND ComprasSujExcluNIT = ? AND ComprasSujExcluNumDoc = ?', [nitDeclarante, s.ComprasSujExcluNIT, s.ComprasSujExcluNumDoc]);
                if (existe.length === 0) {
                    const { idComSujExclui, ...resto } = s;
                    // Limpieza y formato de fecha
                    const nuevoSujeto = { ...resto, iddeclaNIT: nitDeclarante };
                    if (nuevoSujeto.ComprasSujExcluFecha) nuevoSujeto.ComprasSujExcluFecha = formatearFecha(nuevoSujeto.ComprasSujExcluFecha); // 🛠️ CORRECCIÓN

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
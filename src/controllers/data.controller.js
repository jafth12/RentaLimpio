import pool from '../config/db.js';

// Auxiliar para convertir nombre de mes a número
const obtenerMes = (m) => {
    const mapa = { "Enero":1,"Febrero":2,"Marzo":3,"Abril":4,"Mayo":5,"Junio":6,"Julio":7,"Agosto":8,"Septiembre":9,"Octubre":10,"Noviembre":11,"Diciembre":12 };
    return mapa[m] || 1;
};

// ==========================================
// 1. EXPORTACIÓN INDIVIDUAL (Para los módulos)
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

// RENOMBRADO: Antes exportarVentasCF -> Ahora exportarVentasConsumidor (Para coincidir con ventasCF.routes.js)
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

// RENOMBRADO: Antes exportarVentasCCF -> Ahora exportarVentasCredito (Para coincidir con ventasCreditoFiscal.routes.js)
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

// ESTE YA EXISTÍA, PERO ASEGURAMOS QUE ESTÉ PRESENTE
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
// 2. EXPORTACIÓN COMPLETA (Backup Todo)
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
// 3. IMPORTACIÓN (Restauración)
// ==========================================

export const importarTodoJSON = async (req, res) => {
    const { backup_info, data } = req.body;
    if (!backup_info?.nit || !data) return res.status(400).json({ message: "JSON de respaldo inválido." });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction(); 
        const nit = backup_info.nit;

        // 1. Declarante
        await connection.query('INSERT IGNORE INTO declarante (iddeclaNIT, declarante) VALUES (?, ?)', [nit, backup_info.empresa || 'Importado']);

        // 2. Compras
        if (data.compras?.length) {
            for (const c of data.compras) {
                const { idcompras, ...resto } = c;
                await connection.query('INSERT INTO compras SET ?', { ...resto, iddeclaNIT: nit });
            }
        }
        // 3. Ventas CCF
        if (data.ventas_ccf?.length) {
            for (const v of data.ventas_ccf) {
                const { idCredFiscal, ...resto } = v;
                await connection.query('INSERT INTO credfiscal SET ?', { ...resto, iddeclaNIT: nit });
            }
        }
        // 4. Ventas CF
        if (data.ventas_cf?.length) {
            for (const v of data.ventas_cf) {
                const { idConsumidorFinal, ...resto } = v;
                await connection.query('INSERT INTO consumidorfinal SET ?', { ...resto, iddeclaNIT: nit });
            }
        }
        // 5. Sujetos
        if (data.sujetos_excluidos?.length) {
            for (const s of data.sujetos_excluidos) {
                const { idComSujExclui, ...resto } = s;
                await connection.query('INSERT INTO comprassujexcluidos SET ?', { ...resto, iddeclaNIT: nit });
            }
        }

        await connection.commit();
        res.json({ message: "Respaldo restaurado con éxito." });
    } catch (e) {
        await connection.rollback();
        console.error(e);
        res.status(500).json({ message: "Falla en restauración: " + e.message });
    } finally { connection.release(); }
};
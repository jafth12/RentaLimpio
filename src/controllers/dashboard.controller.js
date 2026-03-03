import pool from '../config/db.js';

export const getDashboardMetrics = async (req, res) => {
    const { nit, mes, anio } = req.query;

    if (!nit || !mes || !anio) {
        return res.status(400).json({ message: "Faltan parámetros de búsqueda." });
    }

    try {
        // 1. OBTENER TOTALES DE COMPRAS
        const qCompras = `
            SELECT SUM(c.ComTotal) as total, SUM(c.ComCredFiscal) as iva
            FROM compras c LEFT JOIN anuladosextraviados a 
            ON a.iddeclaNIT = c.iddeclaNIT AND ((a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(c.ComCodGeneracion, '-', '')) OR (a.DetaDocDesde != '' AND a.DetaDocDesde = c.ComNumero))
            WHERE c.iddeclaNIT = ? AND c.ComMesDeclarado = ? AND c.ComAnioDeclarado = ? AND a.idAnuladosExtraviados IS NULL
        `;
        const [resCompras] = await pool.query(qCompras, [nit, mes, anio]);

        // 2. OBTENER TOTALES DE CONSUMIDOR FINAL
        const qCF = `
            SELECT SUM(v.ConsTotalVta) as total
            FROM consumidorfinal v LEFT JOIN anuladosextraviados a 
            ON a.iddeclaNIT = v.iddeclaNIT AND ((a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(v.ConsCodGeneracion, '-', '')) OR (a.DetaDocDesde != '' AND a.DetaDocDesde = v.ConsNumDocAL))
            WHERE v.iddeclaNIT = ? AND v.ConsMesDeclarado = ? AND v.ConsAnioDeclarado = ? AND a.idAnuladosExtraviados IS NULL
        `;
        const [resCF] = await pool.query(qCF, [nit, mes, anio]);

        // 3. OBTENER TOTALES DE CRÉDITO FISCAL
        const qCCF = `
            SELECT SUM(f.FiscTotalVtas) as total, SUM(f.FiscDebitoFiscal) as iva
            FROM credfiscal f LEFT JOIN anuladosextraviados a 
            ON a.iddeclaNIT = f.iddeclaNIT AND ((a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(f.FiscCodGeneracion, '-', '')) OR (a.DetaDocDesde != '' AND a.DetaDocDesde = f.FiscNumDoc))
            WHERE f.iddeclaNIT = ? AND f.FiscMesDeclarado = ? AND f.FiscAnioDeclarado = ? AND a.idAnuladosExtraviados IS NULL
        `;
        const [resCCF] = await pool.query(qCCF, [nit, mes, anio]);

        // 4. OBTENER RETENCIONES
        const qRet = `SELECT SUM(RetenMontoDeReten) as total FROM retenciones WHERE iddeclaNIT = ? AND RetenMesDeclarado = ? AND RetenAnioDeclarado = ?`;
        const [resRet] = await pool.query(qRet, [nit, mes, anio]);

        // 5. OBTENER ÚLTIMOS 6 MOVIMIENTOS GLOBALES (🛡️ CORREGIDO COLUMNA FANTASMA)
        const qRecientes = `
            (SELECT ComFecha as fecha, 'COMPRA' as tipo, ComNumero as documento, ComNomProve as nombre, ComTotal as total FROM compras WHERE iddeclaNIT = ?)
            UNION ALL
            (SELECT ConsFecha as fecha, 'VENTA CF' as tipo, ConsNumDocAL as documento, 'Cliente General' as nombre, ConsTotalVta as total FROM consumidorfinal WHERE iddeclaNIT = ?)
            UNION ALL
            (SELECT FiscFecha as fecha, 'VENTA CCF' as tipo, FiscNumDoc as documento, FiscNomRazonDenomi as nombre, FiscTotalVtas as total FROM credfiscal WHERE iddeclaNIT = ?)
            ORDER BY fecha DESC LIMIT 6
        `;
        const [recientes] = await pool.query(qRecientes, [nit, nit, nit]);

        const comprasTotal = parseFloat(resCompras[0]?.total || 0);
        const comprasIVA = parseFloat(resCompras[0]?.iva || 0);
        const ventasTotal = parseFloat(resCF[0]?.total || 0) + parseFloat(resCCF[0]?.total || 0);
        const ventasIVA = parseFloat(resCCF[0]?.iva || 0); 
        const retencionesTotal = parseFloat(resRet[0]?.total || 0);
        const ivaPagar = ventasIVA - comprasIVA;

        res.json({
            compras: { total: comprasTotal, iva: comprasIVA },
            ventas: { total: ventasTotal, iva: ventasIVA },
            retenciones: retencionesTotal,
            ivaPagar: ivaPagar,
            recientes: recientes
        });

    } catch (error) {
        console.error("Error en Dashboard:", error);
        res.status(500).json({ message: "Error al cargar métricas", error: error.message });
    }
};
import pool from '../config/db.js';

export const buscarDocumentoOperacion = async (req, res) => {
    const { iddeclaNIT, tipoOrigen, busqueda } = req.query;

    if (!iddeclaNIT || !tipoOrigen || !busqueda) {
        return res.status(400).json({ message: "Faltan parámetros: iddeclaNIT, tipoOrigen o busqueda." });
    }

    try {
        // Limpiamos los guiones para que la búsqueda sea flexible
        const searchTerm = `%${busqueda.replace(/-/g, '')}%`;
        
        let query = '';
        let queryParams = [iddeclaNIT, searchTerm, searchTerm];

        // 🛡️ Búsqueda en Consumidor Final
        if (tipoOrigen === 'CF') {
            query = `
                SELECT v.*, IF(a.idAnuladosExtraviados IS NOT NULL, 1, 0) as ya_anulado
                FROM consumidorfinal v
                LEFT JOIN anuladosextraviados a
                  ON a.iddeclaNIT = v.iddeclaNIT
                  AND (
                    (a.DetaDocCodGeneracion IS NOT NULL AND a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(v.ConsCodGeneracion, '-', '')) OR
                    (a.DetaDocDesde IS NOT NULL AND a.DetaDocDesde != '' AND a.DetaDocDesde = v.ConsNumDocAL)
                  )
                WHERE v.iddeclaNIT = ?
                  AND (REPLACE(v.ConsCodGeneracion, '-', '') LIKE ? OR REPLACE(v.ConsNumDocAL, '-', '') LIKE ? OR REPLACE(v.ConsNumDocDEL, '-', '') LIKE ?)
                LIMIT 1
            `;
            queryParams.push(searchTerm); // Añadido para ConsNumDocDEL

        // 🛡️ Búsqueda en Crédito Fiscal
        } else if (tipoOrigen === 'CCF') {
            query = `
                SELECT f.*, IF(a.idAnuladosExtraviados IS NOT NULL, 1, 0) as ya_anulado
                FROM credfiscal f
                LEFT JOIN anuladosextraviados a
                  ON a.iddeclaNIT = f.iddeclaNIT
                  AND (
                    (a.DetaDocCodGeneracion IS NOT NULL AND a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(f.FiscCodGeneracion, '-', '')) OR
                    (a.DetaDocDesde IS NOT NULL AND a.DetaDocDesde != '' AND a.DetaDocDesde = f.FiscNumDoc)
                  )
                WHERE f.iddeclaNIT = ?
                  AND (REPLACE(f.FiscCodGeneracion, '-', '') LIKE ? OR REPLACE(f.FiscNumDoc, '-', '') LIKE ?)
                LIMIT 1
            `;

        // 🛡️ Búsqueda en Compras
        } else if (tipoOrigen === 'COMPRA') {
            query = `
                SELECT c.*, IF(a.idAnuladosExtraviados IS NOT NULL, 1, 0) as ya_anulado
                FROM compras c
                LEFT JOIN anuladosextraviados a
                  ON a.iddeclaNIT = c.iddeclaNIT
                  AND (
                    (a.DetaDocCodGeneracion IS NOT NULL AND a.DetaDocCodGeneracion != '' AND a.DetaDocCodGeneracion = REPLACE(c.ComCodGeneracion, '-', '')) OR
                    (a.DetaDocDesde IS NOT NULL AND a.DetaDocDesde != '' AND a.DetaDocDesde = c.ComNumero)
                  )
                WHERE c.iddeclaNIT = ?
                  AND (REPLACE(c.ComCodGeneracion, '-', '') LIKE ? OR REPLACE(c.ComNumero, '-', '') LIKE ?)
                LIMIT 1
            `;
        } else {
            return res.status(400).json({ message: "tipoOrigen no válido. Use CF, CCF o COMPRA." });
        }

        const [rows] = await pool.query(query, queryParams);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Documento no encontrado en la base de datos." });
        }

        const doc = rows[0];

        // 🏗️ Mapeo Estructurado para el Frontend
        let resEstandar = {
            original: doc,
            ya_anulado: doc.ya_anulado === 1
        };

        if (tipoOrigen === 'CF') {
            resEstandar.uuid = doc.ConsCodGeneracion;
            resEstandar.dte = doc.ConsNumDocAL || doc.ConsNumDocDEL;
            resEstandar.nombre = doc.ConsNomRazonCliente;
            resEstandar.total = doc.ConsTotalVta;
        } else if (tipoOrigen === 'CCF') {
            resEstandar.uuid = doc.FiscCodGeneracion;
            resEstandar.dte = doc.FiscNumDoc;
            resEstandar.nombre = doc.FiscNomRazonDenomi;
            resEstandar.total = doc.FiscTotalVtas;
        } else if (tipoOrigen === 'COMPRA') {
            resEstandar.uuid = doc.ComCodGeneracion;
            resEstandar.dte = doc.ComNumero;
            resEstandar.nombre = doc.ComNomProve;
            resEstandar.total = doc.ComTotal;
        }

        if (resEstandar.ya_anulado) {
            resEstandar.advertencia = "⚠️ Este documento ya se encuentra registrado como ANULADO o EXTRAVIADO.";
        }

        res.json(resEstandar);

    } catch (error) {
        console.error("Error en búsqueda inteligente:", error);
        res.status(500).json({ message: "Error al realizar la búsqueda.", error: error.message });
    }
};
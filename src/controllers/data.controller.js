import pool from '../config/db.js';

// Auxiliar para convertir nombre de mes a número (1-12)
const obtenerMes = (m) => {
    const mapa = { "Enero":1,"Febrero":2,"Marzo":3,"Abril":4,"Mayo":5,"Junio":6,"Julio":7,"Agosto":8,"Septiembre":9,"Octubre":10,"Noviembre":11,"Diciembre":12 };
    return mapa[m] || 1;
};

// --- EXPORTAR TODO (BACKUP) ---
export const exportarTodoJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    
    if (!nit) return res.status(400).json({ message: "Se requiere NIT para generar el backup." });

    try {
        // Información del Declarante
        const [declarante] = await pool.query('SELECT * FROM declarante WHERE iddeclaNIT = ?', [nit]);
        
        // Filtros de fecha
        const mesNum = obtenerMes(mes);

        // Extracción de tablas filtradas por NIT y Periodo
        const [compras] = await pool.query(
            'SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ?', 
            [nit, mes, anio]
        );
        
        const [ventasCCF] = await pool.query(
            'SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND MONTH(FiscFecha) = ? AND YEAR(FiscFecha) = ?', 
            [nit, mesNum, anio]
        );
        
        const [ventasCF] = await pool.query(
            'SELECT * FROM consumidorfinal WHERE iddeclaNIT = ? AND MONTH(ConsFecha) = ? AND YEAR(ConsFecha) = ?', 
            [nit, mesNum, anio]
        );
        
        const [sujetos] = await pool.query(
            'SELECT * FROM comprassujexcluidos WHERE iddeclaNIT = ? AND MONTH(ComprasSujExcluFecha) = ? AND YEAR(ComprasSujExcluFecha) = ?', 
            [nit, mesNum, anio]
        );

        // Respuesta JSON estructurada
        res.json({
            backup_info: { 
                nit, 
                empresa: declarante[0]?.declarante || 'Desconocido', 
                periodo: `${mes}/${anio}`,
                fecha_respaldo: new Date().toISOString() 
            },
            data: { 
                compras, 
                ventas_cf: ventasCF, 
                ventas_ccf: ventasCCF, 
                sujetos_excluidos: sujetos 
            }
        });

    } catch (error) { 
        res.status(500).json({ message: "Error al exportar datos: " + error.message }); 
    }
};

// --- IMPORTAR (RESTAURACIÓN) ---
export const importarTodoJSON = async (req, res) => {
    const { backup_info, data } = req.body;
    
    // Validación básica
    if (!backup_info?.nit || !data) {
        return res.status(400).json({ message: "Archivo de respaldo inválido o corrupto." });
    }

    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction(); // Inicio de transacción segura
        
        const nit = backup_info.nit;
        const empresa = backup_info.empresa || 'Empresa Importada';

        // 1. Restaurar/Asegurar Declarante
        // Usamos INSERT IGNORE para no fallar si ya existe, o ON DUPLICATE KEY UPDATE si quisiéramos actualizar nombre
        await connection.query(
            'INSERT INTO declarante (iddeclaNIT, declarante) VALUES (?, ?) ON DUPLICATE KEY UPDATE declarante = VALUES(declarante)', 
            [nit, empresa]
        );

        // 2. Importar COMPRAS
        if (data.compras && Array.isArray(data.compras)) {
            for (const c of data.compras) {
                // Eliminamos ID original para que se genere uno nuevo y evitar colisiones
                const { idcompras, ...resto } = c; 
                await connection.query('INSERT INTO compras SET ?', { ...resto, iddeclaNIT: nit });
            }
        }

        // 3. Importar VENTAS CCF (Crédito Fiscal)
        if (data.ventas_ccf && Array.isArray(data.ventas_ccf)) {
            for (const v of data.ventas_ccf) {
                const { idCredFiscal, ...resto } = v;
                await connection.query('INSERT INTO credfiscal SET ?', { ...resto, iddeclaNIT: nit });
            }
        }

        // 4. Importar VENTAS CF (Consumidor Final) - ¡FALTABA ESTO!
        if (data.ventas_cf && Array.isArray(data.ventas_cf)) {
            for (const v of data.ventas_cf) {
                const { idConsumidorFinal, ...resto } = v;
                await connection.query('INSERT INTO consumidorfinal SET ?', { ...resto, iddeclaNIT: nit });
            }
        }

        // 5. Importar SUJETOS EXCLUIDOS - ¡FALTABA ESTO!
        if (data.sujetos_excluidos && Array.isArray(data.sujetos_excluidos)) {
            for (const s of data.sujetos_excluidos) {
                const { idComSujExclui, ...resto } = s;
                await connection.query('INSERT INTO comprassujexcluidos SET ?', { ...resto, iddeclaNIT: nit });
            }
        }

        await connection.commit(); // Confirmar cambios
        res.json({ message: "Restauración completada exitosamente." });

    } catch (e) {
        await connection.rollback(); // Revertir todo si hay error
        console.error("Error en importación:", e);
        res.status(500).json({ message: "Falla crítica en restauración: " + e.message });
    } finally { 
        connection.release(); // Liberar conexión al pool
    }
};
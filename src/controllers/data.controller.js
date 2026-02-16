import pool from '../config/db.js';

// --- UTILIDADES ---
const formatearNit = (nit) => {
    if (!nit) return '';
    const n = nit.toString().replace(/[^0-9]/g, '');
    if (n.length === 14) return `${n.substring(0, 4)}-${n.substring(4, 10)}-${n.substring(10, 13)}-${n.substring(13, 14)}`;
    return nit;
};

const formatearFecha = (fecha) => {
    if (!fecha) return new Date().toISOString().split('T')[0];
    if (fecha.includes('/')) {
        const partes = fecha.split('/');
        if (partes[0].length === 4) return `${partes[0]}-${partes[1]}-${partes[2]}`;
        return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    return fecha.substring(0, 10);
};

// --- EXPORTAR (BACKUP) ---
export const exportarTodoJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [declarante] = await pool.query('SELECT * FROM declarante WHERE iddeclaNIT = ?', [nit]);
        // Seleccionamos TODO (*) para asegurar que el backup tenga todas las columnas
        const [compras] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ?', [nit, mes, anio]);
        const [ventasCCF] = await pool.query('SELECT * FROM credfiscal WHERE iddeclaNIT = ? AND FiscMesDeclarado = ? AND FiscAnioDeclarado = ?', [nit, mes, anio]);
        const [ventasCF] = await pool.query('SELECT * FROM consumidorfinal WHERE ConsfECHA LIKE ?', [`${anio}%`]);

        res.json({
            encabezado: { nit_declarante: nit, nombre: declarante[0]?.declarante, periodo: { mes, anio } },
            modulos: { compras, ventas_consumidor: ventasCF, ventas_credito_fiscal: ventasCCF }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- IMPORTAR (EL CORAZÓN DEL SISTEMA) ---
export const importarTodoJSON = async (req, res) => {
    const data = req.body;
    console.log("📥 Importando datos completos...");
    
    if (!data?.encabezado) return res.status(400).json({ message: 'JSON inválido' });

    const { nit_declarante, periodo } = data.encabezado;
    const nitLimpio = nit_declarante.replace(/[^0-9]/g, '');
    const nitFormateado = formatearNit(nitLimpio);

    try {
        const [declarante] = await pool.query('SELECT iddeclaNIT FROM declarante WHERE iddeclaNIT = ? OR iddeclaNIT = ?', [nitLimpio, nitFormateado]);
        if (declarante.length === 0) return res.status(404).json({ message: 'Empresa no encontrada' });
        const nitReal = declarante[0].iddeclaNIT;
        
        let reporte = { compras: 0, ventas_ccf: 0, ventas_cf: 0, errores: 0 };

        // --- A. COMPRAS (EXPANDIDO) ---
        if (data.modulos?.compras?.length > 0) {
            for (const c of data.modulos.compras) {
                try {
                    // Datos básicos
                    const fecha = formatearFecha(c.fecha || c.ComFecha);
                    const tipo = c.tipo_doc || c.ComTipo || '03';
                    const numero = c.numero || c.ComNumero || 'S/N';
                    const nitProv = c.proveedor_nit || c.proveedor_ProvNIT || '00000000000000';
                    const nomProv = c.proveedor_nombre || c.ComNomProve || 'PROVEEDOR VARIOS';
                    
                    // Asegurar Proveedor
                    await pool.query('INSERT IGNORE INTO proveedor (ProvNIT, ProvNombre) VALUES (?, ?)', [nitProv, nomProv]);

                    // MAPEO COMPLETO DE VALORES (Prioridad: Backup DB -> Lector JSON -> 0)
                    const gravado = parseFloat(c.ComIntGrav ?? c.valores?.gravado ?? 0);
                    const iva = parseFloat(c.ComCredFiscal ?? c.valores?.iva ?? 0);
                    const total = parseFloat(c.ComTotal ?? c.valores?.total ?? 0);
                    
                    // Campos específicos de Backup (si no existen en Lector, son 0)
                    const intExe = parseFloat(c.ComIntExe ?? 0);
                    const intlExe = parseFloat(c.ComInternacioExe ?? 0);
                    const noSujeto = parseFloat(c.ComImpExeNoSujetas ?? 0);
                    const intlGrav = parseFloat(c.ComInternacGravBienes ?? 0);
                    const impGravB = parseFloat(c.ComImportGravBienes ?? 0);
                    const impGravS = parseFloat(c.ComImportGravServicios ?? 0);
                    const otro = parseFloat(c.ComOtroAtributo ?? 0);

                    await pool.query(`
                        INSERT INTO compras 
                        (ComFecha, ComTipo, ComNumero, proveedor_ProvNIT, ComNomProve, iddeclaNIT, 
                         ComMesDeclarado, ComAnioDeclarado,
                         ComIntGrav, ComCredFiscal, ComTotal,
                         ComIntExe, ComInternacioExe, ComImpExeNoSujetas,
                         ComInternacGravBienes, ComImportGravBienes, ComImportGravServicios,
                         ComOtroAtributo,
                         ComClase, ComTipoOpeRenta, ComClasiRenta, ComSecNum, ComTipoCostoGasto)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '4. DOCUMENTO TRIBUTARIO DTE', '1', '1', '1', '1')
                    `, [
                        fecha, tipo, numero, nitProv, nomProv, nitReal, 
                        periodo.mes, periodo.anio,
                        gravado, iva, total,
                        intExe, intlExe, noSujeto,
                        intlGrav, impGravB, impGravS,
                        otro
                    ]);
                    reporte.compras++;
                } catch (e) { console.error("Error Compra:", e.message); reporte.errores++; }
            }
        }

        // --- B. VENTAS CCF ---
        if (data.modulos?.ventas_credito_fiscal?.length > 0) {
            for (const v of data.modulos.ventas_credito_fiscal) {
                try {
                    const fecha = formatearFecha(v.fecha || v.FiscFecha);
                    const nitCli = v.cliente_nit || v.clientes_CliNIT;
                    
                    // Validación FK Cliente
                    const [cliente] = await pool.query('SELECT CliNIT FROM clientes WHERE CliNIT = ?', [nitCli]);
                    if (cliente.length > 0) {
                        await pool.query(`
                            INSERT INTO credfiscal 
                            (FiscFecha, FiscNumDoc, clientes_CliNIT, FiscNomCli, iddeclaNIT, 
                             FiscMesDeclarado, FiscAnioDeclarado, 
                             FiscVtaGravLocal, FiscDebitoFiscal, FiscTotalVtas)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            fecha, v.numero || v.FiscNumDoc, nitCli, v.cliente_nombre || v.FiscNomCli, nitReal,
                            periodo.mes, periodo.anio,
                            parseFloat(v.FiscVtaGravLocal ?? v.valores?.gravado ?? 0),
                            parseFloat(v.FiscDebitoFiscal ?? v.valores?.iva ?? 0),
                            parseFloat(v.FiscTotalVtas ?? v.valores?.total ?? 0)
                        ]);
                        reporte.ventas_ccf++;
                    }
                } catch (e) { reporte.errores++; }
            }
        }

        // --- C. VENTAS CF ---
        if (data.modulos?.ventas_consumidor?.length > 0) {
            for (const v of data.modulos.ventas_consumidor) {
                try {
                    // IMPORTANTE: consumidorfinal a veces requiere 'anexos_idAnexos'. 
                    // Si tu DB lo pide NOT NULL, esto fallará. Asumimos que es nullable o tiene default.
                    await pool.query(`
                        INSERT INTO consumidorfinal 
                        (ConsfECHA, ConsNumDocDEL, ConsNumDocAL, ConsVtaGravLocal, ConsVtaExeLocal, ConsTotalVta)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        formatearFecha(v.fecha || v.ConsfECHA), 
                        v.del || v.ConsNumDocDEL, 
                        v.al || v.ConsNumDocAL,
                        parseFloat(v.ConsVtaGravLocal ?? v.valores?.gravado ?? 0),
                        parseFloat(v.ConsVtaExeLocal ?? v.valores?.exento ?? 0),
                        parseFloat(v.ConsTotalVta ?? v.valores?.total ?? 0)
                    ]);
                    reporte.ventas_cf++;
                } catch (e) { reporte.errores++; }
            }
        }

        res.json({ message: "Importación finalizada", detalle: reporte });
    } catch (error) {
        console.error("🔥 Error crítico:", error);
        res.status(500).json({ message: error.message });
    }
};
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
    let d = new Date(fecha);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return String(fecha).substring(0, 10);
};

const mesMap = {
    "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6,
    "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
};

// --- 1. EXPORTAR TODO (BACKUP MAESTRO) ---
export const exportarTodoJSON = async (req, res) => {
    const { mes, anio, nit } = req.query;
    const mesNum = mesMap[mes] || mes; 

    try {
        const [declarante] = await pool.query('SELECT * FROM declarante WHERE iddeclaNIT = ?', [nit]);
        const [compras] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ?', [nit, mes, anio]);
        const [ventasCCF] = await pool.query('SELECT * FROM credfiscal WHERE MONTH(FiscFecha) = ? AND YEAR(FiscFecha) = ?', [mesNum, anio]);
        const [ventasCF] = await pool.query('SELECT * FROM consumidorfinal WHERE MONTH(ConsFecha) = ? AND YEAR(ConsFecha) = ?', [mesNum, anio]);
        const [sujetos] = await pool.query('SELECT * FROM comprassujexcluidos WHERE MONTH(ComprasSujExcluFecha) = ? AND YEAR(ComprasSujExcluFecha) = ?', [mesNum, anio]);

        const totalGravado = compras.reduce((s, i) => s + (parseFloat(i.ComIntGrav) || 0), 0) +
                             ventasCCF.reduce((s, i) => s + (parseFloat(i.FiscVtaGravLocal) || 0), 0) +
                             ventasCF.reduce((s, i) => s + (parseFloat(i.ConsVtaGravLocales) || 0), 0);

        res.json({
            encabezado: { nit_declarante: nit, nombre: declarante[0]?.declarante || 'Desconocido', periodo: { mes, anio } },
            totales_periodo: { total_gravado: totalGravado.toFixed(2) },
            modulos: { compras, ventas_consumidor: ventasCF, ventas_credito_fiscal: ventasCCF, sujetos_excluidos: sujetos },
            lista_compras: compras 
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 2. EXPORTAR COMPRAS (INDIVIDUAL) ---
export const exportarCompras = async (req, res) => {
    const { mes, anio, nit } = req.query;
    try {
        const [compras] = await pool.query('SELECT * FROM compras WHERE iddeclaNIT = ? AND ComMesDeclarado = ? AND ComAnioDeclarado = ?', [nit, mes, anio]);
        res.json({ lista_compras: compras, total: compras.length });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 3. EXPORTAR VENTAS CONSUMIDOR FINAL (INDIVIDUAL) ---
export const exportarVentasConsumidor = async (req, res) => {
    const { mes, anio } = req.query;
    const mesNum = mesMap[mes] || mes;
    try {
        const [ventas] = await pool.query('SELECT * FROM consumidorfinal WHERE MONTH(ConsFecha) = ? AND YEAR(ConsFecha) = ?', [mesNum, anio]);
        res.json(ventas);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 4. EXPORTAR VENTAS CRÉDITO FISCAL (INDIVIDUAL) ---
export const exportarVentasCredito = async (req, res) => {
    const { mes, anio } = req.query;
    const mesNum = mesMap[mes] || mes;
    try {
        const [ventas] = await pool.query('SELECT * FROM credfiscal WHERE MONTH(FiscFecha) = ? AND YEAR(FiscFecha) = ?', [mesNum, anio]);
        res.json(ventas);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 5. EXPORTAR SUJETOS EXCLUIDOS (INDIVIDUAL) ---
export const exportarSujetos = async (req, res) => {
    const { mes, anio } = req.query;
    
    // Mapa para convertir "Febrero" -> 2
    const mesMap = {
        "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6,
        "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
    };
    const mesNum = mesMap[mes] || mes;

    try {
        // AQUÍ USAMOS EL NOMBRE DE TABLA CORRECTO: comprassujexcluidos
        const [sujetos] = await pool.query(
            'SELECT * FROM comprassujexcluidos WHERE MONTH(ComprasSujExcluFecha) = ? AND YEAR(ComprasSujExcluFecha) = ?', 
            [mesNum, anio]
        );
        res.json(sujetos);
    } catch (error) { 
        console.error("Error exportando sujetos:", error);
        res.status(500).json({ message: error.message }); 
    }
};

// --- IMPORTAR (EL CORAZÓN DEL SISTEMA) ---
export const importarTodoJSON = async (req, res) => {
    const data = req.body;
    if (!data?.encabezado) return res.status(400).json({ message: 'JSON inválido' });
    const { nit_declarante } = data.encabezado;
    const nitLimpio = nit_declarante.replace(/[^0-9]/g, '');

    try {
        const [existe] = await pool.query('SELECT iddeclaNIT FROM declarante WHERE iddeclaNIT = ?', [nitLimpio]);
        if (existe.length === 0) await pool.query('INSERT INTO declarante (iddeclaNIT, declarante) VALUES (?, ?)', [nitLimpio, data.encabezado.nombre || 'Importado']);

        let reporte = { compras: 0, ventas_ccf: 0, ventas_cf: 0, sujetos: 0, errores: 0 };

        if (data.modulos?.compras) {
             for (const c of data.modulos.compras) {
                await pool.query('INSERT INTO compras SET ?', [{
                    ComFecha: formatearFecha(c.ComFecha), ComTipo: c.ComTipo||'03', ComNumero: c.ComNumero||'0', proveedor_ProvNIT: c.proveedor_ProvNIT||'0000', ComNomProve: c.ComNomProve||'Varios', iddeclaNIT: nitLimpio, ComMesDeclarado: data.encabezado.periodo.mes, ComAnioDeclarado: data.encabezado.periodo.anio, ComIntGrav: c.ComIntGrav||0, ComCredFiscal: c.ComCredFiscal||0, ComTotal: c.ComTotal||0, ComClase: c.ComClase||'4'
                }]).catch(e => reporte.errores++); reporte.compras++;
             }
        }
        if (data.modulos?.ventas_credito_fiscal) {
             for (const v of data.modulos.ventas_credito_fiscal) {
                await pool.query('INSERT INTO credfiscal SET ?', [{
                    FiscFecha: formatearFecha(v.FiscFecha), FiscNumDoc: v.FiscNumDoc, FiscNit: v.FiscNit, FiscNomRazonDenomi: v.FiscNomRazonDenomi, FiscVtaGravLocal: v.FiscVtaGravLocal||0, FiscDebitoFiscal: v.FiscDebitoFiscal||0, FiscTotalVtas: v.FiscTotalVtas||0
                }]).catch(e => reporte.errores++); reporte.ventas_ccf++;
             }
        }
        if (data.modulos?.ventas_consumidor) {
             for (const v of data.modulos.ventas_consumidor) {
                await pool.query('INSERT INTO consumidorfinal SET ?', [{
                    ConsFecha: formatearFecha(v.ConsFecha), ConsNumDocDEL: v.ConsNumDocDEL, ConsNumDocAL: v.ConsNumDocAL, ConsVtaGravLocales: v.ConsVtaGravLocales||0, ConsTotalVta: v.ConsTotalVta||0
                }]).catch(e => reporte.errores++); reporte.ventas_cf++;
             }
        }
        if (data.modulos?.sujetos_excluidos) {
             for (const s of data.modulos.sujetos_excluidos) {
                await pool.query('INSERT INTO comprassujexcluidos SET ?', [{
                    ComprasSujExcluFecha: formatearFecha(s.ComprasSujExcluFecha), ComprasSujExcluTipoDoc: s.ComprasSujExcluTipoDoc||'14', ComprasSujExcluNIT: s.ComprasSujExcluNIT, ComprasSujExcluNom: s.ComprasSujExcluNom, ComprasSujExcluNumDoc: s.ComprasSujExcluNumDoc, ComprasSujExcluMontoOpera: s.ComprasSujExcluMontoOpera||0, ComprasSujExcluMontoReten: s.ComprasSujExcluMontoReten||0
                }]).catch(e => reporte.errores++); reporte.sujetos++;
             }
        }
        res.json({ message: "Importación finalizada", detalle: reporte });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
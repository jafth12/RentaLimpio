import pool from '../config/db.js';
import { registrarAccion } from './historial.controller.js'; 

// --- 1. OBTENER TODAS LAS VENTAS CCF Y NOTAS (UNION) ---
export const getVentasCCF = async (req, res) => {
    const { nit, mes, anio } = req.query;
    try {
        const condCCF   = [];
        const condNC    = ["NCTipo = 'VENTA'", "NCAnexo = '2'"];
        const paramsCCF = [];   // params para la parte credfiscal del UNION
        const paramsNC  = [];   // params para la parte notas_credito del UNION

        if (nit)  { condCCF.push('iddeclaNIT = ?');       condNC.push('iddeclaNIT = ?');        paramsCCF.push(nit);  paramsNC.push(nit); }
        if (mes)  { condCCF.push('FiscMesDeclarado = ?');  condNC.push('NCMesDeclarado = ?');   paramsCCF.push(mes);  paramsNC.push(mes); }
        if (anio) { condCCF.push('FiscAnioDeclarado = ?'); condNC.push('NCAnioDeclarado = ?');  paramsCCF.push(anio); paramsNC.push(anio); }

        // Params en orden: primero parte1 (credfiscal) luego parte2 (notas_credito)
        const params = [...paramsCCF, ...paramsNC];

        const whereCCF = condCCF.length ? 'WHERE ' + condCCF.join(' AND ') : '';
        const whereNC  = 'WHERE ' + condNC.join(' AND ');

        const query = `
            SELECT 
                idCredFiscal, iddeclaNIT, FiscFecha, FisClasDoc, FisTipoDoc, FiscSerieDoc, 
                FiscNumDoc, FiscCodGeneracion, FiscNumResol, FiscSelloRecepcion,
                FiscNumContInter, FiscNit, FiscNomRazonDenomi, 
                FiscVtaExen, FiscVtaNoSujetas, FiscVtaGravLocal, FiscDebitoFiscal, FiscTotalVtas, 
                BusFiscTipoOperaRenta, BusFiscTipoIngresoRenta, FiscMesDeclarado, FiscAnioDeclarado, 
                'credfiscal' AS OrigenTabla 
            FROM credfiscal ${whereCCF}

            UNION ALL 

            SELECT 
                idNotaCredito as idCredFiscal, iddeclaNIT, NCFecha as FiscFecha, NCClaseDoc as FisClasDoc, 
                NCTipoDoc as FisTipoDoc, NULL as FiscSerieDoc, NCNumero as FiscNumDoc, 
                NCCodGeneracion as FiscCodGeneracion, NULL as FiscNumResol, NULL as FiscSelloRecepcion,
                NULL as FiscNumContInter, NCNitContraparte as FiscNit, NCNombreContraparte as FiscNomRazonDenomi, 
                NCMontoExento as FiscVtaExen, 0.00 as FiscVtaNoSujetas, NCMontoGravado as FiscVtaGravLocal, 
                NCIva as FiscDebitoFiscal, NCTotal as FiscTotalVtas, '1' as BusFiscTipoOperaRenta, 
                '1' as BusFiscTipoIngresoRenta, NCMesDeclarado as FiscMesDeclarado, 
                NCAnioDeclarado as FiscAnioDeclarado, 'notas_credito' AS OrigenTabla 
            FROM notas_credito ${whereNC}

            ORDER BY FiscFecha ASC
        `;
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener ventas CCF', error: error.message });
    }
};

export const getVentaCCFById = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query; 
    try {
        if (origen === 'notas_credito') {
            const [rows] = await pool.query('SELECT * FROM notas_credito WHERE idNotaCredito = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            res.json(rows[0]);
        } else {
            const [rows] = await pool.query('SELECT * FROM credfiscal WHERE idCredFiscal = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Venta no encontrada' });
            res.json(rows[0]);
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener venta', error: error.message });
    }
};

// --- 3. CREAR NUEVA VENTA CCF, NC o ND ---
export const createVentasCCF = async (req, res) => {
    try {
        const d = req.body;

        if (!d.iddeclaNIT) return res.status(400).json({ message: 'La Empresa / Declarante es obligatoria.' });

        const gravada = parseFloat(d.gravadas) || 0;
        const debito = d.debitoFiscal !== undefined && d.debitoFiscal !== null && d.debitoFiscal !== '' ? parseFloat(d.debitoFiscal) : (gravada * 0.13);
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;
        const tipoDoc = d.tipoDocumento || '03';
        const usuario = req.headers['x-usuario'] || 'Sistema';

        // 🛡️ LÓGICA DE VALIDACIÓN CRUZADA: DTE vs FÍSICO
        const esFisico = d.modoIngreso === 'fisico';
        const claseDoc = esFisico ? '1' : '4'; // 1=Papel, 4=DTE
        
        const numDoc = esFisico ? d.numero_fisico : d.numero_control;
        const uuidDte = esFisico ? null : (d.uuid_dte || '');
        const selloRec = esFisico ? null : (d.sello_recepcion || null); // 🛡️ AÑADIDO: Captura del Sello
        const serie = d.serie || null;
        const resolucion = esFisico ? d.resolucion : null;

        // 🚨 VALIDACIONES INTELIGENTES
        if (esFisico) {
            if (!numDoc) return res.status(400).json({ message: '⚠️ El Correlativo (Número de Documento) es obligatorio para CCF Físicos.' });
            if (!resolucion) return res.status(400).json({ message: '⚠️ El número de Resolución es obligatorio para CCF Físicos.' });
        } else {
            if (!numDoc || !uuidDte) return res.status(400).json({ message: '⚠️ El Número de Control y el UUID son obligatorios para DTE.' });
        }

        if (tipoDoc === '05' || tipoDoc === '06') {
            const [duplicado] = await pool.query(
                `SELECT idNotaCredito FROM notas_credito 
                 WHERE iddeclaNIT = ? AND (
                     (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                     OR ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(NCNitContraparte, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, uuidDte, numDoc, d.nrc]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Documento duplicado en Notas de Crédito.' });

            const query = `
                INSERT INTO notas_credito 
                (iddeclaNIT, NCFecha, NCClaseDoc, NCTipoDoc, NCNumero, NCCodGeneracion, NCNitContraparte, NCNombreContraparte, NCNumDocOrigen, NCMontoGravado, NCMontoExento, NCIva, NCTotal, NCTipo, NCMesDeclarado, NCAnioDeclarado, NCAnexo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'N/A', ?, ?, ?, ?, 'VENTA', ?, ?, '2')
            `;
            const values = [d.iddeclaNIT, d.fecha, claseDoc, tipoDoc, numDoc, uuidDte, d.nrc, d.cliente, gravada, exentas, debito, total, d.mesDeclarado, d.anioDeclarado];
            
            const [result] = await pool.query(query, values);
            registrarAccion(usuario, 'CREACION', 'ANEXO 2 (NOTAS)', `Doc: ${numDoc} - Total: $${total}`);
            res.status(201).json({ message: 'Nota Guardada Exitosamente', id: result.insertId });

        } else {
            const [duplicado] = await pool.query(
                `SELECT idCredFiscal FROM credfiscal 
                 WHERE iddeclaNIT = ? AND (
                     (FiscCodGeneracion = ? AND FiscCodGeneracion IS NOT NULL AND FiscCodGeneracion != '') 
                     OR ((FiscCodGeneracion IS NULL OR FiscCodGeneracion = '') AND REPLACE(FiscNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(FiscNit, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, uuidDte, numDoc, d.nrc]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Este Comprobante de Crédito Fiscal ya se encuentra registrado.' });

            // 🛡️ AÑADIDO: FiscSelloRecepcion
            const query = `
                INSERT INTO credfiscal 
                (iddeclaNIT, FiscFecha, FiscMesDeclarado, FiscAnioDeclarado, FisClasDoc, FisTipoDoc, FiscNumResol, FiscSerieDoc, FiscNumDoc, FiscCodGeneracion, FiscSelloRecepcion, FiscNumContInter, FiscNit, FiscNomRazonDenomi, FiscVtaExen, FiscVtaNoSujetas, FiscVtaGravLocal, FiscDebitoFiscal, FiscTotalVtas, BusFiscTipoOperaRenta, BusFiscTipoIngresoRenta, FiscNumAnexo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2')
            `;
            // 🛡️ AÑADIDO: selloRec en los values
            const values = [d.iddeclaNIT, d.fecha, d.mesDeclarado, d.anioDeclarado, claseDoc, tipoDoc, resolucion, serie, numDoc, uuidDte, selloRec, d.nrc, d.nrc, d.cliente, exentas, noSujetas, gravada, debito, total, d.tipo_operacion || '1', d.tipo_ingreso || '1'];

            const [result] = await pool.query(query, values);
            registrarAccion(usuario, 'CREACION', 'ANEXO 2', `Doc: ${numDoc} - Total: $${total}`);
            res.status(201).json({ message: 'CCF Guardado Exitosamente', id: result.insertId });
        }

    } catch (error) {
        console.error("Error BD:", error);
        res.status(500).json({ message: 'Error en la Base de Datos', error: error.message });
    }
};

// --- 4. ACTUALIZAR VENTA CCF, NC o ND ---
export const updateVentasCCF = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query; 
    try {
        const d = req.body;
        
        const gravada = parseFloat(d.gravadas) || 0;
        const debito = d.debitoFiscal !== undefined && d.debitoFiscal !== null && d.debitoFiscal !== '' ? parseFloat(d.debitoFiscal) : (gravada * 0.13);
        const exentas = parseFloat(d.exentas) || 0;
        const noSujetas = parseFloat(d.noSujetas) || 0;
        const total = parseFloat(d.total) || 0;
        const tipoDoc = d.tipoDocumento || '03';
        const usuario = req.headers['x-usuario'] || 'Sistema';

        // 🛡️ LÓGICA DE VALIDACIÓN CRUZADA
        const esFisico = d.modoIngreso === 'fisico';
        const claseDoc = esFisico ? '1' : '4'; 
        const numDoc = esFisico ? d.numero_fisico : d.numero_control;
        const uuidDte = esFisico ? null : (d.uuid_dte || '');
        const selloRec = esFisico ? null : (d.sello_recepcion || null); // 🛡️ AÑADIDO: Captura del Sello
        const serie = d.serie || null;
        const resolucion = esFisico ? d.resolucion : null;

        // 🚨 VALIDACIONES AL ACTUALIZAR
        if (esFisico) {
            if (!numDoc) return res.status(400).json({ message: '⚠️ El Correlativo (Número de Documento) es obligatorio.' });
            if (!resolucion) return res.status(400).json({ message: '⚠️ El número de Resolución es obligatorio.' });
        } else {
            if (!numDoc || !uuidDte) return res.status(400).json({ message: '⚠️ El Número de Control y el UUID son obligatorios para DTE.' });
        }

        if (origen === 'notas_credito') {
            const [duplicado] = await pool.query(
                `SELECT idNotaCredito FROM notas_credito 
                 WHERE iddeclaNIT = ? AND idNotaCredito != ? AND (
                     (NCCodGeneracion = ? AND NCCodGeneracion IS NOT NULL AND NCCodGeneracion != '') 
                     OR ((NCCodGeneracion IS NULL OR NCCodGeneracion = '') AND REPLACE(NCNumero, '-', '') = REPLACE(?, '-', '') AND REPLACE(NCNitContraparte, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, id, uuidDte, numDoc, d.nrc]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRA Nota con ese mismo Número o UUID.' });

            const query = `
                UPDATE notas_credito SET 
                    iddeclaNIT=?, NCFecha=?, NCClaseDoc=?, NCTipoDoc=?, NCNumero=?, NCCodGeneracion=?, NCNitContraparte=?, NCNombreContraparte=?, NCMontoGravado=?, NCMontoExento=?, NCIva=?, NCTotal=?, NCMesDeclarado=?, NCAnioDeclarado=?
                WHERE idNotaCredito = ?
            `;
            const values = [d.iddeclaNIT, d.fecha, claseDoc, tipoDoc, numDoc, uuidDte, d.nrc, d.cliente, gravada, exentas, debito, total, d.mesDeclarado, d.anioDeclarado, id];

            const [result] = await pool.query(query, values);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            registrarAccion(usuario, 'MODIFICACION', 'ANEXO 2 (NOTAS)', `DTE: ${numDoc}`);
            res.json({ message: 'Nota actualizada correctamente' });

        } else {
            const [duplicado] = await pool.query(
                `SELECT idCredFiscal FROM credfiscal 
                 WHERE iddeclaNIT = ? AND idCredFiscal != ? AND (
                     (FiscCodGeneracion = ? AND FiscCodGeneracion IS NOT NULL AND FiscCodGeneracion != '') 
                     OR ((FiscCodGeneracion IS NULL OR FiscCodGeneracion = '') AND REPLACE(FiscNumDoc, '-', '') = REPLACE(?, '-', '') AND REPLACE(FiscNit, '-', '') = REPLACE(?, '-', ''))
                 )`,
                [d.iddeclaNIT, id, uuidDte, numDoc, d.nrc]
            );

            if (duplicado.length > 0) return res.status(400).json({ message: '⚠️ Conflicto. Ya existe OTRO CCF con ese mismo Número o UUID.' });

            // 🛡️ AÑADIDO: FiscSelloRecepcion=?
            const query = `
                UPDATE credfiscal SET 
                    iddeclaNIT=?, FiscFecha=?, FiscMesDeclarado=?, FiscAnioDeclarado=?, FisClasDoc=?, FisTipoDoc=?, FiscNumResol=?, FiscSerieDoc=?, FiscNumDoc=?, FiscCodGeneracion=?, FiscSelloRecepcion=?, FiscNumContInter=?, FiscNit=?, FiscNomRazonDenomi=?, FiscVtaExen=?, FiscVtaNoSujetas=?, FiscVtaGravLocal=?, FiscDebitoFiscal=?, FiscTotalVtas=?, BusFiscTipoOperaRenta=?, BusFiscTipoIngresoRenta=?
                WHERE idCredFiscal = ?
            `;
            // 🛡️ AÑADIDO: selloRec en los values
            const values = [d.iddeclaNIT, d.fecha, d.mesDeclarado, d.anioDeclarado, claseDoc, tipoDoc, resolucion, serie, numDoc, uuidDte, selloRec, d.nrc, d.nrc, d.cliente, exentas, noSujetas, gravada, debito, total, d.tipo_operacion || '1', d.tipo_ingreso || '1', id];

            const [result] = await pool.query(query, values);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'CCF no encontrado' });
            registrarAccion(usuario, 'MODIFICACION', 'ANEXO 2', `DTE: ${numDoc}`);
            res.json({ message: 'CCF actualizado correctamente' });
        }

    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// --- 5. ELIMINAR VENTA CCF O NOTA ---
export const deleteVentasCCF = async (req, res) => {
    const { id } = req.params;
    const { origen } = req.query; 
    try {
        const usuario = req.headers['x-usuario'] || 'Sistema';

        if (origen === 'notas_credito') {
            const [result] = await pool.query('DELETE FROM notas_credito WHERE idNotaCredito = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Nota no encontrada' });
            registrarAccion(usuario, 'ELIMINACION', 'ANEXO 2 (NOTAS)', `Registro ID Eliminado: ${id}`);
        } else {
            const [result] = await pool.query('DELETE FROM credfiscal WHERE idCredFiscal = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Documento no encontrado' });
            registrarAccion(usuario, 'ELIMINACION', 'ANEXO 2', `Registro ID Eliminado: ${id}`);
        }

        res.json({ message: 'Documento eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};
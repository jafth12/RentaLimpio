import pool from '../config/db.js';

// OBTENER EL LISTADO DE VENTAS CCF
export const getVentasCCF = async (req, res) => {
    try {
        // Seleccionamos las columnas principales de la tabla credfiscal
        const [rows] = await pool.query(`
            SELECT 
                idCredFiscal as id,
                FiscFecha as fecha,
                FiscNumDoc as numeroComprobante,
                FiscNomRazonDenomi as cliente,
                FiscNit as nit,
                FiscTotalVtas as total
            FROM credfiscal
            ORDER BY idCredFiscal DESC
        `);
        
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ message: 'Error interno al obtener ventas', error: error.message});
    }
};

// CREAR UNA NUEVA VENTA CCF
export const createVentasCCF = async (req, res) => {
    console.log("Datos recibidos para CCF:", req.body);
    
    // Desestructuramos los datos que vienen del formulario Vue
    const { 
        clienteId, // OJO: Asegúrate que el frontend envíe el NIT o Nombre, no un "1" si no es ID real.
        fecha, 
        numeroComprobante, 
        sumas, 
        iva, 
        totalVenta,
        ivaRetenido
    } = req.body;

    try {
        // NOTA: Como no tienes tabla de 'Items', solo guardamos el resumen en 'credfiscal'.
        // Asumimos que 'clienteId' trae el NIT o buscamos el nombre (aquí guardo el ID en NIT por ahora)
        
        const query = `
            INSERT INTO credfiscal 
            (
                FiscFecha, 
                FiscNumDoc, 
                FiscNit, 
                FiscVtaGravLocal, 
                FiscDebitoFiscal, 
                FiscTotalVtas,
                FisTipoDoc,
                FisClasDoc
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Valores a insertar
        const values = [
            fecha,
            numeroComprobante,
            clienteId,          // Guardamos el cliente (NIT o ID)
            sumas,              // Ventas Gravadas (Subtotal neto)
            iva,                // 13% IVA
            totalVenta,         // Total Final
            '03 COMPROBANTE DE CREDITO FISCAL', // Tipo de documento fijo
            '4. DOCUMENTO TRIBUTARIO DTE'       // Clase fija (ajustar según necesidad)
        ];

        const [result] = await pool.query(query, values);

        res.json({ 
            message: 'Comprobante de Crédito Fiscal guardado correctamente', 
            id: result.insertId 
        });

    } catch (error) {
        console.error('Error al guardar venta:', error);
        res.status(500).json({ message: 'Error al guardar en base de datos', error: error.message });
    }
};
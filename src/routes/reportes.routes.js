import { Router } from 'express';
// 🛡️ IMPORTAMOS LA NUEVA FUNCIÓN DEL CSV
import { generarAnexosHaciendaJSON, descargarAnexo3CSV } from '../controllers/reportes.controller.js';

const router = Router();

/**
 * @route   GET /api/reportes/anexos-hacienda
 * @desc    Genera el JSON consolidado de Anexos 1, 2, 3 y 5 para el F-07
 * @access  Privado (Requiere NIT, Mes y Año por QueryParams)
 */
router.get('/anexos-hacienda', generarAnexosHaciendaJSON);

/**
 * @route   GET /api/reportes/anexo3-csv
 * @desc    Descarga el Anexo 3 (Compras) en formato CSV oficial de Hacienda (UTF-8 con BOM)
 * @access  Privado (Requiere nit, mes y anio por QueryParams)
 */
router.get('/anexo3-csv', descargarAnexo3CSV);

export default router;
import { Router } from 'express';
// 🛡️ IMPORTAMOS TODAS LAS FUNCIONES DEL CONTROLADOR
import { 
    generarAnexosHaciendaJSON, 
    descargarAnexo1CSV,
    descargarAnexo2CSV,
    descargarAnexo3CSV,
    descargarAnexo5CSV
} from '../controllers/reportes.controller.js';

const router = Router();

/**
 * @route   GET /api/reportes/anexos-hacienda
 * @desc    Genera el JSON consolidado de Anexos 1, 2, 3 y 5 para el F-07
 */
router.get('/anexos-hacienda', generarAnexosHaciendaJSON);

/**
 * @route   GET /api/reportes/anexoX-csv
 * @desc    Descarga los Anexos en formato CSV oficial de Hacienda
 */
router.get('/anexo1-csv', descargarAnexo1CSV); // Consumidor Final
router.get('/anexo2-csv', descargarAnexo2CSV); // Crédito Fiscal
router.get('/anexo3-csv', descargarAnexo3CSV); // Compras
router.get('/anexo5-csv', descargarAnexo5CSV); // Sujetos Excluidos

export default router;
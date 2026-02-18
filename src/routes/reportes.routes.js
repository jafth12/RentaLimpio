import { Router } from 'express';
import { generarAnexosHaciendaJSON } from '../controllers/reportes.controller.js';

const router = Router();

/**
 * @route   GET /api/reportes/anexos-hacienda
 * @desc    Genera el JSON consolidado de Anexos 1, 2, 3 y 5 para el F-07
 * @access  Privado (Requiere NIT, Mes y Año por QueryParams)
 */
router.get('/anexos-hacienda', generarAnexosHaciendaJSON);

export default router;
import { Router } from 'express';
import { getHistorial, registrarHistorialWeb } from '../controllers/historial.controller.js';

const router = Router();

// Ruta GET para listar el historial en la tabla (Solo Admin)
router.get('/', getHistorial);

// 🛡️ NUEVA RUTA POST: Para guardar acciones que vienen directo desde Vue
router.post('/pdf', registrarHistorialWeb);

export default router;
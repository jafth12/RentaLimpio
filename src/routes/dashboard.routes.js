import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboard.controller.js';

const router = Router();

// Ruta para extraer las métricas del panel principal
router.get('/metricas', getDashboardMetrics);

export default router;
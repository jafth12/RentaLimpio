import { Router } from 'express';
import { getRetenciones, createRetencion, updateRetencion, deleteRetencion, anularRetencion } from '../controllers/retenciones.controller.js';
import { exportarRetenciones } from '../controllers/reportes.controller.js';
import { requireAdmin } from '../middlewares/roleAuth.js';

const router = Router();

router.get('/retenciones/exportar', exportarRetenciones);
router.get('/retenciones', getRetenciones);
router.post('/retenciones', createRetencion);
router.put('/retenciones/:id', updateRetencion);
router.delete('/retenciones/:id', requireAdmin, deleteRetencion);

// 🛡️ NUEVA RUTA: Anular retención (Solo admin)
router.put('/retenciones/anular/:id', requireAdmin, anularRetencion);

export default router;
import { Router } from 'express';
import { getRetenciones, createRetencion, updateRetencion, deleteRetencion } from '../controllers/retenciones.controller.js';
import { requireAdmin } from '../middlewares/roleAuth.js';

const router = Router();

router.get('/retenciones', getRetenciones);
router.post('/retenciones', createRetencion);
router.put('/retenciones/:id', updateRetencion);
router.delete('/retenciones/:id', requireAdmin, deleteRetencion);

export default router;
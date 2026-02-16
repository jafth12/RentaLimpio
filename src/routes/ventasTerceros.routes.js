import { Router } from 'express';
import { getVentas, createVenta, updateVenta, deleteVenta } from '../controllers/ventasTerceros.controller.js';
import { requireAdmin } from '../middlewares/roleAuth.js';

const router = Router();

router.get('/ventas-terceros', getVentas);
router.post('/ventas-terceros', createVenta);
router.put('/ventas-terceros:id', updateVenta);
router.delete('/ventas-terceros:id', requireAdmin, deleteVenta);

export default router;
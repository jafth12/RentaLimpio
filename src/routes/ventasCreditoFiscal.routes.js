import { Router } from "express";
import { exportarVentasCredito } from "../controllers/data.controller.js";
import { getVentasCCF, createVentasCCF, updateVentasCCF, deleteVentasCCF, getVentaCCFById } from "../controllers/ventasCreditoFiscal.controller.js";
import { requireAdmin } from '../middlewares/roleAuth.js';

const router = Router();

router.get('/ventas-CCF/exportar', exportarVentasCredito);
router.get('/ventas-CCF', getVentasCCF);
router.get('/ventas-CCF/:id', getVentaCCFById);
router.post('/ventas-CCF', createVentasCCF);
router.put('/ventas-CCF/:id', updateVentasCCF);
router.delete('/ventas-CCF/:id', requireAdmin, deleteVentasCCF);

export default router;
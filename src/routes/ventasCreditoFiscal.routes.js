import { Router } from "express";
import { getVentasCCF, createVentasCCF } from "../controllers/ventasCreditoFiscal.controller.js";

const router = Router();

router.get('/ventas-CCF', getVentasCCF);
router.post('/ventas-CCF', createVentasCCF);

export default router;
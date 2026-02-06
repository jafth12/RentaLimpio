import { Router } from "express";
import { getVentasCCF, createVentasCCF } from "../controllers/ventasCreditoFiscal.controller.js";

const router = Router();

router.get('/', getVentasCCF);
router.post('/', createVentasCCF);

export default router;
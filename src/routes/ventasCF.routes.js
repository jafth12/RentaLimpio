import { Router } from "express";
import { getVentasConsumidor, createVentaConsumidor, updateVentaConsumidor,deleteVentaConsumidor } from "../controllers/consumidorFinal.controller.js";

const router = Router();

router.get('/ventas-cf', getVentasConsumidor);
router.post('/ventas-cf', createVentaConsumidor);
router.put('/ventas-cf/:id', updateVentaConsumidor);
router.delete('/ventas-cf/:id', deleteVentaConsumidor);

export default router;
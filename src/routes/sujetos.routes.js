import { Router } from "express";
import { exportarSujetos } from "../controllers/data.controller.js";
import { getSujetos, createSujeto, updateSujeto, deleteSujeto } from "../controllers/sujetos.controller.js";

const router = Router();

router.get('/sujetos/exportar', exportarSujetos);
router.get('/sujetos', getSujetos);
router.post('/sujetos', createSujeto);
router.put('/sujetos/:id', updateSujeto);
router.delete('/sujetos/:id', deleteSujeto);

export default router;
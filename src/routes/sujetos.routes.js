import { Router } from "express";
import { getSujetos, createSujeto, updateSujeto, deleteSujeto } from "../controllers/sujetos.controller.js";

const router = Router();

router.get('/sujetos', getSujetos);
router.post('/sujetos', createSujeto);
router.put('/sujetos/:id', updateSujeto);
router.delete('/sujetos/:id', deleteSujeto);

export default router;
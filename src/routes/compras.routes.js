import { Router } from "express";
import { getCompras, createCompra, deleteCompra, updateCompra } from "../controllers/compras.controller.js";

const router = Router();

router.get('/compras', getCompras);
router.post('/compras', createCompra);
router.delete('/compras/:id', deleteCompra);
router.put('/compras/:id', updateCompra);

export default router;
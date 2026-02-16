import { Router } from "express";
import { getCompras, createCompra, deleteCompra, updateCompra, exportarComprasJSON } from "../controllers/compras.controller.js";
import { requireAdmin } from '../middlewares/roleAuth.js';

const router = Router();

router.get('/compras', getCompras);
router.post('/compras', createCompra);
router.delete('/compras/:id', requireAdmin, deleteCompra);
router.put('/compras/:id', updateCompra);
router.get('/compras/exportar', exportarComprasJSON);

export default router;
import { Router } from "express";
import { getCompras, createCompra, deleteCompra, updateCompra } from "../controllers/compras.controller.js";
import { exportarCompras } from "../controllers/data.controller.js"; // 🛡️ NUEVO: Importamos el exportador
import { requireAdmin } from '../middlewares/roleAuth.js';

const router = Router();

// 🛡️ NUEVA RUTA: Para exportar individualmente el Backup de Compras
router.get('/compras/exportar', exportarCompras); 

router.get('/compras', getCompras);
router.post('/compras', createCompra);
router.delete('/compras/:id', requireAdmin, deleteCompra);
router.put('/compras/:id', updateCompra);

export default router;
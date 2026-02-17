import { Router } from "express";
import { 
    getDeclarantes, 
    createDeclarante, 
    updateDeclarante, 
    deleteDeclarante 
} from "../controllers/declarantes.controller.js";
import { requireAdmin } from "../middlewares/roleAuth.js"; // Seguridad extra

const router = Router();

// Rutas protegidas (Solo Admin)
router.get('/declarantes', requireAdmin, getDeclarantes);
router.post('/declarantes', requireAdmin, createDeclarante);      // Faltaba esta
router.put('/declarantes/:id', requireAdmin, updateDeclarante);   // Faltaba esta
router.delete('/declarantes/:id', requireAdmin, deleteDeclarante); // Faltaba importar

export default router;
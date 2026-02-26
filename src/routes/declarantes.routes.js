import { Router } from "express";
import { 
    getDeclarantes, 
    createDeclarante, 
    updateDeclarante, 
    deleteDeclarante 
} from "../controllers/declarantes.controller.js";
import { requireAdmin } from "../middlewares/roleAuth.js"; // Seguridad extra

const router = Router();

//  GET liberado: Todos los usuarios (admins y empleados) necesitan ver la lista para los dropdowns
router.get('/declarantes', getDeclarantes);

//  Rutas protegidas: Solo el Admin puede crear, editar o eliminar empresas
router.post('/declarantes', requireAdmin, createDeclarante);      
router.put('/declarantes/:id', requireAdmin, updateDeclarante);   
router.delete('/declarantes/:id', requireAdmin, deleteDeclarante); 

export default router;
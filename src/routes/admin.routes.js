import { Router } from 'express';
import { 
    getEmpleados, createEmpleado, updateEmpleado, deleteEmpleado,
    getUsuarios, createUsuario, deleteUsuario 
} from '../controllers/admin.controller.js';

// Si ya tienes el middleware de seguridad, úsalo aquí. Si no, déjalo libre por ahora.
// import { requireAdmin } from '../middlewares/roleAuth.js';

const router = Router();

router.get('/empleados', getEmpleados);
router.post('/empleados', createEmpleado);
router.put('/empleados/:id', updateEmpleado);
router.delete('/empleados/:id', deleteEmpleado);

router.get('/usuarios', getUsuarios);
router.post('/usuarios', createUsuario);
router.delete('/usuarios/:id', deleteUsuario);

export default router;
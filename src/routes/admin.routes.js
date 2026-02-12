import { Router } from 'express';
import { 
    getEmpleados, createEmpleado, updateEmpleado, deleteEmpleado,
    getUsuarios, createUsuario, deleteUsuario 
} from '../controllers/admin.controller.js';

import { requireAdmin } from '../middlewares/roleAuth.js';

const router = Router();

router.get('/empleados', requireAdmin, getEmpleados);
router.post('/empleados', requireAdmin, createEmpleado);
router.put('/empleados/:id', requireAdmin, updateEmpleado);
router.delete('/empleados/:id', requireAdmin, deleteEmpleado);

router.get('/usuarios', requireAdmin, getUsuarios);
router.post('/usuarios', requireAdmin, createUsuario);
router.delete('/usuarios/:id', requireAdmin, deleteUsuario);

export default router;
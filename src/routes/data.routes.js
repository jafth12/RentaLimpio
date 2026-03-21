import { Router } from 'express';
import { importarTodoJSON } from '../controllers/data.controller.js';
import { exportarTodoJSON } from '../controllers/reportes.controller.js';

const router = Router();

router.get('/exportar-todo', exportarTodoJSON);
router.post('/importar-todo', importarTodoJSON);

export default router;
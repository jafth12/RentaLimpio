import { Router } from 'express';
import { exportarTodoJSON, importarTodoJSON } from '../controllers/data.controller.js';

const router = Router();

router.get('/exportar-todo', exportarTodoJSON);
router.post('/importar-todo', importarTodoJSON);

export default router;
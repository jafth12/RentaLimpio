import { Router } from 'express';
import { getAnulados, createAnulacion, updateAnulacion, deleteAnulacion, buscarDocumentoInteligente } from '../controllers/anulados.controller.js';

const router = Router();

// Rutas para el CRUD de Anulados y Extraviados
router.get('/buscar', buscarDocumentoInteligente);
router.get('/', getAnulados);
router.post('/', createAnulacion);
router.put('/:id', updateAnulacion);
router.delete('/:id', deleteAnulacion);

export default router;
import { Router } from 'express';
import { buscarDocumentoOperacion } from '../controllers/busqueda.controller.js';

const router = Router();

// GET /api/documentos/buscar?iddeclaNIT=...&tipoOrigen=...&busqueda=...
router.get('/buscar', buscarDocumentoOperacion);

export default router;
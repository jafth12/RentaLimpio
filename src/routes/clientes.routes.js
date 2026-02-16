import { Router } from "express";
import {getClientes, createCliente, updateCliente, deleteCliente } from "../controllers/clientes.Controller.js";
import { requireAdmin } from "../middlewares/roleAuth.js"; 

const router = Router();

router.get('/clientes', getClientes);
router.post('/clientes', createCliente);    
router.put('/clientes/:id', updateCliente);
router.delete('/clientes/:id', requireAdmin, deleteCliente);
export default router;
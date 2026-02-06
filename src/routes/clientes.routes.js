import { Router } from "express";
import { getClientes } from "../controllers/clientes.Controller.js";

const router = Router();
router.get('/clientes', getClientes);

export default router;
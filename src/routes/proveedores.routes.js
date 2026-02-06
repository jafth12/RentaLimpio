import { Router } from "express";
import { createProveedor, getProveedores, updateProveedor, deleteProveedor } from "../controllers/proveedores.controller.js";

const router = Router();

router.get('/proveedores', getProveedores);
router.post('/proveedores', createProveedor);
router.put('/proveedores/:nitOriginal', updateProveedor);
router.delete('/proveedores/:nit', deleteProveedor);

export default router;
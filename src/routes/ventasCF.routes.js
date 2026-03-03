import { Router } from "express";
import { exportarVentasConsumidor } from "../controllers/data.controller.js";
import { 
    getVentasCF, 
    getVentaCFById,
    createVentasCF, 
    updateVentasCF,
    deleteVentasCF 
} from "../controllers/consumidorFinal.controller.js";

const router = Router();

// Ruta de exportación (Backup)
router.get('/ventas-cf/exportar', exportarVentasConsumidor);

// Rutas CRUD principales
router.get('/ventas-cf', getVentasCF);          
router.get('/ventas-cf/:id', getVentaCFById);          
router.post('/ventas-cf', createVentasCF);       
router.put('/ventas-cf/:id', updateVentasCF);    
router.delete('/ventas-cf/:id', deleteVentasCF);

export default router;
import { Router } from "express";
import { 
    getVentasConsumidor, 
    getVentaConsumidorById,
    createVentaConsumidor, 
    updateVentaConsumidor,
    deleteVentaConsumidor 
} from "../controllers/consumidorFinal.controller.js";

const router = Router();


router.get('/ventas-cf', getVentasConsumidor);          
router.get('/ventas-cf/:id', getVentaConsumidorById);  
router.post('/ventas-cf', createVentaConsumidor);       
router.put('/ventas-cf/:id', updateVentaConsumidor);    
router.delete('/ventas-cf/:id', deleteVentaConsumidor);

export default router;
import { Router } from "express";
import { getDeclarantes } from "../controllers/declarantes.controller.js";

const router = Router();


router.get('/declarantes', getDeclarantes);

export default router;
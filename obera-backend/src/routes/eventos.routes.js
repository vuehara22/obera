import { Router } from "express";
import { crearEvento, listarEventos } from "../controllers/eventos.controller.js";

const router = Router();

router.get("/", listarEventos);
router.post("/", crearEvento);

export default router;
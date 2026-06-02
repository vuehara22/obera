import { Router } from "express";
import {
  listarTransportes,
  crearTransporte,
  actualizarTransporte,
  eliminarTransporte,
} from "../controllers/transportes.controller.js";

const router = Router();

router.get("/", listarTransportes);
router.post("/", crearTransporte);
router.put("/:id", actualizarTransporte);
router.delete("/:id", eliminarTransporte);

export default router;
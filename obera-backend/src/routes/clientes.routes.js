import { Router } from "express";
import {
  listarClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} from "../controllers/clientes.controller.js";

const router = Router();

router.get("/", listarClientes);
router.post("/", crearCliente);
router.put("/:id", actualizarCliente);
router.delete("/:id", eliminarCliente);

export default router;
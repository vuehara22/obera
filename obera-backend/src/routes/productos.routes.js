import { Router } from "express";
import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "../controllers/productos.controller.js";

const router = Router();

router.get("/", listarProductos);
router.post("/", crearProducto);
router.put("/:id", actualizarProducto);
router.delete("/:id", eliminarProducto);

export default router;
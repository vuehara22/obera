import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import eventosRoutes from "./routes/eventos.routes.js";
import { pool } from "./config/db.js";
import productosRoutes from "./routes/productos.routes.js";
import clientesRoutes from "./routes/clientes.routes.js";
import transportesRoutes from "./routes/transportes.routes.js";
import cuentaCorrienteRoutes from "./routes/cuentaCorriente.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend Obera funcionando" });
});

app.use("/eventos", eventosRoutes);
app.use("/productos", productosRoutes);
app.use("/clientes", clientesRoutes);
app.use("/transportes", transportesRoutes);
app.use("/cuenta-corriente", cuentaCorrienteRoutes);

const PORT = process.env.PORT || 3001;

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ ok: true, time: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "Error conectando a PostgreSQL" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
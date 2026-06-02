import { pool } from "../config/db.js";

export async function listarClientes(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        cliente_id AS "IDCliente",
        nombre_razon_social AS "NombreRazonSocial",
        cuit_cuil AS "CUITCUIL",
        telefono AS "Telefono",
        email AS "Email",
        ciudad AS "Ciudad",
        direccion AS "Direccion",
        direccion_envio AS "DireccionEnvio",
        direccion_facturacion AS "DireccionFacturacion",
        pref_factura AS "PrefFactura",
        tiene_cuenta_corriente AS "TieneCuentaCorriente",
        notas AS "Notas"
      FROM clientes
      ORDER BY nombre_razon_social ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error listando clientes:", error);
    res.status(500).json({ error: "Error listando clientes" });
  }
}

export async function crearCliente(req, res) {
  try {
    const c = req.body;

    const result = await pool.query(
      `
      INSERT INTO clientes (
        cliente_id,
        nombre_razon_social,
        cuit_cuil,
        telefono,
        email,
        ciudad,
        direccion,
        direccion_envio,
        direccion_facturacion,
        pref_factura,
        tiene_cuenta_corriente,
        notas
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        c.IDCliente || `CLI-${Date.now()}`,
        c.NombreRazonSocial,
        c.CUITCUIL || "",
        c.Telefono || "",
        c.Email || "",
        c.Ciudad || "",
        c.Direccion || "",
        c.DireccionEnvio || c.Direccion || "",
        c.DireccionFacturacion || c.Direccion || "",
        c.PrefFactura || "A",
        c.TieneCuentaCorriente === true,
        c.Notas || "",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creando cliente:", error);
    res.status(500).json({ error: "Error creando cliente" });
  }
}

export async function actualizarCliente(req, res) {
  try {
    const { id } = req.params;
    const c = req.body;

    const result = await pool.query(
      `
      UPDATE clientes
      SET
        cliente_id = $1,
        nombre_razon_social = $2,
        cuit_cuil = $3,
        telefono = $4,
        email = $5,
        ciudad = $6,
        direccion = $7,
        direccion_envio = $8,
        direccion_facturacion = $9,
        pref_factura = $10,
        tiene_cuenta_corriente = $11,
        notas = $12,
        updated_at = NOW()
      WHERE cliente_id = $13
      RETURNING *
      `,
      [
        c.IDCliente,
        c.NombreRazonSocial,
        c.CUITCUIL || "",
        c.Telefono || "",
        c.Email || "",
        c.Ciudad || "",
        c.Direccion || "",
        c.DireccionEnvio || c.Direccion || "",
        c.DireccionFacturacion || c.Direccion || "",
        c.PrefFactura || "A",
        c.TieneCuentaCorriente === true,
        c.Notas || "",
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error actualizando cliente:", error);
    res.status(500).json({ error: "Error actualizando cliente" });
  }
}

export async function eliminarCliente(req, res) {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM clientes WHERE cliente_id = $1`, [id]);

    res.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando cliente:", error);
    res.status(500).json({ error: "Error eliminando cliente" });
  }
}
import { pool } from "../config/db.js";

export async function listarTransportes(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nombre,
        descripcion,
        activo,
        minimo_km AS "minimoKm",
        precio_minimo AS "precioMinimo",
        precio_por_km AS "precioPorKm",
        porcentaje_venta_sin_iva AS "porcentajeVentaSinIva",
        precio_por_bulto AS "precioPorBulto",
        observaciones
      FROM transportes
      ORDER BY nombre ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error listando transportes:", error);
    res.status(500).json({ error: "Error listando transportes" });
  }
}

export async function crearTransporte(req, res) {
  try {
    const t = req.body;

    const result = await pool.query(
      `
      INSERT INTO transportes (
        id,
        nombre,
        descripcion,
        activo,
        minimo_km,
        precio_minimo,
        precio_por_km,
        porcentaje_venta_sin_iva,
        precio_por_bulto,
        observaciones
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        t.id || `vehiculo-${Date.now()}`,
        t.nombre,
        t.descripcion || "",
        t.activo !== false,
        Number(t.minimoKm) || 0,
        Number(t.precioMinimo) || 0,
        Number(t.precioPorKm) || 0,
        Number(t.porcentajeVentaSinIva) || 0,
        Number(t.precioPorBulto) || 0,
        t.observaciones || "",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creando transporte:", error);
    res.status(500).json({ error: "Error creando transporte" });
  }
}

export async function actualizarTransporte(req, res) {
  try {
    const { id } = req.params;
    const t = req.body;

    const result = await pool.query(
      `
      UPDATE transportes
      SET
        id = $1,
        nombre = $2,
        descripcion = $3,
        activo = $4,
        minimo_km = $5,
        precio_minimo = $6,
        precio_por_km = $7,
        porcentaje_venta_sin_iva = $8,
        precio_por_bulto = $9,
        observaciones = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
      `,
      [
        t.id,
        t.nombre,
        t.descripcion || "",
        t.activo !== false,
        Number(t.minimoKm) || 0,
        Number(t.precioMinimo) || 0,
        Number(t.precioPorKm) || 0,
        Number(t.porcentajeVentaSinIva) || 0,
        Number(t.precioPorBulto) || 0,
        t.observaciones || "",
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error actualizando transporte:", error);
    res.status(500).json({ error: "Error actualizando transporte" });
  }
}

export async function eliminarTransporte(req, res) {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM transportes WHERE id = $1`, [id]);

    res.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando transporte:", error);
    res.status(500).json({ error: "Error eliminando transporte" });
  }
}
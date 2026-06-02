import { pool } from "../config/db.js";

export async function listarMovimientos(req, res) {
  try {
    const result = await pool.query(`
      SELECT *
      FROM cuenta_corriente_movimientos
      ORDER BY fecha DESC, created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo movimientos",
    });
  }
}

export async function crearMovimiento(req, res) {
  try {
    const {
      evento_id,
      cliente_id,
      cliente_nombre,
      fecha,
      tipo,
      concepto,
      referencia,
      monto,
      origen,
      estado_cobro,
      fecha_evento_inicio,
      fecha_evento_fin,
      fecha_stock_desde,
      fecha_stock_hasta,
      dias_alquiler_cobrados,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO cuenta_corriente_movimientos (
        evento_id,
        cliente_id,
        cliente_nombre,
        fecha,
        tipo,
        concepto,
        referencia,
        monto,
        origen,
        estado_cobro,
        fecha_evento_inicio,
        fecha_evento_fin,
        fecha_stock_desde,
        fecha_stock_hasta,
        dias_alquiler_cobrados
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      RETURNING *
      `,
      [
        evento_id || null,
        cliente_id || "",
        cliente_nombre || "",
        fecha || null,
        tipo || "DEBE",
        concepto || "",
        referencia || "",
        monto || 0,
        origen || "manual",
        estado_cobro || "PENDIENTE",
        fecha_evento_inicio || null,
        fecha_evento_fin || null,
        fecha_stock_desde || null,
        fecha_stock_hasta || null,
        dias_alquiler_cobrados || 1,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error creando movimiento",
    });
  }
}

export async function actualizarMovimiento(req, res) {
  try {
    const { id } = req.params;

    const {
      fecha,
      tipo,
      concepto,
      referencia,
      monto,
      estado_cobro,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE cuenta_corriente_movimientos
      SET
        fecha = $1,
        tipo = $2,
        concepto = $3,
        referencia = $4,
        monto = $5,
        estado_cobro = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
      `,
      [
        fecha,
        tipo,
        concepto,
        referencia,
        monto,
        estado_cobro,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error actualizando movimiento",
    });
  }
}

export async function eliminarMovimiento(req, res) {
  try {
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM cuenta_corriente_movimientos
      WHERE id = $1
      `,
      [id]
    );

    res.json({
      ok: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error eliminando movimiento",
    });
  }
}
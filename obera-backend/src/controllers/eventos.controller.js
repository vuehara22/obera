import { pool } from "../config/db.js";

export async function listarEventos(req, res) {
  try {
    const result = await pool.query(`
      SELECT *
      FROM eventos
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error listando eventos:", error);
    res.status(500).json({ error: "Error listando eventos" });
  }
}

export async function crearEvento(req, res) {
  const client = await pool.connect();

  try {
    const data = req.body;

    await client.query("BEGIN");

    const eventoResult = await client.query(
      `
      INSERT INTO eventos (
        nombre_evento,
        cliente_id,
        cliente_nombre,
        fecha_evento_inicio,
        fecha_evento_fin,
        fecha_stock_desde,
        fecha_stock_hasta,
        fecha_cobro,
        estado_cobro,
        dias_alquiler_cobrados,
        ciudad,
        direccion,
        lista_precio,
        subtotal_items,
        total_transporte,
        descuento_monto,
        iva_monto,
        total,
        observaciones
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19
      )
      RETURNING *
      `,
      [
        data.nombreEvento,
        data.clienteId || null,
        data.cliente,
        data.fechaEventoInicio,
        data.fechaEventoFin,
        data.fechaStockDesde,
        data.fechaStockHasta,
        data.fechaCobro,
        data.estadoCobro || "PENDIENTE",
        data.diasAlquilerCobrados || 1,
        data.ciudad,
        data.direccion,
        data.precioPeriodo,
        data.subtotalItems || 0,
        data.totalTransporte || 0,
        data.descuentoMonto || 0,
        data.ivaMonto || 0,
        data.total || 0,
        data.observaciones || "",
      ]
    );

    const evento = eventoResult.rows[0];

    for (const item of data.items || []) {
      await client.query(
        `
        INSERT INTO evento_items (
          evento_id,
          producto_id,
          cantidad,
          precio_unitario,
          grupo_familia_id,
          grupo_familia_nombre,
          precio_periodo
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          evento.id,
          item.ProductoID,
          item.Cantidad,
          item.precioUnitario || 0,
          item.grupoFamiliaId || null,
          item.grupoFamiliaNombre || null,
          item.precioPeriodo || data.precioPeriodo,
        ]
      );

      await client.query(
        `
        INSERT INTO stock_bloqueos (
          evento_id,
          producto_id,
          cantidad,
          fecha_desde,
          fecha_hasta
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          evento.id,
          item.ProductoID,
          item.Cantidad,
          data.fechaStockDesde,
          data.fechaStockHasta,
        ]
      );
    }

    await client.query(
      `
      INSERT INTO cuenta_corriente_movimientos (
        evento_id,
        cliente_id,
        cliente_nombre,
        fecha,
        tipo,
        concepto,
        monto
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        evento.id,
        data.clienteId || null,
        data.cliente,
        data.fechaCobro,
        "DEBE",
        `Evento confirmado: ${data.nombreEvento}`,
        data.total || 0,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      ok: true,
      evento,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creando evento:", error);
    res.status(500).json({ error: "Error creando evento" });
  } finally {
    client.release();
  }
}
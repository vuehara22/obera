import { pool } from "../config/db.js";

export async function listarProductos(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        producto_id AS "ProductoID",
        nombre_producto AS "NombreProducto",
        categoria AS "Categoria",
        subcategoria AS "Subcategoria",
        grupo_familias AS "GrupoFamilias",
        dimensiones AS "Dimensiones",
        foto AS "Foto",
        variante AS "Variante",
        disponible AS "Disponible",
        stock_inicial AS "StockInicial",
        stock_actual AS "StockActual",
        stock_minimo AS "StockMinimo",
        reorden_cantidad AS "ReordenCantidad",
        costo_reposicion AS "CostoReposicion",
        activo AS "Activo",
        ultima_actualizacion AS "UltimaActualizacion"
      FROM productos
      ORDER BY nombre_producto ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error listando productos:", error);
    res.status(500).json({ error: "Error listando productos" });
  }
}

export async function crearProducto(req, res) {
  try {
    const p = req.body;

    const result = await pool.query(
      `
      INSERT INTO productos (
        producto_id,
        nombre_producto,
        categoria,
        subcategoria,
        grupo_familias,
        dimensiones,
        foto,
        variante,
        disponible,
        stock_inicial,
        stock_actual,
        stock_minimo,
        reorden_cantidad,
        costo_reposicion,
        activo,
        ultima_actualizacion
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
      RETURNING *
      `,
      [
        p.ProductoID,
        p.NombreProducto,
        p.Categoria || "",
        p.Subcategoria || "",
        p.GrupoFamilias || "",
        p.Dimensiones || "",
        p.Foto || "",
        p.Variante || "",
        p.Disponible || "Si",
        Number(p.StockInicial) || 0,
        Number(p.StockActual) || 0,
        Number(p.StockMinimo) || 0,
        Number(p.ReordenCantidad) || 0,
        Number(p.CostoReposicion) || 0,
        p.Activo !== false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creando producto:", error);
    res.status(500).json({ error: "Error creando producto" });
  }
}

export async function actualizarProducto(req, res) {
  try {
    const { id } = req.params;
    const p = req.body;

    const result = await pool.query(
      `
      UPDATE productos
      SET
        producto_id = $1,
        nombre_producto = $2,
        categoria = $3,
        subcategoria = $4,
        grupo_familias = $5,
        dimensiones = $6,
        foto = $7,
        variante = $8,
        disponible = $9,
        stock_inicial = $10,
        stock_actual = $11,
        stock_minimo = $12,
        reorden_cantidad = $13,
        costo_reposicion = $14,
        activo = $15,
        ultima_actualizacion = NOW(),
        updated_at = NOW()
      WHERE producto_id = $16
      RETURNING *
      `,
      [
        p.ProductoID,
        p.NombreProducto,
        p.Categoria || "",
        p.Subcategoria || "",
        p.GrupoFamilias || "",
        p.Dimensiones || "",
        p.Foto || "",
        p.Variante || "",
        p.Disponible || "Si",
        Number(p.StockInicial) || 0,
        Number(p.StockActual) || 0,
        Number(p.StockMinimo) || 0,
        Number(p.ReordenCantidad) || 0,
        Number(p.CostoReposicion) || 0,
        p.Activo !== false,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error actualizando producto:", error);
    res.status(500).json({ error: "Error actualizando producto" });
  }
}

export async function eliminarProducto(req, res) {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM productos WHERE producto_id = $1`, [id]);

    res.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando producto:", error);
    res.status(500).json({ error: "Error eliminando producto" });
  }
}
export async function importarProductos(req, res) {
  const client = await pool.connect();

  try {
    const productos = Array.isArray(req.body.productos)
      ? req.body.productos
      : [];

    await client.query("BEGIN");

    for (const p of productos) {
      await client.query(
        `
        INSERT INTO productos (
          producto_id,
          nombre_producto,
          categoria,
          subcategoria,
          grupo_familias,
          dimensiones,
          foto,
          variante,
          disponible,
          stock_inicial,
          stock_actual,
          stock_minimo,
          reorden_cantidad,
          costo_reposicion,
          activo,
          ultima_actualizacion
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
        ON CONFLICT (producto_id)
        DO UPDATE SET
          nombre_producto = EXCLUDED.nombre_producto,
          categoria = EXCLUDED.categoria,
          subcategoria = EXCLUDED.subcategoria,
          grupo_familias = EXCLUDED.grupo_familias,
          dimensiones = EXCLUDED.dimensiones,
          foto = EXCLUDED.foto,
          variante = EXCLUDED.variante,
          disponible = EXCLUDED.disponible,
          stock_inicial = EXCLUDED.stock_inicial,
          stock_actual = EXCLUDED.stock_actual,
          stock_minimo = EXCLUDED.stock_minimo,
          reorden_cantidad = EXCLUDED.reorden_cantidad,
          costo_reposicion = EXCLUDED.costo_reposicion,
          activo = EXCLUDED.activo,
          ultima_actualizacion = NOW(),
          updated_at = NOW()
        `,
        [
          p.ProductoID,
          p.NombreProducto,
          p.Categoria || "",
          p.Subcategoria || "",
          p.GrupoFamilias || "",
          p.Dimensiones || "",
          p.Foto || "",
          p.Variante || "",
          p.Disponible || "Si",
          Number(p.StockInicial) || 0,
          Number(p.StockActual) || 0,
          Number(p.StockMinimo) || 0,
          Number(p.ReordenCantidad) || 0,
          Number(p.CostoReposicion) || 0,
          p.Activo !== false,
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      ok: true,
      imported: productos.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error importando productos:", error);
    res.status(500).json({ error: "Error importando productos" });
  } finally {
    client.release();
  }
}
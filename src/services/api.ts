const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function crearEventoApi(payload: any) {
  const res = await fetch(`${API_URL}/eventos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error || "Error creando evento");
  }

  return res.json();
}


export async function getProductosApi() {
  const res = await fetch(`${API_URL}/productos`);

  if (!res.ok) {
    throw new Error("Error obteniendo productos");
  }

  return res.json();
}

export async function importarProductosApi(productos: any[]) {
  const res = await fetch(`${API_URL}/productos/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productos }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error || "Error importando productos");
  }

  return res.json();
}

export async function crearProductoApi(producto: any) {
  const res = await fetch(`${API_URL}/productos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(producto),
  });

  if (!res.ok) throw new Error("Error creando producto");
  return res.json();
}

export async function actualizarProductoApi(id: string, producto: any) {
  const res = await fetch(`${API_URL}/productos/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(producto),
  });

  if (!res.ok) throw new Error("Error actualizando producto");
  return res.json();
}

export async function eliminarProductoApi(id: string) {
  const res = await fetch(`${API_URL}/productos/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Error eliminando producto");
  return res.json();
}
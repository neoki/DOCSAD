"use client";

import { useState, useEffect, useCallback } from "react";

type Factura = {
  id: string;
  sharePointItemId: string;
  fileName: string;
  importe: number | null;
  moneda: string;
  proveedor: string | null;
  fechaFactura: string | null;
  numeroFactura: string | null;
  status: string;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
};

type ByYear = Record<string, { total: number; count: number }>;

function fmtImporte(importe: number | null, moneda: string): string {
  if (importe === null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: moneda || "EUR" }).format(importe);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusChip({ status, errorMessage }: { status: string; errorMessage: string | null }) {
  if (status === "pending") {
    return (
      <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
        Analizando...
      </span>
    );
  }
  if (status === "no_config") {
    return (
      <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
        Sin config OCR
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        title={errorMessage ?? "Error desconocido"}
        style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 600, cursor: "help" }}
      >
        Error OCR
      </span>
    );
  }
  return null;
}

export default function FacturasTab({ comunidadId }: { comunidadId: string }) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [byYear, setByYear] = useState<ByYear>({});
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProveedor, setFilterProveedor] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comunidades/${comunidadId}/facturas`);
      if (res.ok) {
        const data = await res.json();
        setFacturas(data.facturas ?? []);
        setByYear(data.byYear ?? {});
        setProveedores(data.proveedores ?? []);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [comunidadId]);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      setFacturas((prev) => {
        const hasPending = prev.some((f) => f.status === "pending");
        if (hasPending) load();
        return prev;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  const filtered = facturas.filter((f) => {
    if (filterProveedor !== "all" && f.proveedor !== filterProveedor) return false;
    if (filterYear !== "all") {
      const year = f.fechaFactura ? String(new Date(f.fechaFactura).getFullYear()) : null;
      if (year !== filterYear) return false;
    }
    return true;
  });

  const selectedYearTotal =
    filterYear !== "all" && byYear[filterYear]
      ? byYear[filterYear].total
      : Object.values(byYear).reduce((sum, v) => sum + v.total, 0);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Cargando facturas...</div>;
  }

  if (facturas.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
        <div style={{ fontWeight: 600, color: "#475569", marginBottom: 8 }}>Sin facturas registradas</div>
        <div style={{ fontSize: 14, color: "#94a3b8", maxWidth: 400, margin: "0 auto" }}>
          Las facturas se detectan automáticamente cuando se sube un archivo a la carpeta de facturas en SharePoint. El sistema extrae el importe, proveedor y fecha mediante OCR.
        </div>
      </div>
    );
  }

  return (
    <div>
      {years.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          {years.map((year) => (
            <div
              key={year}
              style={{
                background: filterYear === year ? "#eff6ff" : "#f8fafc",
                border: `1px solid ${filterYear === year ? "#4F7CFF" : "#e2e8f0"}`,
                borderRadius: 12,
                padding: "12px 20px",
                cursor: "pointer",
              }}
              onClick={() => setFilterYear(filterYear === year ? "all" : year)}
            >
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{year}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: filterYear === year ? "#4F7CFF" : "#1e293b" }}>
                {fmtImporte(byYear[year].total, "EUR")}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{byYear[year].count} factura{byYear[year].count !== 1 ? "s" : ""}</div>
            </div>
          ))}
          {filterYear !== "all" && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setFilterYear("all")}
                style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer" }}
              >
                Ver todos los años
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={filterProveedor}
          onChange={(e) => setFilterProveedor(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#1e293b", background: "#fff" }}
        >
          <option value="all">Todos los proveedores</option>
          {proveedores.map((p) => p && (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <span style={{ fontSize: 13, color: "#94a3b8" }}>
          {filtered.length} factura{filtered.length !== 1 ? "s" : ""}
          {(filterProveedor !== "all" || filterYear !== "all") && selectedYearTotal > 0 && (
            <> · Total: <strong style={{ color: "#1e293b" }}>{fmtImporte(selectedYearTotal, "EUR")}</strong></>
          )}
        </span>

        <button
          onClick={load}
          style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, cursor: "pointer" }}
        >
          Actualizar
        </button>
      </div>

      <div className="card-static p-0 overflow-hidden">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Archivo", "Proveedor", "Nº Factura", "Fecha", "Importe", "Estado"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748b",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => (
              <tr
                key={f.id}
                style={{ background: i % 2 === 0 ? "#fff" : "#fafbff", borderBottom: "1px solid #f1f5f9" }}
              >
                <td style={{ padding: "10px 16px", fontSize: 13, color: "#1e293b", maxWidth: 280 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.fileName}>
                    {f.fileName}
                  </div>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, color: f.proveedor ? "#1e293b" : "#94a3b8" }}>
                  {f.proveedor ?? "—"}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: f.numeroFactura ? "#1e293b" : "#94a3b8", fontFamily: "monospace" }}>
                  {f.numeroFactura ?? "—"}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>
                  {fmtDate(f.fechaFactura)}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: f.importe !== null ? 700 : 400, color: f.importe !== null ? "#1e293b" : "#94a3b8", whiteSpace: "nowrap" }}>
                  {fmtImporte(f.importe, f.moneda)}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  {f.status !== "success" && (
                    <StatusChip status={f.status} errorMessage={f.errorMessage} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            No hay facturas con los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
}

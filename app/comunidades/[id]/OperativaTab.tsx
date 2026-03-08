"use client";

import { useState, useEffect, useCallback } from "react";

type Operativa = {
  id?: string;
  comunidadId?: string;
  usaAgreGasfincas: boolean;
  somosCorredorSeguro: boolean;
  corredorSeguroNombre: string;
  numeroPolizaSeguro: string;
  usaNuevoSistemaIncidencias: boolean;
  tieneAppTuComunidad: boolean;
  tienePortero: boolean;
  tieneConserje: boolean;
  tieneGarajista: boolean;
  tieneLimpiadora: boolean;
  tieneOtroPersonal: boolean;
  descripcionOtroPersonal: string;
  tieneVideovigilancia: boolean;
  actuaComoArrendadora: boolean;
  activoArrendadoDescripcion: string;
  gestionaConsumos: boolean;
  empresaGestionConsumos: string;
  gestionaPermisosGasoleo: boolean;
  reformaFontaneria: boolean;
  fechaReformaFontaneria: string;
  reformaSaneamiento: boolean;
  fechaReformaSaneamiento: string;
  reformaElectricidad: boolean;
  fechaReformaElectricidad: string;
  obligadaITE: boolean;
  fechaProximaITE: string;
};

const defaultOperativa: Operativa = {
  usaAgreGasfincas: false,
  somosCorredorSeguro: false,
  corredorSeguroNombre: "",
  numeroPolizaSeguro: "",
  usaNuevoSistemaIncidencias: false,
  tieneAppTuComunidad: false,
  tienePortero: false,
  tieneConserje: false,
  tieneGarajista: false,
  tieneLimpiadora: false,
  tieneOtroPersonal: false,
  descripcionOtroPersonal: "",
  tieneVideovigilancia: false,
  actuaComoArrendadora: false,
  activoArrendadoDescripcion: "",
  gestionaConsumos: false,
  empresaGestionConsumos: "",
  gestionaPermisosGasoleo: false,
  reformaFontaneria: false,
  fechaReformaFontaneria: "",
  reformaSaneamiento: false,
  fechaReformaSaneamiento: "",
  reformaElectricidad: false,
  fechaReformaElectricidad: "",
  obligadaITE: false,
  fechaProximaITE: "",
};

function toDateInput(val: string | null | undefined): string {
  if (!val) return "";
  return new Date(val).toISOString().split("T")[0];
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("es-ES");
}

function BoolToggle({
  value,
  onChange,
  editing,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  editing: boolean;
}) {
  if (!editing) {
    return (
      <span className={value ? "badge-si" : "badge-no"}>
        {value ? "Sí" : "No"}
      </span>
    );
  }
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => onChange(true)}
        className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
        style={{
          background: value ? "#dcfce7" : "#f8fafc",
          color: value ? "#166534" : "#94a3b8",
          border: `1px solid ${value ? "#86efac" : "#e2e8f0"}`,
        }}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
        style={{
          background: !value ? "#fef2f2" : "#f8fafc",
          color: !value ? "#991b1b" : "#94a3b8",
          border: `1px solid ${!value ? "#fca5a5" : "#e2e8f0"}`,
        }}
      >
        No
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-600 text-sm">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card-static"
      style={{
        borderTop: `4px solid ${color}`,
        padding: "16px 20px",
      }}
    >
      <h4 className="section-title" style={{ marginBottom: 12 }}>
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export default function OperativaTab({ comunidadId }: { comunidadId: string }) {
  const [form, setForm] = useState<Operativa>(defaultOperativa);
  const [original, setOriginal] = useState<Operativa>(defaultOperativa);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchOperativa = useCallback(async () => {
    const res = await fetch(`/api/comunidades/${comunidadId}/operativa`);
    if (res.ok) {
      const data = await res.json();
      const parsed = {
        ...data,
        corredorSeguroNombre: data.corredorSeguroNombre ?? "",
        numeroPolizaSeguro: data.numeroPolizaSeguro ?? "",
        descripcionOtroPersonal: data.descripcionOtroPersonal ?? "",
        activoArrendadoDescripcion: data.activoArrendadoDescripcion ?? "",
        empresaGestionConsumos: data.empresaGestionConsumos ?? "",
        fechaReformaFontaneria: toDateInput(data.fechaReformaFontaneria),
        fechaReformaSaneamiento: toDateInput(data.fechaReformaSaneamiento),
        fechaReformaElectricidad: toDateInput(data.fechaReformaElectricidad),
        fechaProximaITE: toDateInput(data.fechaProximaITE),
      };
      setForm(parsed);
      setOriginal(parsed);
    }
    setLoading(false);
  }, [comunidadId]);

  useEffect(() => {
    fetchOperativa();
  }, [fetchOperativa]);

  const set = (field: keyof Operativa, value: unknown) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/comunidades/${comunidadId}/operativa`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOriginal(form);
    setEditing(false);
  }

  function handleCancel() {
    setForm(original);
    setEditing(false);
  }

  if (loading)
    return (
      <div className="text-gray-500 text-sm">
        Cargando operativa...
      </div>
    );

  const iteExpired =
    form.obligadaITE &&
    form.fechaProximaITE &&
    new Date(form.fechaProximaITE) < new Date();

  const textValue = (val: string) =>
    val || <span className="text-gray-400">—</span>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary"
          >
            Editar información operativa
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={handleCancel}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Financiero y Seguros" color="#EC4899">
          <Field label="Corredor propio">
            <BoolToggle
              value={form.somosCorredorSeguro}
              onChange={(v) => set("somosCorredorSeguro", v)}
              editing={editing}
            />
          </Field>
          {!form.somosCorredorSeguro && (
            <Field label="Nombre corredor">
              {editing ? (
                <input
                  type="text"
                  value={form.corredorSeguroNombre}
                  onChange={(e) => set("corredorSeguroNombre", e.target.value)}
                  className="input-field"
                  style={{ width: 200 }}
                />
              ) : (
                <span className="text-sm">{textValue(form.corredorSeguroNombre)}</span>
              )}
            </Field>
          )}
          <Field label="Nº póliza seguro">
            {editing ? (
              <input
                type="text"
                value={form.numeroPolizaSeguro}
                onChange={(e) => set("numeroPolizaSeguro", e.target.value)}
                className="input-field"
                style={{ width: 200 }}
              />
            ) : (
              <span className="text-sm">{textValue(form.numeroPolizaSeguro)}</span>
            )}
          </Field>
        </SectionCard>

        <SectionCard title="Sistemas y Digitalización" color="#4F7CFF">
          <Field label="GESFINCAS">
            <BoolToggle
              value={form.usaAgreGasfincas}
              onChange={(v) => set("usaAgreGasfincas", v)}
              editing={editing}
            />
          </Field>
          <Field label="Nuevo sist. incidencias">
            <BoolToggle
              value={form.usaNuevoSistemaIncidencias}
              onChange={(v) => set("usaNuevoSistemaIncidencias", v)}
              editing={editing}
            />
          </Field>
          <Field label="App TuComunidad">
            <BoolToggle
              value={form.tieneAppTuComunidad}
              onChange={(v) => set("tieneAppTuComunidad", v)}
              editing={editing}
            />
          </Field>
        </SectionCard>

        <SectionCard title="Personal" color="#F59E0B">
          <Field label="Portero">
            <BoolToggle
              value={form.tienePortero}
              onChange={(v) => set("tienePortero", v)}
              editing={editing}
            />
          </Field>
          <Field label="Conserje">
            <BoolToggle
              value={form.tieneConserje}
              onChange={(v) => set("tieneConserje", v)}
              editing={editing}
            />
          </Field>
          <Field label="Garajista">
            <BoolToggle
              value={form.tieneGarajista}
              onChange={(v) => set("tieneGarajista", v)}
              editing={editing}
            />
          </Field>
          <Field label="Limpiadora">
            <BoolToggle
              value={form.tieneLimpiadora}
              onChange={(v) => set("tieneLimpiadora", v)}
              editing={editing}
            />
          </Field>
          <Field label="Otro personal">
            <BoolToggle
              value={form.tieneOtroPersonal}
              onChange={(v) => set("tieneOtroPersonal", v)}
              editing={editing}
            />
          </Field>
          {form.tieneOtroPersonal && (
            <Field label="Descripción">
              {editing ? (
                <input
                  type="text"
                  value={form.descripcionOtroPersonal}
                  onChange={(e) => set("descripcionOtroPersonal", e.target.value)}
                  className="input-field"
                  style={{ width: 200 }}
                />
              ) : (
                <span className="text-sm">
                  {textValue(form.descripcionOtroPersonal)}
                </span>
              )}
            </Field>
          )}
        </SectionCard>

        <SectionCard title="Videovigilancia" color="#8B5CF6">
          <Field label="Tiene videovigilancia">
            <BoolToggle
              value={form.tieneVideovigilancia}
              onChange={(v) => set("tieneVideovigilancia", v)}
              editing={editing}
            />
          </Field>
        </SectionCard>

        <SectionCard title="Arrendamientos" color="#EC4899">
          <Field label="Actúa como arrendadora">
            <BoolToggle
              value={form.actuaComoArrendadora}
              onChange={(v) => set("actuaComoArrendadora", v)}
              editing={editing}
            />
          </Field>
          {form.actuaComoArrendadora && (
            <Field label="Activo arrendado">
              {editing ? (
                <input
                  type="text"
                  value={form.activoArrendadoDescripcion}
                  onChange={(e) =>
                    set("activoArrendadoDescripcion", e.target.value)
                  }
                  className="input-field"
                  style={{ width: 200 }}
                />
              ) : (
                <span className="text-sm">
                  {textValue(form.activoArrendadoDescripcion)}
                </span>
              )}
            </Field>
          )}
        </SectionCard>

        <SectionCard title="Gestión de Consumos" color="#06b6d4">
          <Field label="Gestiona consumos">
            <BoolToggle
              value={form.gestionaConsumos}
              onChange={(v) => set("gestionaConsumos", v)}
              editing={editing}
            />
          </Field>
          {form.gestionaConsumos && (
            <Field label="Empresa">
              {editing ? (
                <input
                  type="text"
                  value={form.empresaGestionConsumos}
                  onChange={(e) =>
                    set("empresaGestionConsumos", e.target.value)
                  }
                  className="input-field"
                  style={{ width: 200 }}
                />
              ) : (
                <span className="text-sm">
                  {textValue(form.empresaGestionConsumos)}
                </span>
              )}
            </Field>
          )}
        </SectionCard>

        <SectionCard title="Gasóleo" color="#78716c">
          <Field label="Permisos gasóleo">
            <BoolToggle
              value={form.gestionaPermisosGasoleo}
              onChange={(v) => set("gestionaPermisosGasoleo", v)}
              editing={editing}
            />
          </Field>
        </SectionCard>

        <SectionCard title="Reformas" color="#a855f7">
          <Field label="Fontanería">
            <BoolToggle
              value={form.reformaFontaneria}
              onChange={(v) => set("reformaFontaneria", v)}
              editing={editing}
            />
          </Field>
          {form.reformaFontaneria && (
            <Field label="Fecha fontanería">
              {editing ? (
                <input
                  type="date"
                  value={form.fechaReformaFontaneria}
                  onChange={(e) =>
                    set("fechaReformaFontaneria", e.target.value)
                  }
                  className="input-field"
                  style={{ width: 180 }}
                />
              ) : (
                <span className="text-sm">
                  {formatDate(form.fechaReformaFontaneria)}
                </span>
              )}
            </Field>
          )}
          <Field label="Saneamiento">
            <BoolToggle
              value={form.reformaSaneamiento}
              onChange={(v) => set("reformaSaneamiento", v)}
              editing={editing}
            />
          </Field>
          {form.reformaSaneamiento && (
            <Field label="Fecha saneamiento">
              {editing ? (
                <input
                  type="date"
                  value={form.fechaReformaSaneamiento}
                  onChange={(e) =>
                    set("fechaReformaSaneamiento", e.target.value)
                  }
                  className="input-field"
                  style={{ width: 180 }}
                />
              ) : (
                <span className="text-sm">
                  {formatDate(form.fechaReformaSaneamiento)}
                </span>
              )}
            </Field>
          )}
          <Field label="Electricidad">
            <BoolToggle
              value={form.reformaElectricidad}
              onChange={(v) => set("reformaElectricidad", v)}
              editing={editing}
            />
          </Field>
          {form.reformaElectricidad && (
            <Field label="Fecha electricidad">
              {editing ? (
                <input
                  type="date"
                  value={form.fechaReformaElectricidad}
                  onChange={(e) =>
                    set("fechaReformaElectricidad", e.target.value)
                  }
                  className="input-field"
                  style={{ width: 180 }}
                />
              ) : (
                <span className="text-sm">
                  {formatDate(form.fechaReformaElectricidad)}
                </span>
              )}
            </Field>
          )}
        </SectionCard>

        <SectionCard title="ITE" color="#EF4444">
          <Field label="Obligada a ITE">
            <BoolToggle
              value={form.obligadaITE}
              onChange={(v) => set("obligadaITE", v)}
              editing={editing}
            />
          </Field>
          {form.obligadaITE && (
            <>
              <Field label="Fecha próxima ITE">
                {editing ? (
                  <input
                    type="date"
                    value={form.fechaProximaITE}
                    onChange={(e) => set("fechaProximaITE", e.target.value)}
                    className="input-field"
                    style={{ width: 180 }}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {formatDate(form.fechaProximaITE)}
                    </span>
                    {iteExpired && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#fef2f2", color: "#dc2626" }}
                      >
                        VENCIDA
                      </span>
                    )}
                  </div>
                )}
              </Field>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

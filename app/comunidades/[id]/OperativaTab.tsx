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

function BoolField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-300"
        } relative flex-shrink-0`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </div>
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-4">
      <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function OperativaTab({ comunidadId }: { comunidadId: string }) {
  const [form, setForm] = useState<Operativa>(defaultOperativa);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchOperativa = useCallback(async () => {
    const res = await fetch(`/api/comunidades/${comunidadId}/operativa`);
    if (res.ok) {
      const data = await res.json();
      setForm({
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
      });
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="text-gray-500 text-sm">Cargando operativa...</div>;

  return (
    <div>
      <Section title="Sistema y Herramientas">
        <BoolField label="Usa AgreGasfincas" checked={form.usaAgreGasfincas} onChange={(v) => set("usaAgreGasfincas", v)} />
        <BoolField label="Somos corredor de seguro" checked={form.somosCorredorSeguro} onChange={(v) => set("somosCorredorSeguro", v)} />
        {form.somosCorredorSeguro && (
          <input
            type="text"
            value={form.corredorSeguroNombre}
            onChange={(e) => set("corredorSeguroNombre", e.target.value)}
            placeholder="Nombre del corredor de seguro"
            className="input-field mt-2"
          />
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Número de póliza de seguro</label>
          <input
            type="text"
            value={form.numeroPolizaSeguro}
            onChange={(e) => set("numeroPolizaSeguro", e.target.value)}
            placeholder="POL-XXXX-XXX"
            className="input-field"
          />
        </div>
        <BoolField label="Usa nuevo sistema de incidencias" checked={form.usaNuevoSistemaIncidencias} onChange={(v) => set("usaNuevoSistemaIncidencias", v)} />
        <BoolField label="Tiene app TuComunidad" checked={form.tieneAppTuComunidad} onChange={(v) => set("tieneAppTuComunidad", v)} />
      </Section>

      <Section title="Personal">
        <div className="grid grid-cols-2 gap-3">
          <BoolField label="Portero" checked={form.tienePortero} onChange={(v) => set("tienePortero", v)} />
          <BoolField label="Conserje" checked={form.tieneConserje} onChange={(v) => set("tieneConserje", v)} />
          <BoolField label="Garajista" checked={form.tieneGarajista} onChange={(v) => set("tieneGarajista", v)} />
          <BoolField label="Limpiadora" checked={form.tieneLimpiadora} onChange={(v) => set("tieneLimpiadora", v)} />
        </div>
        <BoolField label="Otro personal" checked={form.tieneOtroPersonal} onChange={(v) => set("tieneOtroPersonal", v)} />
        {form.tieneOtroPersonal && (
          <input
            type="text"
            value={form.descripcionOtroPersonal}
            onChange={(e) => set("descripcionOtroPersonal", e.target.value)}
            placeholder="Descripción del otro personal"
            className="input-field"
          />
        )}
      </Section>

      <Section title="Instalaciones y Legal">
        <BoolField label="Videovigilancia" checked={form.tieneVideovigilancia} onChange={(v) => set("tieneVideovigilancia", v)} />
        <BoolField label="Actúa como arrendadora" checked={form.actuaComoArrendadora} onChange={(v) => set("actuaComoArrendadora", v)} />
        {form.actuaComoArrendadora && (
          <input
            type="text"
            value={form.activoArrendadoDescripcion}
            onChange={(e) => set("activoArrendadoDescripcion", e.target.value)}
            placeholder="Descripción del activo arrendado"
            className="input-field"
          />
        )}
        <BoolField label="Gestiona consumos" checked={form.gestionaConsumos} onChange={(v) => set("gestionaConsumos", v)} />
        {form.gestionaConsumos && (
          <input
            type="text"
            value={form.empresaGestionConsumos}
            onChange={(e) => set("empresaGestionConsumos", e.target.value)}
            placeholder="Empresa de gestión de consumos"
            className="input-field"
          />
        )}
        <BoolField label="Gestiona permisos de gasóleo" checked={form.gestionaPermisosGasoleo} onChange={(v) => set("gestionaPermisosGasoleo", v)} />
      </Section>

      <Section title="Reformas">
        <div className="space-y-4">
          <div>
            <BoolField label="Reforma fontanería" checked={form.reformaFontaneria} onChange={(v) => set("reformaFontaneria", v)} />
            {form.reformaFontaneria && (
              <input type="date" value={form.fechaReformaFontaneria} onChange={(e) => set("fechaReformaFontaneria", e.target.value)} className="input-field mt-2" />
            )}
          </div>
          <div>
            <BoolField label="Reforma saneamiento" checked={form.reformaSaneamiento} onChange={(v) => set("reformaSaneamiento", v)} />
            {form.reformaSaneamiento && (
              <input type="date" value={form.fechaReformaSaneamiento} onChange={(e) => set("fechaReformaSaneamiento", e.target.value)} className="input-field mt-2" />
            )}
          </div>
          <div>
            <BoolField label="Reforma electricidad" checked={form.reformaElectricidad} onChange={(v) => set("reformaElectricidad", v)} />
            {form.reformaElectricidad && (
              <input type="date" value={form.fechaReformaElectricidad} onChange={(e) => set("fechaReformaElectricidad", e.target.value)} className="input-field mt-2" />
            )}
          </div>
        </div>
      </Section>

      <Section title="ITE - Inspección Técnica de Edificios">
        <BoolField label="Obligada a ITE" checked={form.obligadaITE} onChange={(v) => set("obligadaITE", v)} />
        {form.obligadaITE && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha próxima ITE</label>
            <input
              type="date"
              value={form.fechaProximaITE}
              onChange={(e) => set("fechaProximaITE", e.target.value)}
              className="input-field"
            />
          </div>
        )}
      </Section>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && (
          <span className="text-green-600 text-sm font-medium">✓ Guardado correctamente</span>
        )}
      </div>
    </div>
  );
}

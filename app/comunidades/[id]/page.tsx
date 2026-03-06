"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";
import OperativaTab from "./OperativaTab";
import ChecklistTab from "./ChecklistTab";
import DocumentosTab from "./DocumentosTab";

type Comunidad = {
  id: string;
  nombre: string;
  nif: string;
  direccion: string;
  pisos: number;
  _count: { checklists: number; documentos: number };
};

const TABS = [
  { id: "operativa", label: "Operativa", icon: "⚙️" },
  { id: "checklist", label: "Checklist", icon: "✅" },
  { id: "documentos", label: "Documentos", icon: "📄" },
];

export default function ComunidadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [comunidad, setComunidad] = useState<Comunidad | null>(null);
  const [activeTab, setActiveTab] = useState("operativa");
  const [loading, setLoading] = useState(true);

  const fetchComunidad = useCallback(async () => {
    const res = await fetch(`/api/comunidades/${id}`);
    if (res.ok) {
      const data = await res.json();
      setComunidad(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchComunidad();
  }, [fetchComunidad]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">
            Cargando...
          </main>
        </div>
      </AuthGuard>
    );
  }

  if (!comunidad) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-8 text-center text-red-500">
            Comunidad no encontrada.
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/comunidades" className="hover:text-blue-600">
              Comunidades
            </Link>
            <span>›</span>
            <span className="text-gray-900">{comunidad.nombre}</span>
          </div>

          {/* Header */}
          <div className="card mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{comunidad.nombre}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>🪪 {comunidad.nif}</span>
                  <span>📍 {comunidad.direccion}</span>
                  <span>🏗️ {comunidad.pisos} pisos</span>
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="badge-completado">{comunidad._count.documentos} docs</span>
                <span className="badge-pendiente">{comunidad._count.checklists} checklist</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          {activeTab === "operativa" && <OperativaTab comunidadId={id} />}
          {activeTab === "checklist" && <ChecklistTab comunidadId={id} />}
          {activeTab === "documentos" && <DocumentosTab comunidadId={id} />}
        </main>
      </div>
    </AuthGuard>
  );
}

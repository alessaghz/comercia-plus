'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Paperclip,
  FileText,
  History,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  ChevronDown,
  Layers,
  Sparkles,
  X
} from 'lucide-react';

interface CapituloDisponible {
  capitulo: string;
  nombre: string;
  ejemplo: string;
  totalFracciones: number;
}

export default function Home() {
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);

  const [capitulos, setCapitulos] = useState<CapituloDisponible[]>([]);
  const [capituloActivo, setCapituloActivo] = useState<CapituloDisponible | null>(null);
  const [menuCapitulosAbierto, setMenuCapitulosAbierto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarHistorial();
    cargarCapitulos();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuCapitulosAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarHistorial = async () => {
    try {
      const res = await fetch('/api/clasificar');
      if (res.ok) {
        const data = await res.json();
        setHistorial(data);
      }
    } catch (e) {
      console.error('Error cargando historial:', e);
    }
  };

  const cargarCapitulos = async () => {
    try {
      const res = await fetch('/api/capitulos');
      if (res.ok) {
        const data: CapituloDisponible[] = await res.json();
        setCapitulos(data);
        if (data.length > 0) {
          setCapituloActivo(data[0]);
        }
      }
    } catch (e) {
      console.error('Error cargando capítulos:', e);
    }
  };

  const seleccionarCapitulo = (cap: CapituloDisponible) => {
    setCapituloActivo(cap);
    setDescripcion(cap.ejemplo);
    setMenuCapitulosAbierto(false);
    setError(null);
  };

  const handleClasificar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim() && !archivo) {
      setError('Por favor ingresa una descripción técnica o adjunta un archivo.');
      return;
    }

    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('descripcionProducto', descripcion);
      if (archivo) {
        formData.append('archivo', archivo);
      }

      const res = await fetch('/api/clasificar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al clasificar la mercancía.');
      }

      setResultado(data);
      cargarHistorial();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const imprimirDictamen = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* HEADER CORPORATIVO - COMBINACIÓN FORMA C (NODOS) + COLORES A (AZUL/CIAN) */}
      <header className="no-print sticky top-0 z-40 border-b border-slate-800/80 bg-[#070A10]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/25 to-cyan-500/10 border border-cyan-400/35 shadow-[0_0_24px_rgba(56,189,248,0.18)]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3"/>
                <path d="M12 6.5L17 15.5H7L12 6.5Z" stroke="#2563EB" strokeWidth="1.75" strokeLinejoin="round"/>
                <circle cx="12" cy="6.5" r="2" fill="#38BDF8"/>
                <circle cx="17" cy="15.5" r="2" fill="#2563EB"/>
                <circle cx="7" cy="15.5" r="2" fill="#60A5FA"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-0.5 text-xl font-bold tracking-tight text-white">
                Comerc<span className="text-cyan-400">IA</span>
                <span className="text-blue-500 font-extrabold">+</span>
              </div>
              <p className="text-xs text-slate-400">Copiloto de Cumplimiento Aduanero & LIGIE</p>
            </div>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMenuCapitulosAbierto(!menuCapitulosAbierto)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-medium bg-[#0B1120] hover:bg-blue-950/50 text-cyan-300 border border-cyan-500/30 transition-all shadow-[0_0_15px_rgba(37,99,235,0.15)]"
            >
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                {capitulos.length > 0
                  ? `${capitulos.length} ${capitulos.length === 1 ? 'Capítulo Activo' : 'Capítulos Activos'} (${capitulos.map(c => `Cap. ${c.capitulo}`).join(' · ')})`
                  : 'Cargando catálogo TIGIE...'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform ${menuCapitulosAbierto ? 'rotate-180' : ''}`} />
            </button>

            {menuCapitulosAbierto && (
              <div className="absolute right-0 mt-2.5 w-80 rounded-2xl bg-[#0B1120] border border-slate-800 shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Capítulos en Base de Datos
                  </span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                    En vivo
                  </span>
                </div>

                <div className="mt-1.5 space-y-1">
                  {capitulos.map((cap) => (
                    <button
                      key={cap.capitulo}
                      type="button"
                      onClick={() => seleccionarCapitulo(cap)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start justify-between gap-2 ${
                        capituloActivo?.capitulo === cap.capitulo
                          ? 'bg-blue-600/20 border border-cyan-500/30'
                          : 'hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <span className="text-cyan-400">Capítulo {cap.capitulo}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-200">{cap.nombre}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Clic para cargar ejemplo en el clasificador
                        </p>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 shrink-0">
                        {cap.totalFracciones} frac.
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="no-print rounded-2xl border border-slate-800/90 bg-[#0B1120] p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Clasificación Arancelaria Asistida y Detección de NOMs
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Describe la mercancía o adjunta su ficha técnica (PDF) / fotografía del producto para análisis multimodal.
            </p>
          </div>

          <form onSubmit={handleClasificar} className="space-y-4">
            <div className="relative">
              <textarea
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Camisa de vestir manga larga para caballero, confeccionada en tejido plano de popelina 100% algodón..."
                className="w-full rounded-xl bg-[#070A10] border border-slate-800 focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all resize-none"
              />
              {descripcion && (
                <button
                  type="button"
                  onClick={() => setDescripcion('')}
                  className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 p-1 rounded-lg"
                  title="Limpiar texto"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#070A10] border border-slate-800/90 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-xs text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  <Paperclip className="w-4 h-4 text-cyan-400" />
                  <span>
                    {archivo ? archivo.name : 'Adjuntar Ficha Técnica (PDF) o Foto del producto (JPG, PNG, WebP)'}
                  </span>
                </button>
                {archivo && (
                  <button
                    type="button"
                    onClick={() => {
                      setArchivo(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 ml-1"
                  >
                    (Quitar)
                  </button>
                )}
              </div>

              {capitulos.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Ejemplos:
                  </span>
                  {capitulos.map((cap) => (
                    <button
                      key={cap.capitulo}
                      type="button"
                      onClick={() => seleccionarCapitulo(cap)}
                      className="px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-cyan-500/20 font-medium transition-colors"
                    >
                      Cap. {cap.capitulo}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={cargando}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 transition-all shadow-[0_0_25px_rgba(37,99,235,0.35)] cursor-pointer"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizando Merceología...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Clasificar Mercancía</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-5 rounded-xl bg-rose-950/40 border border-rose-500/40 p-4 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {resultado && (
          <section className="print-sheet rounded-2xl bg-white text-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="rounded-xl bg-[#1E3A8A] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Ficha de Clasificación Merceológica
                </h2>
                <p className="text-[11px] uppercase tracking-widest text-blue-200 mt-0.5">
                  DICTAMEN TÉCNICO OFICIAL — COMERCIA+
                </p>
              </div>
              <div className="sm:text-right">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-wider font-mono">
                  {resultado.fraccion}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-blue-200">
                  FRACCIÓN ARANCELARIA
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 rounded-xl bg-blue-50/80 border border-blue-100 p-3 text-center">
              <div>
                <div className="text-[10px] font-bold text-blue-700 uppercase">Capítulo</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">{resultado.capitulo}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-700 uppercase">Partida</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">{resultado.partida}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-700 uppercase">Subpartida</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">{resultado.subpartida}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-700 uppercase">NICO</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">{resultado.nico}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-700 uppercase">Arancel (IGI)</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">{resultado.arancel_igi}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-700 uppercase">Confianza</div>
                <div className="text-base font-extrabold text-emerald-700 mt-0.5">{resultado.nivel_confianza}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 border-l-4 border-l-blue-600 p-4 space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Identificación del Producto
                </h3>
                <ul className="text-xs text-slate-700 space-y-1.5">
                  <li><strong>Nombre Comercial:</strong> {resultado.identificacion?.nombre_comercial}</li>
                  <li><strong>Nombre Técnico:</strong> {resultado.identificacion?.nombre_tecnico}</li>
                  <li><strong>Estructura:</strong> {resultado.identificacion?.estructura}</li>
                  <li><strong>Sistemas / Función:</strong> {resultado.identificacion?.sistemas_funcion}</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 border-l-4 border-l-cyan-600 p-4 space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Sustento Legal y Criterio
                </h3>
                <div className="text-xs text-slate-700 space-y-2">
                  <p><strong>Fundamento LIGIE:</strong> {resultado.sustento?.regla_nota_principal}</p>
                  <p><strong>Criterio Diferencial:</strong> {resultado.sustento?.criterio_diferencial}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2">
                Desglose de la LIGIE / Sistema Armonizado
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-3">
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 font-bold w-36 shrink-0 text-center">
                    Capítulo {resultado.capitulo}
                  </span>
                  <span className="text-slate-700 pt-1">→ {resultado.desglose_ligie?.capitulo_desc}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 font-bold w-36 shrink-0 text-center">
                    Partida {resultado.partida}
                  </span>
                  <span className="text-slate-700 pt-1">→ {resultado.desglose_ligie?.partida_desc}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 font-bold w-36 shrink-0 text-center">
                    Subpartida {resultado.subpartida}
                  </span>
                  <span className="text-slate-700 pt-1">→ {resultado.desglose_ligie?.subpartida_desc}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-900 font-bold w-36 shrink-0 text-center">
                    Fracción {resultado.fraccion}
                  </span>
                  <span className="text-slate-800 font-medium pt-1">
                    → <strong>NICO {resultado.nico}:</strong> {resultado.desglose_ligie?.fraccion_nico_desc}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {resultado.noms_aplicables?.map((nom: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-3.5 space-y-1.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {nom.norma}
                  </span>
                  <p className="text-xs text-slate-700">{nom.detalle}</p>
                </div>
              ))}
              <div className="rounded-xl border border-slate-200 p-3.5 space-y-1.5">
                <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                  IMPUESTOS Y UNIDAD
                </span>
                <p className="text-xs text-slate-700">
                  <strong>IGI:</strong> {resultado.arancel_igi}. <strong>IVA:</strong> {resultado.iva_aplicable}. <strong>Unidad:</strong> {resultado.unidad_medida}.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Documentos para la Carpeta de Agente Aduanal
              </h3>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                {resultado.documentos_carpeta?.map((doc: string, idx: number) => (
                  <li key={idx}>{doc}</li>
                ))}
              </ul>
            </div>

            <div className="no-print flex justify-end pt-2">
              <button
                type="button"
                onClick={imprimirDictamen}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Descargar / Imprimir Ficha PDF</span>
              </button>
            </div>
          </section>
        )}

        <section className="no-print rounded-2xl border border-slate-800/90 bg-[#0B1120] p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Historial Reciente de Clasificaciones</h2>
          </div>

          {historial.length === 0 ? (
            <p className="text-xs text-slate-500">Aún no hay dictámenes registrados.</p>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {historial.map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.noms_aplicables && setResultado(item.noms_aplicables)}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-3 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-cyan-400">
                        {item.fraccion}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        NICO: {item.nico}
                      </span>
                      {item.archivo_adjunto && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {item.archivo_adjunto}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{item.descripcion_usuario}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-slate-200">IGI: {item.arancel_igi}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(item.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

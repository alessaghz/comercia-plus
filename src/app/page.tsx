'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Paperclip,
  FileText,
  History,
  AlertTriangle,
  Download,
  Loader2,
  ChevronDown,
  Layers,
  Sparkles,
  X,
  ShieldCheck
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600/15 selection:text-blue-900">
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

      {/* HEADER CORPORATIVO CLARO ESTILO SAAS EMPRESARIAL */}
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo Híbrido: Nodos en Triángulo + Azul Cobalto/Cian */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] border border-blue-900/20 shadow-sm">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3"/>
                <path d="M12 6.5L17 15.5H7L12 6.5Z" stroke="#60A5FA" strokeWidth="1.75" strokeLinejoin="round"/>
                <circle cx="12" cy="6.5" r="2" fill="#38BDF8"/>
                <circle cx="17" cy="15.5" r="2" fill="#2563EB"/>
                <circle cx="7" cy="15.5" r="2" fill="#93C5FD"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-0.5 text-xl font-extrabold tracking-tight text-slate-900">
                Comerc<span className="text-blue-600">IA</span>
                <span className="text-cyan-500 font-black">+</span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Inteligencia Aduanera & Cumplimiento LIGIE
              </p>
            </div>
          </div>

          {/* Selector Dinámico de Capítulos con Capítulos Soportados directos */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMenuCapitulosAbierto(!menuCapitulosAbierto)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-50/80 hover:bg-blue-100/80 text-blue-900 border border-blue-200/80 transition-all shadow-xs cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>
                {capitulos.length > 0
                  ? `Capítulos Soportados: ${capitulos.map(c => `Cap. ${c.capitulo}`).join(' · ')}`
                  : 'Capítulos Soportados: Cap. 62 · 87'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-blue-600 transition-transform ${menuCapitulosAbierto ? 'rotate-180' : ''}`} />
            </button>

            {menuCapitulosAbierto && (
              <div className="absolute right-0 mt-2.5 w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Capítulos en Base de Datos
                  </span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    En vivo
                  </span>
                </div>

                <div className="mt-1.5 space-y-1">
                  {capitulos.map((cap) => (
                    <button
                      key={cap.capitulo}
                      type="button"
                      onClick={() => seleccionarCapitulo(cap)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                        capituloActivo?.capitulo === cap.capitulo
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="text-blue-600">Capítulo {cap.capitulo}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-700">{cap.nombre}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Clic para cargar ejemplo en el clasificador
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
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

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* TARJETA PRINCIPAL DEL CLASIFICADOR */}
        <section className="no-print rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Motor Merceológico LIGIE / TIGIE
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Clasificación Arancelaria Asistida y Detección de NOMs
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Describe la mercancía o adjunta su ficha técnica (PDF) / fotografía del producto para análisis multimodal.
              </p>
            </div>
          </div>

          <form onSubmit={handleClasificar} className="space-y-4">
            <div className="relative">
              <textarea
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Camisa de vestir manga larga para caballero, confeccionada en tejido plano de popelina 100% algodón..."
                className="w-full rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all resize-none"
              />
              {descripcion && (
                <button
                  type="button"
                  onClick={() => setDescripcion('')}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                  title="Limpiar texto"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* BARRA DE ADJUNTOS Y EJEMPLOS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-2.5">
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
                  className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <Paperclip className="w-4 h-4 text-blue-600" />
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
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 ml-1 cursor-pointer"
                  >
                    (Quitar)
                  </button>
                )}
              </div>

              {capitulos.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-slate-500">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Ejemplos:
                  </span>
                  {capitulos.map((cap) => (
                    <button
                      key={cap.capitulo}
                      type="button"
                      onClick={() => seleccionarCapitulo(cap)}
                      className="px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 font-semibold transition-colors shadow-2xs cursor-pointer"
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
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-[#1E3A8A] hover:bg-blue-800 disabled:opacity-50 transition-all shadow-md shadow-blue-900/15 cursor-pointer"
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
            <div className="mt-5 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* FICHA EJECUTIVA DE CLASIFICACIÓN MERCEOLÓGICA */}
        {resultado && (
          <section className="print-sheet rounded-2xl bg-white text-slate-900 p-6 sm:p-8 shadow-md border border-slate-200 space-y-6">
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

        {/* HISTORIAL RECIENTE */}
        <section className="no-print rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Historial Reciente de Clasificaciones</h2>
          </div>

          {historial.length === 0 ? (
            <p className="text-xs text-slate-500">Aún no hay dictámenes registrados.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {historial.map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.noms_aplicables && setResultado(item.noms_aplicables)}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 px-3 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-blue-700">
                        {item.fraccion}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        NICO: {item.nico}
                      </span>
                      {item.archivo_adjunto && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {item.archivo_adjunto}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate">{item.descripcion_usuario}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-800">IGI: {item.arancel_igi}</div>
                    <div className="text-[10px] text-slate-400">
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
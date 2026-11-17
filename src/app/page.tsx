'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Search, AlertTriangle, FileText, CheckCircle2,
  Loader2, Scale, Paperclip, X, History, FileCheck2, Printer
} from 'lucide-react';

export default function ComercIAPlusHome() {
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    cargarHistorial();
  }, []);

  const handleClasificar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
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
      if (!res.ok) throw new Error(data.error || 'Error al clasificar');
      setResultado(data);
      cargarHistorial();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleSeleccionArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo supera el límite de 10 MB.');
        return;
      }
      setArchivo(file);
      setError('');
    }
  };

  const handleImprimirDictamen = () => {
    window.print();
  };

  const datosPdf = resultado
    ? (resultado.identificacion ? resultado : (resultado.noms_aplicables?.identificacion ? resultado.noms_aplicables : resultado))
    : null;

  const listaNoms = Array.isArray(resultado?.noms_aplicables)
    ? resultado.noms_aplicables
    : (resultado?.noms_aplicables?.noms_aplicables || []);

  const capituloNum = datosPdf?.capitulo || (resultado?.fraccion ? resultado.fraccion.slice(0, 2) : '--');
  const partidaNum = datosPdf?.partida || (resultado?.fraccion ? resultado.fraccion.slice(0, 5) : '--');
  const subpartidaNum = datosPdf?.subpartida || (resultado?.fraccion ? resultado.fraccion.slice(0, 7) : '--');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans print:bg-white print:text-slate-900">
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.45in;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* Header web oculto en impresión */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10 print:hidden">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Comerc<span className="text-emerald-400">IA+</span>
              </h1>
              <p className="text-xs text-slate-400">Copiloto de Cumplimiento Aduanero & LIGIE</p>
            </div>
          </div>
          <span className="text-xs bg-slate-800 text-emerald-400 border border-slate-700 px-3 py-1 rounded-full font-medium">
            Piloto Automotriz (Cap. 87)
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8 print:p-0 print:space-y-3 print:max-w-none">
        {/* Formulario web oculto en impresión */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl print:hidden">
          <h2 className="text-lg font-semibold text-white mb-1">
            Clasificación Arancelaria Asistida y Detección de NOMs
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            Describe la mercancía o adjunta su ficha técnica (PDF) / fotografía del producto para análisis multimodal.
          </p>

          <form onSubmit={handleClasificar} className="space-y-4">
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Juego de 4 pastillas de freno cerámicas montadas sobre soporte de acero..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-dashed border-slate-700 rounded-xl p-3.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleSeleccionArchivo}
                className="hidden"
              />

              {!archivo ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-xs text-slate-300 hover:text-emerald-400 transition cursor-pointer"
                >
                  <Paperclip className="w-4 h-4 text-emerald-400" />
                  <span>Adjuntar Ficha Técnica (PDF) o Foto del producto (JPG, PNG, WebP)</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-300">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium truncate max-w-xs">{archivo.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setArchivo(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-red-400 ml-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 text-xs text-slate-400">
                <span>Ejemplos:</span>
                <button
                  type="button"
                  onClick={() => setDescripcion('Pastillas de freno cerámicas montadas sobre placa de acero para automóvil de turismo.')}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  Balatas
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={cargando || (!descripcion.trim() && !archivo)}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analizando mercancía...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Clasificar Mercancía
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}
        </section>

        {/* =====================================================================
            VISTA WEB DE RESULTADOS
           ===================================================================== */}
        {resultado && (
          <section className="space-y-6 print:hidden">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                    Fracción Arancelaria + NICO Sugerido
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl font-mono font-bold text-white">
                      {resultado.fraccion}
                    </span>
                    <span className="text-xl font-mono font-semibold bg-emerald-500/20 text-emerald-300 px-3 py-0.5 rounded-lg border border-emerald-500/30">
                      NICO: {resultado.nico}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                    {resultado.descripcion_oficial}
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
                    <span className="block text-xs text-slate-400">IGI (Arancel)</span>
                    <span className="text-lg font-bold text-white">{resultado.arancel_igi}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
                    <span className="block text-xs text-slate-400">Unidad</span>
                    <span className="text-lg font-bold text-white">{resultado.unidad_medida}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
                    <span className="block text-xs text-slate-400">Confianza</span>
                    <span className="text-lg font-bold text-emerald-400">{resultado.nivel_confianza}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleImprimirDictamen}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-blue-900/30"
                >
                  <Printer className="w-4 h-4" />
                  Exportar Ficha Merceológica PDF
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-5">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Análisis Merceológico
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {resultado.analisis_merceologico}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Fundamento Legal (Reglas LIGIE)
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {resultado.fundamento_ligie}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                Regulaciones y Restricciones No Arancelarias (NOMs)
              </h3>

              {listaNoms.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {listaNoms.map((nom: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-400 text-sm">{nom.norma}</span>
                        <span className="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          {nom.tipo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{nom.detalle}</p>
                      {nom.excepciones && (
                        <p className="text-xs text-slate-500 italic">
                          <strong>Excepciones:</strong> {nom.excepciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No se detectaron NOMs específicas vinculadas en la base piloto para esta fracción.
                </p>
              )}
            </div>

            {resultado.alertas_riesgo && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <strong className="block text-amber-300 mb-0.5">Alerta de Cumplimiento SAT / ANAM:</strong>
                  {resultado.alertas_riesgo}
                </div>
              </div>
            )}
          </section>
        )}

        {/* =====================================================================
            PLANTILLA DE IMPRESIÓN PDF (ACTUALIZADA CON TÍTULO, CONFIANZA Y LISTAS)
           ===================================================================== */}
        {resultado && (
          <div className="hidden print:block text-slate-900 space-y-3">
            {/* 1. Banner Superior Azul Marino con Subtítulo Oficial */}
            <div className="bg-[#1e3a8a] text-white rounded-xl px-5 py-3.5 flex justify-between items-center">
              <div>
                <h1 className="text-base font-bold tracking-tight leading-tight">
                  Ficha de Clasificación Merceológica
                </h1>
                <p className="text-[10px] text-blue-200 uppercase tracking-wider font-bold mt-0.5">
                  DICTAMEN TÉCNICO OFICIAL — COMERCIA+
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-mono font-extrabold tracking-wide leading-none">
                  {resultado.fraccion}
                </div>
                <span className="text-[8.5px] uppercase tracking-widest text-blue-200 font-semibold">
                  FRACCIÓN ARANCELARIA
                </span>
              </div>
            </div>

            {/* 2. Barra de 6 Indicadores (Capítulo, Partida, Subpartida, NICO, Arancel, Confianza) */}
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl py-2 px-3 grid grid-cols-6 text-center divide-x divide-[#bfdbfe]">
              <div>
                <span className="block text-[8.5px] font-bold uppercase tracking-wider text-[#2563eb]">CAPÍTULO</span>
                <span className="text-sm font-extrabold text-[#1e3a8a]">{capituloNum}</span>
              </div>
              <div>
                <span className="block text-[8.5px] font-bold uppercase tracking-wider text-[#2563eb]">PARTIDA</span>
                <span className="text-sm font-extrabold text-[#1e3a8a]">{partidaNum}</span>
              </div>
              <div>
                <span className="block text-[8.5px] font-bold uppercase tracking-wider text-[#2563eb]">SUBPARTIDA</span>
                <span className="text-sm font-extrabold text-[#1e3a8a]">{subpartidaNum}</span>
              </div>
              <div>
                <span className="block text-[8.5px] font-bold uppercase tracking-wider text-[#2563eb]">NICO</span>
                <span className="text-sm font-extrabold text-[#1e3a8a]">{resultado.nico}</span>
              </div>
              <div>
                <span className="block text-[8.5px] font-bold uppercase tracking-wider text-[#2563eb]">ARANCEL (IGI)</span>
                <span className="text-sm font-extrabold text-[#1e3a8a]">{resultado.arancel_igi}</span>
              </div>
              <div>
                <span className="block text-[8.5px] font-bold uppercase tracking-wider text-[#2563eb]">CONFIANZA</span>
                <span className="text-sm font-extrabold text-emerald-700">{resultado.nivel_confianza}</span>
              </div>
            </div>

            {/* 3. Dos Columnas con Borde Izquierdo Grueso */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 border-l-4 border-l-[#0284c7] rounded-xl p-3 bg-white">
                <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-[#0f172a] mb-1.5">
                  IDENTIFICACIÓN DEL PRODUCTO
                </h2>
                {datosPdf?.identificacion ? (
                  <ul className="space-y-1 text-[10.5px] text-slate-700 leading-snug list-disc pl-3.5">
                    <li>
                      <strong className="text-slate-900">Nombre Comercial:</strong> {datosPdf.identificacion.nombre_comercial}
                    </li>
                    <li>
                      <strong className="text-slate-900">Nombre Técnico:</strong> {datosPdf.identificacion.nombre_tecnico}
                    </li>
                    <li>
                      <strong className="text-slate-900">Estructura:</strong> {datosPdf.identificacion.estructura}
                    </li>
                    <li>
                      <strong className="text-slate-900">Sistemas / Función:</strong> {datosPdf.identificacion.sistemas_funcion}
                    </li>
                  </ul>
                ) : (
                  <p className="text-[10.5px] text-slate-700 leading-snug">{resultado.analisis_merceologico}</p>
                )}
              </div>

              <div className="border border-slate-200 border-l-4 border-l-[#0d9488] rounded-xl p-3 bg-white">
                <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-[#0f172a] mb-1.5">
                  SUSTENTO LEGAL Y CRITERIO
                </h2>
                {datosPdf?.sustento ? (
                  <div className="space-y-1.5 text-[10.5px] text-slate-700 leading-snug">
                    <p>
                      <strong className="text-slate-900">Fundamento LIGIE:</strong> {datosPdf.sustento.regla_nota_principal}
                    </p>
                    <p>
                      <strong className="text-slate-900">Criterio Diferencial:</strong> {datosPdf.sustento.criterio_diferencial}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10.5px] text-slate-700 leading-snug">{resultado.fundamento_ligie}</p>
                )}
              </div>
            </div>

            {/* 4. Desglose de la LIGIE / Sistema Armonizado */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-[#0f172a] border-b border-slate-100 pb-1 mb-2">
                DESGLOSE DE LA LIGIE / SISTEMA ARMONIZADO
              </h2>
              <div className="space-y-1 text-[10.5px] text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="bg-[#e0f2fe] text-[#0369a1] font-mono font-bold px-2 py-0.5 rounded text-[9.5px] w-32 text-center shrink-0">
                    Capítulo {capituloNum}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="truncate">{datosPdf?.desglose_ligie?.capitulo_desc || 'Sección correspondiente de la Tarifa (TIGIE).'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#e0f2fe] text-[#0369a1] font-mono font-bold px-2 py-0.5 rounded text-[9.5px] w-32 text-center shrink-0">
                    Partida {partidaNum}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="truncate">{datosPdf?.desglose_ligie?.partida_desc || 'Partida específica conforme a materia constitutiva o función.'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#e0f2fe] text-[#0369a1] font-mono font-bold px-2 py-0.5 rounded text-[9.5px] w-32 text-center shrink-0">
                    Subpartida {subpartidaNum}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="truncate">{datosPdf?.desglose_ligie?.subpartida_desc || 'Subpartida arancelaria determinada por Regla General 6.'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#e0f2fe] text-[#0369a1] font-mono font-bold px-2 py-0.5 rounded text-[9.5px] w-32 text-center shrink-0">
                    Fracción {resultado.fraccion}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span>
                    <strong className="text-slate-900">NICO {resultado.nico}:</strong> {datosPdf?.desglose_ligie?.fraccion_nico_desc || resultado.descripcion_oficial}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Tres Tarjetas Inferiores */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="border border-slate-200 rounded-xl p-2.5 bg-white">
                <span className="inline-block bg-[#dcfce7] text-[#15803d] font-bold text-[9.5px] px-2 py-0.5 rounded uppercase mb-1">
                  {listaNoms[0]?.norma || 'REGULACIÓN RRNA'}
                </span>
                <p className="text-[10px] text-slate-700 leading-snug">
                  {listaNoms[0] ? `${listaNoms[0].tipo}: ${listaNoms[0].detalle}` : 'Sin restricción no arancelaria específica registrada.'}
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-2.5 bg-white">
                <span className="inline-block bg-[#fef3c7] text-[#b45309] font-bold text-[9.5px] px-2 py-0.5 rounded uppercase mb-1">
                  {listaNoms[1]?.norma || 'ETIQUETADO / NOM'}
                </span>
                <p className="text-[10px] text-slate-700 leading-snug">
                  {listaNoms[1] ? `${listaNoms[1].tipo}: ${listaNoms[1].detalle}` : 'Verificar cumplimiento de información comercial (NOM-050).'}
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-2.5 bg-white">
                <span className="inline-block bg-[#e0e7ff] text-[#1d4ed8] font-bold text-[9.5px] px-2 py-0.5 rounded uppercase mb-1">
                  IMPUESTOS
                </span>
                <p className="text-[10px] text-slate-700 leading-snug">
                  <strong>IGI & IVA:</strong> IGI {resultado.arancel_igi}. IVA {datosPdf?.iva_aplicable || '16%'}. Unidad: {resultado.unidad_medida}.
                </p>
              </div>
            </div>

            {/* 6. Documentos para Carpeta de Agente Aduanal (En Lista con Viñetas Individuales) */}
            <div className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-3">
              <h3 className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#0f172a] mb-1.5">
                DOCUMENTOS PARA LA CARPETA DE AGENTE ADUANAL
              </h3>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-700 leading-snug pl-1">
                {datosPdf?.documentos_carpeta && datosPdf.documentos_carpeta.length > 0 ? (
                  datosPdf.documentos_carpeta.map((doc: string, idx: number) => (
                    <li key={idx}>{doc}</li>
                  ))
                ) : (
                  <>
                    <li>Ficha técnica del fabricante con especificaciones de material y diagrama.</li>
                    <li>Factura comercial con desglose exacto de peso neto y descripción comercial.</li>
                    <li>Prueba de origen válida (si aplica preferencia arancelaria TLCUEM u otro tratado).</li>
                  </>
                )}
              </ul>
            </div>

            {/* 7. Pie de página limpio */}
            <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-[9px] text-slate-400">
              <span>ComercIA+ — Dictamen Técnico Merceológico ({datosPdf?.titulo_dictamen || resultado.fraccion})</span>
              <span>Emitido el {new Date().toLocaleDateString('es-MX')} • Folio CIA-{resultado.id ? resultado.id.slice(0, 6).toUpperCase() : '2026'}</span>
            </div>
          </div>
        )}

        {/* Historial web oculto en impresión */}
        {historial.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 print:hidden">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              Historial Reciente de Clasificaciones
            </h3>
            <div className="divide-y divide-slate-800">
              {historial.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setResultado(item);
                    setDescripcion(item.descripcion_usuario);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-800/40 px-3 rounded-xl transition cursor-pointer"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {item.fraccion}
                      </span>
                      <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        NICO: {item.nico}
                      </span>
                      {item.archivo_adjunto && (
                        <span className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {item.archivo_adjunto}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-1">{item.descripcion_usuario}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">IGI: {item.arancel_igi}</span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(item.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { INDICE_COMPACTO_CAPITULOS, MAPA_CAPITULOS } from '@/lib/ligie-capitulos';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODELOS = [process.env.GEMINI_MODEL || 'gemini-3.8-flash'];
const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FilaTigie {
  seccion: string;
  capitulo: string;
  partida: string;
  subpartida: string;
  fraccion: string;
  nico: string;
  descripcion: string;
  descripcion_fraccion?: string | null;
  arancel_importacion: number | null;
  arancel_texto?: string | null;
  arancel_exportacion?: string | null;
  unidad_medida: string;
  regulaciones_nom?: Array<{
    tipo_regulacion?: string;
    norma_referencia?: string;
    descripcion_cumplimiento?: string;
    excepciones?: string;
  }>;
}

async function llamarGeminiJSON(
  contents: any[],
  systemInstruction: string,
  temperature = 0.1
): Promise<any> {
  let response = null;
  let ultimoError: any = null;

  for (const modelo of MODELOS) {
    for (let intento = 1; intento <= 2; intento++) {
      try {
        response = await ai.models.generateContent({
          model: modelo,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature,
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        ultimoError = err;
        if (err?.status === 503 || err?.message?.includes('high demand') || err?.status === 404) {
          await esperar(2000);
        } else {
          break;
        }
      }
    }
    if (response?.text) break;
  }

  if (!response?.text) {
    throw ultimoError || new Error('Los modelos no respondieron tras los reintentos.');
  }

  return JSON.parse(response.text);
}

async function consultarPartidasPorCapitulos(capitulos: string[]) {
  const PAGE_SIZE = 1000;
  let from = 0;
  const filas: Array<{
    capitulo: string;
    partida: string;
    descripcion_fraccion: string | null;
    descripcion: string;
  }> = [];

  while (true) {
    const { data, error } = await supabase
      .from('tigie_catalogo')
      .select('capitulo, partida, descripcion_fraccion, descripcion')
      .in('capitulo', capitulos)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    filas.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return filas;
}

async function consultarCatalogoPorPartidas(partidas: string[]): Promise<FilaTigie[]> {
  const PAGE_SIZE = 1000;
  let from = 0;
  const filas: FilaTigie[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('tigie_catalogo')
      .select(`
        seccion,
        capitulo,
        partida,
        subpartida,
        fraccion,
        nico,
        descripcion,
        descripcion_fraccion,
        arancel_importacion,
        arancel_texto,
        arancel_exportacion,
        unidad_medida,
        regulaciones_nom (
          tipo_regulacion,
          norma_referencia,
          descripcion_cumplimiento,
          excepciones
        )
      `)
      .in('partida', partidas)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    filas.push(...(data as FilaTigie[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return filas;
}

function formatearFraccion(f8: string) {
  const d = f8.replace(/\D/g, '').padStart(8, '0').slice(0, 8);
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
}

function formatearSubpartida(s6: string) {
  const d = s6.replace(/\D/g, '').padStart(6, '0').slice(0, 6);
  return `${d.slice(0, 4)}.${d.slice(4, 6)}`;
}

function formatearPartida(p4: string) {
  const d = p4.replace(/\D/g, '').padStart(4, '0').slice(0, 4);
  return `${d.slice(0, 2)}.${d.slice(2, 4)}`;
}

function formatearIgiOficial(fila: FilaTigie): string {
  if (fila.arancel_texto && fila.arancel_texto.trim() !== '') {
    return fila.arancel_texto.trim();
  }
  const num = Number(fila.arancel_importacion ?? 0);
  if (Number.isNaN(num) || num === 0) return 'Exento (0%)';
  return `${num}%`;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('historial_clasificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const descripcionProducto = (formData.get('descripcionProducto') as string) || '';
    const archivo = formData.get('archivo') as File | null;

    if (!descripcionProducto.trim() && !archivo) {
      return NextResponse.json(
        { error: 'Por favor proporciona una descripción técnica o adjunta una foto / ficha técnica PDF.' },
        { status: 400 }
      );
    }

    let adjuntoInline: any = null;
    if (archivo && archivo.size > 0) {
      const arrayBuffer = await archivo.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      adjuntoInline = {
        inlineData: {
          data: base64Data,
          mimeType: archivo.type || 'application/pdf',
        },
      };
    }

    const textoBaseUsuario = descripcionProducto.trim()
      ? `Mercancía a clasificar para importación en México:\n"${descripcionProducto.trim()}"`
      : 'Analiza el archivo adjunto (ficha técnica o imagen) e identifica la mercancía para clasificarla en México.';

    // ETAPA 1: Perfil merceológico + selección de 1 a 3 Capítulos candidatos
    const promptEtapa1 = `
Eres un Perito Clasificador Aduanal mexicano experto en la LIGIE (7ma Enmienda) y Reglas Generales 1 a 6.
Tu tarea en esta ETAPA 1 es identificar el perfil merceológico del producto y elegir de 1 a 3 CAPÍTULOS candidatos del siguiente índice oficial.

CONSIDERA EXPLICITAMENTE:
- Notas Legales de exclusión (materia constitutiva vs. función principal, tejido de punto Cap. 61 vs. tejido plano Cap. 62, partes de uso general vs. partes exclusivas en Secciones XVI y XVII, juguetes Cap. 95 vs. plástico Cap. 39).
- Si falta información clave (composición, tejido, uso, potencia, etc.), inclúyela en "datos_faltantes".

ÍNDICE OFICIAL DE CAPÍTULOS LIGIE:
${INDICE_COMPACTO_CAPITULOS}

Responde ÚNICAMENTE con JSON válido:
{
  "perfil_merceologico": {
    "materia": "Materia constitutiva principal",
    "funcion": "Función principal y uso",
    "proceso_presentacion": "Proceso de fabricación, estado y presentación",
    "datos_faltantes": ["Dato técnico faltante si aplica, o lista vacía"]
  },
  "capitulos_candidatos": ["XX", "YY"]
}
`;

    const contenidosEtapa1 = adjuntoInline
      ? [adjuntoInline, textoBaseUsuario]
      : [textoBaseUsuario];

    const resEtapa1 = await llamarGeminiJSON(contenidosEtapa1, promptEtapa1, 0.1);

    const capitulosCandidatos: string[] = Array.from(
      new Set<string>(
        (Array.isArray(resEtapa1?.capitulos_candidatos)
          ? (resEtapa1.capitulos_candidatos as unknown[])
          : []
        )
          .map((c) => String(c).replace(/\D/g, '').padStart(2, '0'))
          .filter((c) => MAPA_CAPITULOS.has(c))
      )
    ).slice(0, 3);

    if (capitulosCandidatos.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo identificar un capítulo LIGIE candidato. Agrega más detalle técnico del producto.' },
        { status: 422 }
      );
    }

    // ETAPA 2: Filtro de Partidas (4 dígitos) usando SOLO partidas reales de Supabase
    const filasResumen = await consultarPartidasPorCapitulos(capitulosCandidatos);

    if (filasResumen.length === 0) {
      return NextResponse.json(
        {
          error: `Los capítulos identificados (${capitulosCandidatos.join(', ')}) aún no tienen registros cargados en tigie_catalogo.`,
        },
        { status: 404 }
      );
    }

    const mapaPartidas = new Map<string, Set<string>>();
    for (const f of filasResumen) {
      if (!mapaPartidas.has(f.partida)) mapaPartidas.set(f.partida, new Set());
      const setDesc = mapaPartidas.get(f.partida)!;
      if (setDesc.size < 4) {
        const d = (f.descripcion_fraccion || f.descripcion || '').slice(0, 90);
        if (d) setDesc.add(d);
      }
    }

    const todasPartidas = Array.from(mapaPartidas.keys());
    let partidasElegidas: string[] = todasPartidas;

    if (filasResumen.length > 120 || todasPartidas.length > 6) {
      const listaPartidasTexto = todasPartidas
        .sort()
        .map((p) => `${p}: ${Array.from(mapaPartidas.get(p) || []).join(' | ')}`)
        .join('\n');

      const promptEtapa2 = `
Eres un Perito Clasificador Aduanal mexicano.
Con base en el perfil merceológico y el producto, selecciona entre 1 y 4 PARTIDAS (4 dígitos) EXCLUSIVAMENTE de la siguiente lista real de nuestra base de datos TIGIE.
Prioriza partidas específicas sobre genéricas (Regla General 3 a) y verifica posibles partidas vecinas.

PERFIL MERCEOLÓGICO:
${JSON.stringify(resEtapa1.perfil_merceologico || {})}

PARTIDAS DISPONIBLES EN BASE DE DATOS:
${listaPartidasTexto}

Responde ÚNICAMENTE con JSON válido:
{
  "partidas_candidatas": ["XXXX", "YYYY"]
}
`;

      const resEtapa2 = await llamarGeminiJSON([textoBaseUsuario], promptEtapa2, 0.1);
      const filtradas: string[] = Array.from(
        new Set<string>(
          (Array.isArray(resEtapa2?.partidas_candidatas)
            ? (resEtapa2.partidas_candidatas as unknown[])
            : []
          )
            .map((p) => String(p).replace(/\D/g, '').padStart(4, '0').slice(0, 4))
            .filter((p) => mapaPartidas.has(p))
        )
      ).slice(0, 4);

      partidasElegidas = filtradas.length > 0 ? filtradas : todasPartidas.slice(0, 4);
    }

    // ETAPA 3: Dictamen final usando SOLO fracciones, NICOs y NOMs reales
    const catalogoCandidato = await consultarCatalogoPorPartidas(partidasElegidas);

    const catalogoParaPrompt = catalogoCandidato.slice(0, 350).map((f) => ({
      fraccion: formatearFraccion(f.fraccion),
      nico: f.nico.slice(-2),
      nico_10: f.nico,
      descripcion: f.descripcion,
      igi: formatearIgiOficial(f),
      umt: f.unidad_medida,
      noms: (f.regulaciones_nom || []).map((n) => ({
        norma: n.norma_referencia,
        tipo: n.tipo_regulacion,
        detalle: n.descripcion_cumplimiento,
        excepciones: n.excepciones,
      })),
    }));

    const datosFaltantes: string[] = Array.isArray(resEtapa1?.perfil_merceologico?.datos_faltantes)
      ? resEtapa1.perfil_merceologico.datos_faltantes
      : [];

    const systemInstructionFinal = `
Eres el motor de inteligencia merceológica de ComercIA+, un Perito Clasificador Aduanal experto en la LIGIE de México.

Analiza la mercancía descrita y/o el archivo adjunto y determina su fracción arancelaria (8 dígitos) y NICO (2 dígitos finales) ELIGIENDO OBLIGATORIAMENTE una opción existente de la BASE DE DATOS OFICIAL VERIFICADA.

PERFIL MERCEOLÓGICO PREVIO:
${JSON.stringify(resEtapa1?.perfil_merceologico || {}, null, 2)}

BASE DE DATOS OFICIAL VERIFICADA (TIGIE 2026 - Supabase):
${JSON.stringify(catalogoParaPrompt)}

REGLAS ESTRICTAS DE CLASIFICACIÓN Y RESPUESTA:
1. PROHIBIDO inventar fracciones, NICOs o tasas de IGI que no aparezcan en la BASE DE DATOS OFICIAL VERIFICADA.
2. Aplica rigor jurídico citando Reglas Generales (1 a 6), Notas de Sección/Capítulo, Notas Nacionales y Reglas Complementarias.
3. Si faltan atributos decisivos para la fracción o el NICO (ej. composición exacta, tejido de punto vs. plano, cilindrada, voltaje, talla), establece "nivel_confianza": "Medio" o "Bajo" e indica en "alertas_riesgo" exactamente qué dato técnico falta confirmar.
4. Sé CONCISO, EJECUTIVO Y ESCANEABLE (máximo 2 líneas por punto, estilo ficha ejecutiva de despacho aduanal).
5. Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta (sin markdown):
{
  "titulo_dictamen": "Nombre corto y técnico del producto dictaminado",
  "capitulo": "XX",
  "partida": "XX.XX",
  "subpartida": "XXXX.XX",
  "fraccion": "XXXX.XX.XX",
  "nico": "XX",
  "descripcion_oficial": "Texto oficial breve de la TIGIE",
  "arancel_igi": "XX% o Exento (0%)",
  "iva_aplicable": "16% o Exento según ley",
  "unidad_medida": "Pieza / Kilogramo / Par",
  "nivel_confianza": "Alto | Medio | Bajo",
  "identificacion": {
    "nombre_comercial": "Nombre común en mercado",
    "nombre_tecnico": "Denominación merceológica exacta",
    "estructura": "Materiales constitutivos principales",
    "sistemas_funcion": "Mecanismo, funcionamiento y uso específico"
  },
  "sustento": {
    "regla_nota_principal": "Cita breve de Regla General / Nota Legal aplicable y por qué encuadra",
    "criterio_diferencial": "Por qué se excluye de otras partidas o capítulos similares"
  },
  "desglose_ligie": {
    "capitulo_desc": "Texto oficial breve del Capítulo",
    "partida_desc": "Texto oficial breve de la Partida",
    "subpartida_desc": "Texto oficial breve de la Subpartida",
    "fraccion_nico_desc": "Texto oficial breve de la Fracción y NICO"
  },
  "analisis_merceologico": "Resumen técnico en 3 líneas de materia constitutiva y función.",
  "fundamento_ligie": "Resumen jurídico en 3 líneas de las reglas aplicables.",
  "noms_aplicables": [
    {
      "norma": "NOM-XXX-...",
      "tipo": "Seguridad / Etiquetado / Sanitario",
      "detalle": "Requisito concreto en aduana (breve)",
      "excepciones": "Exención breve si aplica"
    }
  ],
  "documentos_carpeta": [
    "Documento específico 1 requerido para este producto",
    "Documento específico 2 (ej. certificado NOM, prueba de origen o ficha técnica)",
    "Documento específico 3 (ej. fotografías de etiquetado o empaque)"
  ],
  "alertas_riesgo": "Advertencia breve sobre tratados (T-MEC/TLCUEM), padrones, criterios SAT/ANAM o datos técnicos por confirmar."
}
`;

    const contenidosFinal = adjuntoInline
      ? [adjuntoInline, textoBaseUsuario]
      : [textoBaseUsuario];

    const resultado = await llamarGeminiJSON(contenidosFinal, systemInstructionFinal, 0.1);

    // ETAPA 4: Candado Anti-Error Determinístico (Supabase manda en códigos y tasas)
    const fraccion8IA = String(resultado?.fraccion || '').replace(/\D/g, '').slice(0, 8);
    const nico2IA = String(resultado?.nico || '00').replace(/\D/g, '').slice(-2).padStart(2, '0');
    const nico10IA = `${fraccion8IA}${nico2IA}`;

    let registroOficial: FilaTigie | undefined =
      catalogoCandidato.find((f) => f.nico === nico10IA) ||
      catalogoCandidato.find((f) => f.fraccion === fraccion8IA);

    if (!registroOficial && fraccion8IA.length === 8) {
      const { data: directo } = await supabase
        .from('tigie_catalogo')
        .select(`
          seccion, capitulo, partida, subpartida, fraccion, nico,
          descripcion, descripcion_fraccion, arancel_importacion,
          arancel_texto, arancel_exportacion, unidad_medida,
          regulaciones_nom (tipo_regulacion, norma_referencia, descripcion_cumplimiento, excepciones)
        `)
        .eq('fraccion', fraccion8IA)
        .limit(10);

      if (directo && directo.length > 0) {
        const lista = directo as FilaTigie[];
        registroOficial = lista.find((f) => f.nico === nico10IA) || lista[0];
      }
    }

    let alertasFinales = String(resultado?.alertas_riesgo || '').trim();
    if (datosFaltantes.length > 0 && !alertasFinales.toLowerCase().includes('confirmar')) {
      alertasFinales = `${alertasFinales ? `${alertasFinales} ` : ''}Datos recomendados por confirmar: ${datosFaltantes.join(', ')}.`;
    }

    if (registroOficial) {
      resultado.capitulo = registroOficial.capitulo;
      resultado.partida = formatearPartida(registroOficial.partida);
      resultado.subpartida = formatearSubpartida(registroOficial.subpartida);
      resultado.fraccion = formatearFraccion(registroOficial.fraccion);
      resultado.nico = registroOficial.nico.slice(-2);
      resultado.arancel_igi = formatearIgiOficial(registroOficial);
      resultado.unidad_medida = registroOficial.unidad_medida;
      resultado.descripcion_oficial = registroOficial.descripcion;

      if (registroOficial.regulaciones_nom && registroOficial.regulaciones_nom.length > 0) {
        resultado.noms_aplicables = registroOficial.regulaciones_nom.map((n) => ({
          norma: n.norma_referencia || 'NOM Aplicable',
          tipo: n.tipo_regulacion || 'Regulación',
          detalle: n.descripcion_cumplimiento || '',
          excepciones: n.excepciones || '',
        }));
      }
    } else {
      resultado.nivel_confianza = 'Bajo';
      alertasFinales = `VALIDACIÓN REQUERIDA: La fracción sugerida no coincidió exactamente con un registro del catálogo TIGIE cargado. ${alertasFinales}`;
    }

    resultado.alertas_riesgo = alertasFinales;

    const payloadCompleto: any = {
      ...resultado,
      identificacion: resultado.identificacion,
      sustento: resultado.sustento,
      desglose_ligie: resultado.desglose_ligie,
      documentos_carpeta: resultado.documentos_carpeta,
      titulo_dictamen: resultado.titulo_dictamen,
      capitulo: resultado.capitulo,
      partida: resultado.partida,
      subpartida: resultado.subpartida,
      iva_aplicable: resultado.iva_aplicable,
      verificado_supabase: Boolean(registroOficial),
    };

    const descripcionGuardada = descripcionProducto.trim() || `Análisis de archivo: ${archivo?.name}`;
    const { data: insertado } = await supabase
      .from('historial_clasificaciones')
      .insert({
        descripcion_usuario: descripcionGuardada,
        archivo_adjunto: archivo ? archivo.name : null,
        fraccion: resultado.fraccion,
        nico: resultado.nico,
        descripcion_oficial: resultado.descripcion_oficial,
        arancel_igi: resultado.arancel_igi,
        unidad_medida: resultado.unidad_medida,
        analisis_merceologico: resultado.analisis_merceologico,
        fundamento_ligie: resultado.fundamento_ligie,
        noms_aplicables: payloadCompleto,
        nivel_confianza: resultado.nivel_confianza,
        alertas_riesgo: resultado.alertas_riesgo,
      })
      .select('id')
      .single();

    if (insertado?.id) {
      payloadCompleto.id = insertado.id;
    }

    return NextResponse.json(payloadCompleto);
  } catch (error: any) {
    console.error('Error en motor ComercIA+:', error);
    const mensajeError =
      error?.status === 503 || error?.message?.includes('high demand')
        ? 'Alta demanda temporal en Google AI. Intenta nuevamente en unos segundos.'
        : `Detalle técnico: ${error?.message || JSON.stringify(error)}`;

    return NextResponse.json({ error: mensajeError }, { status: 500 });
  }
}
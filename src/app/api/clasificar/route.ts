import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODELOS = ['gemini-3.8-flash'];
const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const { data: catalogoTigie, error: dbError } = await supabase
      .from('tigie_catalogo')
      .select(`
        nico,
        fraccion,
        descripcion,
        arancel_importacion,
        unidad_medida,
        regulaciones_nom (
          tipo_regulacion,
          norma_referencia,
          descripcion_cumplimiento,
          excepciones
        )
      `);

    if (dbError) {
      return NextResponse.json({ error: `Error Supabase: ${dbError.message}` }, { status: 500 });
    }

    const systemInstruction = `
Eres el motor de inteligencia merceológica de ComercIA+, un Perito Clasificador Aduanal experto en la LIGIE de México.

Analiza la mercancía descrita y/o el archivo adjunto (PDF o imagen) y determina su fracción arancelaria (8 dígitos) y NICO (10 dígitos).

BASE DE DATOS OFICIAL DISPONIBLE (Prioriza estas fracciones y sus NOMs si corresponden):
${JSON.stringify(catalogoTigie, null, 2)}

REGLAS ESTRICTAS DE RESPUESTA:
1. Sé CONCISO, EJECUTIVO Y ESCANEABLE (máximo 2 líneas por punto, estilo ficha ejecutiva de despacho aduanal).
2. Aplica rigor jurídico citando Reglas Generales (1 a 6), Notas de Sección/Capítulo y Reglas Complementarias.
3. Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta (sin markdown):
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
  "unidad_medida": "Pieza / Kg / Par",
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
  "alertas_riesgo": "Advertencia breve sobre tratados (T-MEC/TLCUEM), padrones o criterios SAT/ANAM."
}
`;

    const contenidos: any[] = [];

    if (archivo && archivo.size > 0) {
      const arrayBuffer = await archivo.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      contenidos.push({
        inlineData: {
          data: base64Data,
          mimeType: archivo.type || 'application/pdf',
        },
      });
    }

    const textoPrompt = descripcionProducto.trim()
      ? `Clasifica arancelariamente la siguiente mercancía para importación en México:\n\n"${descripcionProducto}"`
      : 'Analiza el archivo adjunto (ficha técnica o imagen) y clasifica arancelariamente la mercancía para importación en México.';

    contenidos.push(textoPrompt);

    let response = null;
    let ultimoError: any = null;

    for (const modelo of MODELOS) {
      for (let intento = 1; intento <= 2; intento++) {
        try {
          response = await ai.models.generateContent({
            model: modelo,
            contents: contenidos,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.1,
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

    if (!response || !response.text) {
      throw ultimoError || new Error('Los modelos no respondieron tras los reintentos.');
    }

    const resultado = JSON.parse(response.text);

    const payloadCompleto = {
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
    };

    const descripcionGuardada = descripcionProducto.trim() || `Análisis de archivo: ${archivo?.name}`;
    await supabase.from('historial_clasificaciones').insert({
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
    });

    return NextResponse.json(payloadCompleto);

  } catch (error: any) {
    console.error('Error en motor ComercIA+:', error);
    const mensajeError = error?.status === 503 || error?.message?.includes('high demand')
      ? 'Alta demanda temporal en Google AI. Intenta nuevamente en unos segundos.'
      : `Detalle técnico: ${error?.message || JSON.stringify(error)}`;

    return NextResponse.json({ error: mensajeError }, { status: 500 });
  }
}

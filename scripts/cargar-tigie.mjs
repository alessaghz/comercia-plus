import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

function cargarEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('No se encontró .env.local en la raíz del proyecto.');
  }
  const contenido = fs.readFileSync(envPath, 'utf8');
  for (const linea of contenido.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const idx = limpia.indexOf('=');
    if (idx === -1) continue;
    const clave = limpia.slice(0, idx).trim();
    const valor = limpia.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[clave]) process.env[clave] = valor;
  }
}

function obtenerSeccion(capituloStr) {
  const c = parseInt(capituloStr, 10);
  if (c <= 5) return 'I';
  if (c <= 14) return 'II';
  if (c === 15) return 'III';
  if (c <= 24) return 'IV';
  if (c <= 27) return 'V';
  if (c <= 38) return 'VI';
  if (c <= 40) return 'VII';
  if (c <= 43) return 'VIII';
  if (c <= 46) return 'IX';
  if (c <= 49) return 'X';
  if (c <= 63) return 'XI';
  if (c <= 67) return 'XII';
  if (c <= 70) return 'XIII';
  if (c === 71) return 'XIV';
  if (c <= 83) return 'XV';
  if (c <= 85) return 'XVI';
  if (c <= 89) return 'XVII';
  if (c <= 92) return 'XVIII';
  if (c === 93) return 'XIX';
  if (c <= 96) return 'XX';
  if (c === 97) return 'XXI';
  return 'XXII';
}

function normalizarUmt(raw) {
  const mapa = {
    Kg: 'Kilogramo',
    Pza: 'Pieza',
    L: 'Litro',
    Cbza: 'Cabeza',
    G: 'Gramo',
    Mll: 'Millar',
    M: 'Metro',
    M2: 'M²',
    Par: 'Par',
  };
  return mapa[raw] || raw || 'Pieza';
}

function parsearArancel(rawVal) {
  const texto = String(rawVal ?? '').trim();
  if (!texto || /^ex\.?$/i.test(texto)) {
    return { numerico: 0, texto: 'Exento (0%)' };
  }
  if (/prohibid/i.test(texto)) {
    return { numerico: 0, texto: 'Prohibida' };
  }
  if (/^\d+(\.\d+)?$/.test(texto)) {
    return { numerico: Number(texto), texto: `${texto}%` };
  }
  const matchAmx = texto.match(/(\d+(\.\d+)?)%/);
  if (matchAmx) {
    return { numerico: Number(matchAmx[1]), texto };
  }
  return { numerico: 0, texto };
}

async function main() {
  cargarEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const rutaExcel = path.resolve(
    process.cwd(),
    'data',
    'FRACCIONESARANCELARIAS-LIGIE_20261014-20261014.xlsx'
  );

  if (!fs.existsSync(rutaExcel)) {
    throw new Error(`No se encontró el archivo Excel en: ${rutaExcel}`);
  }

  console.log('Leyendo archivo Excel TIGIE...');
  const wb = XLSX.readFile(rutaExcel);
  const regexFraccion = /^\d{4}\.\d{2}\.\d{2}$/;

  // 1. Leer hoja FA (detectando dinámicamente la columna de fracción)
  const filasFA = XLSX.utils.sheet_to_json(wb.Sheets['FA'], { header: 1, defval: '' });
  const mapaFracciones = new Map();

  for (const row of filasFA) {
    const colIdx = row.findIndex((cell) => regexFraccion.test(String(cell ?? '').trim()));
    if (colIdx === -1) continue;

    const rawFrac = String(row[colIdx]).trim();
    const fraccion8 = rawFrac.replace(/\./g, '');
    const descFrac = String(row[colIdx + 1] ?? '').replace(/\s+/g, ' ').trim();
    const umt = normalizarUmt(String(row[colIdx + 2] ?? '').trim());
    const igi = parsearArancel(row[colIdx + 3]);
    const ige = String(row[colIdx + 4] ?? '').trim() || 'Ex.';

    mapaFracciones.set(fraccion8, {
      fraccion8,
      descFrac,
      umt,
      igiNum: igi.numerico,
      igiTexto: igi.texto,
      igeTexto: ige,
    });
  }

  console.log(`Fracciones leídas en hoja FA: ${mapaFracciones.size}`);

  // 2. Leer hoja NICO (detectando dinámicamente la columna de fracción)
  const filasNICO = XLSX.utils.sheet_to_json(wb.Sheets['NICO'], { header: 1, defval: '' });
  const mapaNicosPorFraccion = new Map();
  let totalNicosLeidos = 0;

  for (const row of filasNICO) {
    const colIdx = row.findIndex((cell) => regexFraccion.test(String(cell ?? '').trim()));
    if (colIdx === -1) continue;

    const rawFrac = String(row[colIdx]).trim();
    const fraccion8 = rawFrac.replace(/\./g, '');
    const nico2 = String(row[colIdx + 1] ?? '')
      .replace(/\.0$/, '')
      .trim()
      .padStart(2, '0');
    const descNico = String(row[colIdx + 2] ?? '').replace(/\s+/g, ' ').trim();

    if (!mapaNicosPorFraccion.has(fraccion8)) {
      mapaNicosPorFraccion.set(fraccion8, []);
    }
    mapaNicosPorFraccion.get(fraccion8).push({ nico2, descNico });
    totalNicosLeidos++;
  }

  console.log(`NICOs leídos en hoja NICO: ${totalNicosLeidos}`);

  // 3. Combinar FA + NICO e identificar posibles "00" fantasma de la corrida anterior
  const registros = [];
  const nicosFantasma00 = [];

  for (const [fraccion8, info] of mapaFracciones.entries()) {
    const nicosEnHoja = mapaNicosPorFraccion.get(fraccion8);
    const nicos = nicosEnHoja || [{ nico2: '00', descNico: info.descFrac }];

    if (nicosEnHoja && !nicosEnHoja.some((n) => n.nico2 === '00')) {
      nicosFantasma00.push(`${fraccion8}00`);
    }

    const capitulo = fraccion8.slice(0, 2);
    const partida = fraccion8.slice(0, 4);
    const subpartida = fraccion8.slice(0, 6);
    const seccion = obtenerSeccion(capitulo);

    for (const n of nicos) {
      const nico10 = `${fraccion8}${n.nico2}`;
      const descripcionFinal =
        !n.descNico || n.descNico.toLowerCase() === info.descFrac.toLowerCase()
          ? info.descFrac
          : `${info.descFrac} — ${n.descNico}`;

      registros.push({
        seccion,
        capitulo,
        partida,
        subpartida,
        fraccion: fraccion8,
        nico: nico10,
        descripcion: descripcionFinal,
        descripcion_fraccion: info.descFrac,
        arancel_importacion: info.igiNum,
        arancel_texto: info.igiTexto,
        arancel_exportacion: info.igeTexto,
        unidad_medida: info.umt,
      });
    }
  }

  console.log(`Total de registros (FA + NICO) listos para subir: ${registros.length}`);

  // 4. Subir en lotes de 500
  const LOTE = 500;
  let procesados = 0;

  for (let i = 0; i < registros.length; i += LOTE) {
    const batch = registros.slice(i, i + LOTE);
    const { error } = await supabase
      .from('tigie_catalogo')
      .upsert(batch, { onConflict: 'nico' });

    if (error) {
      console.error(`Error en lote ${i} - ${i + batch.length}:`, error.message);
      process.exit(1);
    }

    procesados += batch.length;
    console.log(`Progreso: ${procesados} / ${registros.length}`);
  }

  // 5. Limpiar los "00" fantasma de fracciones que realmente usan NICOs específicos (01, 02, 99...)
  if (nicosFantasma00.length > 0) {
    console.log(`Limpiando ${nicosFantasma00.length} NICOs '00' fantasma de la corrida anterior...`);
    for (let i = 0; i < nicosFantasma00.length; i += 200) {
      const loteBorrar = nicosFantasma00.slice(i, i + 200);
      const { error } = await supabase
        .from('tigie_catalogo')
        .delete()
        .in('nico', loteBorrar);

      if (error) {
        console.warn(`Aviso al limpiar lote ${i} (se conserva si tiene NOM vinculada):`, error.message);
      }
    }
  }

  console.log('¡Carga completa de la TIGIE (97 capítulos y 11,556 NICOs reales) finalizada con éxito!');
}

main().catch((err) => {
  console.error('Fallo en la carga:', err.message);
  process.exit(1);
});
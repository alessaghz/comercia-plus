import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseServer = createClient(supabaseUrl, supabaseKey);

interface ResultadoTipoCambio {
  valor: number;
  fecha: string | null;
  fuente: string;
}

// Formato YYYY-MM-DD en horario oficial de México (evita desfases UTC en Vercel)
function obtenerFechaMexico(diasAtras = 0): string {
  const ahora = new Date();
  const fechaBase = new Date(ahora.getTime() - diasAtras * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fechaBase);
}

async function obtenerTipoCambioOficialDOF(): Promise<ResultadoTipoCambio | null> {
  // Intento 1 (Oficial y auditable): Banxico SIE - Serie SF60653 (Vigente para obligaciones/pedimentos de HOY, Art. 20 CFF)
  const banxicoToken = process.env.BANXICO_TOKEN;
  if (banxicoToken) {
    try {
      const fechaInicio = obtenerFechaMexico(7);
      const fechaFin = obtenerFechaMexico(0);

      const res = await fetch(
        `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF60653/datos/${fechaInicio}/${fechaFin}`,
        {
          headers: {
            'Bmx-Token': banxicoToken,
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (res.ok) {
        const data = await res.json();
        const datos: Array<{ fecha: string; dato: string }> =
          data?.bmx?.series?.[0]?.datos || [];

        // Filtrar días inhábiles ("N/E") y tomar el último vigente hasta hoy
        const validos = datos.filter((d) => {
          const n = Number(d?.dato);
          return !Number.isNaN(n) && n > 10 && n < 50;
        });

        const vigenteHoy = validos[validos.length - 1];
        if (vigenteHoy) {
          return {
            valor: Number(Number(vigenteHoy.dato).toFixed(4)),
            fecha: vigenteHoy.fecha,
            fuente: 'Banxico SIE (Art. 20 CFF · SF60653)',
          };
        }
      } else {
        console.warn('Banxico API respondió con estatus:', res.status);
      }
    } catch (e) {
      console.warn('Error consultando Banxico SIE API:', e);
    }
  }

  // Intento 2 (Respaldo sin token): Lectura directa de indicadores del DOF
  try {
    const res = await fetch('https://www.dof.gob.mx/indicadores.php', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ComercIAPlus/1.0)',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/D[OÓ]LAR[\s\S]{0,500}?(\d{2}\.\d{4})/i);
      if (match && match[1]) {
        const rate = Number(match[1]);
        if (!Number.isNaN(rate) && rate > 10 && rate < 50) {
          return {
            valor: Number(rate.toFixed(4)),
            fecha: obtenerFechaMexico(0),
            fuente: 'DOF (dof.gob.mx)',
          };
        }
      }
    }
  } catch (e) {
    console.warn('Error consultando dof.gob.mx directamente:', e);
  }

  return null;
}

// GET o POST sincroniza TIPO_CAMBIO_DOF en parametros_aduanales
async function sincronizarDof() {
  const resultado = await obtenerTipoCambioOficialDOF();

  if (!resultado) {
    return NextResponse.json(
      {
        error:
          'No se pudo obtener el tipo de cambio oficial del DOF. Verifica BANXICO_TOKEN o ingrésalo manual.',
      },
      { status: 502 }
    );
  }

  const { valor: nuevoTc, fecha, fuente } = resultado;

  const { data: updated, error: updateError } = await supabaseServer
    .from('parametros_aduanales')
    .update({ valor: nuevoTc })
    .eq('clave', 'TIPO_CAMBIO_DOF')
    .select();

  if (updateError) {
    return NextResponse.json(
      { error: `Error actualizando Supabase: ${updateError.message}` },
      { status: 500 }
    );
  }

  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabaseServer
      .from('parametros_aduanales')
      .insert({ clave: 'TIPO_CAMBIO_DOF', valor: nuevoTc });

    if (insertError) {
      return NextResponse.json(
        { error: `Error insertando TIPO_CAMBIO_DOF: ${insertError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    clave: 'TIPO_CAMBIO_DOF',
    tipoCambio: nuevoTc,
    fechaDof: fecha,
    fuente,
    actualizadoEn: new Date().toISOString(),
  });
}

export async function GET() {
  return sincronizarDof();
}

export async function POST() {
  return sincronizarDof();
}

// PATCH protegido para actualizar PRV_FIJO, DTA_TASA o IVA_TASA cuando haya cambio oficial en el DOF
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { secret, clave, valor } = body || {};

    if (!process.env.ADMIN_SYNC_SECRET || secret !== process.env.ADMIN_SYNC_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const clavesPermitidas = ['PRV_FIJO', 'DTA_TASA', 'IVA_TASA', 'TIPO_CAMBIO_DOF'];
    const valorNum = Number(valor);

    if (!clavesPermitidas.includes(clave) || Number.isNaN(valorNum)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('parametros_aduanales')
      .upsert({ clave, valor: valorNum }, { onConflict: 'clave' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, clave, valor: valorNum });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error en PATCH' }, { status: 500 });
  }
}
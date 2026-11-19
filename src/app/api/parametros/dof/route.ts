import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Si tienes SUPABASE_SERVICE_ROLE_KEY en .env.local úsala para escrituras seguras;
// si no, cae al anon key (asegúrate de tener política de UPDATE para anon/authenticated o service_role).
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseServer = createClient(supabaseUrl, supabaseKey);

async function obtenerTipoCambioExterno(): Promise<number | null> {
  // Intento 1: Frankfurter API (USD -> MXN)
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=MXN', {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rates?.MXN);
      if (!Number.isNaN(rate) && rate > 10 && rate < 50) {
        return Number(rate.toFixed(4));
      }
    }
  } catch (e) {
    console.warn('Frankfurter API no disponible, intentando respaldo...', e);
  }

  // Intento 2: Open Exchange Rates API pública (USD -> MXN)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rates?.MXN);
      if (!Number.isNaN(rate) && rate > 10 && rate < 50) {
        return Number(rate.toFixed(4));
      }
    }
  } catch (e) {
    console.warn('Open ER API no disponible:', e);
  }

  return null;
}

// GET o POST sincroniza TIPO_CAMBIO_DOF en parametros_aduanales
async function sincronizarDof() {
  const nuevoTc = await obtenerTipoCambioExterno();

  if (!nuevoTc) {
    return NextResponse.json(
      { error: 'No se pudo consultar el tipo de cambio en este momento. Intenta de nuevo o ingrésalo manual.' },
      { status: 502 }
    );
  }

  // Intentar actualizar fila existente
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

  // Si no existía la fila TIPO_CAMBIO_DOF, insertarla
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
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CAPITULOS_LIGIE } from '@/lib/ligie-capitulos';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const conteos = new Map<string, number>();
    const PAGE_SIZE = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('tigie_catalogo')
        .select('capitulo')
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data) {
        const cap = String(row.capitulo || '').padStart(2, '0');
        if (!cap) continue;
        conteos.set(cap, (conteos.get(cap) || 0) + 1);
      }

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    const respuesta = CAPITULOS_LIGIE.filter((c) => conteos.has(c.capitulo)).map((c) => ({
      capitulo: c.capitulo,
      nombre: c.nombre,
      ejemplo: c.ejemplo,
      totalFracciones: conteos.get(c.capitulo) || 0,
    }));

    return NextResponse.json(respuesta);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
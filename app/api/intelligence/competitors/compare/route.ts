import { NextRequest, NextResponse } from 'next/server';
import { compareCompetitors } from '@/lib/server/intelligence';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (ids.length < 2) {
      return NextResponse.json(
        { ok: false, error: { message: 'At least two competitor IDs must be specified in the "ids" query parameter (e.g. ?ids=comp_nike,comp_adidas)' } },
        { status: 400 }
      );
    }

    const comparison = await compareCompetitors(ids);
    return NextResponse.json({ ok: true, data: comparison });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Comparison failed' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

    if (ids.length < 2) {
      return NextResponse.json(
        { ok: false, error: { message: 'At least two competitor IDs must be provided in the "ids" array' } },
        { status: 400 }
      );
    }

    const comparison = await compareCompetitors(ids);
    return NextResponse.json({ ok: true, data: comparison });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Comparison failed' } },
      { status: 500 }
    );
  }
}

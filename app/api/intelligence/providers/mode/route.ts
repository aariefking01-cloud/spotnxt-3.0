import { NextRequest, NextResponse } from 'next/server';
import { isDemoModeActive, setDemoMode, recordEvent } from '@/lib/server/store';

export async function GET() {
  try {
    const isDemo = await isDemoModeActive();
    return NextResponse.json({
      ok: true,
      data: {
        isDemoMode: isDemo,
        mode: isDemo ? 'demo' : 'live',
        label: isDemo ? 'Demo Mode (Opt-in Sample Intelligence)' : 'Live Mode (Meta Ad Library)',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to get provider mode' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const demoMode = Boolean(body.demoMode);
    await setDemoMode(demoMode);

    await recordEvent({
      type: 'AD_UPDATED',
      message: `System operating mode switched to ${demoMode ? 'Demo Mode (Sample data)' : 'Live Mode (Meta Ad Library)'}.`,
      requestId: `mode_switch_${Date.now()}`,
    });

    return NextResponse.json({
      ok: true,
      data: {
        isDemoMode: demoMode,
        mode: demoMode ? 'demo' : 'live',
        label: demoMode ? 'Demo Mode (Opt-in Sample Intelligence)' : 'Live Mode (Meta Ad Library)',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to update provider mode' } },
      { status: 500 }
    );
  }
}

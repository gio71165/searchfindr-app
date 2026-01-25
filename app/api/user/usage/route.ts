import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { getCurrentUsage } from '@/lib/usage/usage-tracker';

export async function GET(req: NextRequest) {
  try {
    const { user } = await authenticateRequest(req);

    const usage = await getCurrentUsage(user.id);

    if (!usage) {
      return NextResponse.json({ error: 'Unable to fetch usage' }, { status: 500 });
    }

    return NextResponse.json(usage);

  } catch (error: any) {
    console.error('Usage API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

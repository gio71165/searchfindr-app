import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { getCorsHeaders } from '@/lib/api/security';
import { calculateWorkingCapital, WorkingCapitalInputs } from '@/lib/utils/working-capital';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    await authenticateRequest(req);
    
    const body = await req.json() as Partial<WorkingCapitalInputs>;
    
    // Validation
    if (body.annualRevenue === undefined || body.annualRevenue < 0) {
      return NextResponse.json(
        { error: 'annualRevenue must be a non-negative number' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!body.industry || typeof body.industry !== 'string') {
      return NextResponse.json(
        { error: 'industry is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Build inputs with defaults
    const inputs: WorkingCapitalInputs = {
      accountsReceivable: body.accountsReceivable ?? 0,
      inventory: body.inventory ?? 0,
      prepaidExpenses: body.prepaidExpenses ?? 0,
      accountsPayable: body.accountsPayable ?? 0,
      accruedExpenses: body.accruedExpenses ?? 0,
      annualRevenue: body.annualRevenue,
      industry: body.industry,
      industryWCPercent: body.industryWCPercent,
    };
    
    const outputs = calculateWorkingCapital(inputs);
    
    return NextResponse.json(
      { inputs, outputs },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode, headers: corsHeaders }
      );
    }
    console.error('calculate-working-capital error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

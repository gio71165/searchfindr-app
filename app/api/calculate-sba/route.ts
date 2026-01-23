import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { getCorsHeaders } from '@/lib/api/security';
import { calculateSBA7a } from '@/lib/utils/sba-calculator';
import { SBA7aInputs } from '@/lib/types/sba';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    
    // Fetch workspace compliance setting
    const { data: workspaceData } = await supabase
      .from('workspaces')
      .select('all_investors_us_citizens')
      .eq('id', workspace.id)
      .single();
    
    const allInvestorsUSCitizens = workspaceData?.all_investors_us_citizens ?? true;
    
    const body = await req.json() as Partial<SBA7aInputs>;
    
    // Validation
    if (!body.purchasePrice || body.purchasePrice <= 0) {
      return NextResponse.json(
        { error: 'purchasePrice must be a positive number' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!body.ebitda || body.ebitda <= 0) {
      return NextResponse.json(
        { error: 'ebitda must be a positive number' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Default values for SBA 7(a)
    const inputs: SBA7aInputs = {
      purchasePrice: body.purchasePrice,
      workingCapital: body.workingCapital ?? 0,
      closingCosts: body.closingCosts ?? (body.purchasePrice * 0.03), // 3% default
      sbaGuaranteeFee: 0, // calculated automatically
      packagingFee: body.packagingFee ?? 3500, // typical
      interestRate: body.interestRate ?? 10.25, // Prime (8%) + 2.75% = 10.75% as of 2025
      loanTermYears: body.loanTermYears ?? 10,
      sellerNoteAmount: body.sellerNoteAmount ?? 0,
      sellerNoteRate: body.sellerNoteRate ?? 6.0,
      sellerNoteTermYears: body.sellerNoteTermYears ?? 5,
      sellerNoteStandbyPeriod: body.sellerNoteStandbyPeriod ?? 24, // months
      earnoutAmount: body.earnoutAmount ?? 0,
      earnoutTrigger: body.earnoutTrigger ?? '',
      ebitda: body.ebitda,
      revenue: body.revenue ?? 0,
      naicsCode: body.naicsCode ?? undefined,
    };
    
    const outputs = calculateSBA7a(inputs, allInvestorsUSCitizens);
    
    return NextResponse.json(
      { inputs, outputs, allInvestorsUSCitizens },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode, headers: corsHeaders }
      );
    }
    console.error('calculate-sba error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

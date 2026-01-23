import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { getCorsHeaders } from '@/lib/api/security';
import { generateIOI } from '@/lib/utils/deal-templates';
import { IOIData } from '@/lib/types/deal-templates';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    await authenticateRequest(req);
    
    const data = await req.json() as IOIData;
    
    // Basic validation
    if (!data.companyName || !data.buyerName || !data.buyerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, buyerName, buyerEmail' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!data.purchasePriceRange || typeof data.purchasePriceRange.min !== 'number' || typeof data.purchasePriceRange.max !== 'number') {
      return NextResponse.json(
        { error: 'Invalid purchasePriceRange' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const ioiText = generateIOI(data);
    
    return NextResponse.json({ template: ioiText }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode, headers: corsHeaders }
      );
    }
    console.error('generate-ioi error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate IOI' },
      { status: 500, headers: corsHeaders }
    );
  }
}

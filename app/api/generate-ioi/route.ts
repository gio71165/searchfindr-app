import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { getCorsHeaders } from '@/lib/api/security';
import { generateIOI } from '@/lib/utils/deal-templates';
import { IOIData } from '@/lib/types/deal-templates';
import { canGenerateIOI, incrementIOIUsage, getCurrentUsage } from '@/lib/usage/usage-tracker';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await authenticateRequest(req);
    
    // Check subscription usage limits
    const { allowed, reason } = await canGenerateIOI(user.id);
    if (!allowed) {
      const usage = await getCurrentUsage(user.id);
      return NextResponse.json(
        { 
          error: 'Usage limit reached',
          message: reason,
          usage
        },
        { status: 429, headers: corsHeaders }
      );
    }
    
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
    
    // Increment usage after successful generation
    try {
      await incrementIOIUsage(user.id);
    } catch (usageError) {
      console.error('Failed to increment IOI usage:', usageError);
      // Don't fail the request, just log the error
    }
    
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

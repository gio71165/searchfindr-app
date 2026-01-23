import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/api/auth';
import { INDUSTRY_BENCHMARKS_SEED } from '@/lib/data/industry-benchmarks-seed';

export const runtime = 'nodejs';

/**
 * POST /api/admin/seed-benchmarks
 * Seeds the industry_benchmarks table with initial data
 * Requires admin authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    const { user } = await authenticateRequest(req);
    
    // Check if user is admin
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();
    
    if (!profile || (!profile.is_admin && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Insert seed data (using upsert to avoid duplicates)
    const results = [];
    for (const benchmark of INDUSTRY_BENCHMARKS_SEED) {
      const { data, error } = await supabase
        .from('industry_benchmarks')
        .upsert(
          {
            industry: benchmark.industry,
            naics_code: benchmark.naics_code || null,
            revenue_p25: benchmark.revenue_p25 || null,
            revenue_median: benchmark.revenue_median || null,
            revenue_p75: benchmark.revenue_p75 || null,
            ebitda_margin_p25: benchmark.ebitda_margin_p25 || null,
            ebitda_margin_median: benchmark.ebitda_margin_median || null,
            ebitda_margin_p75: benchmark.ebitda_margin_p75 || null,
            valuation_multiple_p25: benchmark.valuation_multiple_p25 || null,
            valuation_multiple_median: benchmark.valuation_multiple_median || null,
            valuation_multiple_p75: benchmark.valuation_multiple_p75 || null,
            typical_deal_size_min: benchmark.typical_deal_size_min || null,
            typical_deal_size_max: benchmark.typical_deal_size_max || null,
            sba_commonality: benchmark.sba_commonality || null,
            key_risks: benchmark.key_risks || null,
            key_value_drivers: benchmark.key_value_drivers || null,
            data_source: benchmark.data_source || null,
            last_updated: new Date().toISOString(),
          },
          {
            onConflict: 'industry',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();
      
      if (error) {
        console.error(`Error seeding benchmark for ${benchmark.industry}:`, error);
        results.push({ industry: benchmark.industry, success: false, error: error.message });
      } else {
        results.push({ industry: benchmark.industry, success: true });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Seeded ${successCount} benchmarks${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Error seeding benchmarks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to seed benchmarks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { DatabaseError } from '@/lib/data-access/base';

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    const body = await req.json();
    const dealIds = Array.isArray(body?.dealIds) ? body.dealIds : [];

    if (dealIds.length === 0) {
      return NextResponse.json({ error: 'No deal IDs provided' }, { status: 400 });
    }

    // Hard delete all deals
    // Note: This will cascade delete related documents, activities, etc. if foreign key constraints are set up
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const dealId of dealIds) {
      try {
        // First verify the deal belongs to the workspace
        const deal = await deals.getById(dealId);
        
        // Delete the deal (hard delete)
        const { error: deleteError } = await supabase
          .from('companies')
          .delete()
          .eq('id', dealId)
          .eq('workspace_id', workspace.id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        successCount++;
      } catch (err) {
        failedCount++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Deal ${dealId}: ${errorMsg}`);
        console.error(`Failed to delete deal ${dealId}:`, err);
        // Continue with other deals
      }
    }

    return NextResponse.json({ 
      success: true, 
      successCount,
      failedCount,
      total: dealIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Failed to delete deals' }, { status: 500 });
  }
}

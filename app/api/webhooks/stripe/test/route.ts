import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple test endpoint to verify webhook is accessible
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  });
}

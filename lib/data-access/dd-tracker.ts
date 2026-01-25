import { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_DD_CHECKLIST } from '@/lib/data/dd-templates';

export interface DDCategory {
  id: string;
  workspace_id: string;
  deal_id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DDItem {
  id: string;
  workspace_id: string;
  category_id: string;
  deal_id: string;
  name: string;
  description: string | null;
  status: 'not_started' | 'requested' | 'received' | 'reviewed' | 'issue_found' | 'cleared';
  requested_date: string | null;
  received_date: string | null;
  reviewed_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  issue_description: string | null;
  issue_severity: 'blocker' | 'major' | 'minor' | 'info' | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DDCategoryWithItems extends DDCategory {
  dd_items: DDItem[];
}

export interface DDProgress {
  categories: DDCategoryWithItems[];
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  issuesFound: number;
}

/**
 * Create DD checklist from default template
 */
export async function createDDChecklistFromTemplate(
  supabase: SupabaseClient,
  dealId: string,
  workspaceId: string
): Promise<void> {
  // Create categories
  for (let catIndex = 0; catIndex < DEFAULT_DD_CHECKLIST.categories.length; catIndex++) {
    const cat = DEFAULT_DD_CHECKLIST.categories[catIndex];
    
    const { data: category, error: catError } = await supabase
      .from('dd_categories')
      .insert({
        workspace_id: workspaceId,
        deal_id: dealId,
        name: cat.name,
        description: cat.description,
        order_index: catIndex,
      })
      .select()
      .single();
    
    if (catError || !category) {
      console.error('Error creating DD category:', catError);
      continue;
    }
    
    // Create items for this category
    const items = cat.items.map((itemName, itemIndex) => ({
      workspace_id: workspaceId,
      category_id: category.id,
      deal_id: dealId,
      name: itemName,
      status: 'not_started' as const,
      order_index: itemIndex,
    }));
    
    const { error: itemsError } = await supabase.from('dd_items').insert(items);
    
    if (itemsError) {
      console.error('Error creating DD items:', itemsError);
    }
  }
}

/**
 * Get DD progress for a deal
 */
export async function getDDProgress(
  supabase: SupabaseClient,
  dealId: string
): Promise<DDProgress | null> {
  const { data: categories, error } = await supabase
    .from('dd_categories')
    .select(`
      id,
      workspace_id,
      deal_id,
      name,
      description,
      order_index,
      created_at,
      updated_at,
      dd_items (
        id,
        workspace_id,
        category_id,
        deal_id,
        name,
        description,
        status,
        requested_date,
        received_date,
        reviewed_date,
        assigned_to,
        notes,
        issue_description,
        issue_severity,
        order_index,
        created_at,
        updated_at
      )
    `)
    .eq('deal_id', dealId)
    .order('order_index');
  
  if (error) {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    const errMsg = e.message ?? ([e.code, e.details, e.hint].filter(Boolean).join(' | ') || 'Unknown error');
    console.error('Error fetching DD progress:', errMsg);
    return null;
  }
  
  if (!categories || categories.length === 0) {
    return {
      categories: [],
      totalItems: 0,
      completedItems: 0,
      progressPercent: 0,
      issuesFound: 0,
    };
  }
  
  // Calculate progress
  const totalItems = categories.reduce(
    (sum, cat) => sum + (cat.dd_items?.length || 0),
    0
  );
  const completedItems = categories.reduce(
    (sum, cat) => sum + (cat.dd_items?.filter((i: DDItem) => i.status === 'cleared').length || 0),
    0
  );
  const issuesFound = categories.reduce(
    (sum, cat) => sum + (cat.dd_items?.filter((i: DDItem) => i.status === 'issue_found').length || 0),
    0
  );
  
  return {
    categories: categories as DDCategoryWithItems[],
    totalItems,
    completedItems,
    progressPercent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    issuesFound,
  };
}

/**
 * Update DD item status
 */
export async function updateDDItemStatus(
  supabase: SupabaseClient,
  itemId: string,
  status: DDItem['status'],
  dates?: {
    requested_date?: string | null;
    received_date?: string | null;
    reviewed_date?: string | null;
  }
): Promise<boolean> {
  const updateData: any = { status };
  
  if (dates) {
    if (dates.requested_date !== undefined) updateData.requested_date = dates.requested_date;
    if (dates.received_date !== undefined) updateData.received_date = dates.received_date;
    if (dates.reviewed_date !== undefined) updateData.reviewed_date = dates.reviewed_date;
  }
  
  // Auto-set dates based on status if not provided
  if (!dates) {
    const now = new Date().toISOString();
    if (status === 'requested' && !updateData.requested_date) {
      updateData.requested_date = now;
    } else if (status === 'received' && !updateData.received_date) {
      updateData.received_date = now;
    } else if (status === 'reviewed' && !updateData.reviewed_date) {
      updateData.reviewed_date = now;
    }
  }
  
  const { error } = await supabase
    .from('dd_items')
    .update(updateData)
    .eq('id', itemId);
  
  if (error) {
    console.error('Error updating DD item status:', error);
    return false;
  }
  
  return true;
}

/**
 * Update DD item
 */
export async function updateDDItem(
  supabase: SupabaseClient,
  itemId: string,
  updates: Partial<DDItem>
): Promise<boolean> {
  const { error } = await supabase
    .from('dd_items')
    .update(updates)
    .eq('id', itemId);
  
  if (error) {
    console.error('Error updating DD item:', error);
    return false;
  }
  
  return true;
}

/**
 * Mark all items as requested
 */
export async function markAllItemsAsRequested(
  supabase: SupabaseClient,
  dealId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('dd_items')
    .update({
      status: 'requested',
      requested_date: now,
    })
    .eq('deal_id', dealId)
    .in('status', ['not_started']);
  
  if (error) {
    console.error('Error marking all items as requested:', error);
    return false;
  }
  
  return true;
}

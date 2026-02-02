'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  InventoryItem,
  InventoryTransaction,
  InventoryItemDetail,
  InventoryListResponse,
  CreateItemDTO,
  UpdateItemDTO,
  CreateTransactionDTO,
  InventoryFilters,
  InventoryStats,
} from '@/types/inventory';

export async function getInventoryItems(
  filters?: InventoryFilters,
  page = 1,
  pageSize = 20
): Promise<InventoryListResponse> {
  const supabase = await createClient();

  let query = supabase
    .from('inventory_items')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('item_name');

  if (filters?.search) {
    query = query.or(`item_name.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%`);
  }
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.low_stock_only) {
    query = query.or('quantity_in_stock.lt.minimum_stock_level,quantity_in_stock.lte.reorder_point');
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    items: data as InventoryItem[],
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getInventoryItemById(id: string): Promise<InventoryItemDetail | null> {
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single();

  if (itemError) throw itemError;
  if (!item) return null;

  const { data: transactions } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('item_id', id)
    .order('transaction_date', { ascending: false })
    .limit(20);

  return {
    ...item,
    recent_transactions: (transactions || []) as InventoryTransaction[],
    total_value: (item.quantity_in_stock || 0) * (item.unit_cost || 0),
  };
}

export async function createInventoryItem(data: CreateItemDTO): Promise<InventoryItem> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Generate item code
  const { data: lastItem } = await supabase
    .from('inventory_items')
    .select('item_code')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastItem?.item_code) {
    const match = lastItem.item_code.match(/ITM-(\d+)/);
    if (match) nextNumber = parseInt(match[1]) + 1;
  }
  const item_code = `ITM-${nextNumber.toString().padStart(4, '0')}`;

  const { data: newItem, error } = await supabase
    .from('inventory_items')
    .insert({
      ...data,
      item_code,
      org_id: profile.org_id,
      status: 'active',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return newItem as InventoryItem;
}

export async function updateInventoryItem(
  id: string,
  data: UpdateItemDTO
): Promise<InventoryItem> {
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('inventory_items')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as InventoryItem;
}

export async function createTransaction(
  data: CreateTransactionDTO
): Promise<InventoryTransaction> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Get current item
  const { data: item } = await supabase
    .from('inventory_items')
    .select('quantity_in_stock')
    .eq('id', data.item_id)
    .single();

  if (!item) throw new Error('Item not found');

  // Calculate new quantity
  let newQuantity = item.quantity_in_stock;
  if (data.transaction_type === 'in' || data.transaction_type === 'return') {
    newQuantity += data.quantity;
  } else {
    newQuantity -= data.quantity;
  }

  if (newQuantity < 0) {
    throw new Error('Insufficient stock');
  }

  // Create transaction
  const { data: newTransaction, error } = await supabase
    .from('inventory_transactions')
    .insert({
      ...data,
      org_id: profile.org_id,
      performed_by: user.id,
      transaction_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Update item quantity
  await supabase
    .from('inventory_items')
    .update({
      quantity_in_stock: newQuantity,
      status: newQuantity === 0 ? 'out_of_stock' : 'active',
    })
    .eq('id', data.item_id);

  return newTransaction as InventoryTransaction;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  const { count: totalItems } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('is_active', true);

  const { data: items } = await supabase
    .from('inventory_items')
    .select('quantity_in_stock, unit_cost, minimum_stock_level')
    .eq('org_id', profile.org_id)
    .eq('is_active', true);

  const totalValue =
    items?.reduce((sum, item) => sum + (item.quantity_in_stock || 0) * (item.unit_cost || 0), 0) ||
    0;
  const lowStockItems =
    items?.filter((item) => item.quantity_in_stock < item.minimum_stock_level).length || 0;
  const outOfStockItems = items?.filter((item) => item.quantity_in_stock === 0).length || 0;

  return {
    total_items: totalItems || 0,
    total_value: totalValue,
    low_stock_items: lowStockItems,
    out_of_stock_items: outOfStockItems,
    by_category: [],
    recent_movements: [],
  };
}

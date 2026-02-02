// =====================================================
// INVENTORY MODULE TYPES
// =====================================================

export type ItemStatus = 'active' | 'discontinued' | 'out_of_stock';
export type TransactionType = 'in' | 'out' | 'adjustment' | 'return';

export interface InventoryItem {
  id: string;
  org_id: string;
  
  item_code: string;
  item_name: string;
  category?: string;
  
  // Details
  description?: string;
  unit_of_measure?: string;
  
  // Quantities
  quantity_in_stock: number;
  minimum_stock_level: number;
  reorder_point: number;
  
  // Pricing
  unit_cost?: number;
  unit_price?: number;
  
  // Status
  status: ItemStatus;
  
  // Metadata
  is_active: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  org_id: string;
  item_id: string;
  
  transaction_type: TransactionType;
  quantity: number;
  
  // Reference
  reference_type?: string;
  reference_id?: string;
  
  // Details
  remarks?: string;
  performed_by?: string;
  transaction_date: string;
}

// DTOs
export interface CreateItemDTO {
  item_name: string;
  category?: string;
  description?: string;
  unit_of_measure?: string;
  quantity_in_stock?: number;
  minimum_stock_level?: number;
  reorder_point?: number;
  unit_cost?: number;
  unit_price?: number;
}

export interface UpdateItemDTO {
  item_name?: string;
  category?: string;
  description?: string;
  unit_of_measure?: string;
  minimum_stock_level?: number;
  reorder_point?: number;
  unit_cost?: number;
  unit_price?: number;
  status?: ItemStatus;
}

export interface CreateTransactionDTO {
  item_id: string;
  transaction_type: TransactionType;
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  remarks?: string;
}

export interface InventoryFilters {
  search?: string;
  category?: string;
  status?: ItemStatus;
  low_stock_only?: boolean;
}

// Extended types
export interface InventoryItemDetail extends InventoryItem {
  recent_transactions: InventoryTransaction[];
  total_value: number;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

// Statistics
export interface InventoryStats {
  total_items: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  
  by_category: {
    category: string;
    item_count: number;
    total_quantity: number;
    total_value: number;
  }[];
  
  recent_movements: {
    date: string;
    items_in: number;
    items_out: number;
    net_change: number;
  }[];
}

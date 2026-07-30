/**
 * BuySell B2B Marketplace — Core Type System
 * Industry-standard strict TypeScript definitions.
 */

export type UserRole = "buyer" | "supplier" | "super_admin";
export type VerificationLevel = "unverified" | "pending" | "verified" | "rejected" | "suspended";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  user_id: string;
  company_name: string;
  business_type?: string | null;
  registration_number?: string | null;
  tax_id?: string | null;
  address?: string | null;
  country?: string | null;
  verification_level: VerificationLevel;
  created_at: string;
  updated_at?: string;
}

export interface TieredPrice {
  minQty: number;
  unit_price?: number;
  price: number;
}

export interface Product {
  id: string | number;
  title?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  category_id?: string;
  image_urls?: string[];
  imageUrl?: string;
  min_order_quantity?: number;
  moq?: number;
  lead_time_days?: number;
  hs_code?: string;
  status: "active" | "inactive" | "draft";
  supplier_organization_id?: string;
  supplier_name?: string;
  is_verified?: boolean;
  tiered_pricing?: TieredPrice[];
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "escrow_held"
  | "escrow_released"
  | "refunded"
  | "failed";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

export interface Order {
  id: string;
  buyer_id?: string;
  buyer_organization_id?: string | null;
  supplier_organization_id?: string | null;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_reference?: string;
  payment_method?: string;
  shipping_address?: Record<string, any>;
  tracking_number?: string;
  courier_name?: string;
  created_at: string;
  updated_at?: string;
  buyer_organization?: Partial<Organization> | null;
  supplier_organization?: Partial<Organization> | null;
  items?: OrderItem[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

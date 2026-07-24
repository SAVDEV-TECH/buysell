-- BuySell Core Database Schema DDL Specification
-- Optimized for PostgreSQL 14+ / AntiGravity / Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ENUM TYPES
CREATE TYPE user_role_type AS ENUM ('super_admin', 'buyer_admin', 'buyer_staff', 'supplier_admin', 
'supplier_sales', 'supplier_finance');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE rfq_status_type AS ENUM ('draft', 'published', 'closed', 'cancelled');
CREATE TYPE quote_status_type AS ENUM ('submitted', 'under_negotiation', 'accepted', 'rejected', 
'expired');
CREATE TYPE order_status_type AS ENUM ('pending_escrow', 'escrow_funded', 'processing', 'shipped', 
'delivered', 'completed', 'disputed', 'cancelled');

-- 1. ORGANIZATIONS (Suppliers & Buyers)
CREATE TABLE organizations (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_name VARCHAR(255) NOT NULL,
 legal_registration_number VARCHAR(100) UNIQUE NOT NULL,
 tax_id_vat VARCHAR(100),
 organization_type VARCHAR(50) NOT NULL CHECK (organization_type IN ('supplier', 'buyer', 
'both')),
 country_code CHAR(2) NOT NULL,
 base_currency CHAR(3) DEFAULT 'USD',
 verification_level verification_status DEFAULT 'unverified',
 kyb_data JSONB DEFAULT '{}'::jsonb,
 is_active BOOLEAN DEFAULT TRUE,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS
CREATE TABLE users (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 email VARCHAR(255) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 full_name VARCHAR(255) NOT NULL,
 phone_number VARCHAR(50),
 role user_role_type NOT NULL,
 is_email_verified BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCT CATEGORIES (Hierarchical)
CREATE TABLE product_categories (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
 name VARCHAR(255) NOT NULL,
 slug VARCHAR(255) UNIQUE NOT NULL,
 hs_code_prefix VARCHAR(10),
 attributes_schema JSONB DEFAULT '{}'::jsonb
);

-- 4. PRODUCTS & TIERED PRICING
CREATE TABLE products (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 supplier_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 category_id UUID NOT NULL REFERENCES product_categories(id),
 title VARCHAR(255) NOT NULL,
 description TEXT,
 hs_code VARCHAR(20) NOT NULL,
 unit_of_measure VARCHAR(50) NOT NULL,
 min_order_quantity INT NOT NULL DEFAULT 1,
 tiered_pricing JSONB NOT NULL, -- Format: [{"min_qty": 100, "max_qty": 500, "unit_price": 12.50}]
 custom_specifications JSONB DEFAULT '{}'::jsonb,
 search_vector tsvector,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_specs ON products USING GIN(custom_specifications);

-- 5. RFQs (Request for Quotations)
CREATE TABLE rfqs (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 buyer_organization_id UUID NOT NULL REFERENCES organizations(id),
 title VARCHAR(255) NOT NULL,
 target_category_id UUID REFERENCES product_categories(id),
 destination_country CHAR(2) NOT NULL,
 destination_port VARCHAR(100),
 status rfq_status_type DEFAULT 'published',
 requirements_spec JSONB NOT NULL,
 expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SUPPLIER QUOTES
CREATE TABLE supplier_quotes (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
 supplier_organization_id UUID NOT NULL REFERENCES organizations(id),
 currency CHAR(3) NOT NULL DEFAULT 'USD',
 unit_price NUMERIC(15, 4) NOT NULL,
 total_quantity INT NOT NULL,
 total_amount NUMERIC(15, 2) NOT NULL,
 lead_time_days INT NOT NULL,
 incoterms VARCHAR(10) NOT NULL, -- FOB, CIF, EXW, DDP
 status quote_status_type DEFAULT 'submitted',
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. ORDERS & ESCROW TRANSACTIONS
CREATE TABLE orders (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 quote_id UUID REFERENCES supplier_quotes(id),
 buyer_organization_id UUID NOT NULL REFERENCES organizations(id),
 supplier_organization_id UUID NOT NULL REFERENCES organizations(id),
 total_amount NUMERIC(15, 2) NOT NULL,
 currency CHAR(3) NOT NULL DEFAULT 'USD',
 exchange_rate_to_usd NUMERIC(10, 6) DEFAULT 1.000000,
 status order_status_type DEFAULT 'pending_escrow',
 escrow_reference_id VARCHAR(100),
 shipping_details JSONB DEFAULT '{}'::jsonb,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SEARCH TRIGGER
CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
begin
 new.search_vector :=
 setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
 setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
 setweight(to_tsvector('english', coalesce(new.hs_code, '')), 'C');
 return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_update BEFORE INSERT OR UPDATE
ON products FOR EACH ROW EXECUTE FUNCTION products_search_update();

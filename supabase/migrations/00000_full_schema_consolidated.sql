-- ==========================================
-- AlcoholDepositSaaS — Consolidated Schema (Fresh Install)
-- SaaS Multi-Tenant — Single Source of Truth
-- Generated: 2026-04-23
--
-- This single file creates the entire schema from scratch including:
--   • Multi-tenant root (tenants, platform_admins)
--   • Per-store feature toggles + per-tenant role permission overrides
--   • Per-tenant LINE OA config with optional per-store override
--   • Branch-limit enforcement (tenants.max_branches)
--   • RLS with mandatory tenant_id isolation layer
--
-- Status: 🚧 Phase A — tenant root + identity tables
-- (subsequent phases append more tables, indexes, RLS, seeds)
-- ==========================================

-- ==========================================
-- TIMEZONE
-- ==========================================
ALTER DATABASE postgres SET timezone TO 'Asia/Bangkok';
SET timezone = 'Asia/Bangkok';

-- ==========================================
-- ENUMS
-- ==========================================

-- SaaS / tenancy enums
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
CREATE TYPE tenant_plan   AS ENUM ('trial', 'starter', 'growth', 'enterprise', 'custom');
CREATE TYPE line_mode     AS ENUM ('tenant', 'per_store');
CREATE TYPE platform_admin_role AS ENUM ('super_admin', 'admin', 'support', 'readonly');

-- Domain enums (existing)
CREATE TYPE user_role AS ENUM ('owner', 'accountant', 'manager', 'bar', 'staff', 'customer', 'hq');
CREATE TYPE deposit_status AS ENUM ('pending_confirm', 'in_store', 'pending_withdrawal', 'withdrawn', 'expired', 'transferred_out');
CREATE TYPE comparison_status AS ENUM ('pending', 'explained', 'approved', 'rejected');
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'completed', 'rejected');
CREATE TYPE transfer_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE print_job_status AS ENUM ('pending', 'printing', 'completed', 'failed');
CREATE TYPE print_job_type AS ENUM ('receipt', 'label', 'transfer');
CREATE TYPE hq_deposit_status AS ENUM ('awaiting_withdrawal', 'withdrawn');
CREATE TYPE borrow_status AS ENUM ('pending_approval', 'approved', 'pos_adjusting', 'completed', 'return_pending', 'returned', 'rejected', 'cancelled');
CREATE TYPE chat_room_type AS ENUM ('store', 'direct', 'cross_store');
CREATE TYPE chat_message_type AS ENUM ('text', 'image', 'action_card', 'system');
CREATE TYPE chat_member_role AS ENUM ('member', 'admin');
CREATE TYPE commission_type AS ENUM ('ae_commission', 'bottle_commission');

-- ==========================================
-- TENANTS — root entity (a "tenant" = a customer company)
-- ==========================================

CREATE TABLE tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT UNIQUE NOT NULL,            -- URL-safe identifier: /t/{slug}/...
  company_name     TEXT NOT NULL,
  legal_name       TEXT,                            -- ชื่อนิติบุคคล (optional)
  tax_id           TEXT,                            -- เลขผู้เสียภาษี (optional)
  contact_email    TEXT NOT NULL,
  contact_phone    TEXT,
  country          TEXT DEFAULT 'TH',
  timezone         TEXT DEFAULT 'Asia/Bangkok',

  -- Subscription / limits (set by platform admin)
  status               tenant_status NOT NULL DEFAULT 'trial',
  plan                 tenant_plan   NOT NULL DEFAULT 'trial',
  max_branches         INTEGER NOT NULL DEFAULT 1
                       CHECK (max_branches >= 1 AND max_branches <= 1000),
  max_users            INTEGER NOT NULL DEFAULT 10,
  trial_ends_at        TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  subscription_ends_at TIMESTAMPTZ,

  -- LINE OA defaults (per-tenant) — stores may override when line_mode='per_store'
  line_mode            line_mode NOT NULL DEFAULT 'per_store',
  line_channel_id      TEXT,
  line_channel_secret  TEXT,
  line_channel_token   TEXT,
  line_basic_id        TEXT,                        -- e.g. '@companyA'
  liff_id              TEXT,                        -- LIFF id of this tenant
  line_owner_group_id  TEXT,                        -- LINE group id for owner alerts

  -- Branding (used in UI + LIFF)
  logo_url         TEXT,
  brand_color      TEXT DEFAULT '#0ea5e9',

  -- Ownership (set after owner profile is created)
  owner_user_id    UUID,                            -- FK → profiles.id (added later, deferred)

  -- Audit
  created_by       UUID,                            -- FK → platform_admins.id (deferred)
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  suspended_at     TIMESTAMPTZ,
  suspension_reason TEXT
);

CREATE UNIQUE INDEX idx_tenants_line_channel
  ON tenants(line_channel_id) WHERE line_channel_id IS NOT NULL;

COMMENT ON TABLE tenants IS
  'Root entity for multi-tenant isolation. Every domain row carries tenant_id.';
COMMENT ON COLUMN tenants.line_mode IS
  '''tenant'' = single LINE OA shared by all stores. ''per_store'' = each store has its own LINE OA (default).';
COMMENT ON COLUMN tenants.max_branches IS
  'Hard limit on number of active stores under this tenant. Enforced via trigger.';

-- ==========================================
-- PLATFORM ADMINS — super-admin identities (separate from tenant users)
-- ==========================================

CREATE TABLE platform_admins (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role         platform_admin_role NOT NULL DEFAULT 'admin',
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  created_by   UUID REFERENCES platform_admins(id)
);

COMMENT ON TABLE platform_admins IS
  'Platform-level admins. Identity here grants ZERO implicit access to any tenant data; admins must use audited service-role endpoints to inspect tenant rows.';

-- ==========================================
-- PROFILES — tenant users (NOT platform admins)
-- ==========================================

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  username     TEXT NOT NULL,
  role         user_role NOT NULL DEFAULT 'staff',
  line_user_id TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  created_by   UUID REFERENCES profiles(id),

  -- Username unique within a tenant only (so 'somchai' can exist in multiple tenants)
  UNIQUE (tenant_id, username),
  -- A LINE user may belong to multiple tenants but only once per tenant
  UNIQUE (tenant_id, line_user_id)
);

-- Now we can add the deferred FKs on tenants
ALTER TABLE tenants
  ADD CONSTRAINT tenants_owner_fk FOREIGN KEY (owner_user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT tenants_created_by_fk FOREIGN KEY (created_by) REFERENCES platform_admins(id) ON DELETE SET NULL;

-- ==========================================
-- USER PERMISSIONS — individual permission grants (overrides role defaults)
-- ==========================================

CREATE TABLE user_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission  TEXT NOT NULL,
  granted_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- ==========================================
-- STORES — branches under a tenant
-- ==========================================

CREATE TABLE stores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_code           TEXT NOT NULL,
  store_name           TEXT NOT NULL,

  -- Per-store LINE OA (overrides tenant-level when line_mode='per_store')
  line_token           TEXT,
  line_channel_id      TEXT,
  line_channel_secret  TEXT,

  -- LINE group ids (always per-store, regardless of line_mode)
  stock_notify_group_id   TEXT,    -- กลุ่มแจ้งเตือนสต๊อก
  deposit_notify_group_id TEXT,    -- กลุ่มแจ้งเตือนฝาก/เบิก (staff)
  bar_notify_group_id     TEXT,    -- กลุ่มบาร์ยืนยันรับเหล้า

  borrow_notification_roles TEXT[] DEFAULT ARRAY['owner', 'manager']::text[],
  manager_id           UUID REFERENCES profiles(id),
  is_central           BOOLEAN DEFAULT false,
  active               BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now(),

  UNIQUE (tenant_id, store_code)
);

-- Per-store LINE channel must still be globally unique (one channel = one route)
CREATE UNIQUE INDEX idx_stores_line_channel
  ON stores(line_channel_id) WHERE line_channel_id IS NOT NULL;

-- ==========================================
-- USER ↔ STORE assignment
-- ==========================================

CREATE TABLE user_stores (
  user_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, store_id)
);

-- ==========================================
-- TENANT INVITATIONS — owner invites staff via email
-- ==========================================

CREATE TABLE tenant_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'staff',
  store_ids   UUID[] DEFAULT '{}',
  token       TEXT UNIQUE NOT NULL,
  invited_by  UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, email)
);

-- ==========================================
-- TENANT AUDIT LOGS — platform-admin actions on tenants
-- ==========================================

CREATE TABLE tenant_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  platform_admin_id UUID REFERENCES platform_admins(id),
  action            TEXT NOT NULL,                  -- 'create' / 'suspend' / 'resume' / 'change_plan' / 'impersonate'
  payload           JSONB,
  ip_address        INET,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- END OF PHASE A
-- Next phases will append: feature toggles, role permissions,
-- domain tables (stock/deposit/withdrawal/transfer/borrow/HQ),
-- shared tables, commission, chat, indexes, RLS, triggers, seeds.
-- ==========================================

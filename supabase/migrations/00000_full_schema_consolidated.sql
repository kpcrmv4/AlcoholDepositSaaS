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
-- STORE FEATURES — per-store module enable/disable
-- ==========================================
-- Each store can toggle which modules are active. Defaults to all enabled.
-- Feature keys: 'stock', 'deposit', 'withdrawal', 'transfer', 'borrow',
--               'hq_warehouse', 'commission', 'chat', 'print_server',
--               'line_messaging', 'announcements', 'penalties'

CREATE TABLE store_features (
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID REFERENCES profiles(id),
  PRIMARY KEY (store_id, feature_key)
);

COMMENT ON TABLE store_features IS
  'Per-store module toggle. Absent row = default (usually enabled).';

-- ==========================================
-- ROLE PERMISSIONS — per-tenant role ↔ permission mapping
-- ==========================================
-- Each tenant can customize which permissions a role has access to.
-- On tenant creation, default permission set is seeded (see Phase G).
-- Permission keys use dotted notation: 'deposits.view', 'stock.manage', etc.

CREATE TABLE role_permissions (
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role           user_role NOT NULL,
  permission_key TEXT NOT NULL,
  enabled        BOOLEAN NOT NULL DEFAULT true,
  updated_at     TIMESTAMPTZ DEFAULT now(),
  updated_by     UUID REFERENCES profiles(id),
  PRIMARY KEY (tenant_id, role, permission_key)
);

COMMENT ON TABLE role_permissions IS
  'Tenant-level override of role → permission mapping. Owner can toggle which menus/actions each role can access.';

-- ==========================================
-- STOCK MODULE
-- ==========================================

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_code  TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  category      TEXT,
  size          TEXT,
  unit          TEXT,
  price         NUMERIC(10,2),
  active        BOOLEAN DEFAULT true,
  count_status  TEXT NOT NULL DEFAULT 'active'
                CHECK (count_status IN ('active', 'excluded')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (store_id, product_code)
);

CREATE TABLE manual_counts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id       UUID NOT NULL REFERENCES stores(id),
  count_date     DATE NOT NULL,
  product_code   TEXT NOT NULL,
  count_quantity NUMERIC(10,2) NOT NULL,
  user_id        UUID REFERENCES profiles(id),
  notes          TEXT,
  verified       BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (store_id, count_date, product_code)
);

CREATE TABLE ocr_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES stores(id),
  upload_date     TIMESTAMPTZ DEFAULT now(),
  count_items     INTEGER,
  processed_items INTEGER,
  status          TEXT DEFAULT 'pending',
  upload_method   TEXT,
  file_urls       TEXT[]
);

CREATE TABLE ocr_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocr_log_id   UUID REFERENCES ocr_logs(id) ON DELETE CASCADE,
  product_code TEXT,
  product_name TEXT,
  qty_ocr      NUMERIC(10,2),
  unit         TEXT,
  confidence   NUMERIC(5,2),
  status       TEXT DEFAULT 'pending',
  notes        TEXT
);

CREATE TABLE comparisons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES stores(id),
  comp_date       DATE NOT NULL,
  product_code    TEXT NOT NULL,
  product_name    TEXT,
  pos_quantity    NUMERIC(10,2),
  manual_quantity NUMERIC(10,2),
  difference      NUMERIC(10,2),
  diff_percent    NUMERIC(5,2),
  status          comparison_status DEFAULT 'pending',
  explanation     TEXT,
  explained_by    UUID REFERENCES profiles(id),
  approved_by     UUID REFERENCES profiles(id),
  approval_status TEXT,
  owner_notes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- DEPOSIT MODULE
-- ==========================================

CREATE TABLE deposits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id            UUID NOT NULL REFERENCES stores(id),
  deposit_code        TEXT NOT NULL,
  customer_id         UUID REFERENCES profiles(id),
  line_user_id        TEXT,
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT,
  product_name        TEXT NOT NULL,
  category            TEXT,
  quantity            NUMERIC(10,2) NOT NULL,
  remaining_qty       NUMERIC(10,2) NOT NULL,
  remaining_percent   NUMERIC(5,2) DEFAULT 100,
  table_number        TEXT,
  status              deposit_status DEFAULT 'pending_confirm',
  expiry_date         TIMESTAMPTZ,
  received_by         UUID REFERENCES profiles(id),
  notes               TEXT,
  photo_url           TEXT,         -- legacy main photo
  customer_photo_url  TEXT,         -- customer submitted (via LIFF)
  received_photo_url  TEXT,         -- staff received
  confirm_photo_url   TEXT,         -- bar confirmed
  is_vip              BOOLEAN DEFAULT false,  -- VIP = no expiry
  is_no_deposit       BOOLEAN DEFAULT false,  -- created as expired for HQ transfer
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, deposit_code)
);

CREATE TABLE withdrawals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deposit_id      UUID REFERENCES deposits(id),
  store_id        UUID NOT NULL REFERENCES stores(id),
  line_user_id    TEXT,
  customer_name   TEXT,
  product_name    TEXT,
  requested_qty   NUMERIC(10,2),
  actual_qty      NUMERIC(10,2),
  table_number    TEXT,
  status          withdrawal_status DEFAULT 'pending',
  processed_by    UUID REFERENCES profiles(id),
  notes           TEXT,
  photo_url       TEXT,
  withdrawal_type TEXT DEFAULT 'in_store',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deposit_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id           UUID NOT NULL REFERENCES stores(id),
  line_user_id       TEXT NOT NULL,
  customer_name      TEXT,
  customer_phone     TEXT,
  product_name       TEXT,
  quantity           NUMERIC(10,2),
  table_number       TEXT,
  customer_photo_url TEXT,
  notes              TEXT,
  status             TEXT DEFAULT 'pending',
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- TRANSFER MODULE (between stores WITHIN a tenant)
-- ==========================================

CREATE TABLE transfers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_store_id      UUID NOT NULL REFERENCES stores(id),
  to_store_id        UUID NOT NULL REFERENCES stores(id),
  deposit_id         UUID REFERENCES deposits(id),
  product_name       TEXT,
  quantity           NUMERIC(10,2),
  status             transfer_status DEFAULT 'pending',
  requested_by       UUID REFERENCES profiles(id),
  confirmed_by       UUID REFERENCES profiles(id),
  notes              TEXT,
  photo_url          TEXT,
  confirm_photo_url  TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE hq_deposits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transfer_id         UUID REFERENCES transfers(id),
  deposit_id          UUID REFERENCES deposits(id),
  from_store_id       UUID REFERENCES stores(id),
  product_name        TEXT,
  customer_name       TEXT,
  deposit_code        TEXT,
  category            TEXT,
  quantity            NUMERIC(10,2),
  status              hq_deposit_status DEFAULT 'awaiting_withdrawal',
  received_by         UUID REFERENCES profiles(id),
  received_photo_url  TEXT,
  received_at         TIMESTAMPTZ DEFAULT now(),
  withdrawn_by        UUID REFERENCES profiles(id),
  withdrawal_notes    TEXT,
  withdrawn_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- BORROW MODULE (between stores WITHIN a tenant)
-- ==========================================

CREATE TABLE borrows (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  borrow_code              TEXT,                    -- BRW-{FROM}-{TO}-XXXXX
  from_store_id            UUID NOT NULL REFERENCES stores(id),
  to_store_id              UUID NOT NULL REFERENCES stores(id),
  requested_by             UUID REFERENCES profiles(id),
  status                   borrow_status DEFAULT 'pending_approval',
  notes                    TEXT,
  borrower_photo_url       TEXT,
  lender_photo_url         TEXT,
  approved_by              UUID REFERENCES profiles(id),
  approved_at              TIMESTAMPTZ,
  borrower_pos_confirmed   BOOLEAN DEFAULT false,
  lender_pos_confirmed     BOOLEAN DEFAULT false,
  borrower_pos_confirmed_by UUID REFERENCES profiles(id),
  borrower_pos_confirmed_at TIMESTAMPTZ,
  lender_pos_confirmed_by  UUID REFERENCES profiles(id),
  lender_pos_confirmed_at  TIMESTAMPTZ,
  rejected_by              UUID REFERENCES profiles(id),
  rejected_at              TIMESTAMPTZ,
  rejection_reason         TEXT,
  cancelled_by             UUID REFERENCES profiles(id),
  cancelled_at             TIMESTAMPTZ,
  borrower_pos_bill_url    TEXT,
  lender_pos_bill_url      TEXT,
  completed_at             TIMESTAMPTZ,
  -- Borrower return confirmation (status 'return_pending')
  return_photo_url         TEXT,
  return_confirmed_by      UUID REFERENCES profiles(id),
  return_confirmed_at      TIMESTAMPTZ,
  return_notes             TEXT,
  -- Lender return-receipt confirmation (status 'returned')
  return_receipt_photo_url TEXT,
  return_received_by       UUID REFERENCES profiles(id),
  return_received_at       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, borrow_code)
);

CREATE TABLE borrow_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_id         UUID REFERENCES borrows(id) ON DELETE CASCADE,
  product_name      TEXT NOT NULL,
  category          TEXT,
  quantity          NUMERIC(10,2) NOT NULL,
  approved_quantity NUMERIC(10,2),     -- may be less than requested
  unit              TEXT,
  notes             TEXT
);

-- ==========================================
-- STORE SETTINGS — per-store config (1:1 with stores)
-- ==========================================

CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  notify_time_daily TIME,
  notify_days TEXT[],
  diff_tolerance NUMERIC(5,2) DEFAULT 5,
  staff_registration_code TEXT,
  receipt_settings JSONB,

  -- Customer notification prefs
  customer_notify_expiry_enabled    BOOLEAN DEFAULT true,
  customer_notify_expiry_days       INTEGER DEFAULT 7,
  customer_notify_withdrawal_enabled BOOLEAN DEFAULT true,
  customer_notify_deposit_enabled    BOOLEAN DEFAULT true,
  customer_notify_promotion_enabled  BOOLEAN DEFAULT true,
  customer_notify_channels           TEXT[] DEFAULT '{pwa,line}',

  -- LINE notification toggles
  line_notify_enabled    BOOLEAN DEFAULT true,
  daily_reminder_enabled BOOLEAN DEFAULT true,
  follow_up_enabled      BOOLEAN DEFAULT true,

  -- Chat bot settings
  chat_bot_deposit_enabled    BOOLEAN NOT NULL DEFAULT true,
  chat_bot_withdrawal_enabled BOOLEAN NOT NULL DEFAULT true,
  chat_bot_stock_enabled      BOOLEAN NOT NULL DEFAULT true,
  chat_bot_borrow_enabled     BOOLEAN NOT NULL DEFAULT true,
  chat_bot_transfer_enabled   BOOLEAN NOT NULL DEFAULT true,
  chat_bot_timeout_deposit    INTEGER NOT NULL DEFAULT 15,
  chat_bot_timeout_withdrawal INTEGER NOT NULL DEFAULT 15,
  chat_bot_timeout_stock      INTEGER NOT NULL DEFAULT 60,
  chat_bot_timeout_borrow     INTEGER NOT NULL DEFAULT 30,
  chat_bot_timeout_transfer   INTEGER NOT NULL DEFAULT 120,
  chat_bot_priority_deposit    TEXT NOT NULL DEFAULT 'normal',
  chat_bot_priority_withdrawal TEXT NOT NULL DEFAULT 'normal',
  chat_bot_priority_stock      TEXT NOT NULL DEFAULT 'normal',
  chat_bot_priority_borrow     TEXT NOT NULL DEFAULT 'normal',
  chat_bot_priority_transfer   TEXT NOT NULL DEFAULT 'normal',
  chat_bot_daily_summary_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Print server
  print_server_account_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  print_server_working_hours JSONB DEFAULT '{"enabled": true, "startHour": 12, "startMinute": 0, "endHour": 6, "endMinute": 0}'::jsonb,

  -- Withdrawal
  withdrawal_blocked_days TEXT[] DEFAULT '{Fri,Sat}'
);

-- ==========================================
-- APP SETTINGS — platform-wide flags (platform_admin only)
-- ==========================================

CREATE TABLE app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  type        TEXT DEFAULT 'string',
  description TEXT
);

COMMENT ON TABLE app_settings IS
  'Platform-level settings (feature flags, maintenance mode). NEVER tenant data.';

-- ==========================================
-- SYSTEM SETTINGS — per-tenant config (replaces global system_settings)
-- ==========================================

CREATE TABLE system_settings (
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID REFERENCES profiles(id),
  PRIMARY KEY (tenant_id, key)
);

COMMENT ON TABLE system_settings IS
  'Per-tenant key-value settings (bot display name, webhook note, feature flags scoped to tenant).';

-- ==========================================
-- AUDIT LOGS — tenant-level audit trail
-- ==========================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id    UUID REFERENCES stores(id),
  action_type TEXT NOT NULL,
  table_name  TEXT,
  record_id   TEXT,
  old_value   JSONB,
  new_value   JSONB,
  changed_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- NOTIFICATIONS
-- ==========================================

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id),
  store_id   UUID REFERENCES stores(id),
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT,
  read       BOOLEAN DEFAULT false,
  data       JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PENALTIES
-- ==========================================

CREATE TABLE penalties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id    UUID REFERENCES stores(id),
  staff_id    UUID REFERENCES profiles(id),
  reason      TEXT,
  amount      NUMERIC(10,2),
  status      TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PUSH SUBSCRIPTIONS
-- ==========================================

CREATE TABLE push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  device_name  TEXT,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- NOTIFICATION PREFERENCES (per user)
-- ==========================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  pwa_enabled BOOLEAN DEFAULT true,
  line_enabled BOOLEAN DEFAULT true,
  notify_deposit_confirmed BOOLEAN DEFAULT true,
  notify_withdrawal_completed BOOLEAN DEFAULT true,
  notify_expiry_warning BOOLEAN DEFAULT true,
  notify_promotions BOOLEAN DEFAULT true,
  notify_stock_alert BOOLEAN DEFAULT true,
  notify_approval_request BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- ANNOUNCEMENTS
-- ==========================================

CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id        UUID REFERENCES stores(id),
  title           TEXT NOT NULL,
  body            TEXT,
  image_url       TEXT,
  type            TEXT DEFAULT 'promotion',
  target_audience TEXT DEFAULT 'customer',
  start_date      TIMESTAMPTZ DEFAULT now(),
  end_date        TIMESTAMPTZ,
  send_push       BOOLEAN DEFAULT false,
  push_sent_at    TIMESTAMPTZ,
  active          BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PRINT QUEUE + PRINT SERVER STATUS
-- ==========================================

CREATE TABLE print_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  deposit_id    UUID REFERENCES deposits(id) ON DELETE SET NULL,
  job_type      print_job_type NOT NULL DEFAULT 'receipt',
  status        print_job_status NOT NULL DEFAULT 'pending',
  copies        INTEGER DEFAULT 1,
  payload       JSONB NOT NULL,
  requested_by  UUID REFERENCES profiles(id),
  printed_at    TIMESTAMPTZ,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE print_server_status (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  is_online          BOOLEAN DEFAULT false,
  last_heartbeat     TIMESTAMPTZ,
  server_version     TEXT,
  printer_name       TEXT DEFAULT 'POS80',
  printer_status     TEXT DEFAULT 'unknown',
  hostname           TEXT,
  jobs_printed_today INTEGER DEFAULT 0,
  error_message      TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- COMMISSION MODULE
-- ==========================================

CREATE TABLE ae_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  nickname          TEXT,
  phone             TEXT,
  bank_name         TEXT,
  bank_account_no   TEXT,
  bank_account_name TEXT,
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ae_profiles IS
  'Account Executives (ที่พาลูกค้ามาร้าน). Shared across all stores within a tenant.';

CREATE TABLE commission_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id       UUID NOT NULL REFERENCES stores(id),
  ae_id          UUID REFERENCES ae_profiles(id),
  staff_id       UUID REFERENCES profiles(id),
  type           commission_type NOT NULL,
  month          TEXT NOT NULL,                    -- YYYY-MM
  total_entries  INTEGER NOT NULL DEFAULT 0,
  total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  slip_photo_url TEXT,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'paid'
                 CHECK (status IN ('paid', 'cancelled')),
  paid_by        UUID REFERENCES profiles(id),
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_by   UUID REFERENCES profiles(id),
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE commission_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id          UUID NOT NULL REFERENCES stores(id),
  type              commission_type NOT NULL,
  ae_id             UUID REFERENCES ae_profiles(id),
  staff_id          UUID REFERENCES profiles(id),

  bill_date         DATE NOT NULL,
  receipt_no        TEXT,
  receipt_photo_url TEXT,
  table_no          TEXT,

  -- AE commission calculation
  subtotal_amount   NUMERIC(12,2),
  commission_rate   NUMERIC(5,4) NOT NULL DEFAULT 0.10,   -- 10%
  tax_rate          NUMERIC(5,4) NOT NULL DEFAULT 0.03,   -- 3% withholding
  commission_amount NUMERIC(12,2),
  tax_amount        NUMERIC(12,2),
  net_amount        NUMERIC(12,2) NOT NULL,

  -- Bottle commission
  bottle_count      INTEGER,
  bottle_rate       NUMERIC(10,2) DEFAULT 500,

  payment_id        UUID REFERENCES commission_payments(id),
  notes             TEXT,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- CHAT TABLES
-- ==========================================

CREATE TABLE chat_rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id       UUID REFERENCES stores(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           chat_room_type NOT NULL DEFAULT 'store',
  is_active      BOOLEAN DEFAULT true,
  pinned_summary JSONB DEFAULT NULL,
  avatar_url     TEXT DEFAULT NULL,
  created_by     UUID REFERENCES profiles(id) DEFAULT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN chat_rooms.type IS
  '''cross_store'' = cross-store WITHIN A TENANT only. Cross-tenant rooms are forbidden.';

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type        chat_message_type NOT NULL DEFAULT 'text',
  content     TEXT,
  metadata    JSONB DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE chat_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         chat_member_role NOT NULL DEFAULT 'member',
  last_read_at TIMESTAMPTZ DEFAULT now(),
  muted        BOOLEAN NOT NULL DEFAULT false,
  joined_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE TABLE chat_pinned_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  pinned_by  UUID NOT NULL REFERENCES profiles(id),
  pinned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, message_id)
);

-- ==========================================
-- INDEXES
-- ==========================================

-- --- Tenant identity lookups ---
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX idx_platform_admins_active ON platform_admins(active) WHERE active = true;
CREATE INDEX idx_tenant_invitations_tenant ON tenant_invitations(tenant_id);
CREATE INDEX idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX idx_tenant_invitations_token ON tenant_invitations(token) WHERE accepted_at IS NULL;
CREATE INDEX idx_tenant_audit_logs_tenant ON tenant_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_tenant_audit_logs_admin ON tenant_audit_logs(platform_admin_id);

-- --- Tenant isolation (CRITICAL for RLS performance) ---
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_line_user_id ON profiles(line_user_id);
CREATE INDEX idx_profiles_created_by ON profiles(created_by);

CREATE INDEX idx_stores_tenant ON stores(tenant_id);
CREATE INDEX idx_stores_manager ON stores(manager_id);

CREATE INDEX idx_user_stores_store ON user_stores(store_id);
CREATE INDEX idx_user_permissions_tenant ON user_permissions(tenant_id);
CREATE INDEX idx_user_permissions_granted_by ON user_permissions(granted_by);

-- --- Feature + role config ---
CREATE INDEX idx_store_features_store ON store_features(store_id);
CREATE INDEX idx_role_permissions_tenant_role ON role_permissions(tenant_id, role);

-- --- Stock module ---
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_manual_counts_tenant ON manual_counts(tenant_id);
CREATE INDEX idx_manual_counts_store_date ON manual_counts(store_id, count_date);
CREATE INDEX idx_manual_counts_user ON manual_counts(user_id);
CREATE INDEX idx_ocr_logs_tenant ON ocr_logs(tenant_id);
CREATE INDEX idx_ocr_logs_store ON ocr_logs(store_id);
CREATE INDEX idx_comparisons_tenant ON comparisons(tenant_id);
CREATE INDEX idx_comparisons_store_id ON comparisons(store_id);
CREATE INDEX idx_comparisons_status ON comparisons(status);
CREATE INDEX idx_comparisons_approved_by ON comparisons(approved_by);
CREATE INDEX idx_comparisons_explained_by ON comparisons(explained_by);

-- --- Deposit module ---
CREATE INDEX idx_deposits_tenant ON deposits(tenant_id);
CREATE INDEX idx_deposits_tenant_status ON deposits(tenant_id, status);
CREATE INDEX idx_deposits_store_id ON deposits(store_id);
CREATE INDEX idx_deposits_store_status ON deposits(store_id, status);
CREATE INDEX idx_deposits_customer_id ON deposits(customer_id);
CREATE INDEX idx_deposits_line_user_id ON deposits(line_user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_expiry_date ON deposits(expiry_date);
CREATE INDEX idx_deposits_received_by ON deposits(received_by);
CREATE INDEX idx_deposits_is_vip ON deposits(is_vip) WHERE is_vip = true;
CREATE INDEX idx_deposits_is_no_deposit ON deposits(is_no_deposit) WHERE is_no_deposit = true;

CREATE INDEX idx_withdrawals_tenant ON withdrawals(tenant_id);
CREATE INDEX idx_withdrawals_deposit_id ON withdrawals(deposit_id);
CREATE INDEX idx_withdrawals_store_id ON withdrawals(store_id);

CREATE INDEX idx_deposit_requests_tenant ON deposit_requests(tenant_id);
CREATE INDEX idx_deposit_requests_store_status ON deposit_requests(store_id, status);

-- --- Transfer / HQ module ---
CREATE INDEX idx_transfers_tenant ON transfers(tenant_id);
CREATE INDEX idx_transfers_from_store ON transfers(from_store_id);
CREATE INDEX idx_transfers_to_store ON transfers(to_store_id);
CREATE INDEX idx_transfers_deposit ON transfers(deposit_id);
CREATE INDEX idx_transfers_confirmed_by ON transfers(confirmed_by);
CREATE INDEX idx_transfers_requested_by ON transfers(requested_by);

CREATE INDEX idx_hq_deposits_tenant ON hq_deposits(tenant_id);
CREATE INDEX idx_hq_deposits_status ON hq_deposits(status);
CREATE INDEX idx_hq_deposits_from_store ON hq_deposits(from_store_id);
CREATE INDEX idx_hq_deposits_transfer ON hq_deposits(transfer_id);
CREATE INDEX idx_hq_deposits_deposit ON hq_deposits(deposit_id);
CREATE INDEX idx_hq_deposits_received_by ON hq_deposits(received_by);
CREATE INDEX idx_hq_deposits_withdrawn_by ON hq_deposits(withdrawn_by);

-- --- Borrow module ---
CREATE INDEX idx_borrows_tenant ON borrows(tenant_id);
CREATE INDEX idx_borrows_from_store ON borrows(from_store_id);
CREATE INDEX idx_borrows_to_store ON borrows(to_store_id);
CREATE INDEX idx_borrows_status ON borrows(status);
CREATE INDEX idx_borrows_created_at ON borrows(created_at);
CREATE INDEX idx_borrows_approved_by ON borrows(approved_by);
CREATE INDEX idx_borrows_requested_by ON borrows(requested_by);
CREATE INDEX idx_borrows_rejected_by ON borrows(rejected_by);
CREATE INDEX idx_borrows_cancelled_by ON borrows(cancelled_by);
CREATE INDEX idx_borrows_borrower_pos ON borrows(borrower_pos_confirmed_by);
CREATE INDEX idx_borrows_lender_pos ON borrows(lender_pos_confirmed_by);
CREATE INDEX idx_borrow_items_borrow ON borrow_items(borrow_id);

-- --- Shared tables ---
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_store ON notifications(store_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_store_id ON audit_logs(store_id);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX idx_penalties_tenant ON penalties(tenant_id);
CREATE INDEX idx_penalties_store ON penalties(store_id);
CREATE INDEX idx_penalties_staff ON penalties(staff_id);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX idx_announcements_store_id ON announcements(store_id);
CREATE INDEX idx_announcements_active ON announcements(active, start_date, end_date);
CREATE INDEX idx_announcements_created_by ON announcements(created_by);

-- --- Print ---
CREATE INDEX idx_print_queue_tenant ON print_queue(tenant_id);
CREATE INDEX idx_print_queue_store_status ON print_queue(store_id, status);
CREATE INDEX idx_print_queue_store_pending ON print_queue(store_id, created_at ASC) WHERE status = 'pending';
CREATE INDEX idx_print_queue_created_at ON print_queue(created_at);
CREATE INDEX idx_print_queue_deposit ON print_queue(deposit_id);
CREATE INDEX idx_print_queue_requested_by ON print_queue(requested_by);
CREATE INDEX idx_print_server_status_store ON print_server_status(store_id);

-- --- Commission ---
CREATE INDEX idx_ae_profiles_tenant ON ae_profiles(tenant_id);
CREATE INDEX idx_ae_profiles_active ON ae_profiles(is_active);
CREATE INDEX idx_commission_entries_tenant ON commission_entries(tenant_id);
CREATE INDEX idx_commission_entries_store_id ON commission_entries(store_id);
CREATE INDEX idx_commission_entries_ae_id ON commission_entries(ae_id);
CREATE INDEX idx_commission_entries_bill_date ON commission_entries(bill_date);
CREATE INDEX idx_commission_entries_type ON commission_entries(type);
CREATE INDEX idx_commission_entries_store_date ON commission_entries(store_id, bill_date);
CREATE INDEX idx_commission_entries_payment_id ON commission_entries(payment_id);
CREATE INDEX idx_commission_payments_tenant ON commission_payments(tenant_id);
CREATE INDEX idx_commission_payments_store_id ON commission_payments(store_id);
CREATE INDEX idx_commission_payments_ae_id ON commission_payments(ae_id);
CREATE INDEX idx_commission_payments_month ON commission_payments(month);
CREATE INDEX idx_commission_payments_status ON commission_payments(status);

-- --- Chat ---
CREATE INDEX idx_chat_rooms_tenant ON chat_rooms(tenant_id);
CREATE INDEX idx_chat_rooms_store ON chat_rooms(store_id) WHERE is_active = true;
CREATE INDEX idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX idx_chat_messages_action_cards ON chat_messages((metadata->>'status')) WHERE type = 'action_card' AND archived_at IS NULL;
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_members_user ON chat_members(user_id);
CREATE INDEX idx_chat_pinned_room ON chat_pinned_messages(room_id, pinned_at DESC);
CREATE INDEX idx_chat_pinned_messages_pinned_by ON chat_pinned_messages(pinned_by);
CREATE INDEX idx_chat_pinned_messages_message ON chat_pinned_messages(message_id);

-- ==========================================
-- END OF PHASE D
-- ==========================================

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
-- HELPER FUNCTIONS (all SECURITY DEFINER, search_path locked)
-- ==========================================

-- ─── Tenant identity ───
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE id = auth.uid() AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ─── Role checks (within tenant only) ───
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'accountant', 'hq')
      AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- Backward-compat alias: is_admin() means tenant admin (NOT platform admin)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.is_tenant_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ─── Store scope ───
CREATE OR REPLACE FUNCTION get_user_store_ids()
RETURNS SETOF UUID AS $$
  SELECT us.store_id
  FROM public.user_stores us
  JOIN public.stores s ON s.id = us.store_id
  WHERE us.user_id = auth.uid()
    AND s.tenant_id = public.get_user_tenant_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ─── Feature + permission resolution ───
CREATE OR REPLACE FUNCTION is_feature_enabled(p_store_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.store_features
       WHERE store_id = p_store_id AND feature_key = p_feature_key),
    true   -- absent row = enabled by default
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION has_role_permission(p_permission_key TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    JOIN public.profiles p ON p.tenant_id = rp.tenant_id AND p.role = rp.role
    WHERE p.id = auth.uid()
      AND rp.permission_key = p_permission_key
      AND rp.enabled = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ─── Print server health ───
CREATE OR REPLACE FUNCTION is_print_server_online(p_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.print_server_status
    WHERE store_id = p_store_id
      AND last_heartbeat > now() - INTERVAL '2 minutes'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ─── Chat helpers ───
CREATE OR REPLACE FUNCTION is_chat_member(p_room_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE room_id = p_room_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_action_card_timed_out(p_metadata JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_metadata->>'status' != 'claimed' THEN RETURN false; END IF;
  IF p_metadata->>'claimed_at' IS NULL OR p_metadata->>'timeout_minutes' IS NULL THEN RETURN false; END IF;
  RETURN (
    (p_metadata->>'claimed_at')::timestamptz
    + ((p_metadata->>'timeout_minutes')::int * interval '1 minute')
    < now()
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION auto_release_timed_out(p_metadata JSONB)
RETURNS JSONB AS $$
BEGIN
  RETURN p_metadata || jsonb_build_object(
    'status', 'pending', 'claimed_by', null, 'claimed_by_name', null,
    'claimed_at', null, 'auto_released', true, 'auto_released_at', now()
  );
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION insert_bot_message(
  p_room_id UUID, p_type chat_message_type, p_content TEXT, p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.chat_messages (room_id, sender_id, type, content, metadata)
  VALUES (p_room_id, NULL, p_type, p_content, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION claim_action_card(p_message_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_msg public.chat_messages;
  v_meta JSONB;
  v_profile RECORD;
BEGIN
  SELECT * INTO v_msg FROM public.chat_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Message not found'); END IF;
  IF v_msg.type != 'action_card' THEN RETURN jsonb_build_object('success', false, 'error', 'Not an action card'); END IF;

  v_meta := v_msg.metadata;

  IF v_meta->>'status' = 'claimed' AND public.is_action_card_timed_out(v_meta) THEN
    v_meta := public.auto_release_timed_out(v_meta);
    UPDATE public.chat_messages SET metadata = v_meta WHERE id = p_message_id;
  END IF;

  IF v_meta->>'status' NOT IN ('pending', 'pending_bar') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed',
      'claimed_by', v_meta->>'claimed_by_name');
  END IF;

  SELECT display_name, username INTO v_profile FROM public.profiles WHERE id = p_user_id;

  v_meta := v_meta || jsonb_build_object(
    'status', 'claimed',
    'claimed_by', p_user_id,
    'claimed_by_name', COALESCE(v_profile.display_name, v_profile.username),
    'claimed_at', now(),
    'auto_released', null,
    'auto_released_at', null
  );

  UPDATE public.chat_messages SET metadata = v_meta WHERE id = p_message_id;
  RETURN jsonb_build_object('success', true, 'metadata', v_meta);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION complete_action_card(
  p_message_id UUID, p_user_id UUID, p_notes TEXT DEFAULT NULL, p_photo_url TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_msg public.chat_messages;
  v_meta JSONB;
BEGIN
  SELECT * INTO v_msg FROM public.chat_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Message not found'); END IF;

  v_meta := v_msg.metadata;
  IF v_meta->>'status' != 'claimed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in claimed status');
  END IF;

  IF public.is_action_card_timed_out(v_meta) THEN
    v_meta := public.auto_release_timed_out(v_meta);
    UPDATE public.chat_messages SET metadata = v_meta WHERE id = p_message_id;
    RETURN jsonb_build_object('success', false, 'error', 'หมดเวลาแล้ว งานถูกปล่อยกลับคิว',
      'metadata', v_meta, 'timed_out', true);
  END IF;

  IF v_meta->>'claimed_by' != p_user_id::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not claimed by you');
  END IF;

  v_meta := v_meta || jsonb_build_object(
    'status', 'completed',
    'completed_at', now(),
    'completion_notes', p_notes,
    'confirmation_photo_url', p_photo_url
  );

  UPDATE public.chat_messages SET metadata = v_meta WHERE id = p_message_id;
  RETURN jsonb_build_object('success', true, 'metadata', v_meta);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION release_action_card(p_message_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_msg public.chat_messages;
  v_meta JSONB;
BEGIN
  SELECT * INTO v_msg FROM public.chat_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Message not found'); END IF;

  v_meta := v_msg.metadata;

  IF v_meta->>'status' = 'claimed' AND public.is_action_card_timed_out(v_meta) THEN
    v_meta := public.auto_release_timed_out(v_meta);
    UPDATE public.chat_messages SET metadata = v_meta WHERE id = p_message_id;
    RETURN jsonb_build_object('success', true, 'metadata', v_meta);
  END IF;

  IF v_meta->>'claimed_by' != p_user_id::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not claimed by you');
  END IF;

  v_meta := v_meta || jsonb_build_object(
    'status', CASE WHEN (v_meta->>'_bar_step')::boolean IS TRUE THEN 'pending_bar' ELSE 'pending' END,
    'claimed_by', null,
    'claimed_by_name', null,
    'claimed_at', null,
    'released_by', p_user_id,
    'released_at', now(),
    '_bar_step', null
  );

  UPDATE public.chat_messages SET metadata = v_meta WHERE id = p_message_id;
  RETURN jsonb_build_object('success', true, 'metadata', v_meta);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_chat_unread_counts(p_user_id UUID)
RETURNS TABLE(room_id UUID, unread_count BIGINT) AS $$
  SELECT cm.room_id, COUNT(msg.id) AS unread_count
  FROM public.chat_members cm
  LEFT JOIN public.chat_messages msg
    ON msg.room_id = cm.room_id AND msg.created_at > cm.last_read_at
    AND msg.sender_id != p_user_id AND msg.archived_at IS NULL
  WHERE cm.user_id = p_user_id
  GROUP BY cm.room_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ==========================================
-- TRIGGER FUNCTIONS
-- ==========================================

-- ─── Branch limit enforcement ───
CREATE OR REPLACE FUNCTION enforce_tenant_branch_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max   INTEGER;
  v_count INTEGER;
BEGIN
  SELECT max_branches INTO v_max FROM public.tenants WHERE id = NEW.tenant_id;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Store must belong to a valid tenant (tenant_id=%)', NEW.tenant_id;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.stores
  WHERE tenant_id = NEW.tenant_id
    AND active = true
    AND id IS DISTINCT FROM NEW.id;       -- exclude self on UPDATE

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Branch limit reached for tenant % (max=%). Upgrade plan to add more.',
      NEW.tenant_id, v_max USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_stores_enforce_branch_limit_insert
  BEFORE INSERT ON stores
  FOR EACH ROW WHEN (NEW.active = true)
  EXECUTE FUNCTION enforce_tenant_branch_limit();

CREATE TRIGGER trg_stores_enforce_branch_limit_update
  BEFORE UPDATE ON stores
  FOR EACH ROW WHEN (OLD.active = false AND NEW.active = true)
  EXECUTE FUNCTION enforce_tenant_branch_limit();

-- ─── tenant_id ↔ store_id consistency ───
-- Auto-fills tenant_id from store_id if NULL, raises if mismatched.
CREATE OR REPLACE FUNCTION enforce_tenant_store_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.stores WHERE id = NEW.store_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Invalid store_id %: store not found', NEW.store_id;
  END IF;

  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := v_tenant;
  ELSIF NEW.tenant_id != v_tenant THEN
    RAISE EXCEPTION 'tenant_id mismatch: row tenant=% but store belongs to tenant=%',
      NEW.tenant_id, v_tenant;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_products_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON products
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_manual_counts_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON manual_counts
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_ocr_logs_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON ocr_logs
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_comparisons_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON comparisons
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_deposits_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON deposits
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_withdrawals_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON withdrawals
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_deposit_requests_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON deposit_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_print_queue_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON print_queue
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_announcements_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON announcements
  FOR EACH ROW WHEN (NEW.store_id IS NOT NULL)
  EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_commission_entries_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON commission_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
CREATE TRIGGER trg_commission_payments_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON commission_payments
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();

-- ─── Cross-tenant transfer/borrow guard ───
CREATE OR REPLACE FUNCTION enforce_within_tenant_pair()
RETURNS TRIGGER AS $$
DECLARE
  v_from_tenant UUID;
  v_to_tenant   UUID;
BEGIN
  SELECT tenant_id INTO v_from_tenant FROM public.stores WHERE id = NEW.from_store_id;
  SELECT tenant_id INTO v_to_tenant   FROM public.stores WHERE id = NEW.to_store_id;
  IF v_from_tenant IS NULL OR v_to_tenant IS NULL THEN
    RAISE EXCEPTION 'Invalid from_store_id or to_store_id';
  END IF;
  IF v_from_tenant != v_to_tenant THEN
    RAISE EXCEPTION 'Cross-tenant operations are forbidden (from=%, to=%)', v_from_tenant, v_to_tenant;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := v_from_tenant;
  ELSIF NEW.tenant_id != v_from_tenant THEN
    RAISE EXCEPTION 'tenant_id mismatch with store pair (rows tenant=%, stores tenant=%)',
      NEW.tenant_id, v_from_tenant;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_transfers_within_tenant
  BEFORE INSERT OR UPDATE OF from_store_id, to_store_id, tenant_id ON transfers
  FOR EACH ROW EXECUTE FUNCTION enforce_within_tenant_pair();
CREATE TRIGGER trg_borrows_within_tenant
  BEFORE INSERT OR UPDATE OF from_store_id, to_store_id, tenant_id ON borrows
  FOR EACH ROW EXECUTE FUNCTION enforce_within_tenant_pair();

-- ─── Auth user creation ───
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _username   TEXT;
  _role       user_role;
  _tenant_id  UUID;
  _invitation RECORD;
BEGIN
  -- Path 1: Platform admin (metadata flag set)
  IF NEW.raw_user_meta_data->>'is_platform_admin' = 'true' THEN
    INSERT INTO public.platform_admins (id, email, display_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      COALESCE((NEW.raw_user_meta_data->>'admin_role')::platform_admin_role, 'admin')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Path 2: Tenant user — must specify tenant_id OR carry an invitation_token
  _tenant_id := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::uuid;

  IF _tenant_id IS NULL AND NEW.raw_user_meta_data ? 'invitation_token' THEN
    SELECT tenant_id, role INTO _invitation
    FROM public.tenant_invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND accepted_at IS NULL
      AND expires_at > now();
    IF FOUND THEN
      _tenant_id := _invitation.tenant_id;
      _role := _invitation.role;
    END IF;
  END IF;

  IF _tenant_id IS NULL THEN
    -- Orphan user (no tenant) — allow auth to succeed; profile must be assigned later
    RAISE WARNING 'handle_new_user: user % created without tenant_id', NEW.id;
    RETURN NEW;
  END IF;

  -- Username: from metadata, fallback to email, fallback to UUID-derived
  _username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(NEW.email), ''),
    'user_' || REPLACE(NEW.id::TEXT, '-', '')
  );

  IF EXISTS (SELECT 1 FROM public.profiles
             WHERE tenant_id = _tenant_id AND username = _username) THEN
    _username := _username || '_' || SUBSTR(REPLACE(NEW.id::TEXT, '-', ''), 1, 6);
  END IF;

  -- Role: from invitation > metadata > default 'staff'
  IF _role IS NULL THEN
    BEGIN
      _role := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '')::user_role,
        'staff'
      );
    EXCEPTION WHEN others THEN _role := 'staff';
    END;
  END IF;

  INSERT INTO public.profiles (id, tenant_id, username, role)
  VALUES (NEW.id, _tenant_id, _username, _role);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user: failed for user % — %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Auto-create chat room when store is created ───
CREATE OR REPLACE FUNCTION create_store_chat_room()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chat_rooms (tenant_id, store_id, name, type)
  VALUES (NEW.tenant_id, NEW.id, NEW.store_name || ' — แชท', 'store');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_store_create_chat_room
  AFTER INSERT ON stores
  FOR EACH ROW EXECUTE FUNCTION create_store_chat_room();

-- ─── Add user to store chat room when assigned ───
CREATE OR REPLACE FUNCTION add_user_to_store_chat()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chat_members (room_id, user_id, role)
  SELECT cr.id, NEW.user_id, 'member'
  FROM public.chat_rooms cr
  WHERE cr.store_id = NEW.store_id
    AND cr.type = 'store'
    AND cr.is_active = true
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_user_store_add_chat
  AFTER INSERT ON user_stores
  FOR EACH ROW EXECUTE FUNCTION add_user_to_store_chat();

CREATE OR REPLACE FUNCTION remove_user_from_store_chat()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.chat_members
  WHERE user_id = OLD.user_id
    AND room_id IN (
      SELECT cr.id FROM public.chat_rooms cr
      WHERE cr.store_id = OLD.store_id AND cr.type = 'store'
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_user_store_remove_chat
  AFTER DELETE ON user_stores
  FOR EACH ROW EXECUTE FUNCTION remove_user_from_store_chat();

-- ─── system_settings: auto-update updated_at ───
CREATE OR REPLACE FUNCTION system_settings_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION system_settings_touch_updated_at();

-- ==========================================
-- ROW LEVEL SECURITY — enable on every table
-- ==========================================

ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_audit_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_features       ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_counts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparisons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_deposits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrows              ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties            ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_queue          ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_server_status  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ae_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_pinned_messages ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
--
-- Policy pattern (ALL tenant tables):
--   Layer 1: tenant_id = get_user_tenant_id()      ← mandatory isolation
--   Layer 2: store_id IN (get_user_store_ids())   ← scope (if applicable)
--   Layer 3: is_tenant_admin() bypass             ← admin within tenant
--
-- Platform admins get explicit SELECT-only policies.
-- ==========================================

-- ========== tenants ==========
CREATE POLICY "Tenant members see own tenant" ON tenants
  FOR SELECT USING (id = get_user_tenant_id());
CREATE POLICY "Platform admin sees all tenants" ON tenants
  FOR SELECT USING (is_platform_admin());
CREATE POLICY "Platform admin manages tenants" ON tenants
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());
CREATE POLICY "Tenant owner updates own tenant" ON tenants
  FOR UPDATE USING (id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (id = get_user_tenant_id());

-- ========== platform_admins ==========
CREATE POLICY "Platform admins see each other" ON platform_admins
  FOR SELECT USING (is_platform_admin());
CREATE POLICY "Super admin manages platform admins" ON platform_admins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.platform_admins
            WHERE id = (SELECT auth.uid()) AND role = 'super_admin' AND active = true)
  );

-- ========== profiles ==========
CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT USING (id = (SELECT auth.uid()));
CREATE POLICY "Tenant members view tenant profiles" ON profiles
  FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Platform admin views all profiles" ON profiles
  FOR SELECT USING (is_platform_admin());
CREATE POLICY "Owner manages tenant profiles" ON profiles
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== user_permissions ==========
CREATE POLICY "Users see own permissions" ON user_permissions
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (user_id = (SELECT auth.uid()) OR is_tenant_admin())
  );
CREATE POLICY "Owner manages permissions" ON user_permissions
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== stores ==========
CREATE POLICY "Tenant members see tenant stores" ON stores
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Platform admin sees all stores" ON stores
  FOR SELECT USING (is_platform_admin());
CREATE POLICY "Tenant owner manages stores" ON stores
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== user_stores ==========
CREATE POLICY "Users see own store assignments" ON user_stores
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR (store_id IN (SELECT id FROM public.stores WHERE tenant_id = get_user_tenant_id()) AND is_tenant_admin())
  );
CREATE POLICY "Owner manages store assignments" ON user_stores
  FOR ALL USING (
    get_user_role() = 'owner'
    AND store_id IN (SELECT id FROM public.stores WHERE tenant_id = get_user_tenant_id())
  );

-- ========== tenant_invitations ==========
CREATE POLICY "Tenant admins see invitations" ON tenant_invitations
  FOR SELECT USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());
CREATE POLICY "Tenant owner manages invitations" ON tenant_invitations
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== tenant_audit_logs ==========
CREATE POLICY "Platform admin sees tenant audit logs" ON tenant_audit_logs
  FOR SELECT USING (is_platform_admin());
CREATE POLICY "Platform admin writes tenant audit logs" ON tenant_audit_logs
  FOR INSERT WITH CHECK (is_platform_admin());

-- ========== store_features ==========
CREATE POLICY "Tenant members see store features" ON store_features
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE tenant_id = get_user_tenant_id())
  );
CREATE POLICY "Tenant owner manages store features" ON store_features
  FOR ALL USING (
    get_user_role() = 'owner'
    AND store_id IN (SELECT id FROM public.stores WHERE tenant_id = get_user_tenant_id())
  );

-- ========== role_permissions ==========
CREATE POLICY "Tenant members see role permissions" ON role_permissions
  FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant owner manages role permissions" ON role_permissions
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== products ==========
CREATE POLICY "Tenant staff see products" ON products
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant staff manage products" ON products
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== manual_counts ==========
CREATE POLICY "Tenant staff see counts" ON manual_counts
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant staff manage counts" ON manual_counts
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== comparisons ==========
CREATE POLICY "Tenant staff see comparisons" ON comparisons
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant staff manage comparisons" ON comparisons
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== ocr ==========
CREATE POLICY "Tenant staff see ocr_logs" ON ocr_logs
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant staff manage ocr_logs" ON ocr_logs
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant staff see ocr_items" ON ocr_items
  FOR SELECT USING (
    ocr_log_id IN (
      SELECT id FROM public.ocr_logs
      WHERE tenant_id = get_user_tenant_id()
        AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
    )
  );
CREATE POLICY "Tenant staff manage ocr_items" ON ocr_items
  FOR ALL USING (
    ocr_log_id IN (
      SELECT id FROM public.ocr_logs
      WHERE tenant_id = get_user_tenant_id()
        AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
    )
  );

-- ========== deposits ==========
CREATE POLICY "Tenant staff see deposits" ON deposits
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant customer sees own deposits" ON deposits
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (
      customer_id = (SELECT auth.uid())
      OR line_user_id = (SELECT p.line_user_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
    )
  );
CREATE POLICY "Tenant staff manage deposits" ON deposits
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== withdrawals ==========
CREATE POLICY "Tenant staff see withdrawals" ON withdrawals
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant customer sees own withdrawals" ON withdrawals
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND line_user_id = (SELECT p.line_user_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
  );
CREATE POLICY "Tenant staff manage withdrawals" ON withdrawals
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== deposit_requests ==========
CREATE POLICY "Tenant staff see deposit_requests" ON deposit_requests
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Authenticated insert deposit_requests" ON deposit_requests
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND tenant_id = get_user_tenant_id()
  );
CREATE POLICY "Tenant staff update deposit_requests" ON deposit_requests
  FOR UPDATE USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );

-- ========== transfers ==========
CREATE POLICY "Tenant staff see transfers" ON transfers
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (
      from_store_id IN (SELECT get_user_store_ids())
      OR to_store_id IN (SELECT get_user_store_ids())
      OR is_tenant_admin()
    )
  );
CREATE POLICY "Tenant staff manage transfers" ON transfers
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (
      from_store_id IN (SELECT get_user_store_ids())
      OR to_store_id IN (SELECT get_user_store_ids())
      OR is_tenant_admin()
    )
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== hq_deposits ==========
CREATE POLICY "Tenant admin sees hq_deposits" ON hq_deposits
  FOR SELECT USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());
CREATE POLICY "Tenant admin manages hq_deposits" ON hq_deposits
  FOR ALL USING (tenant_id = get_user_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== borrows ==========
CREATE POLICY "Tenant staff see borrows" ON borrows
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (
      from_store_id IN (SELECT get_user_store_ids())
      OR to_store_id IN (SELECT get_user_store_ids())
      OR is_tenant_admin()
    )
  );
CREATE POLICY "Tenant staff manage borrows" ON borrows
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (
      from_store_id IN (SELECT get_user_store_ids())
      OR to_store_id IN (SELECT get_user_store_ids())
      OR is_tenant_admin()
    )
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== borrow_items ==========
CREATE POLICY "Tenant staff see borrow_items" ON borrow_items
  FOR SELECT USING (
    borrow_id IN (
      SELECT id FROM public.borrows
      WHERE tenant_id = get_user_tenant_id()
        AND (
          from_store_id IN (SELECT get_user_store_ids())
          OR to_store_id IN (SELECT get_user_store_ids())
          OR is_tenant_admin()
        )
    )
  );
CREATE POLICY "Tenant staff manage borrow_items" ON borrow_items
  FOR ALL USING (
    borrow_id IN (
      SELECT id FROM public.borrows
      WHERE tenant_id = get_user_tenant_id()
        AND (
          from_store_id IN (SELECT get_user_store_ids())
          OR to_store_id IN (SELECT get_user_store_ids())
          OR is_tenant_admin()
        )
    )
  );

-- ========== store_settings ==========
CREATE POLICY "Tenant staff see store_settings" ON store_settings
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM public.stores
      WHERE tenant_id = get_user_tenant_id()
        AND (id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
    )
  );
CREATE POLICY "Tenant owner/manager manages store_settings" ON store_settings
  FOR ALL USING (
    get_user_role() IN ('owner', 'manager')
    AND store_id IN (SELECT id FROM public.stores WHERE tenant_id = get_user_tenant_id())
  );

-- ========== app_settings (platform admin only) ==========
CREATE POLICY "Platform admin reads app_settings" ON app_settings
  FOR SELECT USING (is_platform_admin());
CREATE POLICY "Platform admin writes app_settings" ON app_settings
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- ========== system_settings (per tenant) ==========
CREATE POLICY "Tenant members read system_settings" ON system_settings
  FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant owner writes system_settings" ON system_settings
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== audit_logs ==========
CREATE POLICY "Tenant admin sees audit_logs" ON audit_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- ========== notifications ==========
CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT USING (
    tenant_id = get_user_tenant_id() AND user_id = (SELECT auth.uid())
  );
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (
    tenant_id = get_user_tenant_id() AND user_id = (SELECT auth.uid())
  );

-- ========== penalties ==========
CREATE POLICY "Tenant staff see penalties" ON penalties
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant admin manages penalties" ON penalties
  FOR ALL USING (tenant_id = get_user_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== push_subscriptions ==========
CREATE POLICY "Users manage own subscriptions" ON push_subscriptions
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- ========== notification_preferences ==========
CREATE POLICY "Users manage own preferences" ON notification_preferences
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- ========== announcements ==========
CREATE POLICY "Tenant members see active announcements" ON announcements
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND active = true
    AND start_date <= now()
    AND (end_date IS NULL OR end_date >= now())
  );
CREATE POLICY "Tenant owner manages announcements" ON announcements
  FOR ALL USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== print_queue ==========
CREATE POLICY "Tenant staff see print jobs" ON print_queue
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant staff manage print jobs" ON print_queue
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== print_server_status ==========
CREATE POLICY "Tenant staff see print server status" ON print_server_status
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM public.stores
      WHERE tenant_id = get_user_tenant_id()
        AND (id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
    )
  );
CREATE POLICY "Tenant staff manage print server status" ON print_server_status
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores
      WHERE tenant_id = get_user_tenant_id()
        AND (id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
    )
  );

-- ========== ae_profiles ==========
CREATE POLICY "Tenant members see ae_profiles" ON ae_profiles
  FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant admin manages ae_profiles" ON ae_profiles
  FOR ALL USING (tenant_id = get_user_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== commission_entries ==========
CREATE POLICY "Tenant staff see commission_entries" ON commission_entries
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant staff manage commission_entries" ON commission_entries
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== commission_payments ==========
CREATE POLICY "Tenant staff see commission_payments" ON commission_payments
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant admin manages commission_payments" ON commission_payments
  FOR ALL USING (tenant_id = get_user_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== chat_rooms ==========
CREATE POLICY "Tenant members see chat rooms" ON chat_rooms
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (is_chat_member(id) OR is_tenant_admin())
  );
CREATE POLICY "Tenant users create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant_id() AND (SELECT auth.uid()) IS NOT NULL
  );
CREATE POLICY "Chat admins update rooms" ON chat_rooms
  FOR UPDATE USING (
    tenant_id = get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.room_id = chat_rooms.id
        AND chat_members.user_id = (SELECT auth.uid())
        AND chat_members.role = 'admin'
    )
  ) WITH CHECK (tenant_id = get_user_tenant_id());

-- ========== chat_messages ==========
CREATE POLICY "Members see chat messages" ON chat_messages
  FOR SELECT USING (
    room_id IN (SELECT id FROM public.chat_rooms WHERE tenant_id = get_user_tenant_id())
    AND (is_chat_member(room_id) OR is_tenant_admin())
  );
CREATE POLICY "Members send chat messages" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND is_chat_member(room_id)
    AND room_id IN (SELECT id FROM public.chat_rooms WHERE tenant_id = get_user_tenant_id())
  );
CREATE POLICY "Members update action cards" ON chat_messages
  FOR UPDATE USING (type = 'action_card' AND is_chat_member(room_id));

-- ========== chat_members ==========
CREATE POLICY "Members see co-members" ON chat_members
  FOR SELECT USING (
    room_id IN (SELECT id FROM public.chat_rooms WHERE tenant_id = get_user_tenant_id())
    AND (is_chat_member(room_id) OR is_tenant_admin())
  );
CREATE POLICY "Members update own membership" ON chat_members
  FOR UPDATE USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Owner/manager manages chat members" ON chat_members
  FOR ALL USING (
    get_user_role() IN ('owner', 'manager')
    AND room_id IN (SELECT id FROM public.chat_rooms WHERE tenant_id = get_user_tenant_id())
  );
CREATE POLICY "Chat admins add members" ON chat_members
  FOR INSERT WITH CHECK (
    room_id IN (SELECT id FROM public.chat_rooms WHERE tenant_id = get_user_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.chat_members cm
        WHERE cm.room_id = chat_members.room_id
          AND cm.user_id = (SELECT auth.uid())
          AND cm.role = 'admin'
      )
      OR user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Chat admins remove members" ON chat_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.room_id = chat_members.room_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.role = 'admin'
    )
  );

-- ========== chat_pinned_messages ==========
CREATE POLICY "Members view pinned messages" ON chat_pinned_messages
  FOR SELECT USING (
    room_id IN (SELECT id FROM public.chat_rooms WHERE tenant_id = get_user_tenant_id())
    AND is_chat_member(room_id)
  );
CREATE POLICY "Chat admins pin messages" ON chat_pinned_messages
  FOR INSERT WITH CHECK (
    room_id IN (SELECT id FROM public.chat_rooms WHERE tenant_id = get_user_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.room_id = chat_pinned_messages.room_id
        AND chat_members.user_id = (SELECT auth.uid())
        AND (chat_members.role = 'admin' OR get_user_role() IN ('owner', 'manager'))
    )
  );
CREATE POLICY "Chat admins unpin messages" ON chat_pinned_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_members.room_id = chat_pinned_messages.room_id
        AND chat_members.user_id = (SELECT auth.uid())
        AND (chat_members.role = 'admin' OR get_user_role() IN ('owner', 'manager'))
    )
  );

-- ==========================================
-- END OF PHASE F
-- ==========================================

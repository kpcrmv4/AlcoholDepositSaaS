-- ============================================================================
-- 00001 — Tenant module allowlist (platform-controlled)
-- ============================================================================
-- Adds `tenant_modules` so the super admin can decide which product modules
-- each tenant is permitted to use. Tenant owner-side per-store toggles
-- (store_features) are no longer wired into the UI; the sidebar / bottom-nav
-- now read this allowlist instead.
--
-- Safe to re-run: every CREATE uses IF NOT EXISTS / OR REPLACE, and the seed
-- inserts use ON CONFLICT DO NOTHING.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Table + index
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_modules (
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key  TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID REFERENCES platform_admins(id),
  PRIMARY KEY (tenant_id, module_key)
);

COMMENT ON TABLE tenant_modules IS
  'Platform-controlled module allowlist per tenant. Managed by super admin only.';

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant ON tenant_modules(tenant_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. RLS — read by tenant members + platform admin; write by platform admin
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members see tenant modules" ON tenant_modules;
CREATE POLICY "Tenant members see tenant modules" ON tenant_modules
  FOR SELECT USING (tenant_id = get_user_tenant_id() OR is_platform_admin());

DROP POLICY IF EXISTS "Platform admin manages tenant modules" ON tenant_modules;
CREATE POLICY "Platform admin manages tenant modules" ON tenant_modules
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Seed function — enables every module by default
--    Module keys mirror src/lib/modules/registry.ts
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION seed_tenant_modules_for_tenant(p_tenant_id UUID)
RETURNS void AS $$
DECLARE
  v_keys TEXT[] := ARRAY[
    'overview', 'chat',
    'stock', 'deposit', 'transfer', 'borrow', 'hq-warehouse', 'commission',
    'reports', 'activity',
    'performance-staff', 'performance-stores', 'performance-operations', 'performance-customers',
    'guide',
    'announcements', 'users', 'settings'
  ];
  v_key TEXT;
BEGIN
  FOREACH v_key IN ARRAY v_keys LOOP
    INSERT INTO public.tenant_modules (tenant_id, module_key, enabled)
    VALUES (p_tenant_id, v_key, true)
    ON CONFLICT (tenant_id, module_key) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Wire seed into the existing tenant-creation trigger
--    (the original trigger only seeded role_permissions)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_seed_role_permissions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.seed_role_permissions_for_tenant(NEW.id);
  PERFORM public.seed_tenant_modules_for_tenant(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- The trigger itself (trg_tenants_seed_permissions) already exists; the
-- function body change above is enough.

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Backfill — every existing tenant gets all modules enabled by default
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_tenant_modules_for_tenant(t.id);
  END LOOP;
END $$;

COMMIT;

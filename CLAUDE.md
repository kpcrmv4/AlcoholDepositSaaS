# AlcoholDepositSaaS — SaaS Multi-Tenant Upgrade Plan

> เอกสารนี้เป็น **planning document** สำหรับการยกระดับระบบ StockManager
> (single-tenant) ให้กลายเป็น **SaaS Multi-Tenant** เต็มรูปแบบ
> โดยอ้างอิงและแก้ไข `supabase/migrations/00000_full_schema_consolidated.sql`
> เป็น source of truth ของ schema ใหม่
>
> สถานะ: 🟡 **Planning / Design** — ยังไม่เริ่ม implement

---

## 1. ภาพรวม (Overview)

### 1.1 เป้าหมายทางธุรกิจ

ปัจจุบัน StockManager เป็นระบบ **single-tenant** — หนึ่ง database หนึ่งโดเมน
ใช้โดยบริษัทเดียว แต่ละ "store" คือสาขาของบริษัทนั้น

เป้าหมายใหม่คือเปลี่ยนเป็น **Multi-Tenant SaaS** ที่:

1. **1 Database → หลายบริษัท (Tenant)** ใช้ร่วมกันได้อย่างแยกข้อมูลเด็ดขาด
2. **Super Admin (Platform Admin)** — ผู้ดูแลระบบกลาง สร้าง/ระงับ/ดู usage
   ของทุกบริษัทได้ แต่ **ไม่ควร** มองเห็นข้อมูล operational ของบริษัท
3. **Tenant Owner** — เจ้าของบริษัท (1 คน/บริษัท) ดูแลภายในบริษัทตัวเอง:
   สร้างสาขา, เพิ่มพนักงาน, ตั้งค่า LINE OA ของบริษัท ฯลฯ
4. **Branch Limit** — Super Admin กำหนดได้ว่าบริษัทแต่ละราย
   สร้างสาขา (stores) ได้กี่สาขา (`tenants.max_branches`)
5. **LINE OA แยกต่อบริษัท** — แต่ละบริษัทผูก LINE Channel
   (token + secret + webhook) ของตัวเอง
   — บริษัท A ใช้ bot `@companyA`, บริษัท B ใช้ bot `@companyB`
   webhook เดียวกัน (`/api/line/webhook`) แต่ route ไปตาม `destination`
   (channel_id) → tenant_id → store_id

### 1.2 หลักการสำคัญ

| หลักการ | รายละเอียด |
|---------|------------|
| **Shared DB, Shared Schema** | ทุก tenant อยู่ใน schema `public` เดียวกัน แยกโดย `tenant_id` + RLS |
| **Tenant as root** | `tenants` เป็น root entity — `stores.tenant_id` FK → `tenants.id` |
| **RLS เป็นด่านสุดท้าย** | ทุก policy ต้องกรอง `tenant_id` ก่อนเสมอ (defense in depth) |
| **Platform Admin แยกจาก Tenant Owner** | ตาราง `platform_admins` แยก, ไม่ใช้ `user_role` enum เดิม |
| **LIFF/LINE ต่อ tenant** | ย้าย config จาก `system_settings` (global) → `tenants` (per-tenant) |
| **Storage path prefixing** | `deposit-photos/{tenant_id}/{store_id}/...` + RLS |
| **Migration-safe** | 00000 เป็น fresh install; migration 00023+ สำหรับอัพเกรด DB เดิม |

### 1.3 Tenant Identity Resolution

App จะต้องรู้ว่า request นี้มาจาก tenant ไหน — 3 ช่องทาง:

1. **ผ่าน JWT / session** — ตอน login, ดึง `tenant_id` จาก `profiles`
2. **ผ่าน subdomain / path** — `companyA.app.com` หรือ `app.com/t/{slug}/...`
   (เฟส 2 — เริ่มด้วย path-based ก่อน)
3. **ผ่าน LINE webhook** — resolve จาก `destination` (channel_id) →
   `tenants.line_channel_id` → `tenant_id`

---

## 2. สถาปัตยกรรมใหม่ (High-Level Architecture)

```
┌──────────────────────────────────────────────────────────────────┐
│                         PLATFORM LAYER                             │
│  ┌────────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │ Platform Admin │   │ Tenant Provision │   │ Usage / Billing│  │
│  │  Dashboard     │──▶│  (create tenant) │──▶│  (future)      │  │
│  └────────────────┘   └──────────────────┘   └────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼──────────────────────┐
         ▼                       ▼                      ▼
┌────────────────┐      ┌────────────────┐     ┌────────────────┐
│   TENANT A     │      │   TENANT B     │     │   TENANT C     │
│ (Company A)    │      │ (Company B)    │     │ (Company C)    │
│                │      │                │     │                │
│ owner ─┐       │      │ owner ─┐       │     │ owner ─┐       │
│        ▼       │      │        ▼       │     │        ▼       │
│  ┌──────────┐  │      │  ┌──────────┐  │     │  ┌──────────┐  │
│  │ stores[] │  │      │  │ stores[] │  │     │  │ stores[] │  │
│  │  ≤ max   │  │      │  │  ≤ max   │  │     │  │  ≤ max   │  │
│  │ branches │  │      │  │ branches │  │     │  │ branches │  │
│  └──────────┘  │      │  └──────────┘  │     │  └──────────┘  │
│                │      │                │     │                │
│  LINE OA:      │      │  LINE OA:      │     │  LINE OA:      │
│  @companyA     │      │  @companyB     │     │  @companyC     │
│  Channel #1    │      │  Channel #2    │     │  Channel #3    │
│  LIFF #1       │      │  LIFF #2       │     │  LIFF #3       │
└────────────────┘      └────────────────┘     └────────────────┘
         │                       │                      │
         └───────────────────────┴──────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │  /api/line/webhook          │
                    │  resolve by destination     │
                    │  → tenants → stores         │
                    └────────────────────────────┘
```

### 2.1 Role Hierarchy ใหม่

```
platform_admin     (cross-tenant — manage platform)
    │
    ├─ tenant: Company A
    │     │
    │     ├─ owner (1 คน)          ← manages tenant
    │     ├─ accountant
    │     ├─ manager (ต่อสาขา)
    │     ├─ bar / staff            ← scoped to assigned stores
    │     ├─ hq                     ← central warehouse of tenant
    │     └─ customer               ← LINE users of tenant
    │
    ├─ tenant: Company B
    │     └─ ...
    │
    └─ tenant: Company C
          └─ ...
```

- `platform_admin` เก็บใน **ตาราง `platform_admins` แยก** (ไม่ใช้ `user_role` enum)
  เพื่อให้ RLS policy ของ tenant data ไม่มีทาง "หลุด" ให้ platform admin เห็น
  ข้อมูล operational ของ tenant (principle of least privilege)
- Platform admin อยากดูข้อมูล tenant → ต้อง "impersonate" ผ่าน
  service-role endpoint ที่ log audit trail

---

## 3. Tenant Data Model (แก้ไขใน `00000_full_schema_consolidated.sql`)

### 3.1 ENUMs ใหม่

เพิ่มต่อจากบรรทัด 19-30 ของ 00000:

```sql
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
CREATE TYPE tenant_plan   AS ENUM ('trial', 'starter', 'growth', 'enterprise', 'custom');
CREATE TYPE line_mode     AS ENUM ('tenant', 'per_store'); -- per-tenant OA or per-store OA
```

> หมายเหตุ: `user_role` เดิมยังคงเดิม (`owner` = tenant owner, ไม่ใช่ platform)

### 3.2 ตาราง `tenants` (ใหม่ — root entity)

วางไว้ **ก่อน** ตาราง `profiles` ใน 00000 (บรรทัด ~35) เพื่อให้ FK resolve ได้:

```sql
CREATE TABLE tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT UNIQUE NOT NULL,           -- ใช้ใน URL: /t/{slug}
  company_name     TEXT NOT NULL,
  legal_name       TEXT,                           -- ชื่อนิติบุคคล (optional)
  tax_id           TEXT,                           -- เลขผู้เสียภาษี
  contact_email    TEXT NOT NULL,
  contact_phone    TEXT,
  country          TEXT DEFAULT 'TH',
  timezone         TEXT DEFAULT 'Asia/Bangkok',

  -- Subscription / limits
  status           tenant_status NOT NULL DEFAULT 'trial',
  plan             tenant_plan   NOT NULL DEFAULT 'trial',
  max_branches     INTEGER NOT NULL DEFAULT 1
                   CHECK (max_branches >= 1 AND max_branches <= 1000),
  max_users        INTEGER NOT NULL DEFAULT 10,
  trial_ends_at    TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,

  -- LINE (per-tenant defaults — stores อาจ override)
  line_mode            line_mode NOT NULL DEFAULT 'tenant',
  line_channel_id      TEXT UNIQUE,                -- LINE Channel ID ของ OA บริษัท
  line_channel_secret  TEXT,                       -- ใช้ verify webhook signature
  line_channel_token   TEXT,                       -- Channel Access Token
  line_basic_id        TEXT,                       -- เช่น @companyA
  liff_id              TEXT,                       -- LIFF ID ของบริษัท

  -- Branding (ใช้ใน UI + LIFF)
  logo_url         TEXT,
  brand_color      TEXT DEFAULT '#0ea5e9',

  -- Ownership
  owner_user_id    UUID,   -- FK → profiles.id (set หลัง profiles สร้าง)

  -- Audit
  created_by       UUID,   -- FK → platform_admins.id
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  suspended_at     TIMESTAMPTZ,
  suspension_reason TEXT
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE UNIQUE INDEX idx_tenants_line_channel
  ON tenants(line_channel_id) WHERE line_channel_id IS NOT NULL;
```

**เหตุผลของแต่ละคอลัมน์สำคัญ**
- `slug` — ใช้ใน URL path (`/t/bar-somchai/...`) และเป็นตัวระบุให้มนุษย์เรียก
- `line_mode` — เผื่ออนาคตบริษัทใหญ่จะมี LINE OA แยกต่อสาขา; default `tenant`
- `max_branches` — **Super admin ตั้งค่าได้** ตามแพ็กเกจที่ซื้อ;
  trigger บน `stores` จะบังคับ (ดูส่วน 3.6)
- `owner_user_id` — ลิงก์สองทางให้ rollback/grant access ได้ง่าย

### 3.3 ตาราง `platform_admins` (ใหม่ — super admin)

```sql
CREATE TABLE platform_admins (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role         TEXT NOT NULL DEFAULT 'admin'
               CHECK (role IN ('super_admin', 'admin', 'support', 'readonly')),
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  created_by   UUID REFERENCES platform_admins(id)
);

CREATE INDEX idx_platform_admins_active ON platform_admins(active) WHERE active = true;
```

> **สำคัญ:** platform admin ไม่มี record ใน `profiles` — เป็น identity
> แยกต่างหาก ทำให้ RLS policy ของ tenant data ไม่มีทางตรวจเจอว่าเป็น "is_admin"
> ของ tenant เด็ดขาด (ถือ principle: **zero implicit access to tenant data**)

### 3.4 ตาราง `tenant_invitations` (ใหม่)

สำหรับ owner เชิญพนักงานเข้า tenant:

```sql
CREATE TABLE tenant_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         user_role NOT NULL DEFAULT 'staff',
  store_ids    UUID[] DEFAULT '{}',
  token        TEXT UNIQUE NOT NULL,     -- random, ใช้ใน invite link
  invited_by   UUID REFERENCES profiles(id),
  accepted_at  TIMESTAMPTZ,
  accepted_by  UUID REFERENCES profiles(id),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, email)
);
```

### 3.5 ตาราง `tenant_audit_logs` (ใหม่ — แยกจาก `audit_logs` เดิม)

log การกระทำของ platform admin (impersonate, suspend, เปลี่ยน plan ฯลฯ):

```sql
CREATE TABLE tenant_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  platform_admin_id UUID REFERENCES platform_admins(id),
  action        TEXT NOT NULL,   -- 'create', 'suspend', 'resume', 'change_plan', 'impersonate', ...
  payload       JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tenant_audit_logs_tenant ON tenant_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_tenant_audit_logs_admin ON tenant_audit_logs(platform_admin_id);
```

### 3.6 Trigger: บังคับ `max_branches`

```sql
CREATE OR REPLACE FUNCTION enforce_tenant_branch_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max   INTEGER;
  v_count INTEGER;
BEGIN
  SELECT max_branches INTO v_max FROM public.tenants WHERE id = NEW.tenant_id;
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'Store must belong to a tenant (tenant_id is NULL or invalid)';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.stores WHERE tenant_id = NEW.tenant_id AND active = true;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Branch limit reached for tenant % (max=%). Upgrade plan to add more.',
      NEW.tenant_id, v_max USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_enforce_branch_limit
  BEFORE INSERT ON stores
  FOR EACH ROW WHEN (NEW.active = true)
  EXECUTE FUNCTION enforce_tenant_branch_limit();
```

> หมายเหตุ: UPDATE จาก `active=false` → `active=true` ก็ควรเช็คเช่นกัน
> (เพิ่มเป็น `BEFORE UPDATE WHEN (OLD.active = false AND NEW.active = true)`)

### 3.7 แก้ไขตาราง `profiles` (บรรทัด 35-45 เดิม)

**เพิ่ม**:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- ← ใหม่
  username TEXT NOT NULL,                                   -- ไม่ UNIQUE แล้ว
  role user_role NOT NULL DEFAULT 'staff',
  line_user_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE (tenant_id, username),                             -- ← ย้าย UNIQUE มา scope ภายใน tenant
  UNIQUE (tenant_id, line_user_id)                          -- ← customer แต่ละคนต่อ tenant
);
```

**เหตุผล**: `username` เดิม UNIQUE ทั้ง DB — เป็นไปไม่ได้ใน multi-tenant
(ลูกค้าชื่อ "somchai" อาจซ้ำข้าม tenant) ต้องทำให้ unique **ภายใน tenant เท่านั้น**

### 3.8 แก้ไขตาราง `stores` (บรรทัด 56-74 เดิม)

**เพิ่ม** `tenant_id`, **ลบ/ย้าย** LINE fields ที่ซ้ำซ้อน:

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,  -- ← ใหม่
  store_code TEXT NOT NULL,                                          -- ไม่ UNIQUE แล้ว
  store_name TEXT NOT NULL,

  -- LINE (override — ใช้เมื่อ tenants.line_mode = 'per_store')
  line_token TEXT,
  line_channel_id TEXT,
  line_channel_secret TEXT,

  -- Group IDs ยังคงเดิม (กลุ่ม LINE ต่อสาขายังแยกได้)
  stock_notify_group_id TEXT,
  deposit_notify_group_id TEXT,
  bar_notify_group_id TEXT,

  borrow_notification_roles TEXT[] DEFAULT ARRAY['owner', 'manager']::text[],
  manager_id UUID REFERENCES profiles(id),
  is_central BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (tenant_id, store_code)   -- ← store_code ซ้ำข้าม tenant ได้
);
```

### 3.9 ตารางอื่นๆ ที่ต้องเพิ่ม `tenant_id`

ตามหลัก **defense in depth** เราจะเพิ่ม `tenant_id` ทุกตารางหลัก
(ซ้ำซ้อนกับ `store_id` แต่ช่วย query และ RLS เร็วขึ้น + ป้องกัน misconfiguration):

| ตาราง | วิธีหา tenant_id | หมายเหตุ |
|-------|-----------------|----------|
| `user_permissions` | join profiles | เพิ่ม FK `tenant_id` |
| `user_stores` | join stores | มี store_id แล้ว — ไม่ต้องเพิ่ม |
| `products` | join stores | เพิ่ม FK `tenant_id` (denormalized) |
| `manual_counts` | join stores | เพิ่ม FK `tenant_id` |
| `ocr_logs` / `ocr_items` | join stores | เพิ่ม `tenant_id` |
| `comparisons` | join stores | เพิ่ม `tenant_id` |
| `deposits` | join stores | เพิ่ม `tenant_id` ← **สำคัญมาก** (volume สูง) |
| `withdrawals` | join stores | เพิ่ม `tenant_id` |
| `deposit_requests` | join stores | เพิ่ม `tenant_id` |
| `transfers` | join stores | เพิ่ม `tenant_id` (cross-store **ภายใน tenant** เท่านั้น) |
| `hq_deposits` | join stores | เพิ่ม `tenant_id` |
| `borrows` / `borrow_items` | join stores | เพิ่ม `tenant_id` (ห้ามยืมข้าม tenant) |
| `store_settings` | join stores | ไม่จำเป็นเพิ่ม (1:1 กับ store) |
| `audit_logs` | join stores | เพิ่ม `tenant_id` |
| `notifications` | join user/store | เพิ่ม `tenant_id` |
| `penalties` | join stores | เพิ่ม `tenant_id` |
| `push_subscriptions` | join profiles | เพิ่ม `tenant_id` |
| `notification_preferences` | join profiles | เพิ่ม `tenant_id` |
| `announcements` | join stores | เพิ่ม `tenant_id` |
| `print_queue` | join stores | เพิ่ม `tenant_id` |
| `print_server_status` | join stores | ไม่จำเป็นเพิ่ม |
| `chat_rooms` | join stores | เพิ่ม `tenant_id` + block cross-tenant rooms |
| `chat_messages` | join room | ไม่จำเป็นเพิ่ม (แต่จะเพิ่มก็ได้เพื่อ partition pruning) |
| `chat_members` | join room+user | ตรวจ tenant ตอน insert |
| `chat_pinned_messages` | join room | ไม่เพิ่ม |

**Enum scope**: `cross_store` ใน `chat_room_type` ต้องเปลี่ยนความหมายเป็น
"cross-store **within tenant**" — ห้ามข้าม tenant เด็ดขาด

### 3.10 `system_settings` — เปลี่ยนจาก global → per-tenant

ปัจจุบัน `system_settings` เก็บ `davis_ai.bot_name`, `davis_ai.liff_id` แบบ global
ต้อง **เปลี่ยน schema** เป็น:

```sql
CREATE TABLE system_settings (
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID REFERENCES profiles(id),
  PRIMARY KEY (tenant_id, key)
);
```

### 3.11 `app_settings` — global บาง key, per-tenant บาง key

- `LINE_CENTRAL_*` เดิม — **ลบทิ้ง** (ย้ายไป `tenants.line_channel_*`)
- `OWNER_GROUP_LINE_ID` — ย้ายเป็น `tenants.line_owner_group_id` (เพิ่ม column)
- `app_settings` เหลือไว้สำหรับ platform-level (feature flags, maintenance mode)
  และต้องจำกัดให้ **platform_admin เท่านั้น** เห็น

---

## 4. LINE Messaging API — Per-Tenant Routing

### 4.1 โมเดลปัจจุบัน vs ใหม่

**ปัจจุบัน (single-tenant)**:
- `stores.line_token` / `line_channel_id` / `line_channel_secret` — **per-store**
- 1 LIFF ID global ใน `system_settings['davis_ai.liff_id']`
- `/api/line/webhook` → resolve store จาก `destination` (channel_id)

**ใหม่ (multi-tenant)**:
- Default: **1 LINE Channel ต่อ 1 tenant** เก็บใน `tenants.line_channel_*`
  (`line_mode = 'tenant'`)
- Optional: Enterprise plan — override ต่อสาขาได้ (`line_mode = 'per_store'`)
  ใช้ field ใน `stores` เป็น override
- **1 LIFF ต่อ 1 tenant** (`tenants.liff_id`)
- Webhook ตัวเดียว `/api/line/webhook` → resolve **tenant ก่อน** → store

### 4.2 Webhook Resolution Flow (ใหม่)

```
POST /api/line/webhook
  ├─ body.destination = channel_id
  ├─ header X-Line-Signature = HMAC(body, channel_secret)
  │
  ├─ Step 1: หา tenant จาก destination
  │    SELECT * FROM tenants WHERE line_channel_id = :destination
  │      → ไม่เจอ → 404 (หรือลอง per_store fallback)
  │
  ├─ Step 2: verify signature ด้วย tenants.line_channel_secret
  │    → fail → 401
  │
  ├─ Step 3: ต่อสำหรับแต่ละ event →
  │    ├─ source.groupId → หาสาขาใน tenant นี้ที่มี group_id ตรง
  │    ├─ source.userId  → หาลูกค้า (profiles.line_user_id) ใน tenant นี้
  │    │                    → หา deposit ล่าสุด → store_id
  │    └─ postback data → parse tenant+store จาก data
  │
  └─ Step 4: reply ด้วย tenants.line_channel_token (หรือ store override)
```

### 4.3 ใช้ `tenants.line_mode` ตัดสิน

```ts
// src/lib/line/messaging.ts (pseudo)
async function resolveLineConfig(tenantId: string, storeId?: string) {
  const tenant = await getTenant(tenantId);

  if (tenant.line_mode === 'per_store' && storeId) {
    const store = await getStore(storeId);
    if (store.line_token) return {
      token: store.line_token,
      secret: store.line_channel_secret,
      channelId: store.line_channel_id,
    };
  }
  // default: tenant-level
  return {
    token: tenant.line_channel_token,
    secret: tenant.line_channel_secret,
    channelId: tenant.line_channel_id,
  };
}
```

### 4.4 LIFF — URL Schema

| เป้าหมาย | URL |
|----------|-----|
| ลูกค้าเปิด LIFF เพื่อฝากเหล้า | `https://liff.line.me/{tenant.liff_id}?store={store_code}` |
| ลูกค้าเปิดหน้า deposit list | `https://liff.line.me/{tenant.liff_id}/deposits` |
| Deep link → withdrawal | `https://liff.line.me/{tenant.liff_id}/w/{deposit_code}` |

- App ที่ LIFF เรียก (Next.js) จะอ่าน `liff_id` จาก runtime →
  lookup `tenants WHERE liff_id = :liff_id` → เจอ tenant → set tenant context
- ลูกค้าคนเดียวกันที่อยู่ทั้ง tenant A และ B → ต้องเปิด LIFF ของแต่ละ tenant
  (LIFF ID ต่างกัน) เพราะเป็น OA คนละตัว

### 4.5 การตั้งค่าฝั่ง LINE Developer Console

Platform admin / Tenant owner ตอน onboard ต้องทำ:

1. สร้าง LINE **Messaging API Channel** ใน LINE Developer Console
2. คัดลอก:
   - Channel ID → `tenants.line_channel_id`
   - Channel Secret → `tenants.line_channel_secret`
   - Channel Access Token (long-lived) → `tenants.line_channel_token`
3. ตั้ง Webhook URL: `https://{app-domain}/api/line/webhook` (เหมือนกันทุก tenant)
4. สร้าง LIFF app ใน channel นั้น → endpoint URL:
   `https://{app-domain}/customer` → `tenants.liff_id`
5. เปิด "Use webhook = ON", "Auto-reply messages = OFF"
6. (optional) เพิ่ม bot เข้ากลุ่ม LINE ต่อสาขา → เก็บ `groupId` ใน
   `stores.deposit_notify_group_id` / `stock_notify_group_id` / `bar_notify_group_id`

### 4.6 Provisioning UI (Platform Admin)

หน้าจัดการ tenant ต้องมี:

- Form: สร้าง tenant ใหม่ (company_name, contact_email, plan, max_branches)
- Form: ตั้งค่า LINE Channel (3 fields: channel_id, secret, token) + ปุ่ม "Verify"
  ที่ยิง `/v2/bot/info` ด้วย token เพื่อเช็คความถูกต้อง
- Display: Webhook URL + LIFF endpoint URL ที่ต้อง copy ไปใส่ใน LINE Console
- Display: สถานะ webhook (ได้รับ event ล่าสุดเมื่อไหร่) — จาก `tenant_audit_logs`

### 4.7 Backward Compatibility ช่วงเปลี่ยนผ่าน

ระหว่างที่ DB เดิม (single-tenant) ยังไม่ได้ migrate:

- สร้าง default tenant "legacy" ให้ทุก record เดิม (migration script)
- `stores.line_*` fields **ยังอยู่** — ทำตัวเป็น override เมื่อ
  `tenants.line_mode = 'per_store'`
- เดิม `/api/line/webhook` resolve ด้วย `stores.line_channel_id` — ยังใช้ได้
  ในโหมด `per_store` แต่ default mode ต้อง resolve ผ่าน `tenants.line_channel_id` ก่อน

---

## 5. RLS & Security Redesign

### 5.1 ปัญหาของ RLS เดิม

RLS เดิม (00000 บรรทัด 720-870) ใช้ helper:
- `is_admin()` = role in (`owner`, `accountant`, `hq`)
- `get_user_store_ids()` = stores ที่ user ถูก assign

**ปัญหาสำคัญใน multi-tenant**:
- Owner ของ tenant A ถ้ามี record ใน `profiles.tenant_id = A` แล้ว
  query deposits โดยไม่มี filter → RLS ยอมให้เห็น deposits ทั้ง DB
  (เพราะ `is_admin()` เป็น true)
  → **ต้องเพิ่มการกรอง tenant_id ในทุก policy**

### 5.2 Helper functions ใหม่ (เพิ่มใน 00000)

```sql
-- ดึง tenant ปัจจุบันของ user ที่ login
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- platform admin?
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE id = auth.uid() AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- tenant owner? (เทียบเท่า is_admin เดิม แต่ scope ภายใน tenant)
CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'accountant', 'hq')
      AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- แทนที่ is_admin() เดิม — เปลี่ยนให้หมายถึง tenant admin
-- (ลบ function เก่าทิ้ง, สร้างใหม่ด้วยชื่อเดิมเพื่อ policy เก่าไม่พัง)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.is_tenant_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- stores เดิม — scope ใน tenant เดียวเท่านั้น
CREATE OR REPLACE FUNCTION get_user_store_ids()
RETURNS SETOF UUID AS $$
  SELECT us.store_id
  FROM public.user_stores us
  JOIN public.stores s ON s.id = us.store_id
  WHERE us.user_id = auth.uid()
    AND s.tenant_id = public.get_user_tenant_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';
```

### 5.3 Policy Pattern ใหม่ — ทุก policy ต้องมี 3 layers

```sql
-- ตัวอย่าง: deposits
DROP POLICY IF EXISTS "Staff see store deposits" ON deposits;
CREATE POLICY "Tenant isolation + staff see store deposits"
  ON deposits FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()                   -- Layer 1: tenant isolation
    AND (
      store_id IN (SELECT get_user_store_ids())        -- Layer 2: store scope
      OR is_tenant_admin()                              -- Layer 3: tenant admin bypass
    )
  );
```

**Rule**: Layer 1 (tenant isolation) ต้อง **มาก่อนเสมอ** และใช้ `AND`
ไม่ใช่ `OR` — ผิดแม้แต่นิดเดียวคือ data leak ระหว่าง tenant

### 5.4 Platform Admin Access Pattern

Platform admin **ไม่ควร** ผ่าน RLS ของ tenant tables ปกติ:

- Use case 1: ดู tenant list → query `tenants` ผ่าน policy
  `is_platform_admin()` bypass
- Use case 2: impersonate เพื่อ debug → ใช้ **service-role endpoint**
  ที่ log `tenant_audit_logs` ก่อนทุกครั้ง, ไม่ได้รับ JWT แบบ user ปกติ
- Use case 3: usage/billing stats → **aggregate-only views** (เช่น
  `v_tenant_usage` ที่ return count/size ไม่ใช่ row เต็ม)

### 5.5 Storage RLS (Supabase Storage)

Bucket `deposit-photos` → path prefix pattern: `{tenant_id}/{store_id}/...`

```sql
-- Upload: authenticated + path ต้องเริ่มด้วย tenant_id ของตัวเอง
DROP POLICY IF EXISTS "Authenticated users can upload deposit photos" ON storage.objects;
CREATE POLICY "Tenant users upload own tenant photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'deposit-photos'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

-- Read: public (LINE Flex ใช้ได้) — แต่เปลี่ยนเป็น signed URL ในอนาคต
-- หรือถ้าเข้มงวด: ต้องเป็นเจ้าของ tenant
CREATE POLICY "Tenant users read own tenant photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'deposit-photos'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );
```

> **หมายเหตุ**: LINE Flex ต้องการ URL เข้าถึงได้โดยไม่ auth →
> เปลี่ยนเป็น signed URL (expire 1 ชม.) ใน API ที่ส่ง flex ไป LINE
> (บันทึกไว้ใน roadmap Phase 3)

### 5.6 Trigger: บังคับ tenant_id consistency

ป้องกันกรณี insert deposit ด้วย `store_id` ที่ไม่ตรง `tenant_id`:

```sql
CREATE OR REPLACE FUNCTION enforce_tenant_store_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.stores WHERE id = NEW.store_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Invalid store_id';
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := v_tenant;   -- auto-fill
  ELSIF NEW.tenant_id != v_tenant THEN
    RAISE EXCEPTION 'tenant_id mismatch with store_id (store belongs to different tenant)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- apply ให้ทุกตารางหลัก: deposits, withdrawals, products, comparisons, ...
CREATE TRIGGER trg_deposits_tenant_consistency
  BEFORE INSERT OR UPDATE OF store_id, tenant_id ON deposits
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_store_consistency();
-- (ทำซ้ำให้ตารางอื่น)
```

### 5.7 Updated `handle_new_user` — สร้าง profile พร้อม tenant_id

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _username   TEXT;
  _role       user_role;
  _tenant_id  UUID;
  _invitation RECORD;
BEGIN
  -- Platform admin path: ถ้า metadata มี is_platform_admin → ใส่ใน platform_admins, ไม่สร้าง profile
  IF NEW.raw_user_meta_data->>'is_platform_admin' = 'true' THEN
    INSERT INTO public.platform_admins (id, email, display_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'admin_role', 'admin')
    );
    RETURN NEW;
  END IF;

  -- Tenant user path: ต้องระบุ tenant_id ใน metadata
  _tenant_id := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::uuid;

  -- ถ้าไม่มี tenant_id แต่มี invitation_token → resolve จาก invitation
  IF _tenant_id IS NULL AND NEW.raw_user_meta_data ? 'invitation_token' THEN
    SELECT tenant_id, role INTO _invitation
    FROM public.tenant_invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND accepted_at IS NULL AND expires_at > now();
    _tenant_id := _invitation.tenant_id;
  END IF;

  IF _tenant_id IS NULL THEN
    RAISE WARNING 'handle_new_user: missing tenant_id for user %', NEW.id;
    RETURN NEW;  -- ไม่สร้าง profile — user orphan จนกว่าจะถูก assign
  END IF;

  -- username + role logic (เหมือนเดิม แต่ unique check scoped ใน tenant)
  _username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(NEW.email), ''),
    'user_' || REPLACE(NEW.id::TEXT, '-', '')
  );
  IF EXISTS (SELECT 1 FROM public.profiles
             WHERE tenant_id = _tenant_id AND username = _username) THEN
    _username := _username || '_' || SUBSTR(REPLACE(NEW.id::TEXT, '-', ''), 1, 6);
  END IF;

  BEGIN
    _role := COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '')::user_role,
      'staff'
    );
  EXCEPTION WHEN others THEN _role := 'staff';
  END;

  INSERT INTO public.profiles (id, tenant_id, username, role)
  VALUES (NEW.id, _tenant_id, _username, _role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.8 Realtime & Broadcast

Supabase Realtime publishes ทุกตารางที่ `ALTER PUBLICATION supabase_realtime ADD TABLE`
→ ลูกค้า subscribe ต้อง pass filter `tenant_id=eq.{currentTenantId}` เสมอ:

```ts
// src/hooks/use-deposits-realtime.ts (pseudo)
supabase.channel('deposits').on('postgres_changes', {
  event: '*', schema: 'public', table: 'deposits',
  filter: `tenant_id=eq.${tenantId}`   // ← บังคับทุกที่
}, ...)
```

Broadcast channels ต้อง prefix ด้วย tenant: `chat:{tenantId}:room:{roomId}`
ไม่ใช่แค่ `chat:room:{roomId}` — ป้องกัน accidental cross-tenant subscribe

---

## 6. SQL Diff Plan — การแก้ `00000_full_schema_consolidated.sql`

### 6.1 สรุปจำนวนบรรทัด

- ปัจจุบัน: **1278 บรรทัด**
- หลังแก้ (ประมาณ): **1800-2000 บรรทัด** (+tenants, +platform_admins, +invitations, +audit_logs, +triggers, +RLS rewrite)

### 6.2 ลำดับการแก้ (section-by-section)

| ลำดับ | Section | บรรทัดเดิม | Action |
|-------|---------|-----------|--------|
| 1 | Header | 1-8 | อัพเดท comment → "SaaS Multi-Tenant Consolidated Schema" |
| 2 | Timezone | 10-14 | คงเดิม |
| 3 | **ENUMs** | 17-30 | **เพิ่ม** `tenant_status`, `tenant_plan`, `line_mode` |
| 4 | **Tenants table** | — | **แทรกใหม่** ก่อน `profiles` |
| 5 | **platform_admins** | — | **แทรกใหม่** หลัง `tenants` |
| 6 | `profiles` | 35-45 | **เพิ่ม** `tenant_id`, ย้าย UNIQUE ไป (tenant, username) |
| 7 | `user_permissions` | 47-54 | เพิ่ม `tenant_id` |
| 8 | `stores` | 56-74 | เพิ่ม `tenant_id` NOT NULL, UNIQUE(tenant_id, store_code) |
| 9 | `user_stores` | 76-80 | คงเดิม (มี store_id ชี้ tenant ผ่าน stores) |
| 10 | **tenant_invitations** | — | **แทรกใหม่** |
| 11 | **tenant_audit_logs** | — | **แทรกใหม่** |
| 12 | `products` … ทุก domain tables | 86-452 | **เพิ่ม** `tenant_id UUID NOT NULL REFERENCES tenants(id)` |
| 13 | `store_settings` | 326-368 | ไม่ต้องเพิ่ม tenant_id (1:1 กับ store) |
| 14 | `system_settings` | 1180-1186 | **เปลี่ยน PK** เป็น (tenant_id, key) |
| 15 | `app_settings` | 370-375 | จำกัด → platform_admin only; **ลบ** LINE_CENTRAL_* rows |
| 16 | Chat tables | 498-540 | เพิ่ม `tenant_id` ใน `chat_rooms`, `chat_members` |
| 17 | **Indexes** | 545-624 | **เพิ่ม** indexes ใหม่สำหรับทุก `tenant_id` column |
| 18 | RLS policies | 629-872 | **rewrite ทั้งหมด** — เพิ่ม Layer 1 tenant isolation |
| 19 | **Helper functions** | 663-718 | **เพิ่ม** `get_user_tenant_id()`, `is_platform_admin()`, `is_tenant_admin()` |
| 20 | **Triggers** | 1083-1141 | **เพิ่ม** `enforce_tenant_branch_limit`, `enforce_tenant_store_consistency`, update `handle_new_user` |
| 21 | Realtime | 1145-1154 | คงเดิม (client ต้อง pass filter) |
| 22 | Seed / app_settings data | 1160-1165 | **ลบ** LINE_CENTRAL_* rows, ย้ายไป per-tenant |
| 23 | system_settings seed | 1192-1197 | **ลบ** — seed ต่อ tenant ผ่าน app ตอน provision |
| 24 | Storage | 1248-1261 | เพิ่ม path prefix check, keep public read ชั่วคราว |
| 25 | Seed: chat rooms | 1267-1278 | คงเดิม (จะสร้างตาม tenant ที่มีอยู่) |

### 6.3 Index list ใหม่ที่ต้องเพิ่ม

```sql
-- Tenant isolation indexes (CRITICAL for RLS performance)
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_stores_tenant ON stores(tenant_id);
CREATE INDEX idx_deposits_tenant ON deposits(tenant_id);
CREATE INDEX idx_deposits_tenant_status ON deposits(tenant_id, status);
CREATE INDEX idx_withdrawals_tenant ON withdrawals(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_manual_counts_tenant ON manual_counts(tenant_id);
CREATE INDEX idx_comparisons_tenant ON comparisons(tenant_id);
CREATE INDEX idx_transfers_tenant ON transfers(tenant_id);
CREATE INDEX idx_hq_deposits_tenant ON hq_deposits(tenant_id);
CREATE INDEX idx_borrows_tenant ON borrows(tenant_id);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_chat_rooms_tenant ON chat_rooms(tenant_id);
CREATE INDEX idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX idx_print_queue_tenant ON print_queue(tenant_id);
CREATE INDEX idx_deposit_requests_tenant ON deposit_requests(tenant_id);

-- Tenant lookup indexes
CREATE INDEX idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX idx_tenant_invitations_tenant ON tenant_invitations(tenant_id);
CREATE INDEX idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX idx_tenant_invitations_token ON tenant_invitations(token) WHERE accepted_at IS NULL;
```

### 6.4 Default "legacy" tenant (ใช้ตอน fresh install + dev)

ท้ายไฟล์ 00000 เพิ่ม:

```sql
-- ==========================================
-- DEFAULT TENANT (dev / legacy install)
-- ==========================================
-- สำหรับ fresh install + dev: สร้าง 1 tenant default
-- เพื่อให้ระบบทำงานได้ก่อนที่จะมี platform admin สร้าง tenant แรก
-- ใน production: ลบ INSERT นี้ออก แล้วใช้ platform admin provision แทน

INSERT INTO tenants (
  id, slug, company_name, contact_email,
  status, plan, max_branches, max_users,
  line_mode
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'default',
  'Default Company',
  'admin@example.com',
  'active',
  'enterprise',
  100,
  1000,
  'tenant'
) ON CONFLICT (id) DO NOTHING;
```

### 6.5 RLS policies ที่ต้อง rewrite (รายการ)

ต้อง DROP + CREATE ใหม่ให้ทุก policy เหล่านี้ เพิ่ม Layer 1 tenant isolation:

- `profiles` — view own / admin view / owner manage (+ tenant check)
- `stores` — admin see / users see / owner manage (+ tenant check)
- `user_stores`, `user_permissions` — tenant-scoped
- `deposits`, `withdrawals`, `deposit_requests` — tenant + store scope
- `products`, `manual_counts`, `comparisons`, `ocr_logs`, `ocr_items` — tenant + store
- `transfers`, `hq_deposits`, `borrows`, `borrow_items` — tenant + store
- `store_settings`, `notifications`, `penalties`, `announcements` — tenant + store
- `push_subscriptions`, `notification_preferences` — user's own tenant
- `audit_logs`, `app_settings` — platform_admin only (for app_settings), tenant_admin for audit_logs
- `chat_rooms`, `chat_messages`, `chat_members`, `chat_pinned_messages` — tenant + member
- `print_queue`, `print_server_status` — tenant + store
- `tenants` — own tenant row + platform_admin
- `platform_admins` — self + super_admin
- `tenant_invitations` — tenant admins only
- `tenant_audit_logs` — platform_admin only
- `system_settings` — tenant admin (เดิมเป็น owner only)

### 6.6 ตัวอย่าง RLS policy rewrite (4 ตาราง key)

```sql
-- ========== tenants ==========
CREATE POLICY "Platform admin sees all tenants" ON tenants
  FOR SELECT USING (is_platform_admin());
CREATE POLICY "Tenant members see own tenant" ON tenants
  FOR SELECT USING (id = get_user_tenant_id());
CREATE POLICY "Platform admin manages tenants" ON tenants
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());
CREATE POLICY "Tenant owner updates own tenant" ON tenants
  FOR UPDATE USING (id = get_user_tenant_id() AND get_user_role() = 'owner')
  WITH CHECK (id = get_user_tenant_id());

-- ========== platform_admins ==========
CREATE POLICY "Platform admin sees self + peers" ON platform_admins
  FOR SELECT USING (is_platform_admin());
CREATE POLICY "Super admin manages platform admins" ON platform_admins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM platform_admins
            WHERE id = auth.uid() AND role = 'super_admin' AND active = true)
  );

-- ========== stores (rewrite) ==========
DROP POLICY IF EXISTS "Admin see all stores" ON stores;
DROP POLICY IF EXISTS "Users see assigned stores" ON stores;
DROP POLICY IF EXISTS "Owner manages stores" ON stores;

CREATE POLICY "Tenant members see tenant stores" ON stores
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant owner manages stores" ON stores
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND get_user_role() = 'owner'
  )
  WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Platform admin sees all stores" ON stores
  FOR SELECT USING (is_platform_admin());

-- ========== deposits (rewrite) ==========
DROP POLICY IF EXISTS "Staff see store deposits" ON deposits;
DROP POLICY IF EXISTS "Customer see own deposits" ON deposits;
DROP POLICY IF EXISTS "Staff manage store deposits" ON deposits;

CREATE POLICY "Tenant staff see store deposits" ON deposits
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  );
CREATE POLICY "Tenant customer see own deposits" ON deposits
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
    AND (
      customer_id = (SELECT auth.uid())
      OR line_user_id = (SELECT p.line_user_id FROM public.profiles p
                         WHERE p.id = (SELECT auth.uid()))
    )
  );
CREATE POLICY "Tenant staff manage deposits" ON deposits
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND (store_id IN (SELECT get_user_store_ids()) OR is_tenant_admin())
  )
  WITH CHECK (tenant_id = get_user_tenant_id());
```

### 6.7 Migration script strategy (สำหรับ DB ที่มีข้อมูลอยู่แล้ว)

เนื่องจาก 00000 เป็น **fresh install** เท่านั้น, DB ที่รันไปแล้วต้อง
สร้าง **migration 00023_saas_multitenant.sql** แยก ด้วยลำดับ:

```sql
-- 00023 (เพียง outline — ไฟล์จริงจะเขียนใน Phase 1)
BEGIN;

-- 1. สร้าง tenants + platform_admins (ไม่มี FK ชี้ไปไหน)
CREATE TABLE tenants (...);
CREATE TABLE platform_admins (...);

-- 2. สร้าง "legacy" tenant แล้วย้ายข้อมูลเดิมทั้งหมดเข้าไป
INSERT INTO tenants (id, slug, company_name, ...) VALUES (...);
-- tenant_id = '00000000-0000-0000-0000-000000000001'

-- 3. เพิ่ม tenant_id column (nullable ก่อน)
ALTER TABLE profiles ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE stores ADD COLUMN tenant_id UUID REFERENCES tenants(id);
-- ... ทุกตาราง

-- 4. Backfill tenant_id = 'legacy'
UPDATE profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE stores   SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
-- ... ทุกตาราง (join via store_id ถ้ามี)

-- 5. Set NOT NULL
ALTER TABLE stores ALTER COLUMN tenant_id SET NOT NULL;
-- ... (profiles อาจเว้น NULL ไว้สำหรับ platform_admin path)

-- 6. Drop + recreate UNIQUE constraints scope ใน tenant
ALTER TABLE profiles DROP CONSTRAINT profiles_username_key;
ALTER TABLE profiles ADD CONSTRAINT profiles_tenant_username_uniq UNIQUE (tenant_id, username);
ALTER TABLE stores DROP CONSTRAINT stores_store_code_key;
ALTER TABLE stores ADD CONSTRAINT stores_tenant_code_uniq UNIQUE (tenant_id, store_code);

-- 7. ย้าย LINE config: tenants.line_channel_* ← stores.line_channel_* (store แรกของ tenant)
UPDATE tenants t SET
  line_channel_id     = (SELECT line_channel_id FROM stores WHERE tenant_id = t.id LIMIT 1),
  line_channel_secret = (SELECT line_channel_secret FROM stores WHERE tenant_id = t.id LIMIT 1),
  line_channel_token  = (SELECT line_token FROM stores WHERE tenant_id = t.id LIMIT 1);

-- 8. Recreate RLS policies (DROP ทั้งหมด → CREATE ใหม่พร้อม tenant layer)
-- (ลอกจาก 00000 rewrite section)

-- 9. เพิ่ม triggers (branch limit, store consistency)

-- 10. เพิ่ม indexes

COMMIT;
```

---

## 7. App-Layer Changes (Next.js)

### 7.1 Tenant Context

สร้าง `TenantContext` ฝั่ง client + server:

```
src/
├─ lib/
│  ├─ tenant/
│  │  ├─ context.ts          # React Context + Provider
│  │  ├─ resolve.ts          # resolve tenant จาก URL/JWT/subdomain
│  │  ├─ guard.ts            # middleware guard
│  │  └─ types.ts
│  ├─ supabase/
│  │  ├─ server.ts           # createServerClient + tenant scope
│  │  └─ client.ts           # createBrowserClient + tenant scope
```

**ทุก Supabase query ต้องทำผ่าน helper ที่ inject tenant_id**:

```ts
// src/lib/supabase/server.ts
export async function getTenantScopedClient() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id, role').eq('id', user.id).single();
  if (!profile?.tenant_id) throw new Error('User has no tenant');
  return { supabase, tenantId: profile.tenant_id, role: profile.role };
}
```

### 7.2 Routing strategy

| เฟส | รูปแบบ | ตัวอย่าง |
|-----|-------|---------|
| Phase 1 (MVP) | Path-based | `/t/{slug}/dashboard` |
| Phase 2 | Subdomain (optional) | `{slug}.app.com/dashboard` |

**Middleware** (`src/middleware.ts`) resolve tenant ก่อน render:

```ts
export async function middleware(req: NextRequest) {
  const slug = extractTenantSlug(req.url);  // path or subdomain
  const tenant = await resolveTenant(slug);
  if (!tenant || tenant.status !== 'active') return redirect('/suspended');

  const res = NextResponse.next();
  res.headers.set('x-tenant-id', tenant.id);
  res.headers.set('x-tenant-slug', tenant.slug);
  return res;
}
```

### 7.3 โครงสร้างโฟลเดอร์ใหม่

```
src/app/
├─ (platform)/                  # ← ใหม่: Platform admin UI
│  ├─ admin/
│  │  ├─ tenants/
│  │  │  ├─ page.tsx            # list tenants
│  │  │  ├─ new/page.tsx        # create tenant
│  │  │  └─ [id]/page.tsx       # edit tenant (plan, max_branches, LINE)
│  │  ├─ audit/page.tsx         # tenant_audit_logs view
│  │  └─ usage/page.tsx         # stats dashboard
│  └─ layout.tsx                # platform-only layout
│
├─ (auth)/                       # เดิม
├─ (dashboard)/                  # เดิม — แต่อยู่ภายใต้ /t/[slug]/...
│
├─ t/[slug]/                     # ← ใหม่: tenant scope wrapper
│  ├─ (dashboard)/               # move เดิมมาใต้นี้
│  ├─ (auth)/
│  ├─ customer/
│  └─ layout.tsx                 # ยืนยัน tenant + inject context
│
└─ api/
   ├─ platform/                  # ← ใหม่: platform admin APIs
   │  ├─ tenants/route.ts        # POST=create, GET=list
   │  ├─ tenants/[id]/route.ts
   │  ├─ tenants/[id]/suspend/route.ts
   │  └─ tenants/[id]/impersonate/route.ts
   ├─ line/
   │  └─ webhook/route.ts        # update: resolve tenant ก่อน
   └─ ... (APIs เดิมต้อง guard ด้วย tenant context)
```

### 7.4 ไฟล์สำคัญที่ต้องแก้

| ไฟล์ | การแก้ |
|------|--------|
| `src/lib/line/messaging.ts` | รับ `tenantId` → resolve token จาก `tenants` ก่อน fallback per-store |
| `src/app/api/line/webhook/route.ts` | Step 1 ต้อง resolve tenant จาก destination, ต่อ store |
| `src/lib/line/customer-entry-url.ts` | ใช้ `tenants.liff_id` แทน `system_settings['davis_ai.liff_id']` |
| `src/lib/supabase/server.ts` / `client.ts` | inject tenant scope ทุก query |
| `src/lib/modules/registry.ts` | เพิ่ม role `platform_admin` + modules ใหม่ |
| `src/hooks/use-*-realtime.ts` | เพิ่ม `tenant_id=eq.{x}` filter ในทุก realtime subscribe |
| `src/middleware.ts` | resolve tenant + guard suspended tenant |
| `src/stores/*` | Zustand stores ต้อง reset เมื่อสลับ tenant |

### 7.5 Platform Admin UI (ใหม่)

หน้าที่ต้องสร้าง:

1. **`/admin/tenants`** — ตาราง tenant ทั้งหมด + search + filter status
   - คอลัมน์: slug, company, plan, branches (current/max), users, status, last activity
2. **`/admin/tenants/new`** — wizard สร้าง tenant
   - Step 1: ข้อมูลบริษัท (name, contact, country)
   - Step 2: แพ็กเกจ (plan, max_branches, max_users, trial_ends_at)
   - Step 3: LINE config (optional — ข้ามได้)
   - Step 4: สร้าง owner account (ส่ง magic link)
3. **`/admin/tenants/[id]`** — detail + edit
   - Tab: Overview / Plan / LINE / Users / Audit / Danger Zone (suspend/delete)
4. **`/admin/audit`** — stream tenant_audit_logs
5. **`/admin/usage`** — total deposits/month, storage usage, LINE quota per tenant

### 7.6 Tenant Owner UI (ต่อยอดจากเดิม)

หน้าที่เพิ่ม/แก้ภายใน tenant scope:

- `/t/{slug}/settings/company` — แก้ company info
- `/t/{slug}/settings/line` — ตั้งค่า LINE OA ของบริษัท (channel_id, secret, token, LIFF)
  + ปุ่ม **"Test connection"** → GET /v2/bot/info
- `/t/{slug}/settings/branches` — รายการสาขา + แสดง **"{current}/{max} branches"**
  + ปุ่ม "Add branch" disabled เมื่อเต็ม + link upgrade plan
- `/t/{slug}/settings/users` — เชิญ user ด้วย email (สร้าง invitation)

---

## 8. Phase Roadmap

### Phase 0: Design & Agreement ✅ (เอกสารนี้)
> วิเคราะห์ + ออกแบบ — ไม่มีโค้ด

- [x] 0.1 — วิเคราะห์ schema เดิม (00000)
- [x] 0.2 — ออกแบบ tenant model
- [x] 0.3 — วางแผน LINE routing ใหม่
- [x] 0.4 — วางแผน RLS rewrite
- [x] 0.5 — ร่าง CLAUDE.md (เอกสารนี้)
- [ ] 0.6 — รีวิวกับทีม + approve ก่อนลงมือเฟส 1

### Phase 1: Schema Migration (ประมาณ 2-3 วัน)
> Source of truth — DB schema

- [ ] 1.1 — แก้ `00000_full_schema_consolidated.sql` ตามส่วน 6
- [ ] 1.2 — เขียน `00023_saas_multitenant.sql` สำหรับ upgrade DB เดิม
- [ ] 1.3 — เขียน seed script: default platform_admin + default tenant (dev only)
- [ ] 1.4 — ทดสอบ fresh install + upgrade path ใน Supabase local
- [ ] 1.5 — รัน `supabase db lint` + `pg_prove` tests

### Phase 2: Backend Plumbing (ประมาณ 3-5 วัน)
> Server-side abstraction

- [ ] 2.1 — `src/lib/tenant/` context + resolve + guard
- [ ] 2.2 — `src/lib/supabase/server.ts` — tenant-scoped client
- [ ] 2.3 — `src/middleware.ts` — tenant resolution middleware
- [ ] 2.4 — Refactor `src/lib/line/messaging.ts` → accept `tenantId`
- [ ] 2.5 — Refactor `src/app/api/line/webhook/route.ts` → resolve tenant first
- [ ] 2.6 — Update all API routes to use tenant-scoped client
- [ ] 2.7 — Unit tests สำหรับ tenant isolation

### Phase 3: Platform Admin UI (ประมาณ 3-4 วัน)
> Super admin dashboard

- [ ] 3.1 — `/admin/tenants` list + search + filter
- [ ] 3.2 — `/admin/tenants/new` wizard (4 steps)
- [ ] 3.3 — `/admin/tenants/[id]` edit — tabs (overview, plan, LINE, danger zone)
- [ ] 3.4 — `/admin/tenants/[id]/suspend` + audit log
- [ ] 3.5 — `/admin/audit` — audit log stream
- [ ] 3.6 — `/admin/usage` — usage stats dashboard
- [ ] 3.7 — Platform admin auth flow (separate from tenant auth)

### Phase 4: Tenant Routing & UI (ประมาณ 4-5 วัน)
> Move app under /t/[slug]/

- [ ] 4.1 — Move `(dashboard)` → `t/[slug]/(dashboard)`
- [ ] 4.2 — Move `(auth)`, `customer` → `t/[slug]/*`
- [ ] 4.3 — Root `/` → landing page หรือ redirect
- [ ] 4.4 — `/t/{slug}/settings/company` — company info
- [ ] 4.5 — `/t/{slug}/settings/line` — per-tenant LINE config + test
- [ ] 4.6 — `/t/{slug}/settings/branches` — branch list with max limit UI
- [ ] 4.7 — `/t/{slug}/settings/users` — invite via email (invitations)
- [ ] 4.8 — Invitation acceptance page `/t/{slug}/invite/{token}`

### Phase 5: LINE Per-Tenant Integration (ประมาณ 2-3 วัน)
> Webhook + LIFF

- [ ] 5.1 — Webhook resolver: tenant-first, then store
- [ ] 5.2 — LIFF entry: `liff_id` per tenant
- [ ] 5.3 — `tenants.line_mode='per_store'` override path
- [ ] 5.4 — LINE OA verify endpoint (test connection)
- [ ] 5.5 — Webhook health monitoring (last event received)

### Phase 6: Data Isolation Audit (ประมาณ 2 วัน)
> Security hardening

- [ ] 6.1 — Penetration test: cross-tenant data access
  - login as tenant A → query data ของ tenant B (ต้อง fail ทุกกรณี)
- [ ] 6.2 — Realtime subscribe audit — filter ทุก channel
- [ ] 6.3 — Storage path audit — upload/read ไม่ข้าม tenant
- [ ] 6.4 — Impersonation audit log — platform_admin ทุก action log
- [ ] 6.5 — Load test: RLS performance (tenant_id index hit rate)

### Phase 7: Billing & Usage (optional, เฟสหลัง)
> สำหรับ production SaaS จริง

- [ ] 7.1 — Plan tiers (storage, branches, users, LINE push/month)
- [ ] 7.2 — Usage metering (track per tenant)
- [ ] 7.3 — Stripe integration
- [ ] 7.4 — Trial → paid conversion flow
- [ ] 7.5 — Dunning / past-due handling

---

## 9. Risks & Open Questions

### 9.1 ความเสี่ยงทางเทคนิค

| ความเสี่ยง | ผลกระทบ | การจัดการ |
|-----------|---------|-----------|
| **Data leak ข้าม tenant จาก RLS ผิด** | สูงสุด | เขียน test suite ทุก policy (Phase 6.1) |
| **Performance ตก หลังเพิ่ม tenant_id filter** | กลาง | เพิ่ม composite index (tenant_id, status/date) |
| **LINE webhook routing ผิด tenant** | สูง | ยืนยัน channel_id UNIQUE + signature verify ด้วย secret ของ tenant นั้น |
| **Migration downtime** | กลาง | รัน `00023` แบบ transactional + maintenance window |
| **Existing data ไม่ได้ backfill tenant_id** | กลาง | script backfill + verify count ก่อน SET NOT NULL |
| **Customer (LINE user) ข้าม tenant** | กลาง | `profiles.line_user_id` UNIQUE ต่อ tenant — คนละคนในคนละ tenant ได้ |

### 9.2 Open questions (ต้องตัดสินใจก่อน Phase 1)

1. **Auth model**: ใช้ `auth.users` เดียว + tenant_id ใน profiles หรือ
   แยก auth provider ต่อ tenant (OIDC multi-project)?
   → **แนะนำ: single auth.users** — ง่ายกว่า, Supabase-friendly
2. **Domain strategy**: path-based vs subdomain — เริ่มจากอะไร?
   → **แนะนำ: path-based Phase 1, subdomain Phase 2** (DNS wildcard + SSL cert ยุ่ง)
3. **Platform admin = Supabase user หรือแยก?**
   → **แนะนำ: ยังใช้ `auth.users` — แยกด้วย `platform_admins` table**
4. **Pricing unit**: ต่อ branch? ต่อ active user? ต่อ deposit? ต่อ LINE push?
   → Phase 7 ค่อยตัดสิน
5. **Data residency**: tenant บาง ราย ต้องการ DB แยก (EU, healthcare)?
   → Phase 7 — "bring your own database" option
6. **Template cloning**: tenant ใหม่สร้างมา products/settings ควรมี default?
   → Phase 4 — เพิ่ม `tenant_templates` table

### 9.3 Non-goals (ยังไม่ทำในแผนนี้)

- ไม่ทำ **schema-per-tenant** (Supabase ไม่รองรับ dynamic schema ดี)
- ไม่ทำ **database-per-tenant** (cost สูง, ย้ายไม่ยืดหยุ่น)
- ไม่ทำ **cross-tenant sharing** (ยืมของข้าม tenant)
- ไม่ทำ **white-label full** (domain / email sender / SSL ต่อ tenant) ใน Phase 1-6

---

## 10. Pre-Flight Checklist ก่อนเริ่ม Phase 1

- [ ] ทีมรีวิว + approve เอกสารนี้
- [ ] ยืนยัน tech stack: Next.js 16 + Supabase + LINE เดิม
- [ ] ยืนยัน deployment: Vercel + Supabase (ตอนนี้) — scale plan ภายหลัง
- [ ] ยืนยัน business rules:
  - 1 LINE OA = 1 tenant (default) ✅
  - max_branches ตั้งโดย super admin ✅
  - 1 LIFF ต่อ tenant ✅
  - customer data (LINE user) แยกต่อ tenant ✅
- [ ] วางแผน staging env: Supabase branch หรือ project แยก
- [ ] เตรียม migration rollback plan
- [ ] กำหนดเกณฑ์ success (Phase 6 penetration test ผ่าน, latency < X ms)

---

## 11. ไฟล์ที่จะถูกแตะในแต่ละ Phase (สรุป)

### Phase 1 — DB
- `supabase/migrations/00000_full_schema_consolidated.sql` (rewrite)
- `supabase/migrations/00023_saas_multitenant.sql` (new)
- `supabase/seed.sql` (new — default platform_admin for dev)

### Phase 2 — Backend
- `src/lib/tenant/*` (new)
- `src/lib/supabase/server.ts`, `client.ts` (refactor)
- `src/lib/line/messaging.ts`, `customer-entry-url.ts` (refactor)
- `src/app/api/line/webhook/route.ts` (refactor)
- `src/middleware.ts` (new/refactor)
- `src/app/api/**/route.ts` (ทุก API — wrap ด้วย tenant guard)

### Phase 3 — Platform UI
- `src/app/(platform)/*` (new)
- `src/app/api/platform/*` (new)

### Phase 4 — Tenant UI
- `src/app/t/[slug]/*` (move + modify)
- `src/app/(dashboard)/settings/*` → `src/app/t/[slug]/settings/*`
- `src/app/t/[slug]/settings/company/page.tsx` (new)
- `src/app/t/[slug]/settings/line/page.tsx` (new)
- `src/app/t/[slug]/settings/branches/page.tsx` (new)
- `src/app/t/[slug]/invite/[token]/page.tsx` (new)

### Phase 5 — LINE
- (ส่วนใหญ่อยู่ใน Phase 2 แล้ว) — เพิ่ม test/verify endpoints

### Phase 6 — Audit
- `tests/rls/*` (new — pgTap หรือ vitest + supabase-js)
- `tests/tenant-isolation.spec.ts` (new)

---

## 12. Tech Stack (คงเดิม)

- Next.js 16 + React 19
- Supabase (Postgres + Realtime Broadcast + Presence + Storage + Auth)
- Zustand (state management)
- TanStack Query (server state)
- Tailwind CSS v4
- Lucide icons
- LINE Messaging API + LIFF
- Deploy: Vercel (app) + Supabase Cloud (DB/Auth/Storage)

---

**Status**: 🟡 Planning complete — รอ approve ก่อน Phase 1
**Last updated**: 2026-04-23
**Owner**: Platform Team


---
title: Salsabil Frontend Integration Pattern
status: ADOPTED
date: 2026-09-21
source: docs/audits/2026-09-21-real-backend-sdui-integration-poc.md (POC VERIFIED)
---

# Salsabil Frontend Integration Pattern

Every real (non-mock) feature connecting Antigravity-built UI to Salsabil's backend MUST follow this
exact pipeline. Do not invent a variant without founder approval.

## Data Path

```
Backend Service (existing, e.g. catalogService)
↓
DataSource (new, per-feature — mirrors existing Mock DataSource structure)
↓
DataResolver (unmodified core file)
↓
PageSchema (plain declarative data)
↓
PageEngine (unmodified core file)
↓
Stem (presentation-only, e.g. StemProductCard)
```

## Action Path

```
Stem → onAction({ type, payload })
↓
ApplicationRuntime (unmodified core file)
↓
ActionRouter (unmodified core file)
↓
CapabilityRegistry → registered capability (new, per-feature — orchestration only)
↓
Existing Server Action(s) (unmodified — e.g. addToCartAction)
↓
Existing Service/Repository (unmodified)
↓
Database
```

## Hard Rules

1. **Core files never change per-feature:** `DataResolver`, `PageEngine`, `ApplicationRuntime`,
   `ActionRouter`, `CapabilityRegistry` stay untouched. Only new DataSources, new capabilities, and new
   Stems/adapters are added.
2. **No client-supplied price, ever.** Any action payload touching money is computed server-side only.
3. **No new backend logic duplicating existing services.** Capabilities orchestrate existing Server
   Actions; they do not reimplement cart/order/catalog logic.
4. **`componentRegistry` guard is mandatory.** Every page/feature registering a component type into the
   shared `componentRegistry` MUST check `.has(type)` before registering. Unconditional registration is
   forbidden — it causes cross-page component leakage (discovered in POC §J.3).
5. **Read-path placement:** if the DataSource's backend call chain imports anything `server-only`
   (e.g. touches `supabase-admin-client.ts`), resolution happens in a Server Component, never a client
   `useEffect`.
6. **Every slice is additive and reversible** until explicitly approved to replace existing UI — ship
   behind a scoped section/route, not a wholesale page rewrite, unless told otherwise.
7. **Every slice ends with the same verification bar as the POC:** `tsc --noEmit`, `npm run arch:check`,
   `npm run architecture:check`, and real runtime verification (browser interaction + independent DB
   read) — no slice is "done" on type-check alone.

## Definition of "Integrated & Verified"

Real data, real contract, no mock in the path, backend is source of truth, actions flow through
Runtime/Capability, real Server Action/Service, real auth/session, correct loading/error/empty states,
TypeScript passes, architecture gates pass, no regression — confirmed by direct evidence, not assumption.

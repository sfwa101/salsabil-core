---
title: Post-Antigravity Merge — Integration State, Routing & Backend Readiness Forensic Audit
status: COMPLETE
date: 2026-09-22
mode: READ-ONLY FORENSIC AUDIT — no source, schema, config, dependency, or git changes made
scope: >
  Repository-wide forensic snapshot answering: what was actually merged from "Antigravity"/Stem
  frontend work, what the application actually renders in production today, why the old UI still
  appears, what backend capabilities exist vs. are missing, what is duplicated, and what the safe
  next integration step is. This report does not continue development and does not fix anything.
related:
  - docs/audits/2026-09-21-real-backend-sdui-integration-poc.md (POC VERIFIED)
  - docs/audits/2026-09-21-migrate-home-real-shelf-to-sdui-report.md (COMPLETE)
  - docs/audits/SALSABIL_FRONTEND_BACKEND_INTEGRATION_AUDIT.md (pre-dates this audit by ~1 day;
    written before the POC/home-shelf-migration/Stem-library commits landed — see §9 for what this
    audit confirms vs. contradicts from it)
  - docs/audits/2026-09-14-reef-v1-engineering-audit.md
  - docs/audits/COMPREHENSIVE_PRE_LAUNCH_AUDIT.md
  - docs/salsabil-frontend-integration-pattern.md (status: ADOPTED, 2026-09-21)
method: >
  Direct file reads, repo-wide grep/import tracing, git history inspection, and 4 parallel read-only
  research passes (frontend reachability, backend capability inventory, SDUI/Stem chain trace,
  governance/prior-audit extraction), synthesized and cross-checked by the auditing session itself.
  Read-only verification commands (tsc, arch:check, architecture:check) were executed live against
  the current working tree — none of them mutate files.
---

# Post-Antigravity Merge — Integration State, Routing & Backend Readiness Forensic Audit

## Executive Summary

The repository contains **two separate things that both get called "Antigravity/Stem"**, and conflating
them is the root of the confusion this audit was commissioned to resolve:

1. **A real, POC-verified, production-wired SDUI slice** (`src/sdui/*` core + `StemProductCard.tsx` +
   `HorizontalShelfStem.tsx` + `RealCatalogDataSource.ts`), built and live-verified on 2026-09-21,
   committed in `4bc4a80`, and wired into **exactly one production surface**: the desktop-only "منتجات
   ريف" shelf on the Home page, via `src/app/(reef)/RealCatalogShelfSDUI.tsx` (commit `78a0e06`). This
   is **RUNTIME-VERIFIED** (real Playwright run + independent DB read, documented in the two related
   POC/migration reports) — not merely code-complete.
2. **16 new, separately-authored presentational "Stem" components** (`AddressModalStem`,
   `BottomNavStem`, `CartBreakdownStem`, `CartLineItemStem`, `CartUpgradeBannerStem`,
   `CategoryBarStem`, `DesktopHeaderStem`, `MobileCartSheetStem`, `MobileHeaderStem`,
   `OrderSuccessModalStem`, `ProductQuickViewStem`, `ReelsEmbedModalStem`, `ReelsHorizontalShelfStem`,
   `StemHeroFeedCard`, `VendorCartGroupStem`, `WorldsTrayStem`), committed separately in `a37a484`
   ("feat(ui): add Stem presentational component library") together with mock backing infrastructure
   (`989abb8`) and three test-only routes (`504f32b`). **These 16 components have ZERO production
   importers.** Their only consumer, repo-wide, is `src/app/test-ui/page.tsx` — a 682-line dev-only
   route not linked from any navigation, with no auth/env guard.

**This is precisely why the old UI is still displayed**: the new Stem component library was merged
into the repository (files exist, `git log` shows real commits, `npm run arch:check` and
`npm run architecture:check` both pass clean) but was never wired into any production page. Only the
narrow, separately-built SDUI proof-of-concept path reaches production, and only for one shelf, only
on desktop. This is a **ROUTING / IMPORT PROBLEM** in the strict sense used by this audit's
classification scheme: it is not a bug, redirect, feature flag, or broken build — the production
`page.tsx`/`layout.tsx`/`cart/page.tsx`/`checkout/page.tsx`/etc. files simply still import the legacy
components (`Header`, `BottomNav`, `HorizontalShelf`, `ProductCard`, `CartVendorGroup`,
`CheckoutForm`, `CategoryProductGrid`, `Feed`) because no task has yet swapped them, the same
disciplined way the home shelf was swapped.

A second, independent, and more urgent finding surfaced during this audit: **`/test-integration`, one
of the three test-only routes, is reachable with no auth/env guard and performs real writes to the
production-shaped `cart_items` table** via the same Server Actions the live storefront uses — unlike
`/test-ui`/`/test-portability`, which only touch mock/local state. This is a live, currently-open risk,
not a hypothetical one (see §19, Finding 2).

A third finding: a load-bearing citation (`AF-006`, and its purported source document
`SALSABIL_BACKEND_ARCHITECTURE_FORENSIC_AUDIT`) is referenced as authoritative/closed evidence in three
different 2026-09-21 documents and in `docs/DECISIONS.md`, but **that source document does not exist
anywhere in this repository or its git history**. The underlying finding it supports (test routes
reachable with no guard) is independently re-confirmed as still true by this audit's own direct
inspection — so the *conclusion* stands — but the *citation chain* is broken and should not be trusted
as-is going forward (see §19, Finding 3).

---

## 1. Current Repository State

- **Branch:** `feat/stem-design-tokens`, diverged from `main` at commit `45624f9` with **57 commits
  ahead** (per `git log main..HEAD`), spanning Phase-1 feature work (merchant staff, delivery, admin
  taxonomy, notifications), the SEC-P1-1 security fix, and the 2026-09-21 SDUI/Stem work this audit
  focuses on.
- **`git diff main...HEAD --stat`:** 224 files changed, +193,059 / −529 lines. The vast majority of the
  insertion count is new feature work (delivery, merchant staff, notifications, catalog taxonomy,
  orders splitting) plus the SDUI/Stem files themselves — not evidence of runaway scope on this
  specific audit's topic by itself.
- **Uncommitted working-tree changes** (`git status`, not part of any commit, present right now):
  - `SALSABIL_CONSTITUTION.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md` — a documentation-only
    edit (confirmed by diff) adding a cross-reference to `docs/ERP_SAAS_VISION.md` in §9, founder-
    commissioned per the diff's own inline note ("توثيق فقط، بتكليف مؤسس مباشر"). Unrelated to
    SDUI/Antigravity.
  - `next.config.ts` — sets `images.unoptimized: true`, disclosed in-diff as a temporary fix for a live
    Vercel Image Optimization 402 quota error on staging (`FIX-VERCEL-IMAGE-OPTIMIZATION-402-LIVE-BUG`,
    2026-09-20). Unrelated to SDUI/Antigravity.
  - `package.json` — adds the `"architecture:check": "node scripts/architecture-gate.mjs"` script
    entry. **Confirmed the entry is present and functional in the working tree** (the command was run
    live for this audit, see §18) but not yet committed, even though the script file itself was
    committed separately in `8abb5ae`.
  - `src/core/modules/cart/cart.service.ts` — adds a `roundToCents()` call on two cart-total
    computations. In-progress, uncommitted money-rounding fix, unrelated to SDUI/Antigravity.
  - Untracked: `scripts/2026-09-20-tmp-category-dump.json` (638KB, one-line JSON scratch dump),
    `scripts/auto-backup.ps1` (a disaster-recovery-only local git snapshot script, explicitly
    documented in its own header as "NOT a reviewed/deployed history" and never merged into any real
    branch), `staging.html` (337KB, a saved static snapshot of a rendered page — see §9, used as
    corroborating evidence in this audit).
- None of these five uncommitted/untracked items were touched by this audit; they are disclosed here
  per §17/§18 ("Git / Merge State") requirements, not evaluated further except where directly relevant
  (`staging.html` is used as evidence in §9).

## 2. Documentation Reviewed

| File | Found | Relevance |
|---|---|---|
| `AGENTS.md` | YES | Governs this audit's own conduct; already loaded at session start |
| `SALSABIL_CONSTITUTION.md` | YES | §4/§14 architecture principles; §9 has the actual origin/definition of "Antigravity" as a term (see §3 below) — a different meaning than its later reuse |
| `docs/ARCHITECTURE.md` | YES (v1.12) | Dependency-direction rule (ADR-005, mechanically enforced by dependency-cruiser); no mention of SDUI/Stem/Antigravity anywhere |
| `docs/SECURITY.md` | YES (v1.7) | §0 trust-boundary model; §1 auth status PARTIALLY_IMPLEMENTED; §2 no central authz middleware |
| `docs/DECISIONS.md` | YES (2953 lines) | **Zero ADR/DD entries for SDUI, Stem, or Antigravity** despite `salsabil-frontend-integration-pattern.md` being marked ADOPTED and three same-day 2026-09-21 reports describing real executed work — see §19 Finding 4 |
| `docs/AI_RULES.md` | YES | Scoped to "Hakim," the in-product AI assistant — not relevant to build-tooling AI or to Stem/SDUI |
| `INVARIANTS.md` | YES (865 lines) | Golden Paths section (GP-001, GP-002) — neither mentions SDUI/Stem; no Golden Path currently covers the new Stem UI |
| `docs/salsabil-frontend-integration-pattern.md` | YES (71 lines, status: ADOPTED, 2026-09-21) | The canonical Hard-Rules doc for extending SDUI to production — see §14 |
| `docs/audits/2026-09-14-reef-v1-engineering-audit.md` | YES (316 lines) | Does **not** contain "AF-006" or any test-route-reachability finding, contrary to what two later reports imply — see §19 Finding 3 |
| `docs/audits/SALSABIL_FRONTEND_BACKEND_INTEGRATION_AUDIT.md` | YES (563 lines, 2026-09-21) | Pre-dates the POC/home-migration/Stem-library commits — see §9 for reconciliation |
| `docs/audits/COMPREHENSIVE_PRE_LAUNCH_AUDIT.md` | YES (73 lines, 2026-09-19) | Predates SDUI work; top risks are in-memory locks, no migrations system, no central authz middleware |
| `docs/API_CONTRACTS.md` | YES (39 lines) | Confirms: no real external API exists at all |
| `docs/DATABASE.md` | YES | §8 confirms no formal migrations system; all SQL applied manually |
| `docs/audits/2026-09-21-real-backend-sdui-integration-poc.md` | YES | The proven POC — already summarized, not re-litigated here except where it disagrees with current code |
| `docs/audits/2026-09-21-migrate-home-real-shelf-to-sdui-report.md` | YES | The one production SDUI consumer's own execution report |

## 3. Antigravity Merge Findings

**Repo-wide case-insensitive grep for "Antigravity" returns exactly 8 files, revealing two distinct,
non-identical meanings:**

- **(a) Original meaning — `SALSABIL_CONSTITUTION.md:111-113`:** a table of prior *failed whole-project
  rebuild attempts*. Row 2: "الانتقال إلى Antigravity (Google)" — an attempt to rebuild the entire
  project using Google's Antigravity AI coding tool after a prior attempt (Lovable) ran out of credits.
  Explicitly concluded: "تبيّن أنها أبطأ من المطلوب لبدء تجاري سريع" (turned out too slow for the
  needed fast commercial start) — **abandoned**. The Constitution's *current, approved* path is
  disciplined incremental building with Claude Code/Cursor instead.
- **(b) Current, active meaning — used throughout `docs/audits/SALSABIL_FRONTEND_BACKEND_INTEGRATION_AUDIT.md`
  and `docs/salsabil-frontend-integration-pattern.md`, and matching the git branch name
  `feature/ui-antigravity`:** the label for the new mock-data-backed "Stem" UI component layer
  (`src/components/ui/*Stem*.tsx`, `src/app/test-ui/*`).

**Whether (b) is a literal continuation of tool (a) — i.e., whether these 16 Stem components were
actually generated by Google's Antigravity tool — is UNKNOWN. No file in this repository states this
explicitly**, and the Constitution's own account of (a) describes it as a closed, abandoned chapter.
This is worth resolving directly with the founder, since the Constitution's stated reason for
abandoning (a) ("too slow for a fast commercial start") is in tension with (b) being actively continued
under the same name.

**What was actually merged, independent of naming**, verified via `git show <commit> --stat`:

| Commit | What it added | Files |
|---|---|---|
| `4bc4a80` | Pre-existing SDUI/Stem core: `src/sdui/*` (11 files), `StemProductCard.tsx`, `HorizontalShelfStem.tsx`, `RealCatalogDataSource.ts`, `src/types/ui-contracts.ts` — described in its own commit message as "already written and live-verified... sitting uncommitted in the working tree" | 15 files, 563 insertions |
| `c88ecd4` | SEC-P1-1 security fix (inventory `cost_price` exposure) — unrelated to Stem, sequenced between the two | 3 files |
| `78a0e06` | `MIGRATE-HOME-REAL-SHELF-TO-SDUI`: wires `StemProductCard`/`HorizontalShelfStem` into the real Home page's desktop shelf via new `RealCatalogShelfSDUI.tsx` | 6 files, +361/−23 |
| `a37a484` | **16 new Stem presentational components**, explicitly labeled in its own commit message "Presentational components only, no data-layer wiring" | 16 files, 1,813 insertions |
| `989abb8` | Mock `DataSource` (`ReefMockDataSource.ts`), `DummyCartContext.tsx`, `dummy-ui-service.ts`, `dynamic-nav-config.ts` — commit message: "Explicitly marked as dummy/mock data, not production data paths" | 4 files, 402 insertions |
| `504f32b` | Three test-only routes: `/test-integration`, `/test-portability`, `/test-ui` — commit message: "Not linked from production navigation" | 4 files, 1,069 insertions |
| `8abb5ae` | Standalone `scripts/architecture-gate.mjs` — the SDUI/Stem architecture gate script (Stem Purity, Action Contracts, Engine Isolation, Data Resolver Boundaries) | 1 file |
| `2bf9500` | Stem design tokens / glass-blur CSS variables (current HEAD) | not individually inspected beyond stat |

**Component-by-component reachability (Table, built from direct repo-wide import grep, all 18
Stem-family components audited):**

| Component | Classification | Evidence |
|---|---|---|
| `StemProductCard` | **PRODUCTION-WIRED** | Imported by `src/app/(reef)/RealCatalogShelfSDUI.tsx:25`, itself imported by `src/app/(reef)/page.tsx:15` |
| `HorizontalShelfStem` | **PRODUCTION-WIRED** | Same chain as above, `RealCatalogShelfSDUI.tsx:26` |
| `AddressModalStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:22` |
| `BottomNavStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:11` |
| `CartBreakdownStem` | TEST-ONLY + composition | `test-ui/page.tsx:23`; also used inside `MobileCartSheetStem.tsx:6` (itself test-only) |
| `CartLineItemStem` | TEST-ONLY (composition-only) | Used only inside `MobileCartSheetStem.tsx:5`, `VendorCartGroupStem.tsx:5` — never imported directly by any route |
| `CartUpgradeBannerStem` | TEST-ONLY + composition | `test-ui/page.tsx:20`; `MobileCartSheetStem.tsx:7` |
| `CategoryBarStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:10` |
| `DesktopHeaderStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:15` |
| `MobileCartSheetStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:14` |
| `MobileHeaderStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:12` |
| `OrderSuccessModalStem` | TEST-ONLY + composition | `test-ui/page.tsx:24`; `MobileCartSheetStem.tsx:10` |
| `ProductQuickViewStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:25` |
| `ReelsEmbedModalStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:8` |
| `ReelsHorizontalShelfStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:7` |
| `StemHeroFeedCard` | TEST-ONLY | Only importer: `test-ui/page.tsx:6` |
| `VendorCartGroupStem` | TEST-ONLY + composition | `test-ui/page.tsx:21`; `MobileCartSheetStem.tsx:8` |
| `WorldsTrayStem` | TEST-ONLY | Only importer: `test-ui/page.tsx:13` |

**Verdict: the merge itself is real and clean** (files exist, are committed, pass both architecture
gates, and are internally consistent — the 16 new Stems compose correctly with each other inside
`test-ui/page.tsx`). **The merge did not include wiring any of the 16 new components into a production
route.** Only the two pre-existing Stems from the separate, earlier POC effort reach production, and
only for one feature.

## 4. Why the Old UI Is Still Rendering

**Classification: ROUTING / IMPORT PROBLEM.** Traced directly from browser entry to rendered component
for every major production surface (full detail in §15's truth table). Root cause, stated precisely:

**Every production route file (`src/app/(reef)/page.tsx`'s mobile branch and feed, `layout.tsx`,
`cart/page.tsx`, `checkout/page.tsx`, `product/[id]/page.tsx`, `[district]/**`, `order/[id]/page.tsx`,
and every file under `src/app/merchant/`, `src/app/admin/`, `src/app/delivery/`) still contains a plain
`import` statement pointing at the pre-existing legacy component (`Header`, `BottomNav`,
`HorizontalShelf`, `ProductCard`, `CartVendorGroup`, `CheckoutForm`, `CategoryProductGrid`, `Feed`,
`MobileStorefront`/`MobileSmallProductCard`/`MobileHeroProductCard`) — because no task has replaced
that import with the new Stem equivalent.** There is no feature flag, no A/B branch, no environment
check, no component-registry fallback, and no build/deployment issue causing this — it is the direct
and simple consequence of the fact that only one file (`RealCatalogShelfSDUI.tsx`) was ever written to
consume the new components in a production context, and it was wired into exactly one `<main>` branch
of one page.

Explicitly ruled out (CODE-PROVEN, not RUNTIME-UNVERIFIED, for each):
- **Feature flag problem** — grepped `src/app/(reef)/**`, `layout.tsx`, `proxy.ts`: no feature-flag or
  env-based component-selection logic exists anywhere in the (reef) route tree.
- **Component registry problem** — `componentRegistry` (§6) does have a real, confirmed fragility (an
  unguarded shared singleton), but it does not explain the old-UI-still-showing symptom: production
  code never even calls `componentRegistry.get()` for the legacy components, because the legacy
  components are rendered as plain React JSX, not through the SDUI/`PageEngine` pipeline at all.
- **SDUI resolution failure** — `PageEngine`/`DataResolver` both function correctly where they are
  actually invoked (`RealCatalogShelfSDUI.tsx`, confirmed by the `staging.html` snapshot showing
  `data-page-id="home_real_catalog_shelf"` present and populated). They are simply never invoked by any
  other production file.
- **Build/deployment problem** — `npx tsc --noEmit`, `npm run arch:check`, and
  `npm run architecture:check` all pass clean on the current working tree (§18); this is not a build
  failure masking new code.
- **Legacy page still active / duplicate implementation** — technically true in a narrow sense (the
  legacy `page.tsx`/`layout.tsx`/etc. are exactly the files still active), but this is the *description*
  of the routing/import gap, not a separate root cause.

## 5. Old vs New Frontend Inventory

| # | Feature | Current Production Component | New Stem Equivalent Exists? | Wired Into Production? | Integration Status |
|---|---|---|---|---|---|
| 1a | Home desktop shelf ("منتجات ريف") | `RealCatalogShelfSDUI` → `StemProductCard` inside `HorizontalShelfStem` | Yes (this IS the Stem) | **YES** | **PRODUCTION + REAL BACKEND** |
| 1b | Home desktop feed | `Feed.tsx` | `StemHeroFeedCard` (unwired) | NO | PRODUCTION + REAL BACKEND (legacy path) |
| 1c | Home mobile ("MobileStorefront") | `MobileStorefront.tsx` → legacy `HorizontalShelf` + `MobileSmallProductCard`/`MobileHeroProductCard` | `HorizontalShelfStem`, `StemProductCard` | NO — `page.tsx` comment explicitly states this shelf "stays on the old path unchanged, out of scope" for the migration batch | PRODUCTION + REAL BACKEND (legacy path) |
| 2 | District/category/subcategory pages | `CategoryProductGrid.tsx` (category/sub) / plain `<Link>` grid (district) | `CategoryBarStem` (unwired) | NO | PRODUCTION + REAL BACKEND (legacy path) |
| 3 | Product details | `ProductOptions`, legacy `HorizontalShelf`+`ProductCard` upsell shelf | `ProductQuickViewStem`, `HorizontalShelfStem`, `StemProductCard` | NO | PRODUCTION + REAL BACKEND (legacy path) |
| 4 | Cart | `CartVendorGroup`, legacy `HorizontalShelf`+`ProductCard` cross-sell | `VendorCartGroupStem`, `CartLineItemStem`, `CartBreakdownStem` | NO | PRODUCTION + REAL BACKEND (legacy path) |
| 5 | Checkout | `CheckoutForm.tsx` | No direct Stem equivalent among the 16 | NO | PRODUCTION + REAL BACKEND (legacy path) |
| 6a | Orders list | Static empty-state (no real order-list capability exists at all — by design) | N/A | N/A | NOT INTEGRATED (feature doesn't exist, not a Stem gap) |
| 6b | Order tracking | Inline hand-rolled JSX | `OrderSuccessModalStem` (loose conceptual match only) | NO | PRODUCTION + REAL BACKEND (legacy path) |
| 7 | Header / bottom nav (site shell) | `Header.tsx`, `BottomNav.tsx`, rendered in `src/app/(reef)/layout.tsx` | `DesktopHeaderStem`, `MobileHeaderStem`, `BottomNavStem` | NO | PRODUCTION + REAL BACKEND (legacy path) |
| 8 | Offers | `Feed.tsx` filtered to `postTypes:['offer']` | No dedicated Stem | NO | PRODUCTION + REAL BACKEND (legacy path) |
| 9 | Account/login/register | `PersonalThemeSheet`, `LastOrderCard`, `CustomerLoginForm`, `CustomerRegisterForm` | No direct Stem equivalent | NO | PRODUCTION + REAL BACKEND (legacy path) |
| 10 | Merchant UI (9 pages) | Legacy components throughout | None wired | **NO — zero Stem imports found anywhere under `src/app/merchant/`** | PRODUCTION + REAL BACKEND (legacy path) |
| 11 | Admin UI (10 pages) | Legacy components throughout | None wired | **NO — zero Stem imports found anywhere under `src/app/admin/`** | PRODUCTION + REAL BACKEND (legacy path) |
| 12 | Delivery UI (5 pages) | Legacy components throughout | None wired | **NO — zero Stem imports found anywhere under `src/app/delivery/`** | PRODUCTION + REAL BACKEND (legacy path) |
| 13 | Search | `HeaderSearchBar.tsx` | No dedicated Stem exists | N/A | PRODUCTION + REAL BACKEND (legacy path) |
| 14 | Reels/posts | **No live Reels feature in production.** Only `ReelsShelfPlaceholder.tsx` (6 empty tiles, no data) is rendered, inside `Feed.tsx`. `ReelsFeed.tsx` exists as dead code (unreferenced). Header/MobileStorefront both carry comments confirming the reels tab was deliberately removed (image-only `post_media` data model) | `ReelsEmbedModalStem`, `ReelsHorizontalShelfStem`, `StemHeroFeedCard` | NO | NOT INTEGRATED (legacy placeholder only) |

## 6. SDUI / Stem Integration State

Full chain, confirmed by direct file reads of every file under `src/sdui/`:

```
Backend Service (catalogService.listPurchasableProducts)
  → RealCatalogDataSource (implements DataSource; server-only, real backend)
    → DataResolver (per-instance, not singleton; picks first registered source — single-source
       limitation, self-documented TODO at DataResolver.ts:43)
      → PageSchema (Zod-validated; SectionSchema.type is a CLOSED enum of exactly 4 values:
         hero_card, product_shelf, reels_shelf, category_bar — any new Stem needs a schema edit
         to participate in SDUI at all)
        → PageEngine (pure, Engine-Isolation-verified: imports only react + 3 sibling sdui/ files,
           zero Reef/Supabase/cart imports found)
          → componentRegistry.get(section.type) → StemProductCard (inside HorizontalShelfStem)
            → onAction → ApplicationRuntime (fresh instance per page, not shared)
              → ActionRouter → CapabilityRegistry (per-ApplicationRuntime-instance, not shared)
                → registered 'ADD_TO_CART' capability (RealCatalogShelfSDUI.tsx, orchestration-only)
                  → addToCartAction / updateCartItemAction / removeCartItemAction (existing,
                     unmodified Server Actions)
                    → cartService → cartRepository → Supabase cart_items (real DB write)
```

**Confirmed architectural properties, verified against current code (not assumed from the POC docs):**
- **Engine Isolation holds**: zero Reef/Supabase/cart imports anywhere in `src/sdui/`.
- **`componentRegistry` is a confirmed unguarded shared singleton** — one `Map` instance shared by
  every importer process-wide, `register()` silently overwrites on key collision (only a
  `console.warn`), no reset/scope/teardown API. This is not a stale POC-era claim: current
  `RealCatalogShelfSDUI.tsx:16-17` and `TestIntegrationClient.tsx:59-64` both carry fresh in-code
  comments re-confirming it live, and `test-portability/page.tsx` is a **live, reproducible instance**
  of the hazard — it registers no components of its own and silently depends on whichever other test
  route loaded first in the same session.
- **`CapabilityRegistry`/`ActionRouter` are NOT singletons** — instantiated fresh per
  `ApplicationRuntime`, so no cross-page capability leakage risk exists there (only the component
  registry has this problem).
- Of 8 `UIAction` types defined in `action-contracts.ts`, only **`ADD_TO_CART`** is registered in
  production code. The other 7 (`OPEN_QUICK_VIEW`, `OPEN_REEL`, `NAVIGATE`, `SELECT_CATEGORY`,
  `CHANGE_FEED_TAB`, `CLEAR_CART`, `EXECUTE_SEARCH`) are exercised only inside `test-ui/page.tsx`;
  `EXECUTE_SEARCH` is declared in the contract but registered **nowhere in the entire repository**
  (dead action type).
- **Mock infrastructure is fully isolated from production**, confirmed by exhaustive import trace:
  `DummyCartContext.tsx` has exactly one importer repo-wide (`test-ui/page.tsx`); `ReefMockDataSource`
  has exactly one importer (`test-ui/page.tsx`); `dummy-ui-service.ts` is imported by 4 of the 16 new
  Stems plus `ReefMockDataSource.ts`, but every one of those importing files is itself unreachable from
  production — so this dependency, while technically crossing outside the `test-*` directory boundary
  in file terms, has **no live production code path**.
- `RealCatalogShelfSDUI.tsx` (the one production consumer) imports neither `DummyCartContext` nor
  `dummy-ui-service` nor `ReefMockDataSource` — confirmed clean by direct import-list read.

## 7. Backend Capability Inventory

13 actual domain modules exist under `src/core/modules/` (not the list assumed by the original task
prompt — corrected during research): `admin, audit, bayan, cart, catalog, customer, delivery,
inventory, merchant, merchantStaff, notifications, orders, payments`, plus the cross-cutting identity
kernel `src/core/kernel/khalil/`. **There is no `src/app/api/**` directory anywhere in this repo** — all
frontend↔backend wiring is exclusively through Next.js Server Actions or direct RSC service reads.

| Module | Backend Status | Frontend Status | Integration Status | Notes |
|---|---|---|---|---|
| catalog | PRODUCTION-CAPABLE | OLD (+ 1 new SDUI shelf) | REAL + VERIFIED | Price-calc engine, heavily changed this branch |
| cart | PRODUCTION-CAPABLE | OLD (+ 1 new SDUI shelf) | REAL + VERIFIED | IDOR fix already landed and integration-tested |
| inventory | PRODUCTION-CAPABLE | OLD only | REAL + VERIFIED | See SEC-P1-1 detail below |
| orders | PRODUCTION-CAPABLE | OLD only | REAL + VERIFIED | Full state machine, see below |
| merchant / merchantStaff | PRODUCTION-CAPABLE | OLD only | REAL + VERIFIED | Real password auth |
| delivery | PRODUCTION-CAPABLE (new this branch) | OLD only | REAL + UNVERIFIED (unit tests only, no integration test) | New parallel state machine |
| admin | PRODUCTION-CAPABLE | OLD only | REAL + VERIFIED | |
| bayan (posts/feed) | PRODUCTION-CAPABLE | OLD only | REAL + VERIFIED | Powers `Feed.tsx` |
| customer (account) | PRODUCTION-CAPABLE | OLD only | REAL + VERIFIED | OTP claim flow |
| notifications | PRODUCTION-CAPABLE | N/A (backend-only side effect) | REAL, unit-tested only | Best-effort SMS, never throws |
| audit | PRODUCTION-CAPABLE | N/A | REAL, unit-tested only | No integration test |
| payments | **PARTIAL** | N/A | REAL but stub | Only `CashOnDeliveryProvider`, no-op charge; **zero test coverage**, sits directly in checkout money path |
| khalil (identity kernel) | PRODUCTION-CAPABLE | Backing every login page | REAL + VERIFIED (scrypt + timing-safe compare, Guardian-reviewed) | Not Supabase Auth — home-grown |

**Authentication — clarified finding:** there is **no platform-wide auth system in the Supabase-
Auth/OAuth sense** (still `PROPOSED`, not enabled, per `docs/SECURITY.md` §1). What exists and is real:
phone+scrypt-password login for merchant owner/admin/delivery office/delivery driver/merchant staff,
each with its own session-cookie namespace, plus OTP-based customer account claim. This is genuinely
DB-verified (not a stub) — `KhalilService.verifyPasswordForPhone` does a real lookup + `timingSafeEqual`
hash comparison, with a documented timing-attack fix that went through two independent Guardian review
passes (first BLOCKED, second APPROVED). No central authorization middleware exists anywhere — each
domain's `service.ts` checks its own role.

**SEC-P1-1 (commit `c88ecd4`) — current state:** the application-layer fix (repository no longer
requests `cost_price` over the `anon` client) is committed and live. **The DB-level `REVOKE SELECT
(cost_price)` SQL script (`scripts/2026-09-21-fix-inventory-cost-price-rls-exposure.sql`) exists in the
repo but the commit message itself discloses it had not yet been executed against dev/staging as of
that commit.** This audit did not execute it (explicitly out of scope, would be a database mutation) —
**whether it has since been run is UNKNOWN and should be confirmed**, since the fix as merged is
application-layer only, not yet backed by a database-level grant revocation.

**Orders state machine** (`src/core/modules/orders/types.ts`, enforced in `orders.service.ts`):
`pending → confirmed → preparing → ready → out_for_delivery → delivered`, with `cancelled` reachable
from any non-terminal state. Every transition except the implicit initial `pending` requires role ∈
`{merchant_owner, merchant_manager, employee, platform_admin}`. A code comment explicitly flags
`ready→out_for_delivery`/`out_for_delivery→delivered` as **temporary** grants pending a real
delivery-driver domain — that domain now exists (`delivery` module) but per `merchantStaff.service.ts`'s
own header, is **intentionally not yet wired into `ORDER_TRANSITION_ACTORS`**. This is a real,
self-disclosed gap between two features built in the same branch.

## 8. Duplication / Rebuild Findings

Cross-referencing §5's inventory against the 16 new Stem components, most of them are **visual
rebuilds of features that already have a production component and a real, working backend path** —
not net-new capabilities:

| Capability | Existing Implementation (backend-connected) | New Stem Implementation | Duplicate? | Recommended Direction |
|---|---|---|---|---|
| Site header (desktop/mobile) | `Header.tsx` (single file, internally branches desktop/mobile) | `DesktopHeaderStem` + `MobileHeaderStem` | YES — visual rebuild of an existing, working, backend-agnostic (pure presentational) component | Swap import in `layout.tsx` behind the same additive/reversible pattern as the home shelf — low risk, no backend work needed, header takes no props from a data source today |
| Bottom nav | `BottomNav.tsx` | `BottomNavStem` | YES | Same as above |
| Cart line items / vendor grouping / breakdown | `CartVendorGroup.tsx` + inline cart JSX | `VendorCartGroupStem`, `CartLineItemStem`, `CartBreakdownStem` | YES | Needs a real adapter from `CartSummary` (backend shape) to these Stems' prop shapes — not yet built anywhere; do this as one scoped slice, following the `salsabil-frontend-integration-pattern.md` rules, before wiring |
| Mobile cart sheet | Legacy cart page's own mobile rendering | `MobileCartSheetStem` | YES (partial — legacy mobile cart flow not independently confirmed as a single named component) | Same as above |
| Product quick view | **No existing production quick-view feature identified** | `ProductQuickViewStem` | Possibly net-new capability, not a duplicate — confirm with founder whether one was ever planned/removed | Needs its own capability wiring regardless |
| Category bar | District page's plain `<Link>` grid | `CategoryBarStem` | Loose duplicate (different interaction model, not a 1:1 visual swap) | Needs product-owner decision on whether it's a redesign or literal swap |
| Reels (`ReelsEmbedModalStem`, `ReelsHorizontalShelfStem`) | **No live Reels feature exists in production today** — only `ReelsShelfPlaceholder` (6 empty tiles) remains; the real Reels UI (`ReelsFeed.tsx`) was deliberately removed per in-code comments (image-only `post_media` data model, no video column) | Two new Reels Stems | **NOT a duplicate of anything live** — but also a naming collision: Bayan's real `post_type='reel'` means a tagged *image*, while the Stem's `ReelSnapshot`/`DummyReel` means an embedded external video (YouTube/TikTok/etc.) — same word, two incompatible concepts. Flagged as an open architectural conflict by the earlier `SALSABIL_FRONTEND_BACKEND_INTEGRATION_AUDIT.md`, still unresolved | Needs an explicit founder decision on which "reel" concept is real before any backend wiring is attempted |
| Order success | **No existing production order-confirmation modal identified** (checkout likely redirects directly to an order page) | `OrderSuccessModalStem` | Possibly net-new | Confirm current checkout completion UX before wiring |
| Address entry | Checkout's own address form (inside `CheckoutForm.tsx`, not independently extracted) | `AddressModalStem` | Loose duplicate | Needs a real adapter to the checkout address flow |
| "Worlds" tray | **No "worlds" feature exists anywhere in the current production backend or UI** — `data-world` attributes exist purely as a CSS/theme selector (`diwan`, `reef-lavender`), not a data-backed feature | `WorldsTrayStem` (backed only by `dummy-ui-service.getDummyWorlds()`) | **NOT a duplicate — appears to be a forward-looking/speculative concept** not yet grounded in any real backend capability or documented product decision | Needs explicit founder scoping before any backend work is even considered; do not build a "worlds" backend speculatively |
| Cart upgrade banner | No equivalent found | `CartUpgradeBannerStem` | Not a duplicate | Needs product definition of what "upgrade" means before wiring |

**Do not rebuild:** the backend for catalog, cart, inventory, orders, merchant, delivery, notifications,
customer accounts, and admin already exists, is production-capable, and (per §7) is mostly test-covered.
None of it needs to be recreated to wire any of these Stems — what's missing is exclusively adapters
(view-model mapping) and capability registrations, exactly the pattern already proven once in
`RealCatalogShelfSDUI.tsx`.

## 9. Verified Completed Work

Comparing this audit's findings against the pre-existing `SALSABIL_FRONTEND_BACKEND_INTEGRATION_AUDIT.md`
(written 2026-09-21, **before** the POC/home-shelf-migration/Stem-library commits landed):

- **That audit's finding** ("a complete new UI layer exists, untracked in Git, consumes zero real
  backend services, zero production pages use PageEngine/ApplicationRuntime/DataResolver") — **this
  audit CONTRADICTS that finding for the current state**: the Stem library and SDUI core are now
  tracked in Git, and one production page (`RealCatalogShelfSDUI.tsx` on Home) does use the full
  PageEngine/ApplicationRuntime/DataResolver pipeline with a real backend. The prior audit's finding was
  accurate *for its own point in time* (before commits `4bc4a80`/`78a0e06`/`a37a484` landed) — this
  audit **confirms it is now stale** and should not be cited as current state without this correction.
- **That audit's finding** ("`ADD_TO_CART` carried a client-supplied `price` field, violating
  `INV-SEC-001`") — **this audit CONFIRMS this was fixed**: `action-contracts.ts`'s `ADD_TO_CART` type
  carries no `price` field today; the real capability derives price exclusively server-side.
- **That audit's finding** ("14 of 18 Stem components cannot run through the SDUI engine at all,
  `SectionSchema.type` only accepts 4 values") — **this audit CONFIRMS this is still true and remains a
  real structural gap**: the schema enum is unchanged; any of the 16 new Stems that isn't shaped like
  `hero_card`/`product_shelf`/`reels_shelf`/`category_bar` cannot participate in `PageEngine` without a
  schema edit (a core-file change, requiring the Hard Rule 1 exception process in the pattern doc).

**VERIFIED DONE (runtime evidence, not just code):**
- Real catalog data flowing through `DataResolver`/`PageEngine` to `StemProductCard` on the production
  Home page desktop shelf — confirmed by (a) the 2026-09-21 migration report's own live Playwright
  run + independent DB read, and (b) this audit's own independent corroboration: the untracked
  `staging.html` snapshot (captured 2026-09-21 19:54, right after the relevant commits) contains
  `data-page-id="home_real_catalog_shelf"`, the exact DOM marker `RealCatalogShelfSDUI.tsx` emits.
- `ADD_TO_CART` reaching the real cart Server Actions and writing to the real `cart_items` table for
  that one shelf — same runtime evidence.
- SEC-P1-1 application-layer fix — code-verified (repository query no longer selects `cost_price` over
  anon).
- Both architecture gates (`arch:check`, `architecture:check`) pass clean on current HEAD, re-run live
  by this audit (§18) — not merely asserted by prior reports.

**CODE COMPLETE / RUNTIME-UNVERIFIED:**
- The 16 new Stem components themselves — they render correctly inside `test-ui/page.tsx` per that
  route's own structure, but this audit did not launch a browser against `/test-ui` (out of scope for a
  read-only audit whose only file-write permission is the report itself); their code-level correctness
  is not in question, only their *production* wiring, which is confirmed absent.

**NOT DONE:**
- Any production wiring for 16 of 18 audited Stem components.
- The DB-level `REVOKE` half of SEC-P1-1 (status UNKNOWN, see §7).
- Any ADR/DD entry in `docs/DECISIONS.md` for the SDUI/Stem architecture or its adoption (see §19
  Finding 4).
- Any auth/env guard on the three test-only routes (open since at least the POC's own disclosure).

## 10. Remaining Work

See §11 for the dependency-ordered version. In prose: the SDUI core is proven and stable; the adapter
pattern is proven once (cart capability + product-card view-model mapping); what remains is repeating
that same narrow pattern for each of the other 12 features in §5's inventory, one at a time, each
requiring (a) a view-model adapter from the real backend type to the Stem's prop shape, (b) a
capability registration for whichever `UIAction`s that Stem actually dispatches, and (c) — for Stems
that don't fit the current 4-value `SectionSchema.type` enum — an explicit, disclosed core-schema
change (Hard Rule 1 exception), not a silent one.

## 11. Dependency-Ordered Backlog

**P0 — Blocking integration issues**
1. **Resolve the `/test-integration` real-DB-write exposure** (§19 Finding 2) — this blocks nothing
   architecturally, but is a live security/data-integrity risk that should be decided on (gate it or
   accept the risk explicitly) before any further test-route proliferation. Claude Code should own
   this (it's a routing/guard change, not a Stem/backend rebuild); safe to do in parallel with anything
   else once explicitly authorized (per AGENTS.md §9/§14, this is at minimum an L2/L3 change needing
   founder sign-off since it touches a route boundary, not purely additive).
2. **Confirm whether `scripts/2026-09-21-fix-inventory-cost-price-rls-exposure.sql` has been executed**
   (§7) — if not, the SEC-P1-1 fix is application-layer-only; this is a founder/DBA decision (L4/L5
   territory per AGENTS.md §14), not something Claude Code or Antigravity should execute unprompted.
3. **Record the SDUI/Stem architecture adoption in `docs/DECISIONS.md`** (§19 Finding 4) — a pure
   documentation task, no code risk, should happen before any further Stem wiring so the decision trail
   doesn't keep growing undocumented. Either Claude Code or the founder directly; safe in parallel with
   everything else.

**P1 — Required integration work (migrate existing frontend capabilities to the new architecture, one
slice at a time, following `salsabil-frontend-integration-pattern.md`)**
4. Header/BottomNav swap (`DesktopHeaderStem`/`MobileHeaderStem`/`BottomNavStem`) — lowest risk of the
   remaining 16, since the legacy `Header.tsx`/`BottomNav.tsx` are largely presentational already (no
   data-source dependency beyond nav config). Claude Code should own the wiring; Antigravity/whoever
   built the Stems has already delivered the presentation layer.
5. Cart page Stems (`VendorCartGroupStem`, `CartLineItemStem`, `CartBreakdownStem`,
   `MobileCartSheetStem`) — needs a `CartSummary → Stem props` adapter, medium risk (touches the
   Guardian-Matrix-DEEP-tier cart/financial logic per AGENTS.md §17, so needs the same rigor as the
   original cart POC, not a shortcut).
6. Mobile home shelf (`MobileStorefront` → `HorizontalShelfStem`/`StemProductCard`) — same pattern as
   the already-proven desktop shelf, should be nearly mechanical once P1.4 stabilizes the shared shell.
7. Product detail page's upsell shelf, checkout address (`AddressModalStem`), order success
   (`OrderSuccessModalStem`) — each needs its own small adapter; sequence after cart since checkout
   depends on cart correctness.

**P2 — Missing backend capabilities (genuinely absent, not just unwired)**
8. Product quick-view backend/UX definition (`ProductQuickViewStem` has no existing production
   equivalent to adapt from — needs a product decision, not just an adapter).
9. "Worlds" concept (`WorldsTrayStem`) — no backend capability exists or is documented anywhere;
   requires an explicit founder decision on scope before any backend work.
10. Reels — requires resolving the `post_type='reel'` (image) vs. `ReelSnapshot` (embedded video)
    naming/concept conflict (§8) before any backend or wiring work proceeds.
11. Real order-list capability (§5 row 6a) — does not exist today at all; unrelated to Stem/Antigravity,
    a genuine backend gap.

**P3 — Future enhancements**
12. Search Stem (none exists yet, `HeaderSearchBar.tsx` remains the only implementation).
13. Admin/Merchant/Delivery Stem equivalents — zero Stems target these surfaces today; out of current
    scope until P1 stabilizes the customer-facing pattern.

## 12. Claude Code Responsibilities

Per existing project boundaries (`AGENTS.md`, `docs/salsabil-frontend-integration-pattern.md`), and
confirmed by what has already happened in practice on 2026-09-21:
- Backend services, repositories, Server Actions, adapters/DataSources, capability registrations,
  security fixes, database work, routing/runtime wiring, verification (typecheck/arch gates/tests),
  and Server-vs-Client Component placement decisions (the POC's own §J.1 deviation is exactly this kind
  of call).
- Owning the `salsabil-frontend-integration-pattern.md` Hard Rules and enforcing them on every future
  Stem-wiring task (the `.has()` guard rule, Rule 4, exists specifically because the POC itself
  violated it once before the rule was written down — Claude Code should not repeat that).
- Deciding, per AGENTS.md §17 Guardian Matrix, the review severity for each wiring slice (cart/checkout
  wiring is DEEP-tier; header/nav swap is likely LIGHT–MEDIUM).

## 13. Antigravity Responsibilities

Extracted from what the existing "Stem" commits actually did (presentation-only, explicitly disclaimed
"no data-layer wiring" in `a37a484`'s own commit message) and from `SALSABIL_CONSTITUTION.md`'s
architecture boundaries:
- **Allowed:** presentational Stem components, responsive/visual states, theming, UI contracts (prop
  shapes), mock/demo data strictly confined to `dummy-ui-service.ts`/test routes as already
  established.
- **Must not:** create or duplicate backend services, database logic, authoritative price/inventory/
  payment logic, or business-critical server logic (this is an existing, explicit constitutional rule,
  §4 of `SALSABIL_CONSTITUTION.md`, not invented for this audit) — and per §14 of that audit's own open
  question, **must not silently redefine feature scope** (e.g. `WorldsTrayStem`) without an explicit
  founder decision recorded in `docs/DECISIONS.md`, since no such decision currently exists for that
  concept.

## 14. Proven Integration Pattern

**PROVEN** (by the POC + its production extension, both with real runtime/DB evidence, re-confirmed
live by this audit's own architecture-gate runs and the `staging.html` corroboration):

```
Real Backend Service → per-feature DataSource → DataResolver (unmodified) → SectionSchema
  → PageEngine (unmodified) → Stem (presentation) → UIAction → ApplicationRuntime (unmodified)
  → ActionRouter (unmodified) → CapabilityRegistry → per-feature capability (orchestration only)
  → existing Server Action → existing Service/Repository → Database
```

**What must remain unchanged when reusing this pattern:** `DataResolver.ts`, `PageEngine.tsx`,
`ApplicationRuntime.ts`, `ActionRouter.ts`, `CapabilityRegistry.ts` — Hard Rule 1 of
`salsabil-frontend-integration-pattern.md`, and confirmed still true of the current code (Engine
Isolation check, §6).

**What is reusable as-is:** the whole SDUI core, `StemProductCard`, `HorizontalShelfStore`
[`HorizontalShelfStem`], and the `.has()`-guarded component-registration convention.

**What remains unproven:** everything past `SectionSchema`'s current 4-value enum (i.e., any Stem whose
natural shape isn't `hero_card`/`product_shelf`/`reels_shelf`/`category_bar` — which is 14 of the 16 new
Stems); multi-source `DataResolver` behavior (only ever tested with exactly one registered source, a
self-documented limitation); and the `componentRegistry` singleton hazard remains a live, undecided
architectural debt (Hard Rule 4 mitigates the symptom for new registrations but does not fix the root
cause).

## 15. Routing / Rendering Truth Table

| User Entry | Actual Route | Page | Layout | Main UI Component | Old/New | SDUI? | Backend Connected? |
|---|---|---|---|---|---|---|---|
| `/` desktop shelf | `src/app/(reef)/page.tsx` | same | `(reef)/layout.tsx` | `RealCatalogShelfSDUI` → `StemProductCard` | **NEW** | YES | YES (real) |
| `/` desktop feed / mobile | `src/app/(reef)/page.tsx` | same | `(reef)/layout.tsx` | `Feed.tsx` / `MobileStorefront.tsx` | OLD | NO | YES (real) |
| `/[district]` | `[district]/page.tsx` | same | `(reef)/layout.tsx` | Plain `<Link>` grid | OLD | NO | YES (real) |
| `/[district]/[category]` | `[category]/page.tsx` | same | `(reef)/layout.tsx` | `CategoryProductGrid` | OLD | NO | YES (real) |
| `/product/[id]` | `product/[id]/page.tsx` | same | `(reef)/layout.tsx` | `ProductOptions` + legacy shelf | OLD | NO | YES (real) |
| `/cart` | `cart/page.tsx` | same | `(reef)/layout.tsx` | `CartVendorGroup` + legacy shelf | OLD | NO | YES (real) |
| `/checkout` | `checkout/page.tsx` | same | `(reef)/layout.tsx` | `CheckoutForm` | OLD | NO | YES (real) |
| `/order/[id]` | `order/[id]/page.tsx` | same | `(reef)/layout.tsx` | Inline JSX | OLD | NO | YES (real) |
| every `(reef)` page's header/nav | n/a | n/a | `(reef)/layout.tsx` | `Header` + `BottomNav` | OLD | NO | N/A (nav is static) |
| `/merchant/*` (9 routes) | respective `page.tsx` | — | own layout | legacy components throughout | OLD | NO | YES (real) |
| `/admin/*` (10 routes) | respective `page.tsx` | — | own layout | legacy components throughout | OLD | NO | YES (real) |
| `/delivery/*` (5 routes) | respective `page.tsx` | — | own layout | legacy components throughout | OLD | NO | YES (real) |
| `/test-ui` | `test-ui/page.tsx` | — | root layout only | 13+ Stem components, all mock-backed | **NEW (all 16)** | YES (mock `DataSource`) | NO (mock) |
| `/test-portability` | `test-portability/page.tsx` | — | root layout only | Isolated inline mock | NEW (isolation test) | YES (inline mock) | NO (mock) |
| `/test-integration` | `test-integration/page.tsx` | — | root layout only | `StemProductCard`/`HorizontalShelfStem`, real catalog | NEW (POC pattern) | YES (real `DataSource`) | **YES (real) — see Finding 2, §19** |

No middleware/redirect/feature-flag logic exists anywhere in this table; `src/proxy.ts` only ensures a
guest cart-session cookie exists on every non-`/admin`/`/merchant`/`/api` route (including the three
test routes) — it performs no routing decisions and no auth gating.

## 16. Test vs POC vs Production Separation

| Route/File | Classification | Reachable w/o guard? | Data | Real DB writes? |
|---|---|---|---|---|
| `/test-ui` | **TEST** (dev harness, all 16 new Stems + 2 pre-existing) | YES | 100% mock (`dummy-ui-service.ts`, `ReefMockDataSource`, `DummyCartContext`/`localStorage`) | NO |
| `/test-portability` | **TEST** (isolation check — deliberately imports nothing Reef-specific) | YES | Inline throwaway mock | NO |
| `/test-integration` | **POC** (the original proof that the pattern works end-to-end) | YES | **Real catalog + real cart** | **YES** |
| `src/app/(reef)/RealCatalogShelfSDUI.tsx` | **PRODUCTION** | N/A (part of `/`) | Real | YES |
| Everything else under `(reef)`/`merchant`/`admin`/`delivery` | **PRODUCTION** | N/A | Real | YES |

**A successful `/test-ui` or `/test-portability` visual check proves nothing about production
integration** — both are 100% mock, by design, confirmed by import trace. **`/test-integration`
is different in kind**: it proves the pattern works, but it is also a live, ungated, real-data-mutating
endpoint sitting in the production build today — it should not be treated as "just another test page"
when reasoning about production risk (see §19 Finding 2).

## 17. Git / Merge State

Already detailed in §1. Summary: current branch `feat/stem-design-tokens`, 57 commits ahead of `main`,
working tree has 4 uncommitted tracked-file changes (all unrelated to SDUI/Antigravity except the
`architecture:check` script-entry addition) and 3 untracked files (a stale scratch JSON dump, a
disaster-recovery backup script explicitly marked as never-merged, and a `staging.html` snapshot used
as corroborating evidence in §9). No merge conflicts present. No git commands were run beyond read-only
`log`/`status`/`diff`/`show`.

## 18. Verification Commands and Results

| Command | Result | Detail |
|---|---|---|
| `npm run arch:check` (`depcruise src --config .dependency-cruiser.cjs`) | **PASS** | "no dependency violations found (308 modules, 1177 dependencies cruised)" |
| `npm run architecture:check` (`node scripts/architecture-gate.mjs`) | **PASS** | Stem Purity ✅, Action Contracts ✅, Engine Isolation ✅, Data Resolver Boundaries ✅ |
| `npx tsc --noEmit` | **PASS** | Exit code 0, zero errors |

No test suite (`npm run test`/`test:unit`/`test:integration`) was run — not required to answer this
audit's questions, and prior reports (§9-referenced) already document baseline flakiness in this
sandbox unrelated to code correctness; re-running was judged unnecessary scope for a routing/reachability
audit. Flagged as NOT RUN, not NOT AVAILABLE (the commands exist and are defined in `package.json`).

## 19. Critical Findings

1. **The old UI is still showing because only 2 of 18 new/POC Stem components were ever wired into a
   production route, and only for one shelf on the desktop Home page.** All 16 components from the
   dedicated "Stem library" commit (`a37a484`) have zero production importers — their only consumer is
   the test-only `/test-ui` route. **CODE-VERIFIED.**
2. **`/test-integration` is reachable by any visitor with no authentication or environment guard, and
   performs real writes to the production `cart_items` table** using the same Server Actions the live
   storefront uses — unlike the other two test routes, which are fully mock. This is a live, currently
   open risk (not previously flagged with this specific framing in any prior report — the POC report
   only classified all three test routes together as "reachable," without separately calling out that
   this one, uniquely, mutates real data). **CODE-VERIFIED, RUNTIME-PROVEN** (by the POC's own
   documented live DB write).
3. **A load-bearing citation, `AF-006`, sourced to a document called
   `SALSABIL_BACKEND_ARCHITECTURE_FORENSIC_AUDIT`, is cited as authoritative/closed evidence in
   `docs/DECISIONS.md` and three 2026-09-21 audit reports — but that source document does not exist
   anywhere in this repository or its git history.** The underlying conclusion (test routes reachable
   with no guard) is independently re-confirmed as still true by this audit's own direct inspection, so
   the finding itself stands — but the citation chain supporting it is broken and untraceable.
   **CODE-VERIFIED (document absence), independently re-confirmed (underlying claim).**
4. **No ADR or Decision-Debt entry exists in `docs/DECISIONS.md` for the SDUI/Stem architecture or its
   production adoption**, despite `salsabil-frontend-integration-pattern.md` being marked `ADOPTED` and
   three same-day reports describing real, executed, verified integration work — a repeat of a failure
   pattern the project's own 2026-09-14 audit already caught once before (an undocumented ADR
   reference for the catalog master-item feature). **CODE-VERIFIED.**
5. **The `componentRegistry` is a confirmed unguarded shared singleton** with a live, reproducible
   collision instance (`test-portability/page.tsx` silently depends on registration order). Mitigated
   for new registrations by a documented convention (`.has()` guard, Hard Rule 4) but the underlying
   design flaw is unfixed. **CODE-VERIFIED.**
6. **SEC-P1-1's database-level fix (the `REVOKE` SQL script) has unknown execution status** — the
   commit that introduced it explicitly disclosed it had not yet been run against dev/staging; nothing
   found in this audit confirms it has been since. **UNKNOWN — needs founder/DBA confirmation.**
7. **Existing, real, DB-verified backend capabilities cover essentially every domain needed** (catalog,
   cart, inventory, orders, merchant, delivery, notifications, customer accounts, admin) — none of this
   needs to be rebuilt to wire the remaining Stems. **CODE-VERIFIED** (§7).
8. **Two backend capabilities are genuinely missing, not just unwired**: a real customer order-list
   feature (the orders list page is a permanent static empty state by design) and any backend/data
   model for the "Worlds" concept the `WorldsTrayStem` implies. **CODE-VERIFIED.**
9. **Most of the 16 new Stem components are visual rebuilds of features that already work end-to-end on
   the old stack** (header, nav, cart breakdown, cart line items) — the blocking work is adapters, not
   new backend capability, and not new presentation work either (the presentation already exists on
   both sides). **CODE-VERIFIED** (§8).
10. **The single safest next implementation task is the header/bottom-nav swap** (`DesktopHeaderStem` /
    `MobileHeaderStem` / `BottomNavStem` into `layout.tsx`) — it requires no new adapter (these
    components are not data-source-dependent beyond static nav config, which already has a real
    non-dummy equivalent path available), follows the exact pattern already proven twice, and is the
    lowest-blast-radius production surface among the 16 unwired Stems (touches no cart/checkout/
    financial logic, so does not require a DEEP-tier Guardian review per AGENTS.md §17 — likely
    LIGHT–MEDIUM).

## 20. Exact Next Step

**The single safest next implementation task, based strictly on the evidence above, is: wire
`DesktopHeaderStem`/`MobileHeaderStem`/`BottomNavStem` into `src/app/(reef)/layout.tsx`, replacing
`Header`/`BottomNav`, following the exact additive/reversible, `.has()`-guarded pattern already proven
twice (POC + Home shelf migration).** It is not gated on resolving the P0 items in §11, but those three
P0 items (test-route exposure decision, SEC-P1-1 DB-fix confirmation, missing DECISIONS.md entry)
should be resolved in parallel, not silently deferred, since two of them are founder-level decisions
this audit cannot make on its own.

### Direct answers to the audit's required questions

1. **Why are the old interfaces still appearing?** Because only 2 of 18 new/POC Stem components were
   ever imported into a production route file — a routing/import gap, not a bug (§4, §19.1).
2. **Which new Antigravity interfaces are actually present?** All 16 from `a37a484`, plus the 2
   pre-existing ones from the earlier POC (`4bc4a80`) — 18 total, all present as committed files (§3).
3. **Which are actually reachable?** All 18 are reachable at `/test-ui`; 2 are additionally reachable in
   production (`/`, desktop only); the rest are reachable nowhere outside `/test-ui` (§3, §15).
4. **Which are actually connected to real backend services?** Only the 2 wired into
   `RealCatalogShelfSDUI.tsx` (§6). The POC route (`/test-integration`) also connects 2 of them to real
   backend, but is not a production surface (§16).
5. **What exactly did the successful POC prove?** That the full
   Backend→DataSource→DataResolver→PageEngine→Stem→Action→Capability→Server-Action chain works
   end-to-end with real data and real writes, for exactly one product-shelf-shaped feature (§14).
6. **What is still only mock/isolated?** The other 16 Stems, `DummyCartContext`, `dummy-ui-service`,
   `ReefMockDataSource` — all confirmed to have zero production import paths (§3, §6).
7. **Which backend capabilities already exist and must NOT be rebuilt?** Catalog, cart, inventory,
   orders, merchant, merchantStaff, delivery, notifications, customer accounts, admin, bayan/feed — all
   production-capable today (§7, §8).
8. **Which backend capabilities are genuinely missing?** Real customer order-list; any backend for the
   "Worlds" concept; the Reels naming conflict needs resolution before any Reels backend work (§8, §11
   P2).
9. **What work is currently blocking the next integration?** Nothing architecturally blocks the header/
   nav swap; the three P0 items (§11) are risk/governance blockers, not technical ones.
10. **What is the single safest next implementation task?** Header/bottom-nav Stem swap (§19.10, above).
11. **Should Antigravity continue building new interfaces now, or pause?** Based on the evidence, it
    should **pause building entirely new Stem surfaces** and instead let Claude Code finish wiring the
    16 that already exist — building more unwired presentation compounds the same gap rather than
    closing it. This is an inference from the repository's own state, not a pre-existing rule.
12. **If Antigravity continues, exactly what is it allowed to build?** Per §13: presentational
    components, visual states, theming — strictly no backend/business logic, and no new speculative
    concepts (like "Worlds") without a founder decision first.
13. **What must Claude Code integrate next?** The header/nav swap, then cart Stems, following §11's
    ordering.
14. **What is the correct sequence for integrating the remaining interfaces?** As ordered in §11: P0
    governance items in parallel with P1.4 (header/nav) → P1.5 (cart) → P1.6 (mobile shelf) → P1.7
    (checkout/address/order-success) → P2 items only after their respective founder decisions land.
15. **Which work can safely happen in parallel and which must be sequential?** §11's P0 items are
    parallel-safe with any P1 work. Within P1, header/nav (4) can happen independently of cart (5); (6)
    depends on (4)'s shared-shell stabilizing; (7) depends on (5)'s cart adapter existing first. P2
    items are blocked on explicit founder decisions, not on any P1 code.

This determines **MODEL B** (build one interface → integrate → verify → repeat) as the evidenced-correct
workflow, not MODEL A: the one slice that was integrated this way (the Home desktop shelf) is the only
one that reached RUNTIME-VERIFIED status; the 16 slices built without immediate integration (MODEL A's
premise) are exactly the ones now sitting disconnected. The repository's own history is the evidence for
this choice, not a stated preference.

## 21. Appendix — Important Files and Symbols

- `src/sdui/schema/page.schema.ts` — `SectionSchema.type` enum (currently 4 values; the hard limit on
  what can flow through `PageEngine` without a core-schema change)
- `src/sdui/data/DataResolver.ts:43` — single-source-only limitation, self-documented
- `src/sdui/registry/component-registry.ts:7-12` — the unguarded singleton `register()` method
- `src/app/(reef)/RealCatalogShelfSDUI.tsx` — the one production SDUI consumer; the template to copy
- `src/app/(reef)/data/RealCatalogDataSource.ts` vs `src/app/(reef)/data/ReefMockDataSource.ts` — real
  vs. mock `DataSource` implementations, confirm which one any new wiring task instantiates
- `src/sdui/actions/action-contracts.ts` — `UIAction` union; `ADD_TO_CART`'s price-field removal is the
  canonical example of the "server is source of truth" rule
- `docs/salsabil-frontend-integration-pattern.md` — the 7 Hard Rules governing any future wiring task
- `src/app/test-ui/page.tsx`, `src/app/test-portability/page.tsx`, `src/app/test-integration/page.tsx`
  + `TestIntegrationClient.tsx` — the three test/POC routes; `test-integration` is the one with real
  DB-write risk (§19.2)
- `src/core/modules/*/service.ts` (13 modules) + `src/core/kernel/khalil/` — the real backend surface
  available to adapt against, none of it needing to be rebuilt

---

## Proposed Permanent Project Execution Rules

For the future shared governance document read by both Claude Code and Antigravity, extracted only from
evidence in this audit — nothing invented:

1. **Never rebuild an existing backend capability without an explicit architectural decision.**
   *(RECOMMENDED FROM AUDIT — §8 shows most new Stems duplicate already-working, already-backend-connected
   features; the risk is rebuilding, not the presentation work itself.)*
2. **A Stem component's existence, or its use inside `/test-ui`, is never proof of production
   integration.** Only an import trace from an actual production route file counts. *(PROVEN BY POC/this
   audit — §3, §6.)*
3. **Separate presentation from backend authority; use adapters between real backend services and
   presentation contracts, never let a Stem call a service/repository directly.** *(EXISTING RULE —
   `SALSABIL_CONSTITUTION.md` §4, `docs/ARCHITECTURE.md` ADR-005, mechanically enforced by
   dependency-cruiser.)*
4. **Verify one complete integration slice (real runtime + independent DB check) before multiplying the
   pattern to more Stems.** *(PROVEN BY POC — the one slice built this way is the only one that reached
   RUNTIME-VERIFIED status; the 16 built without this discipline are exactly the ones now disconnected.)*
5. **Any `componentRegistry.register()` call for a section type MUST guard with `.has()` first.**
   *(EXISTING RULE — `salsabil-frontend-integration-pattern.md` Hard Rule 4, written in direct response
   to the POC's own earlier violation of it.)*
6. **No client-supplied price, ever, on any action payload.** *(EXISTING RULE — `SALSABIL_CONSTITUTION.md`,
   `INV-SEC-001`, enforced in `ADD_TO_CART`'s current contract.)*
7. **Antigravity must not create authoritative business/financial/inventory/payment logic.**
   *(EXISTING RULE — `SALSABIL_CONSTITUTION.md` §4; also self-disclosed by `a37a484`'s own commit
   message, "presentational components only, no data-layer wiring.")*
8. **Every architecturally significant decision (a new UI system, a pattern-doc adoption, a production
   integration) must get a `docs/DECISIONS.md` entry — not just an audit report.** *(RECOMMENDED FROM
   AUDIT — §19 Finding 4 shows this was skipped for the entire SDUI/Stem adoption, repeating a failure
   the project's own 2026-09-14 audit already caught once.)*
9. **Test-only routes that can write to real production data must be explicitly labeled and gated, not
   treated the same as fully-mock test routes.** *(RECOMMENDED FROM AUDIT — §19 Finding 2; no existing
   rule currently distinguishes `/test-integration`'s risk profile from `/test-ui`'s.)*
10. **Any citation to a prior audit finding (e.g., an `AF-` tag) must point to a document that actually
    exists in the repository; a citation to a non-existent source should never be treated as closed/
    authoritative.** *(RECOMMENDED FROM AUDIT — §19 Finding 3.)*
11. **Core SDUI files (`DataResolver`, `PageEngine`, `ApplicationRuntime`, `ActionRouter`,
    `CapabilityRegistry`) never change per-feature; extending SDUI to a new feature means adding a
    DataSource/adapter/capability, not editing these files.** *(EXISTING RULE —
    `salsabil-frontend-integration-pattern.md` Hard Rule 1, verified still true of current code, §6.)*
12. **Do not build backend or wiring for a UI concept that has no corresponding founder-approved product
    decision** (e.g. "Worlds"). *(RECOMMENDED FROM AUDIT — §8, §11 P2 — no existing rule covers this
    case explicitly, but it follows directly from Capability Before Creation, `AGENTS.md` §2.)*

---

## Execution Report

```
Files created: 1 (docs/audits/2026-09-22-post-antigravity-integration-forensic-audit.md)
Files modified: 0
Database changes: 0
Configuration changes: 0
Dependency changes: 0
Git changes: 0
```

Task: POST-ANTIGRAVITY MERGE FORENSIC AUDIT
Files added / modified / removed: 1 added (this report) / 0 modified / 0 removed
LOC added / removed / net: report only, no source LOC touched
New dependencies: 0
New DB objects: 0
New endpoints/actions: 0
Capabilities reused: N/A — read-only audit, no implementation
New abstractions: 0
Architecture violations found: none introduced by this audit; documented pre-existing findings only
  (§19) — componentRegistry singleton fragility, ungated `/test-integration` real-write exposure,
  missing DECISIONS.md entries, dangling AF-006 citation
Security checks: PASS (read-only inspection only; no security-sensitive code touched); one open risk
  surfaced (§19.2) and one unconfirmed remediation status (§19.6) — both disclosed, neither fixed, per
  this task's explicit read-only mandate
Tenant isolation checks: N/A — no tenant-scoped code touched
Tests: 0 run beyond the three read-only verification commands in §18 (all PASS); no test suite executed
Docs updated: docs/audits/2026-09-22-post-antigravity-integration-forensic-audit.md (new file only)
Outstanding risks (explicit, not defaulted to "none"):
  1. `/test-integration` reachable with no auth/env guard, performs real DB writes (§19.2) — not fixed
     here (read-only audit scope); risk: any visitor can mutate real cart data with no gate; needs a
     DECISION-DEBT entry in docs/DECISIONS.md per AGENTS.md §12, not recorded by this audit itself
     since this audit's only file-write permission was this report.
  2. SEC-P1-1 DB-level REVOKE script execution status UNKNOWN (§19.6/§7) — not fixed here (would be a
     database mutation, explicitly forbidden for this task); risk: cost_price may still be exposed at
     the DB grant level if the script was never run; needs founder/DBA confirmation, not a DECISION-DEBT
     entry (this is a verification gap, not a design decision).
  3. `componentRegistry` unguarded singleton (§19.5) — not fixed here (out of this audit's scope and
     the originating POC's own scope); risk: any future test/production page that registers a section
     type without checking `.has()` can silently clobber another page's registration; already
     partially tracked via Hard Rule 4 but the root design flaw remains; a DECISION-DEBT entry for the
     underlying singleton design (distinct from the mitigation) does not yet exist in
     docs/DECISIONS.md.
  4. No `docs/DECISIONS.md` entry for the SDUI/Stem architecture adoption itself (§19.4) — not fixed
     here (this audit's only permitted file write is this report); risk: repeats a previously-caught
     documentation-gap failure mode; should be created directly by the founder or a dedicated
     documentation task, not silently absorbed into this report.
```

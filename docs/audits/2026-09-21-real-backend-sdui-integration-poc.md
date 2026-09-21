---
title: Real Backend → SDUI Integration POC — Execution & Verification Report
status: COMPLETE
date: 2026-09-21
mode: EXECUTION (controlled, scope-limited)
scope: prove one vertical slice — real catalog data through SDUI to StemProductCard, and a real
       ADD_TO_CART write through the existing cart Server Action/service/repository/DB — nothing else.
related: SEC-P1-1 (treated as CLOSED/VERIFIED per task instruction, not touched here)
---

# Real Backend → SDUI Integration POC — Execution & Verification Report

## A. Executive Summary

**Built and proven.** A single isolated page, `/test-integration`, demonstrates the full vertical
slice end-to-end using exclusively real, already-existing backend code: real catalog products
(`catalogService.listPurchasableProducts`) flow through the generic SDUI `DataResolver`/`PageEngine`
into the real `StemProductCard`, and clicking its add-to-cart control dispatches `UIAction.ADD_TO_CART`
through `ApplicationRuntime` → `ActionRouter` → a registered capability that calls the **existing**
cart Server Actions (`addToCartAction`/`updateCartItemAction`/`removeCartItemAction`), which write to
the real `cart_items` table via the existing `cartService`/`cartRepository`. Both the read path and the
write path were verified by actually running the app in a browser (Playwright) against the real dev
database, and the write was independently confirmed by querying `cart_items` directly with the
`service_role` key — not by trusting the app's own on-screen log alone.

The `ADD_TO_CART` action contract was corrected as part of this POC: it no longer carries a
client-supplied `price` field at all (see §D). No DataResolver/PageEngine/QueryRegistry core file was
modified. No new cart/business logic was created — the capability only orchestrates four existing
Server Actions.

One architectural placement decision was required and is disclosed in full in §J/§I: the real
`DataSource` cannot be invoked from client-side code (it transitively imports the `server-only`-guarded
`service_role` Supabase client through `catalog.repository.ts`), so read-path resolution happens in a
Server Component rather than in a client `useEffect` as `test-ui/page.tsx` does with mock data. This is
a call-site choice only — no core SDUI file changed — and is judged not to meet the bar for an
Architectural Escalation Stop (§17 of the task prompt).

## B. Files Created

- `src/app/(reef)/data/RealCatalogDataSource.ts` — real `DataSource` implementation, mirrors
  `ReefMockDataSource.ts` in the same folder, calls `catalogService.listPurchasableProducts`.
- `src/app/test-integration/page.tsx` — the isolated POC route. Server Component: builds
  `QueryRegistry`/`DataResolver`/`RealCatalogDataSource`, resolves the page schema, reads the existing
  cart summary (`getCartSummaryIfExistsAction`) for initial quantities, renders the client wrapper.
- `src/app/test-integration/TestIntegrationClient.tsx` — Client Component: builds `ApplicationRuntime`
  once, registers the real `ADD_TO_CART` capability, registers the `'product_shelf'` component wrapper
  (contains the product → Stem view-model adapter), renders `PageEngine` + a small on-page Action Log.
- `docs/audits/2026-09-21-real-backend-sdui-integration-poc.md` — this report.

No other file was created. An ephemeral Playwright driver script (`tmp-poc-verify.mjs`) was written
directly to the project root during runtime verification (to resolve the `playwright` package from
`node_modules`) and was deleted immediately after use — it was never committed and is not one of the
files this task permits keeping; disclosed here for full transparency, not hidden.

## C. Files Modified

All five are pre-existing files whose only change was removing the client-supplied `price` field from
`UIAction.ADD_TO_CART`'s payload (or adapting to that removal) — required by §9 of the task prompt
("trace every existing caller of ADD_TO_CART and make only the minimum changes necessary"). All five
are confirmed test/scratch-only surfaces (Stem components and the `test-ui` harness), never reachable
from any production route — confirmed by the prior forensic audit and re-confirmed by grep in this
session.

| File | Change |
|---|---|
| `src/sdui/actions/action-contracts.ts` | Removed `price: number` from `ADD_TO_CART`'s payload type. This is the actual contract fix (§D). |
| `src/components/ui/StemProductCard.tsx` | Removed `price` from its two `ADD_TO_CART` dispatch call sites (increment/decrement). `price` remains a display prop — unaffected. |
| `src/components/ui/ProductQuickViewStem.tsx` | Removed `price` from its one `ADD_TO_CART` dispatch call site. |
| `src/components/ui/MobileCartSheetStem.tsx` | Removed `price` from its one `ADD_TO_CART` dispatch payload literal (local helper's own signature untouched). |
| `src/app/test-ui/page.tsx` | Removed `price` from its two `onAddToCart` dispatch lambdas; its `ADD_TO_CART` capability now derives price locally from the mock `products` array instead of reading it off the (now price-less) action payload — keeps the mock `DummyCartContext.updateQuantity(id, price, qty)` call working without modifying `DummyCartContext` itself. |

`src/app/test-portability/page.tsx` needed **no change** — its `ADD_TO_CART` handler never
destructured `price` in the first place (verified by direct read).

## D. ADD_TO_CART Contract

**Before:**
```ts
| { type: 'ADD_TO_CART'; payload: { id: string; price: number; amount?: number; action?: 'increment' | 'decrement' | 'set' } }
```

**After:**
```ts
| { type: 'ADD_TO_CART'; payload: { id: string; amount?: number; action?: 'increment' | 'decrement' | 'set' } }
```

Only `price` was removed — no field was invented, no variant/selection identity was added (the
existing cart contract, `AddItemInput` in `src/core/modules/cart/types.ts`, only requires
`productId`/`quantity`/optional `selection`; the POC's product data has no size/addon options, so no
selection identity was needed here, matching §5's instruction not to invent variant architecture).

The real capability (`TestIntegrationClient.tsx`) never reads or forwards any price from the client. It
resolves the current real cart state via `getCartSummaryAction()` first, computes the desired absolute
quantity from `action`/`amount`, and calls `addToCartAction({ productId, quantity })` /
`updateCartItemAction(itemId, quantity)` / `removeCartItemAction(itemId)` — all of which are the
**existing** actions, unmodified. The actual unit price is computed exclusively server-side inside
`cartService.buildSummary()` via `catalogService.calculatePrice()`, exactly as before this POC.

## E. Real Data Path (actual repository symbols, no placeholders)

```
catalogService.listPurchasableProducts(limit)
  src/core/modules/catalog/catalog.service.ts:45
        ↓
RealCatalogDataSource.resolve('query.real_products', { limit: 8 })
  src/app/(reef)/data/RealCatalogDataSource.ts
        ↓
DataResolver.resolvePage(testIntegrationPageSchema)
  src/sdui/data/DataResolver.ts   (unmodified — invoked server-side)
        ↓  — called from —
TestIntegrationPage()  (async Server Component)
  src/app/test-integration/page.tsx
        ↓  — resolved SDUIPage passed as a prop to —
TestIntegrationClient  (Client Component)
  src/app/test-integration/TestIntegrationClient.tsx
        ↓
PageEngine
  src/sdui/engine/PageEngine.tsx   (unmodified)
        ↓  — section.type === 'product_shelf' resolves to —
TestIntegrationShelf  (SDUIComponent) → mapProductToStemProps() adapter
  src/app/test-integration/TestIntegrationClient.tsx
        ↓
StemProductCard
  src/components/ui/StemProductCard.tsx
```

**Runtime-observed evidence (not assumed):** the browser console printed
`[DataResolver] Resolved props for source default: {title: "منتجات حقيقية من الكتالوج (POC)", items: Array(8)}`
— that log line is emitted from inside the real, unmodified `DataResolver.resolveProps()` — and the
rendered page showed 8 real product names/prices from the live catalog (e.g. "سنسوداين معجون اسنان
ترميم 75مل+هدية — 64.75 ج.م"), not placeholder text.

## F. Real Action Path (actual repository symbols, no placeholders)

```
StemProductCard.handleIncrement()
  src/components/ui/StemProductCard.tsx:20-27
        ↓  onAction({ type: 'ADD_TO_CART', payload: { id, action: 'increment' } })
ApplicationRuntime.dispatch
  src/sdui/runtime/ApplicationRuntime.ts:21   (unmodified; bound as PageEngine's onAction prop)
        ↓
ActionRouter.dispatch()
  src/sdui/runtime/ActionRouter.ts:7   (unmodified)
        ↓
CapabilityRegistry.getHandler('ADD_TO_CART')
  src/sdui/runtime/CapabilityRegistry.ts:15   (unmodified)
        ↓
registered ADD_TO_CART capability
  src/app/test-integration/TestIntegrationClient.tsx  (inside useMemo, built once)
        ↓
getCartSummaryAction() / addToCartAction() / updateCartItemAction() / removeCartItemAction()
  src/app/(reef)/cart/actions.ts   (unmodified — the exact, existing Server Actions)
        ↓
cartService.addItem() / updateItemQuantity() / removeItem()
  src/core/modules/cart/cart.service.ts:114 / 156 / 177   (unmodified)
        ↓
cartRepository.insertItem() / updateItemQuantity() / deleteItem()
  src/core/modules/cart/cart.repository.ts   (unmodified)
        ↓
Supabase `cart_items` table (service_role client) — real row confirmed, see §G
```

## G. Runtime Verification

Executed via a headless Playwright/Chromium session against `npm run dev` (localhost:3000), navigating
to `/test-integration` and interacting with the real, rendered page — not a simulation.

1. **Page load:** No SDUI validation error box, no "Unknown component type" fallback. 8 real products
   rendered with real Arabic names and real prices (e.g. "كلوس اب معجون اسنان ريد هوت 100 مل عرض —
   20.5 ج.م", "جونسون كريم منعم بزبدة الشيا 300مل — 68 ج.م").
2. **First click** (add-to-cart button, `aria-label="أضف للسلة"`, product id
   `6acb81f5-8e3c-4bcd-a848-6de64456cfe5`): on-page Action Log showed, verbatim:
   ```
   ADD_TO_CART received: productId=6acb81f5-8e3c-4bcd-a848-6de64456cfe5 action=increment
   OK: cart now has qty=1 for 6acb81f5-8e3c-4bcd-a848-6de64456cfe5 (real DB write confirmed)
   ```
   The card's own quantity stepper appeared (1 → visible +/− control), matching `StemProductCard`'s
   real quantity-prop-driven rendering.
3. **Second click** (the now-visible increment button, `aria-label="زيادة الكمية"`): Action Log
   appended:
   ```
   ADD_TO_CART received: productId=6acb81f5-8e3c-4bcd-a848-6de64456cfe5 action=increment
   OK: cart now has qty=2 for 6acb81f5-8e3c-4bcd-a848-6de64456cfe5 (real DB write confirmed)
   ```
   confirming server-side merge behavior (`cartService.addItem`'s existing `matchingItem` logic), not a
   duplicate row.
4. **Console/network:** zero `pageerror` events, zero console errors. Only benign output: a React
   DevTools suggestion, an HMR-connected log, the `[DataResolver]` debug logs (pre-existing verbose
   logging already in `DataResolver.ts`, not added by this POC), and a Next.js `next/image` LCP-loading
   hint warning (cosmetic, unrelated to this POC). **No `server-only` violation, no hydration
   mismatch, no failed Server Action.**
5. **Independent database confirmation** (bypassing the app entirely — direct `service_role` query
   against dev, same technique used in the SEC-P1-1 verification):
   ```
   GET {dev_url}/rest/v1/cart_items?product_id=eq.6acb81f5-8e3c-4bcd-a848-6de64456cfe5&order=created_at.desc
   → [{"id":"22e73519-22eb-4bc1-9876-5bc0f22cb620","cart_id":"2009a66c-e589-4609-9baf-cd3b3e464217",
       "product_id":"6acb81f5-...","quantity":2,"created_at":"2026-09-21T15:20:33.69Z"}]
   ```
   This matches the app's own log exactly, confirming the write is real and persisted — not a UI-only
   illusion.

**Disclosed side effect:** the row above is real test data now sitting in the **dev** database. Per
this repo's `AGENTS.md` §9 ("any destructive operation always requires separate explicit human
authorization, no exception"), it was **not** deleted by this session. See §K.

## H. Verification Commands

| Command | Result | Detail |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | First run crashed with a JS heap out-of-memory error unrelated to any code (`FATAL ERROR: Committing semi space failed`); a plain retry (no flags/config changed) completed normally and found one real bug in this POC's own new code (a double-wrapped `ActionResult` in `TestIntegrationClient.tsx`), which was fixed. Final run: zero errors. |
| `npm run arch:check` | **PASS** | `depcruise src --config .dependency-cruiser.cjs` → "no dependency violations found (307 modules, 1162 dependencies cruised)". |
| `npm run architecture:check` | **PASS** | All 4 SDUI/Stem gate rules passed: Stem Purity, Action Contracts, Engine Isolation, Data Resolver Boundaries. |

**Additional, non-mandated check — `npm run test:unit` (full suite): NOT FULLY VERIFIED, environment
issue, not a POC failure.** Two separate attempts crashed with OOM/worker-spawn errors (`FATAL ERROR:
Zone Allocation failed`, then `Error: spawn UNKNOWN`/`errno: -4094`) in this sandbox. Per explicit
instruction, this was not fixed (test-runner/memory configuration is out of the Hard Scope Limit) and
the full suite was not retried further. Diagnosis performed instead:
- Stashed all POC changes and ran the full suite once on the unmodified committed state: **29/29 files,
  311/311 tests passed cleanly, no crash.** This is one data point, not conclusive proof of "no
  regression," since the earlier `tsc --noEmit` OOM also occurred once with zero code changes present
  and cleared on a bare retry — this sandbox shows some baseline flakiness independent of any code.
- Restored the POC changes and ran a **scoped** test targeting only the backend modules this POC's
  read/write paths actually depend on: `npx vitest run cart.service.test.ts catalog.service.test.ts
  inventory.service.test.ts` → **3/3 files, 67/67 tests passed, no crash.**
- Conclusion: the full-suite OOM/spawn crash appears to be a pre-existing resource constraint of this
  specific sandbox (likely too many concurrent forked worker processes) rather than something
  introduced by this POC's changes, but this is not proven with certainty — flagged as an open,
  out-of-scope environment finding, not resolved here.

## I. Architecture Compliance

- **DataResolver boundary:** respected. `DataResolver`/`QueryRegistry`/`DataSource` interface files
  were not touched. `RealCatalogDataSource` is the only new Reef-aware plug-in, exactly the intended
  extension point (mirrors `ReefMockDataSource` structurally).
- **PageEngine purity:** respected. Zero changes to `PageEngine.tsx`; confirmed by the passing "Engine
  Isolation" architecture-gate rule, which greps it for Reef/Supabase/cart imports.
- **Stem purity:** respected. `StemProductCard.tsx`'s only change removed one field from its own
  outgoing action payload — no new Supabase/cart-context/fetch imports were added; confirmed by the
  passing "Stem Purity" gate rule.
- **Backend price authority:** enforced. `ADD_TO_CART` carries no price field at all now (not just for
  this POC — for every existing caller, since the shared type was fixed). The real capability never
  reads a client price. Price is computed exclusively server-side, unchanged.
- **Existing cart ownership:** respected. Zero new cart service/repository/table code. The capability
  is pure orchestration of four pre-existing Server Actions.
- **Session/auth boundary:** respected. No new auth code. The existing guest cart-session cookie flow
  (`src/proxy.ts` → `getCartIdentity()`) worked transparently for `/test-integration` since that route
  isn't excluded from the proxy's matcher — confirmed by the real quantity persisting correctly.
- **Lifecycle rules:** respected, and arguably improved on the pattern in `test-ui/page.tsx`:
  `ApplicationRuntime` is built exactly once (`useMemo(() => ..., [])`, empty deps — `test-ui`'s own
  runtime is rebuilt on every cart-state change, which this POC does not replicate); `DataResolver`/
  `DataSource`/`QueryRegistry` are instantiated once per **server** request inside the Server Component,
  never inside a client effect at all — avoiding the render→resolve→setState→render loop the task
  prompt explicitly warns against; the one client-side derivation (`hydratedPage`) is a pure,
  synchronous `useMemo` merge of already-resolved data with local quantity state, nothing async.

## J. Deviations

1. **Read-path resolution runs in a Server Component, not a client `useEffect`.** Inspection revealed
   `catalogService` → `catalog.repository.ts` imports `supabase-admin-client.ts` (guarded by the
   `server-only` package) for other methods in the same file; importing this chain into any
   `'use client'` module breaks the build. This is a call-site placement decision only — no
   DataResolver/PageEngine/QueryRegistry file was modified, and Server/Client Component composition is
   already this codebase's established pattern (e.g. every real product listing page). Judged not to
   require an Architectural Escalation Stop; disclosed here per that section's own spirit ("report what
   was discovered") rather than silently absorbed.
2. **Five pre-existing files touched beyond the POC folder**, all explicitly pre-authorized by §4/§9 of
   the task and all confirmed test-only surfaces (listed exhaustively in §C).
3. **Discovered, not fixed: `componentRegistry` is an unguarded shared singleton.**
   `test-portability/page.tsx` registers no components of its own and silently depends on some other
   page (e.g. `test-ui`) having registered `'hero_card'`/`'product_shelf'` first in the same browser
   session — visiting it first/alone would show "Unknown component type" fallback boxes. This POC's
   client component registers `'product_shelf'` **unconditionally** (not guarded by `.has()`, unlike
   `test-ui`) specifically so `/test-integration` is correct regardless of visit order — which means a
   subsequent client-side navigation to `/test-ui`/`/test-portability` in the same session, without a
   full reload, would inherit this POC's real-catalog-shaped wrapper instead of their mock-shaped one.
   Pre-existing architectural fragility of the shared registry design; fixing it would mean redesigning
   the SDUI component-registration mechanism, out of this POC's scope — documented per "identify the
   exact boundary where it fails," not silently patched.
4. **Publisher name is a static placeholder** ("سلسبيل"), not the product's real merchant business name
   — the real `Product` type carries no display-ready merchant name, and resolving one would require an
   additional `merchantService` lookup outside the "smallest possible adapter" the task asked for.
5. **Decrement/absolute-set are wired too** (via the existing `updateCartItemAction`/
   `removeCartItemAction`), beyond the strictly-required increment-only "Add to Cart" flow — done to
   avoid a confusing half-working stepper UI during manual verification. Still zero new business logic;
   pure orchestration of existing actions.
6. **`npm run test:unit` full-suite instability**, detailed in §H — not resolved, out of scope by
   explicit instruction.
7. **An ephemeral Playwright driver script was created in the project root and deleted immediately
   after use** (see §B) — needed to resolve the `playwright` package from `node_modules`; never
   committed.
8. **A real test `cart_items` row now exists on dev** as a direct, intended side effect of runtime
   verification — not deleted, per `AGENTS.md` §9. See §K.

## K. Founder Decisions Required

1. **Cleanup:** delete the test `cart_items` row created during verification
   (`id: 22e73519-22eb-4bc1-9876-5bc0f22cb620`, `cart_id: 2009a66c-e589-4609-9baf-cd3b3e464217`,
   product `6acb81f5-8e3c-4bcd-a848-6de64456cfe5`, quantity 2, dev only)? Not deleted here per
   `AGENTS.md` §9 — needs explicit separate authorization.
2. **`componentRegistry` singleton fragility** (§J.3): worth a tracked Decision Debt entry now that a
   third test harness page exists and the collision has a concrete, reproducible description? Not
   fixed in this POC (would require redesigning the SDUI registration mechanism).
3. **Test-only routes in production routing** (`/test-integration` joins `/test-ui`/`/test-portability`,
   all reachable with no auth/env guard): this is the same open finding as `AF-006` in the prior
   forensic audit, now with a third instance — no new decision needed beyond what's already tracked,
   but flagged again since scope grew.

## L. Final Verdict

```
POC VERIFIED
```

All 15 success criteria from the task prompt (§22) are met with direct evidence, not assumption:
real backend data reaches SDUI (§E, §G.1); `DataResolver` participates (§G.1's console-log evidence);
`PageSchema` stays declarative (`testIntegrationPageSchema` is plain data, §E); `PageEngine` stays
generic (zero diff, gate-verified, §I); `StemProductCard` renders real data (§G.1); `ADD_TO_CART`
trusts no client price (§D); the action reaches `ApplicationRuntime`/routing/capability (§F, §G.2-3);
the existing cart backend path is reused with zero duplication (§F, §I); real cart/DB state changed,
independently confirmed (§G.5); no `DummyCartContext`/mock catalog participates in this path (§I,
confirmed by import inspection); TypeScript, the dependency-architecture gate, and the SDUI/Stem gate
all pass (§H).

Per §26 of the task prompt: stopping here. No broader migration, no additional Stems, no production
replacement, no dashboard work, no further SDUI expansion, no additional backend refactoring was
performed or will be initiated from this task.

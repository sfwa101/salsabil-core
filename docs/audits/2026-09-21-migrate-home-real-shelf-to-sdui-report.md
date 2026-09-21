---
title: Migrate Home Real-Catalog Shelf to SDUI — Execution & Verification Report
status: COMPLETE
date: 2026-09-21
scope: first production consumer of the SDUI pipeline (docs/salsabil-frontend-integration-pattern.md) —
       the desktop "منتجات ريف" shelf on the Home page, replacing direct ProductCard rendering.
related: docs/audits/2026-09-21-real-backend-sdui-integration-poc.md (the proven pattern this extends)
---

# Migrate Home Real-Catalog Shelf to SDUI — Execution & Verification Report

## A. What changed

The desktop "منتجات ريف" shelf on the real Home page (`src/app/(reef)/page.tsx`) — previously rendered
directly as `<HorizontalShelf><ProductCard/></HorizontalShelf>` fed by `loadRealCatalogShelfAction()` —
now flows through the SDUI pipeline proven in the 2026-09-21 POC:
`RealCatalogDataSource → DataResolver → PageEngine → StemProductCard`, orchestrated by a new client
wrapper, `RealCatalogShelfSDUI.tsx`.

This is additive/reversible per the pattern doc's rule 6: only this one shelf moved. The mobile shelf
(`MobileStorefront.tsx`) is untouched — still `HorizontalShelf` + `MobileSmallProductCard`, fed by the
same resolved product array, unchanged behavior.

## B. Files

| File | Change |
|---|---|
| `src/app/(reef)/RealCatalogShelfSDUI.tsx` | New. Client wrapper: builds `ApplicationRuntime`, registers the real `ADD_TO_CART` capability (identical orchestration logic to the POC — existing cart Server Actions only, no new business logic), registers `'product_shelf'` in `componentRegistry` **guarded by `.has()`** (Hard Rule 4 of the pattern doc — the POC itself registered unconditionally, being an isolated test route; this is the first production instance, so the guard is mandatory here). |
| `src/app/(reef)/page.tsx` | Replaced the direct shelf JSX with `<RealCatalogShelfSDUI/>`; added `resolveRealCatalogShelf()` (builds `QueryRegistry`/`DataResolver`/`RealCatalogDataSource` per-request, same POC pattern) in place of the `loadRealCatalogShelfAction()` call; derives `initialQuantities` from the cart summary already fetched on this page (no extra fetch, unlike the POC which had none to reuse); filters size-option products out of the SDUI shelf's product list (see §C). |
| `src/app/(reef)/feed-actions.ts` | Removed `loadRealCatalogShelfAction`/`REAL_CATALOG_SHELF_LIMIT` (now unused — `page.tsx` reads this data through `RealCatalogDataSource` directly). No other export touched. |
| `src/app/(reef)/page.test.tsx` | Updated mocks: removed the mock for the deleted `loadRealCatalogShelfAction`; added `listPurchasableProducts` to the mocked `catalogService` (now called directly by `RealCatalogDataSource`); mocked the new `RealCatalogShelfSDUI` component (same treatment as `ProductCard`/`HorizontalShelf` were before — this test's actual subject is the cart-load-failure branch, not the shelf). |

No core SDUI file (`DataResolver`, `PageEngine`, `ApplicationRuntime`, `ActionRouter`,
`CapabilityRegistry`) was touched. `RealCatalogDataSource` and `StemProductCard`, both built in the
prior POC, are reused unmodified.

## C. A correctness issue found during planning, resolved before implementation

`catalogService.listPurchasableProducts` does not filter out products carrying a `size` option
(variable-weight items, `SALSABIL_CONSTITUTION.md §14`). The current `ProductCard.tsx` explicitly
disables quick add-to-cart for such products (`hasSizeOptions` guard) because
`CatalogService.validateSelection()` requires an explicit `sizeId`. The POC's `ADD_TO_CART` capability
has no such guard — it always calls `addToCartAction({ productId, quantity })` with no selection.

Founder decision (confirmed before implementation): filter products with a `size` option out of the
SDUI shelf's product list in `page.tsx` (`desktopShelfProducts`), mirroring the existing safety net
rather than extending the Stem/capability to handle size selection (that would be a larger, separate
scope). The full (unfiltered) product array still goes to `MobileStorefront` unchanged.

## D. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **PASS**, zero errors |
| `npm run arch:check` | **PASS** — "no dependency violations found (308 modules, 1177 dependencies cruised)" |
| `npm run architecture:check` | **PASS** — Stem Purity, Action Contracts, Engine Isolation, Data Resolver Boundaries all pass |
| `npx vitest run "src/app/(reef)/page.test.tsx"` | **PASS** — 2/2 |
| `npx vitest run cart.service.test.ts catalog.service.test.ts inventory.service.test.ts` | **PASS** — 3/3 files, 67/67 tests |

**Live runtime verification** (headless Playwright against `npm run dev`, real dev database — same bar
as the POC, not simulated):

1. Navigated to `/` (the real Home page). Console showed the real `[DataResolver]` log:
   `Resolved props for source default: {title: "منتجات ريف", items: Array(12)}` — confirming the SDUI
   resolver ran server-side against the real catalog, not a mock. Zero "SDUI Validation Error" boxes,
   zero "Unknown component type" fallback boxes.
2. `[data-page-id="home_real_catalog_shelf"]` (the `PageEngine` root for this shelf) present with 12
   real `StemProductCard`s inside it.
3. Clicked "أضف للسلة" on the first real card (product: "ففيت كريم ازاله الشعرللبشرة العادية100عر") →
   UI stepper showed `1`. Clicked "زيادة الكمية" once more → UI stepper showed `2`.
4. **Independent confirmation**, bypassing the app entirely: read the `sb_cart_session` cookie, queried
   `carts`/`cart_items`/`products` directly via the `service_role` REST endpoint. Result: one
   `cart_items` row, `quantity: 2`, `product_id` resolving to the exact same product name clicked in the
   browser — matching the UI exactly, confirming a real merged write (not a duplicate row, not a UI-only
   illusion).
5. No `pageerror` events during the whole flow.

The ephemeral Playwright script used for this (`tmp-verify-real-shelf.mjs`, project root) was deleted
immediately after use and was never committed — same disclosed pattern as the POC.

**Disclosed side effect:** the `cart_items` row created during verification
(`cart_id: 2c2d8a9d-a255-41a1-be5b-3588efc93341`, `product_id: 16f7bdb8-51c0-4664-b07b-5b082bb4d2d2`,
`quantity: 2`, dev database only) was **not** deleted, per `AGENTS.md §9` — deletion needs separate
explicit founder authorization, same as the POC's disclosed test row.

## E. Known pre-existing limitation, not introduced here

`componentRegistry` is a shared singleton (`docs/audits/2026-09-21-real-backend-sdui-integration-poc.md
§J.3`, `AF-006`). This task's registration is correctly guarded (`.has()`), but the underlying registry
fragility itself is unchanged — out of scope here, already tracked.

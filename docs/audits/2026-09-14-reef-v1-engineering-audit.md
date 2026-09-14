# REEF V1 — AUTHORITATIVE ENGINEERING AUDIT
Audit-only. No files modified, no commits made, no migrations run.

1. Executive Verdict
Can we safely continue development from the current repository? YES. HEAD (7876402) is exactly the baseline the previous audit identified — confirmed present, unchanged, and the tip of feature/ui-antigravity. The only drift is an uncommitted, UI-only working tree (13 modified + 5 new files) that passes typecheck, arch-check, build, and all 184 unit tests. Nothing destructive or hidden was found.

Can we safely accept a real customer order today? YES, WITH CONDITIONS. For a single merchant, COD-only, single-server/staging deployment, the financial/security invariants that matter (server-side pricing, tenant isolation, inventory atomicity, order-ownership, IDOR protections) were independently re-verified against current code and hold up under adversarial review. Conditions: fix the OTP rate-limit inversion (§9/§18) before exposing the guest-claim flow to real phone numbers, and don't deploy to more than one server instance until DD-002 (in-memory locks) is resolved — see §8.

Can we safely target 100 orders? YES, WITH CONDITIONS. Same conditions as above, plus: fix the cart UI inconsistencies and dead "Add to Cart" CTA now sitting in the working tree (customers will see them), add the missing DB indexes before real volume, and keep it to one server process throughout the test (Vercel serverless with concurrent isolates would break the in-memory checkout-dedup lock).

Multi-merchant orders (one customer order spanning several merchants): NO — not built, not close to built. This is the single biggest gap between where the project is and the V1 vision described in this task's brief.

2. Repository & Git State
Branch: feature/ui-antigravity. HEAD: 7876402 ("feat(ui): add isolated storefront presentational components").
7876402 IS the baseline the previous audit named, and it IS the current HEAD (git log 7876402..HEAD is empty). No commits landed after it — everything since is uncommitted.
Working tree is dirty: 13 modified files (all UI: layout.tsx, page.tsx, Header.tsx, CartCapsule.tsx, PostCard.tsx, StoryBar.tsx, BottomNav.tsx, ProductCard.tsx, QuantityStepper.tsx, DesktopCartSidebar.tsx, useOptimisticCartLine.ts, plus next-env.d.ts and a seed script) and 5 new untracked files (all under src/components/ / src/components/storefront/).
No stashes, no other local branches besides main, single worktree, no local trace of the external "Antigravity" experiment — it genuinely lives outside this repo, exactly as framed.
This dirty state is real, functioning, uncommitted work — not an accidental leftover. It already implements a mobile/desktop split (see §14) and is fully wired into the live render tree.
Diagnostics on the current dirty tree: typecheck clean, arch:check clean (204 modules, 718 dependencies, 0 violations — up from 111/327 at the last documented snapshot), test:unit 184/184 passing (up from 122), build succeeds in ~10s. Integration tests were not run (would touch live Supabase); .env.local/.env.staging.local exist.

3. Previous Audit Verification
Finding	Current Status	Evidence	Priority
Single-merchant commerce flow real & tested	CONFIRMED	Price/cart/inventory/checkout/order-ownership boundaries independently re-verified adversarially; 184 unit + integration tests across cart/orders/catalog/inventory	—
Cart regression in in-progress UI refactor	CONFIRMED	Three divergent optimistic-quantity implementations now exist (useOptimisticCartLine.ts has rollback; CartCapsule.tsx and DesktopCartSidebar.tsx don't); page.tsx now swallows cart-fetch failures into a silent empty-cart state	P1
Multi-merchant ordering unsupported	CONFIRMED	orders.service.ts:84-91 explicitly rejects carts spanning >1 tenant_id (ADR-009)	P1
Delivery/drivers largely absent	CONFIRMED, stronger than stated — 100% absent	Zero delivery/driver module, zero schema, zero role, specs/delivery/README.md untouched since 2026-09-01	P1
Notifications absent	CONFIRMED	No notification module/table/service found anywhere	P2
Commission ledger absent	CONFIRMED	merchants.commission_rate is a bare numeric column; no ledger, settlement, or payout logic anywhere; Taysir (financial kernel) is 0% built	P1
Merchant employees absent	CONFIRMED	specs/merchant/SPEC.md lists this as an explicit non-goal; employee/merchant_manager are schema-only placeholders with zero user-creation path	P1
Reef employee/RBAC incomplete	CONFIRMED	Exactly one flat platform_admin role, no tiering, explicit non-goal in specs/admin/SPEC.md	P1
Address picker fake/hardcoded	CONFIRMED	DeliveryAddressButton.tsx uses hardcoded FAKE_ADDRESSES, self-documented as such; no MapPicker.tsx exists anywhere despite being referenced by analogy in OTP code comments	P1 (customer-facing before launch)
Several UI elements are placeholders/fake data	CONFIRMED, and expanded	New uncommitted work adds more: mock ReelsFeed videos, hardcoded post-attribution text, dead "Add to cart" CTA, fake "Trending" badge — see §15	P1
RLS not a sufficient security backstop	CONFIRMED — and correctly understood by the team already	docs/SECURITY.md §0 documents this explicitly: RLS is either full-lock (service_role only) or public-read; real authorization lives in the service layer, not RLS	Informational
Order status/history atomicity needs hardening	CONFIRMED, unchanged	No real Postgres transaction/RPC between orders/order_items insert; a compensating delete runs on failure instead (ADR-009, documented, accepted)	P2
No formal migration system	CONFIRMED	DD-005 OPEN; every schema change is manual SQL pasted into Supabase's SQL Editor	P1 (before more people touch schema)
Several indexes missing	CONFIRMED	products.tenant_id, orders.tenant_id, orders.user_id, cart_items.cart_id (the highest-frequency query in the app), order_items.order_id are all unindexed (docs/DATABASE.md §10)	P1 (before real order volume)
Catalog is clone-on-import, no canonical product	PARTIALLY CONFIRMED — has evolved, undocumented	A real MasterCatalogItem + review-queue dedup workflow now exists (catalog.service.ts:86-237) solving exactly the "10 of 70 merchants sell identical products" problem — but it has zero decision record: docs/DECISIONS.md has no matching entry despite the code citing "ADR-025" (which is actually the shadcn/ui decision). See §7/§10.	P1 (document it; the underlying products table is still one-row-per-tenant, not a true offer join-table)
Cash on delivery is the payment model	CONFIRMED	PaymentMethod type has exactly one member; payment method is never client input	—
Admin is incomplete	CONFIRMED	Scope is merchant activate/deactivate + orders + posts + catalog master/review only — no employee management, no financial view	P1

4. What Actually Works
Server-side price authority (CatalogService.calculatePrice) — no client-supplied price is possible even structurally (CheckoutInput has no price field).
Atomic inventory decrement (optimistic concurrency, DB-level, survives multi-instance) — genuinely ENFORCED, not just claimed.
Tenant isolation on single-order-mutation paths (assertActorCanAccessOrder) — verified at every real call site (merchant/admin order pages and actions).
Cart IDOR protection (ownership check before mutation) — has a dedicated regression test.
Guest-cart → registered-customer merge (ADR-029) — quantity-summing, cookie-scoped to the requester only, no cross-account leak.
OTP subsystem (ADR-030) — hashed codes, max-attempts lockout, expiry, single-use, fail-closed when no channel is configured. Well-built.
Password auth (merchant/admin, ADR-026) — scrypt + timingSafeEqual, a real timing-attack was found and fixed in a first Guardian review round, second round approved.
Dependency-direction enforcement (dependency-cruiser, 6 rules) — 0 violations across 204 modules/718 dependencies, genuinely automated, not just documented intent.
Build/typecheck/unit-test pipeline — all green, including on top of the uncommitted UI work.
The project's own documentation discipline (ADRs, Decision Debt registry, Invariant registry with evidence levels) is unusually rigorous for a project this size — most claims I checked against code held up.

5. What Is Broken
OTP send-rate-limit is inverted (account/claim/actions.ts:27-33): only failed claim attempts increment the counter; every successful (paid, WhatsApp/SMS) send is uncounted. A phone number known to have an account can be spammed indefinitely — real money and harassment exposure. P1.
In-memory rate-limiter and checkout dedup lock (rate-limit.ts:14, orders.service.ts:43) do not survive multiple server instances — already self-documented (DD-002) but re-confirmed as real and unaddressed. This is not exploitable on the current single-instance deployment, but becomes concrete the moment the app runs on Vercel serverless functions or any horizontally-scaled target. P1, effectively P0 at deploy time.
Cart quantity-update logic has drifted into three implementations with inconsistent error handling — two of them (CartCapsule, DesktopCartSidebar) don't roll back on a failed update, unlike the shared hook. P1.
A dead "Add to cart" button (no onClick at all) sits in PostCard.tsx:160-162 in the current working tree — a non-functional primary commerce CTA.
docs/CHANGELOG.md is stale by ~6 days / 6 ADRs; specs/identity/SPEC.md predates the last four identity ADRs; docs/SECURITY.md §9 understates audit-log coverage (customer auth is now audited — the doc is behind, the code is actually better than documented).

6. What Is Missing
Multi-merchant order splitting (parent order + merchant suborders) — no schema, no service logic, explicit rejection instead.
Delivery/driver domain — zero code, zero schema, zero role.
Commission ledger / settlement / payout logic.
Merchant employee and tiered admin roles.
Notifications (any channel).
Formal migration tooling.
Real payment gateways (COD only).
A real address/map model (user_addresses, MapPicker.tsx, delivery_lat/lng) — explicitly deferred, doesn't exist.
Live viewport verification for the new mobile/desktop UI split (the previous responsive work had a dedicated verification script; this new split doesn't yet).

7. Customer Commerce Architecture
Traced end-to-end (Product → Cart → Checkout → Order → Merchant fulfillment → Status → Customer tracking):

Pricing: always server-computed via CatalogService.calculatePrice(); cart_items stores no price at all (computed live on every read); order_items.unit_price_snapshot is computed once at checkout and frozen forever. No client-supplied price is possible even structurally.
Authorization: tenant/role identity is read exclusively from the server-validated sessions table via an opaque random token in an httpOnly cookie — never from client input, verified at every real call site for merchant/admin order actions.
Inventory: decrement is a single conditional UPDATE with retry (genuine DB-level atomicity, survives multi-instance) — this is the one concurrency-safety property that's real regardless of server count.
Idempotency: an in-memory Map keyed by cart id deduplicates concurrent checkouts on the same process only — does not survive multiple server instances (DD-002).
Ownership: cart-item and order mutations both verify the sub-resource belongs to the parent (cart/order) the caller actually controls before acting — a real, tested IDOR fix, not just a documented intention.
Catalog dedup: a previously-undocumented MasterCatalogItem + review-queue workflow (admin sets canonical name/price/category; merchant Excel imports either auto-match or land in a review queue for the admin to approve-as-new or merge) already exists and functionally addresses the "many merchants selling the same item" problem for onboarding — see §10 for the documentation gap around it.
Payment: COD only, cannot be manipulated by the client since it's never client input.
Order tracking: a deliberate "bearer link" model (/order/[id], UUID-only, no session check) that intentionally omits address/name/phone from what's rendered — a documented, reasonable tradeoff for guest checkout, not an oversight.

8. Multi-Merchant Architecture
Current reality: one orders row has exactly one tenant_id column. Checkout reads the cart, computes the set of distinct tenant_ids among its items, and explicitly rejects checkout with a clear error if that set has more than one member (or contains an untenanted product) — this was a deliberate, tested decision (ADR-009), not an accident, made when literally only one product/merchant existed in the database.

What exists today toward the target model:

Parent order: orders (single-tenant only)
Order items: order_items (frozen price snapshot)
Merchant assignment: implicit, one merchant per whole order
Fulfillment/inventory reservation: real, atomic, per-item
Pickup/delivery: two order-state-machine steps handled manually by merchant/admin actors — no separate domain
Cancellation: supported (any non-terminal state → cancelled)
Partial readiness / substitution / consolidation across merchants: does not exist at all

Recommended smallest sound architecture (extend, don't rebuild):

customer_order (NEW — the thing the customer sees as "one order")
  ├─ id, user_id, delivery_address, created_at, overall_status (derived/rollup)
  │
  └─ merchant_suborders (NEW — one per participating merchant)
       ├─ id, customer_order_id (FK), tenant_id (FK merchants), status (reuses existing ORDER_TRANSITIONS)
       └─ order_items (EXISTING table, gains suborder_id FK instead of/alongside order_id)

This keeps everything that already works (state machine, actor-role transition rules, inventory decrement, price snapshot, tenant-isolation checks) unchanged per suborder — assertActorCanAccessOrder already operates on a single-tenant record, so a merchant suborder is a drop-in replacement for today's orders row from that merchant's point of view. The new work is entirely additive: a customer_order wrapper, a split-at-checkout step (today's single-tenant-cart validation becomes "group by tenant_id, create one suborder per group"), and a status rollup for the customer-facing view. This is a structural change, not an extension of the current orders table — it should not be attempted as an ALTER on live orders rows; build the new tables alongside, migrate the checkout path, and only then decide whether to rename/retire the old single-tenant path.

9. Delivery Architecture
Confirmed: nothing exists. No delivery/driver module, no driver role, no pickup/assignment/acceptance code, no proof-of-delivery, no delivery fee/earnings logic. The last two order states (out_for_delivery, delivered) are today transitioned manually by merchant or admin actors — there is no driver identity in the system at all. specs/delivery/README.md is an untouched placeholder from day 1.

Recommended minimum V1 domain model (the brief's proposed lifecycle is reasonable but should attach to the merchant-suborder concept from §8, not the whole customer order, since pickup happens per-merchant):

delivery_offices (NEW)          drivers (NEW)                delivery_jobs (NEW)
  id, name, coverage_area         id, office_id (FK)            id, merchant_suborder_id(s) (FK, array or join table
                                  user_id (FK users,               for multi-pickup consolidation)
                                    role='driver')                 driver_id (FK, nullable until assigned)
                                  is_available                     status: READY_FOR_PICKUP → DRIVER_ASSIGNED →
                                                                    PICKING_UP → ALL_ITEMS_COLLECTED →
                                                                    OUT_FOR_DELIVERY → DELIVERED | FAILED

Evaluation of the brief's proposed lifecycle: it's sound for the common case, but "DRIVER_AT_PICKUP" as a separate state from "PICKING_UP" is likely unnecessary granularity for V1 (merge them) unless there's a real operational need to distinguish "arrived" from "collecting." Add FAILED_DELIVERY explicitly (not just a generic cancel) since it needs a different resolution path (retry vs. return-to-merchant) than a pre-pickup cancellation. This entire domain is new work, additive, and does not require touching orders/order_items beyond adding a merchant_suborder_id FK to delivery_jobs.

10. Catalog Architecture
Current model, corrected from the previous audit: not pure "merchant clones an independent product" — there's now a canonical-item-with-clone pattern:

MasterCatalogItem (admin-owned: name, canonical sell price, category)
   │  cascades price down on update
   ▼
products (tenant-owned clone: one row per tenant per master item,
          FK-like link via master_item resolution at import time,
          sell price locked to master, tenant sets quantity/cost via inventory)

This is real, tested-by-use (though not unit-tested — no catalog.master* test exists), and directly solves the "10 of 70 merchants sell identical products" onboarding problem named in the roadmap. However: this is a significant, undocumented architectural addition — docs/DECISIONS.md has zero entry for it despite the code's own comment citing "ADR-025" (verified: ADR-025 is actually the shadcn/ui decision, an unrelated topic). This violates the project's own AGENTS.md §13 ("No Silent State Change" — schema/business-rule changes must be explicitly announced) and §16 (docs must be updated as part of Definition of Done). Recommend: write the missing ADR retroactively before any further catalog work, and add unit tests for calculatePrice/validateSelection/master-item cascade logic (already flagged separately as DD-004).

What must change for V1 vs. can wait: the current model is sufficient for the near-term "70 merchants" onboarding wave. A true merchant_offers join table (many merchants selling the same canonical product, customer picks a seller per BR-017's "open marketplace" model) is real future work but is not blocking — it only matters for categories the founder explicitly wants to run as an open marketplace (fish, meat) rather than a unified-brand model (health/pharma), and that categorization decision (BR-017) itself is still PROPOSED.

11. Commission & Finance
Confirmed: essentially nothing exists beyond a number. merchants.commission_rate is a bare percentage column with no computation, no ledger, no settlement, no payout, no COD-cash-reconciliation logic anywhere. specs/payments/README.md is an untouched placeholder. Taysir (the financial kernel engine) is 0% built. BR-007 (Zero Hidden Fees), BR-009 (Fair Liability), BR-010 (Automated Offboarding/settlement) are all ACCEPTED as business principles but have no implementation, and BR-009 specifically depends on order_status_history (which exists) plus an audit-analysis layer (which does not).

Recommended minimum V1 ledger (additive, no touch to orders):

merchant_ledger_entries (NEW)
  id, tenant_id, order_id (or merchant_suborder_id), type (sale | commission | adjustment | payout),
  amount, running_balance, created_at

A single append-only ledger table populated at the moment an order/suborder reaches a terminal successful state (delivered), computing commission = order_total * merchants.commission_rate and recording both the merchant's net and the platform's cut as two rows. This is deliberately far short of a full accounting system (no multi-currency, no tax, no refund netting) — it's the minimum needed to answer "how much do we owe this merchant" before the "instant settlement" vision (BR-010) becomes buildable.

12. Authentication / RBAC / Security
Three separate, correctly-isolated login surfaces: merchant, admin, customer — each with its own httpOnly cookie name and independent session validation. No shared-cookie confusion found.
No centralized auth middleware — src/proxy.ts only assigns a cart-session cookie on /cart and /checkout; every other protected page enforces its own session check individually. This worked correctly everywhere it was checked (one minor inconsistency found, see below), but it means there is no safety net if a future page is added without its guard — a process risk, not a current bypass.
One real inconsistency found: merchant/change-password/page.tsx:6-10 checks session existence but not tenantId, unlike its sibling pages — the underlying Server Action still catches it, so this is not independently exploitable, but it's the exact bug class worth linting for.
IDOR: every Server Action taking a client-supplied id was traced; none were found missing an ownership check. This is a genuinely strong result.
employee/merchant_manager roles are pure schema placeholders — no code path anywhere creates a user with either role. No driver role exists at all.
Password auth (merchant/admin) and OTP (customer) are both well-built, with a documented and fixed timing-attack in the password path.
RLS is not the enforcement layer — by design, and correctly understood by the team (docs/SECURITY.md §0); real authorization is in the service layer. This is architecturally consistent but means every new sensitive service method needs its own authorization discipline — there's no DB-level backstop to catch a missed check.
P0-severity-adjacent finding: the OTP claim-flow rate-limit inversion (§5) is the most concrete near-term abuse vector found in this audit.

13. Database Assessment
Seventeen-plus tables, all RLS-enabled, in one of two deliberate patterns (public-read or full-lock-service-role-only) — no "RLS open to anon trusting unguessable IDs" antipattern found anywhere, which is a real strength.

P0 database problems: none found that corrupt data or bypass isolation today.

P1 database problems:
Missing indexes on products.tenant_id, orders.tenant_id, orders.user_id, cart_items.cart_id (highest-frequency query path), order_items.order_id — fine at current volume, will degrade with real merchant/order growth.
No formal migration system — every change is manual SQL Editor DDL; explicit blocker for adding a second engineer or scaling schema-change velocity.
No real Postgres transaction between orders/order_items insert (compensating-delete pattern instead) — works today, is a real correctness risk if the compensating delete itself ever fails silently.

P2 database improvements:
INV-INV-002 (negative-inventory CHECK constraint) has never been live-verified in this session or documented as re-verified since creation.
Successful inventory decrements/restores are not audit-logged (only failures are) — INV-AUDIT-001, documented and accepted as a known gap (DD-003).
Soft vs. hard delete policy for users and most tables remains an open question — currently latent (no delete flow exists), but will matter once account deletion is built.

14. UI / Responsive Architecture
The uncommitted mobile/desktop split sitting in this repo right now is real, wired, and working — not dead code. src/app/(reef)/page.tsx directly imports and renders MobileStorefront (mobile) alongside DesktopCategorySidebar/DesktopCartSidebar (desktop), switched by Tailwind breakpoint classes (lg:hidden / hidden lg:flex), both trees always mounted, CSS deciding visibility — no JS viewport detection, no user-agent sniffing. Dependency-rule compliance is clean: none of the five new components touch a repository or service directly; all cart mutations still go through the existing Server Actions.

This already matches the general shape of the validated external "Antigravity" approach — a real mobile/desktop separation achieved with zero changes to server actions, database, cart engine, repository layer, or tenant isolation (confirmed independently: arch:check stayed clean, no new repository imports anywhere in the diff).

What's incomplete about it:
Three now-divergent product-card components (ProductCard, MobileHeroProductCard, MobileSmallProductCard) and three divergent cart-quantity-update implementations — real duplication, not yet consolidated.
No live-viewport verification script for the new split (the previous responsive work had one; this doesn't yet).
docs/design/HOME_FEED.md's documented render-tree diagram no longer matches the code (StoryBar/FeedTabBar/WorldSwitcher composition has changed) — needs updating alongside whatever gets committed.
Decorative, non-functional buttons (desktop header icons, wallet/support, share/heart icons) violate the project's own documented rule (docs/design/UX_RULES.md §2) that unimplemented buttons must show a "coming soon" toast, not silently do nothing.

15. Fake / Placeholder Production Dependencies
Item	Classification
MOCK_REELS hardcoded array in ReelsFeed.tsx — fake merchant names, sample-bucket videos, "Add to cart" only fires a toast	MUST REPLACE BEFORE LAUNCH — bypasses the real posts/post_media reel pipeline that already exists and is already passed into the parent component
Dead "Add to cart" button, PostCard.tsx:160-162	MUST REPLACE BEFORE LAUNCH
Hardcoded publisher name/category text on every post card, PostCard.tsx:94,97	MUST REPLACE BEFORE LAUNCH
Static "Trending" badge on every product, MobileSmallProductCard.tsx:33-37	MUST REPLACE BEFORE LAUNCH (or explicitly confirm as an intentional cosmetic choice)
DeliveryAddressButton.tsx FAKE_ADDRESSES	FUTURE — pre-existing, self-documented, explicitly deferred by founder decision pending the address/map domain
Decorative icon buttons with no handler (heart/share/wallet/support)	SAFE FOR V1 only if given a "coming soon" toast per the project's own UX rule — currently silent, which the rule forbids
Seed script placeholder→Unsplash image swap	SAFE FOR V1 — dev tooling only, no runtime impact
StoryBar fallback gradients	SAFE FOR V1 — cosmetic, backed by real category data

16. Testing & Quality
Real coverage exists for cart, orders, catalog, inventory, merchant, admin, khalil, security, otp, customer, audit, bayan, and validation (unit + integration where it matters, e.g., concurrent-checkout and concurrent-inventory races are genuinely tested against live Supabase). Zero coverage for delivery/driver/commission — because those domains don't exist in code at all, not because tests are missing. payments module has zero tests despite existing — worth closing even though it's currently trivial (COD-only).

No Playwright-integrated E2E suite exists; one ad-hoc script (test-first-real-purchase.e2e.ts) targets staging manually. The "reef-city-journey" file named e2e is actually a Vitest integration test, not a browser test.

Before attempting "100 real-world-style orders across multiple merchants", the following must be true, in order: (1) multi-merchant order splitting must exist at all — today it's structurally impossible, checkout rejects it outright; (2) the distributed-lock/rate-limit BLOCKER (DD-002) must be resolved if the test runs on more than one server process; (3) the OTP rate-limit fix should land if any test customers register/claim accounts; (4) missing indexes should be added given 100 orders will exercise cart_items/order_items joins repeatedly. For a single-merchant 100-order test on one server today, the existing invariants are sound enough to attempt it once the cart-UI and dead-CTA issues are fixed (customers will actually see and use those surfaces).

17. Architectural Decisions Required
#	Question	Current State	Options	Recommended	Why	Impact	Can Wait?
1	Parent order / merchant suborders	Single-tenant orders only, hard rejection of multi-tenant carts	(a) keep single-tenant, force separate checkouts per merchant; (b) build customer_order+merchant_suborders (§8)	(b)	Needed the moment 2+ merchants can appear in one cart; (a) delivers worse customer experience but is a valid stopgap	High — new tables, checkout rewrite	NO — blocks the stated V1 vision, but can be sequenced after single-merchant volume is stable
2	Delivery job model	Doesn't exist; last 2 states handled manually	Build delivery_offices/drivers/delivery_jobs per §9	Yes, as scoped in §9	No driver identity exists at all today	High — new domain	NO, but can follow #1
3	Distributed lock/rate-limit (DD-002)	In-memory Maps, single-process only	Redis, or Postgres-backed advisory lock/counter	Postgres-backed (no new infra dependency, matches the project's existing "everything through Supabase" pattern)	Avoids adding Redis just for this; Postgres row-locking already proven in inventory decrement	Medium — touches checkout + rate-limit code paths	NO if deploying multi-instance, otherwise can wait
4	Catalog master-item model — document it	Real code exists (§10), zero ADR	Write retroactive ADR + tests	Do it now, cheaply	Governance gap, violates project's own protocol	Low — docs + tests only	NO — cheap to fix, high documentation-integrity value
5	Merchant/Admin RBAC expansion	Single owner, single flat admin role	Add merchant_manager/employee creation path; tiered admin	Build minimally when the "70 merchants" wave actually needs it (some will have staff)	Currently zero real demand signal beyond the roadmap note	Medium	YES, until real merchant onboarding surfaces the need
6	Commission ledger	Column only	Build minimal append-only ledger (§11)	Yes, minimal version	Needed before any real merchant payout promise	Medium	NO — needed before first real merchant is owed money
7	Formal migrations	Manual SQL Editor	Adopt a lightweight migration tool (e.g., Supabase CLI migrations)	Yes	Explicit blocker for team growth / schema velocity	Medium — one-time tooling adoption	YES short-term (solo founder), NO if a second engineer joins
8	Address/map model	Hardcoded fake addresses, plain-text checkout form	Build user_addresses + Mapbox (already decided as provider per ADR-029)	Yes, when delivery zones matter	Needed for real delivery-fee/zone logic, not urgent for COD-only pilot	Medium	YES for a small COD pilot, NO once delivery zones/fees matter
9	Desktop/mobile UI architecture	Uncommitted split, working, undocumented	Commit incrementally, fix correctness gaps first (§14), update docs	Proceed with what's already there — do not import the external branch	It already achieves the same "surgical, non-invasive" property the external experiment demonstrated	Low-medium (UI only)	NO — cheap fixes, should land before next UI work continues on top of it

18. P0 Issues
None found that are actively exploitable or broken today, under the current single-instance/single-merchant/COD deployment. The closest thing to P0 is conditional: DD-002 (in-memory checkout-dedup and rate-limit) becomes a live P0 the instant this app runs on more than one server process — treat any move to Vercel serverless or horizontal scaling as gated on this.

19. P1 Issues
OTP send-rate-limit inversion (§5, account/claim/actions.ts:27-33) — real financial/harassment abuse vector.
DD-002 distributed lock/rate-limit — must resolve before multi-instance deployment.
Cart UI implementation drift (3 divergent quantity-update paths, 2 without rollback) + silent empty-cart-on-fetch-error in page.tsx.
Dead "Add to cart" CTA and mock ReelsFeed data — customer-facing, must fix before real customers see them.
Multi-merchant order splitting — not built (§8, §17#1).
Delivery/driver domain — not built (§9, §17#2).
Commission ledger — not built (§11, §17#6).
Merchant/Reef employee RBAC — not built (§17#5, needed once real onboarding starts).
Missing DB indexes before real order volume (§13).
Formal migration system before adding engineers/schema velocity (§13, §17#7).
Retroactively document the catalog master-item/review-queue architecture (§10, §17#4) — cheap, high value.
Stale docs: CHANGELOG.md, specs/identity/SPEC.md, docs/SECURITY.md §9 audit-scope claim.

20. P2 / P3 Issues
P2: validateSelection() asymmetric gap on size-less products; dead findUserByPhone code path via anon client; merchant change-password page missing tenantId guard (action layer already catches it); no centralized auth middleware/route-guard enumeration; SMS Misr channel contract unverified live; /order/[id] has no rate limit (known, accepted tradeoff); INV-AUDIT-001 inventory-audit gap; soft/hard delete policy undecided; BR-016 minimum order value undecided; decorative buttons need "coming soon" toasts.

P3: full canonical-product + merchant-offer join-table remodel; Nizam governance engine; central event ledger; Hakim AI advisory; Taysir full wallet/ledger; Barq open delivery marketplace + fair-matching engine; additional worlds (Asrab/Nabdh/Noor Al-Din/Takween); real payment gateways beyond COD.

21. Recommended V1 Architecture

                    Customer
                       │
                 (single cart, one checkout)
                       │
                 customer_order  ──────────────► overall_status (rollup)
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  merchant_suborder  merchant_suborder  merchant_suborder   (one per tenant_id in the cart)
   (= today's orders   (reuses existing state machine,
    row, unchanged)     actor rules, inventory decrement,
        │               tenant-isolation checks — no rewrite)
        ▼
  delivery_job  (NEW domain, §9) ── driver_id, office_id, status
        │
   consolidation/pickup coordination (if delivery_job spans >1 merchant_suborder)
        │
        ▼
     Customer receives one delivery

Everything below the dotted line in today's system (inventory, pricing, order state machine, tenant isolation) is sound and should be preserved untouched — the new work is entirely a wrapper layer (customer_order) plus one new domain (delivery_job) plus one new ledger table (merchant_ledger_entries, §11), not a rebuild.

22. Dependency-Ordered Implementation Roadmap
(Not implemented — planning only, per the task's constraints.)

TASK-01 — Fix OTP claim-flow rate-limit inversion
WHY: real abuse vector (§5/§19#1). DEPENDENCIES: none. FILES: src/app/(reef)/account/claim/actions.ts. SCOPE: call recordFailedAttempt (or a new counter) on the success path too, not only the error path. ACCEPTANCE: a phone number with an account cannot receive more than N OTP sends per hour, matching the documented intent. TESTS: new unit test on startClaimAction asserting the counter increments on success. COMMIT BOUNDARY: this fix alone.

TASK-02 — Unify cart optimistic-update logic
WHY: 3 divergent implementations, 2 missing rollback (§19#3). DEPENDENCIES: none. FILES: src/components/CartCapsule.tsx, src/components/storefront/DesktopCartSidebar.tsx, src/components/useOptimisticCartLine.ts. SCOPE: make CartCapsule/DesktopCartSidebar consume useOptimisticCartLine instead of reimplementing it. ACCEPTANCE: a failed quantity update rolls back visually in all three surfaces identically. TESTS: existing hook tests extended to cover the two new consumers. COMMIT BOUNDARY: this alone.

TASK-03 — Fix silent empty-cart-on-error in home page
WHY: a failed cart-summary fetch currently renders as "cart is empty" (§5). DEPENDENCIES: none. FILES: src/app/(reef)/page.tsx. SCOPE: distinguish "genuinely empty" from "fetch failed" in the try/catch, surface the latter as a retry state, not a false empty cart. ACCEPTANCE: simulate a fetch failure, confirm the UI does not claim the cart is empty. TESTS: manual/dev-server verification (no existing test harness for this page). COMMIT BOUNDARY: this alone.

TASK-04 — Remove dead CTA and mock Reels data
WHY: customer-facing non-functional/fake content (§15). DEPENDENCIES: none. FILES: src/components/PostCard.tsx, src/components/ReelsFeed.tsx. SCOPE: wire the "Add to cart" button to the real add-to-cart action; replace MOCK_REELS with the real posts prop already available in MobileStorefront, or hide the reel tab entirely until that wiring is done. ACCEPTANCE: no hardcoded reel/merchant data renders; add-to-cart from a post actually adds to cart. TESTS: extend existing PostCard/feed tests. COMMIT BOUNDARY: this alone (can split PostCard vs. ReelsFeed into two commits if preferred).

TASK-05 — Retroactive ADR for catalog master-item/review-queue system
WHY: significant undocumented architecture (§10/§19#11). DEPENDENCIES: none, pure documentation. FILES: docs/DECISIONS.md, fix the stale "ADR-025" comment reference in src/core/modules/catalog/types.ts/catalog.service.ts. SCOPE: write the missing ADR describing the master-item/review-queue design already in code. ACCEPTANCE: docs/DECISIONS.md has a real entry; code comments point to the correct ADR number. TESTS: n/a. COMMIT BOUNDARY: docs-only commit.

TASK-06 — Add unit tests for CatalogService.calculatePrice/validateSelection/master-item cascade
WHY: DD-004, financial-logic gap. DEPENDENCIES: TASK-05 (for shared context). FILES: new src/core/modules/catalog/catalog.service.test.ts additions. SCOPE: cover size/addon edge cases, master-price cascade to linked tenant products. ACCEPTANCE: tests fail on a deliberately-reintroduced pricing bug. COMMIT BOUNDARY: this alone.

TASK-07 — Add missing DB indexes
WHY: §13, real query-pattern gaps. DEPENDENCIES: none. FILES: new SQL script under scripts/. SCOPE: index products.tenant_id, orders.tenant_id, orders.user_id, cart_items.cart_id, order_items.order_id. ACCEPTANCE: EXPLAIN ANALYZE on the hottest cart/order queries shows index usage; applied manually to dev then staging per current DDL practice. TESTS: none needed (pure performance change). COMMIT BOUNDARY: this alone; requires founder execution on live DB per current manual-DDL practice.

TASK-08 — Distributed lock/rate-limit for checkout dedup and login attempts (DD-002)
WHY: multi-instance BLOCKER (§18). DEPENDENCIES: none, but should land before any multi-instance deployment decision. FILES: src/core/kernel/security/rate-limit.ts, src/core/modules/orders/orders.service.ts. SCOPE: replace in-memory Maps with a Postgres-backed advisory lock/counter table. ACCEPTANCE: the existing concurrent-checkout integration test still passes when simulated across two separate Node processes. TESTS: extend orders.integration.test.ts to spawn two processes/connections. COMMIT BOUNDARY: this alone — DEEP guardian review required per the project's own matrix (Inventory Concurrency class).

TASK-09 — Design doc: customer_order + merchant_suborders
WHY: prerequisite for multi-merchant orders (§8/§17#1). DEPENDENCIES: TASK-08 should land first if this doubles down on concurrency-sensitive checkout paths. FILES: new spec under specs/orders/. SCOPE: no code — a design document the founder approves before implementation, per the project's own PLAN-before-IMPLEMENT protocol. ACCEPTANCE: founder sign-off. TESTS: n/a. COMMIT BOUNDARY: docs-only.

TASK-10 — Implement customer_order/merchant_suborders schema + checkout split logic
WHY: unblocks multi-merchant orders. DEPENDENCIES: TASK-09 approved. FILES: new schema script, orders.service.ts, orders.repository.ts, checkout actions. SCOPE: additive tables only, checkout groups cart items by tenant and creates one suborder per group instead of rejecting. ACCEPTANCE: a cart with 2 tenants successfully checks out into one customer_order with 2 merchant_suborders, each independently transitionable; single-tenant carts continue to work unchanged. TESTS: new integration test mirroring the existing multi-tenant-rejection test, now asserting successful split instead. COMMIT BOUNDARY: schema first, then service logic, as two commits — DEEP guardian review required (Financial logic + Orders State Machine class).

TASK-11 — Minimum commission ledger
WHY: §11/§17#6. DEPENDENCIES: TASK-10 (ledger entries should key off suborders once they exist; can be built against today's single-tenant orders first if sequencing demands it). FILES: new src/core/modules/finance/ module. SCOPE: append-only merchant_ledger_entries, populated on terminal delivered status. ACCEPTANCE: a delivered order produces exactly two ledger rows (merchant net, platform commission) summing to the order total. TESTS: new integration test. COMMIT BOUNDARY: this alone — DEEP guardian review required (Financial logic class).

TASK-12 — Minimum delivery domain
WHY: §9/§17#2. DEPENDENCIES: TASK-10 (delivery jobs should reference suborders, not the old single-tenant orders, to avoid rework). FILES: new src/core/modules/delivery/ module, new schema. SCOPE: delivery_offices, drivers (role='driver' creation path), delivery_jobs with the lifecycle from §9. ACCEPTANCE: a driver can be assigned to a ready suborder, transition it through pickup to delivered, with the same tenant-isolation discipline as merchant order transitions. TESTS: new unit + integration tests mirroring the orders test pattern. COMMIT BOUNDARY: schema, then service, then one minimal UI page per role (driver app, delivery-office dashboard) as separate commits.

TASK-13 — Merchant employee / tiered admin RBAC
WHY: §17#5, only once real onboarding demands it. DEPENDENCIES: none technically, but sequence after the "70 merchants" wave actually surfaces the need. FILES: khalil.repository.ts (user creation), merchant/admin service+UI. SCOPE: allow creating employee/merchant_manager users scoped to a tenant; add a second admin tier if needed. ACCEPTANCE: an employee can perform the subset of merchant actions the founder specifies, and no more. TESTS: new authorization tests per role. COMMIT BOUNDARY: merchant-employee first, admin-tiering second, as separate commits — DEEP guardian review required (Authorization/RBAC class).

TASK-14 — Update stale documentation
WHY: §19#12. DEPENDENCIES: none, can run in parallel with anything above. FILES: docs/CHANGELOG.md, specs/identity/SPEC.md, docs/SECURITY.md §9, docs/design/HOME_FEED.md (once the UI split from §14 is committed). SCOPE: bring each current. ACCEPTANCE: no stale claim remains that contradicts verified current code. TESTS: n/a. COMMIT BOUNDARY: one commit per file, or batched as a single docs-only commit.

23. What We Should NOT Build Yet
A true merchant_offers join-table remodel of catalog (§10) — current master-item clone model is sufficient for the near-term onboarding wave; revisit only when a specific category needs the open-marketplace model (BR-017).
Nizam (separate governance/permissions engine), a central event ledger, Hakim (AI advisory), Taysir's full wallet/ledger beyond the minimal commission table in TASK-11, Barq's open delivery marketplace/fair-matching engine, additional worlds (Asrab/Nabdh/Noor Al-Din/Takween) — all explicitly PROPOSED with no near-term V1 dependency.
Real payment gateways beyond COD — no evidence any V1 customer segment needs it yet.
Redis or any new infrastructure dependency for the distributed-lock problem (TASK-08) — Postgres already does this job elsewhere in the codebase (inventory decrement); don't introduce a new moving part for it.
Importing the external "Antigravity" branch's code directly — this repo's own uncommitted work already achieves the same non-invasive separation; importing a separate implementation would just create the exact duplication problem (§14) already present, twice over.

24. Final Recommendation
Next engineering action: land TASK-01 through TASK-05 first (all P1, all small, all independently committable, none requiring an architecture decision from the founder) — this closes the one real security/abuse gap (OTP rate limit), fixes the customer-visible defects already sitting in the working tree, and retroactively documents the undocumented catalog feature, all without touching anything structural. Commit the UI work in the working tree as part of this pass (per §14, it's sound and wired — don't let it keep drifting uncommitted).

Then bring TASK-09 (the customer_order/merchant_suborders design doc) to the founder for explicit sign-off before writing any of that code — this is the single decision that unlocks the actual "one marketplace experience across multiple merchants" vision named in this task's brief, and per the project's own protocol (AGENTS.md §1), it must be planned and approved before implementation begins.

Do not attempt delivery (TASK-12) or commission (TASK-11) before the multi-merchant order model exists underneath them — both are cleaner to build once suborders exist as the thing a driver picks up and a ledger entry attaches to, rather than building them against the single-tenant orders table and reworking them immediately after.

# Post-Pilot Backlog

Everything identified before the church dry run (Sunday 2 August 2026) that was
deliberately **not** shipped beforehand, so the pilot tested the existing flow
rather than fresh code.

Compiled 31 July 2026 from: a competitor sweep (TaskRabbit, Airtasker, Handy,
Instacart, Shipt, Deliveroo, Tesco, Ocado, Uber Eats, Just Eat, Stuart), a
code audit of the runner surface, an FCA/e-money research pass, and a security
review.

**Audit coverage.** The runner surface was audited in full. The customer surface
and accessibility were audited manually afterwards (2 Aug) — findings folded in
below. What has still **never** been systematically reviewed: the carer flow, the
templates flow, the claims flow end to end, the admin surface beyond runner
management, and the PWA/service-worker behaviour.

**Checked and genuinely fine** (recorded so nobody re-litigates them): text
contrast passes WCAG AA in both themes (4.59–4.83:1 for muted text); tap targets
use a 44px minimum; empty states exist across the customer dashboard; the
resume-payment path is wired into the UI.

---

> **The 2 August dry run did not go ahead.** The "don't touch the flow" constraint
> that shaped this list no longer applies, so items are now ordered purely by
> value and dependency rather than by pilot risk. Re-read the ordering notes at
> the bottom before picking work up.

## Already shipped and deployed (do not redo)

- Customer PII leak to unassigned runners; dead chat notifications; global rate
  limit bucket — `95edbe9`
- Password reset (both roles) + admin account deletion — `2b59692`
- Runner/entry-flow QoL pass: fabricated distance removed, shopping list shown
  before accepting, accept confirmation, maps + tel links, task sort, money
  formatting, messaging gate, rating contradiction, service-unavailable retry,
  cold-start messaging — `47915d5`
- Wallet disabled (client + server, `WALLET_ENABLED` opt-in); first-errand
  introductory price of £8 with the runner paid on the full tariff — `e1f03a9`

---

## P0 — Blockers before real money moves at any scale

### 1. Wallet → Stripe Connect + manual capture
The prepaid wallet is stored value: a claim on ErrandBuddy, issued on receipt of
funds, spendable with third parties, redeemable via `withdrawFromWallet`. That
maps onto the UK e-money definition almost element by element.

**Critical:** pre-auth + capture alone is **not** sufficient. It fixes the
e-money limb only. If ErrandBuddy then pays runners from its own bank account,
that swaps an e-money problem for a payment-services one. Manual capture must be
combined with Connect so the payout leg belongs to Stripe.

**Invariant to encode:** ErrandBuddy never holds a per-customer redeemable
balance. No refunds to wallet, no credits, no goodwill balances. All refunds to
the original card.

Files: `wallet.service.js`, `payments.service.js`, `stripe.service.js`,
`config/pricing.js`, `app.js` (Connect webhook before `express.json()`).

Design constraints: card authorisations expire in ~7 days, so authorise close to
fulfilment, not at booking — this materially affects `WEEKLY_SUBSCRIPTION`. You
can only capture up to the amount authorised, so variable goods cost needs an
over-authorised estimate plus a separate overage charge.

### 2. Goods charge fails silently
`bookings.service.js` catches a failed wallet charge / Stripe transfer and only
`console.error`s it. The runner sees a successful completion. Someone can front
£60 of shopping and never learn that neither the charge nor their reimbursement
happened. **Must be fixed before goods charging is used with real money.**

### 3. Runner can cancel an assigned booking with no refund
`PATCH /bookings/:id {status:'Cancelled'}` — the ownership check passes for the
assigned runner, status updates are unrestricted by role, and `ASSIGNED →
CANCELLED` is a legal transition. Restrict status transitions by role.

### 4. Enable Stripe Connect on the platform account
Connect is coded (`createConnectAccount`, `createAccountLink`, `retrieveAccount`)
but not enabled, so payouts are dead. Demo runners carry placeholder
`acct_demo_*` ids that need clearing.

---

## P1 — Highest value after the pilot

### 5. Out-of-stock / substitution flow
The single biggest unhandled operational reality in grocery errands, and the #1
source of disputes. There is currently **no mechanism at all** — no item model,
no substitution state. A booking is one free-text `instructions` string. The
runner's only channel is chat, which needs the customer watching the app in real
time while the runner stands in the aisle.

Build in this order (value per unit of effort):

1. **Substitution price protection** — clamp so the customer never pays more than
   the agreed price for a substituted item. Near-zero code, highest trust per
   line. (Tesco charges the original price; Sainsbury's credits the difference.)
2. **Order-level substitution default** — one enum on `Booking`, one radio group
   at checkout, one line on the runner's job screen: *substitute freely / ask me
   first / no substitutes*. The 80% version at a fraction of the cost.
3. **Named backup per item** — "if no Hovis, get Warburtons." Elderly customers
   have fixed brand preferences.
4. **In-shop approve/decline card with a photo** — Instacart's model. Big
   tappable Approve / No thanks, which suits shaky hands and poor eyesight far
   better than free text.
5. **No-answer timeout rule** — the elderly-user failure mode nobody designs for:
   the customer is asleep or in another room. Needs an explicit fallback.

### 5b. Auto-dispatch — the originally intended job flow
**This was filed in P3 by mistake. It is the founder's original design for how
errands were meant to work, described pre-pilot as:** *"as soon as someone places
a request… any available runner (in the area first then others outside if nothing
after a minute) gets notified via a pop up or message."*

What exists instead is a pull model: runners open the app and see open jobs in
their own postcode area, refreshed by a 45s poll. Nothing is pushed to them, and
jobs are assigned manually from the admin dashboard.

Three separate pieces, and the second is the one that gets underestimated:

1. **Notify eligible runners when a job becomes available.** Must fire on the
   transition to `PENDING` (i.e. after payment clears), *not* on creation —
   bookings start life as `PENDING_PAYMENT`. Push already exists.
2. **Relax the area restriction so the radius can widen.** This is not a
   notification change, it is a permissions change. Today the area gate is
   absolute in two places: `listBookings` only returns open jobs where
   `postcodeArea` equals the runner's own area, and `acceptBooking` throws a hard
   403 — *"Booking is outside your area"*. Widening after 60s means a runner
   outside the area must be able to both see and accept the job, so the gate has
   to become time-dependent rather than binary.
3. **A timer.** Render's free tier sleeps, so a 60s delayed job needs an external
   scheduler or a persistent process. Pairs with the "keep Render awake" item.

Build alongside **#6b (reassignment)** and **#7 (release a job)** — all three
share the "notify every eligible runner that this job is available" primitive,
and building them separately means writing it three times.

### 5c. Multi-church expansion has no home in the data model
The stated plan is church → other churches → public. There is currently **no
concept of an organisation, congregation, or tenant anywhere** in the schema —
grep returns nothing. Everything is scoped by postcode area only.

That is fine for one congregation and breaks immediately at two: you cannot tell
which church someone came through, cannot report per-church, cannot let one
church's coordinator see their own people without seeing everyone, and cannot run
a second pilot without the two mixing.

This is the same shape of problem as the **family/household grouping** request
(P2) — both are "which group does this person belong to". Design them together as
one grouping concept rather than bolting on two overlapping ones. A nullable
`organisationId` on `User` plus an admin filter is probably the whole of v1.

### 6. Receipt photo + itemised receipt email
Cost-of-goods is charged with **no evidence trail**. For vulnerable adults and
their carers, "prove my mum wasn't overcharged" is a trust question, not a
feature request. Needs a photo field on `Booking` and an upload route registered
before `express.json()` (follow the `RunnerDocument` pattern). Resend is already
wired for the itemised email.

### 6b. Reassignment status — cancelled jobs go back to the pool
*(Founder's idea, 31 July.)* When a runner cancels or releases a job it currently
just sits idle. Add a reassignment state so the booking returns to the open pool
and every other eligible runner is pinged again.

Needs a `REASSIGNING` (or reuse of `PENDING` + a `reassignedAt` stamp) plus a
notification fan-out. Pairs directly with **#7 Release an accepted job** and with
the auto-dispatch item in P3 — build them together, since they share the same
"notify eligible runners" primitive. Note the notification must fire on the
booking being *available*, not on creation.

### 6c. Runner virtual card (research first, then decide)
*(Founder's idea, 31 July.)* Instead of the runner fronting their own money and
being reimbursed, issue them a virtual card tied to a balance that they spend at
the shop. All the existing refund / reimbursement / top-up rules would still
apply.

**This is a good instinct and it may be the right long-term answer** — it removes
the runner's cash-flow burden entirely, which is one of the biggest reasons small
errand platforms lose runners. Instacart and Shipt both work this way.

Research before committing:
- **Stripe Issuing** is the obvious route — it is built for exactly this: issue
  virtual cards, fund them from the platform balance, and constrain spend with
  authorisation controls (merchant category, per-transaction cap, single-use
  cards tied to one booking). Check current UK eligibility, pricing, and the
  application/approval process, which is not automatic.
- **Regulatory note, important:** this is *not* the same problem as the customer
  wallet. A customer wallet is money **you owe back to a customer**. A funded
  card is **your own money being spent on your own obligation**. So it does not
  obviously reintroduce the e-money issue — but it must be confirmed, and it only
  works if the customer has already paid, which means it depends on the pre-auth
  + capture work in P0 #1 landing first.
- **Fallback if Issuing isn't available:** a per-errand spend cap with the runner
  fronting and same-day reimbursement, or a small number of shared physical cards
  held by trusted runners for a pilot-scale operation.
- Consider single-use cards scoped to one booking with the cap set to the
  authorised goods estimate — that also solves the "runner typed any number up to
  £1000" problem in P0 #2.

### 7. Release an accepted job
If a runner's car won't start, their only options today are to phone someone or
let an elderly customer's prescription silently fail. A structured release gives
you an alert instead of a no-show. Pair with a decline/dismiss on the available
list, which currently re-shows the same unwanted job every 45s forever.

### 8. Runner is never told a booking was cancelled
No cancellation notifier exists. A runner can travel to an address for a job the
customer cancelled.

### 8c. Abandoned Pending-payment bookings are never cleaned up
*(Found in the customer-side audit, 2 Aug.)* Nothing expires a booking that was
created but never paid for. Two consequences:

1. They pile up in the customer's "Awaiting payment" group indefinitely, which
   for a confused older user looks like several duplicate bookings.
2. **They permanently burn the first-errand offer.** Eligibility counts any
   booking that isn't `CANCELLED`, deliberately, so the offer can't be farmed by
   creating and abandoning bookings — but the cost is that one abandoned attempt
   silently removes the discount for good. See `createBooking` in
   `bookings.service.js`.

Fix: expire `PENDING_PAYMENT` bookings to `CANCELLED` after ~24h. That fixes both
at once — the clutter goes, and cancelled bookings don't count against
eligibility. Needs a scheduled job, so it lands with the "keep Render awake"
item in P3.

### 8d. Session expires mid-flow with no warning
*(Found 2 Aug.)* JWTs last 7 days with no refresh. When one expires the next
request 401s and `clearSession()` fires, dumping the user to login — losing an
in-progress booking form. No warning, no refresh, no "you've been signed out"
message. Low frequency, high annoyance, and worse for someone who books once a
fortnight.

### 8e. Small type for the audience
*(Found 2 Aug.)* 52 uses of `text-xs` (12px) and 238 of `text-sm` (14px) across
pages and components. Contrast is fine; the sizes are not, for a user base that
skews elderly. GOV.UK guidance for older users points at 16px+ body text. Worth a
deliberate pass over which of those are genuinely captions and which are
information someone has to read.

### 9. Partial completion / problem states
`ON_HOLD` exists in the schema and the transition map but is unreachable from the
UI and has no runner endpoint. There is no "customer not home", "pharmacy
closed", or "could not complete" outcome — only COMPLETED.

### 8b. Claims become a ticket system
*(Founder's decision, 31 July.)* Runners currently cannot see or respond to a
claim raised against them — `listClaims` returns `[]` for every runner, while a
customer can name them and trigger a Stripe refund with no notice.

Turn `Claim` into a thread: messages attached to the claim, visible to the
customer, the named runner and the admin, with a status the runner can see. The
existing per-booking `Message` model is a reasonable template. Notify the runner
on creation and on resolution. **A refund should not be issuable until the runner
has had a chance to respond**, or at minimum the admin should see that they
haven't.

### 10. Runner rating: compute it, and don't fabricate a starting value
`RunnerProfile.rating` is set to 0 at signup and never written again. The display
was patched to use a computed average; the stored field is still dead, and
`notifyReviewSubmitted` is an empty function.

**On the starting value** *(founder suggested 2 or 2.5 rather than 5, 31 July)* —
the instinct that 5 is a false blanket is right, but **2.5 is also a fabricated
number, just a pessimistic one**, and it is worse in one specific way: it makes a
brand-new runner look actively bad to customers before they have done anything,
which suppresses their first bookings and means they may never get the reviews
that would fix it. That is a cold-start penalty on exactly the people you most
need to keep.

**Recommendation: don't show a number at all until there is real data.** Display
a "New runner" badge until roughly 3 completed reviews, then switch to the true
average. This is what most marketplaces settled on. It is honest, it doesn't
punish new runners, and it doesn't overclaim either.

**On gamification** *(founder's idea)* — tiering task access by performance is a
real and proven mechanic (Uber Pro, Instacart priority access). Worth doing. But
base progression on **completed tasks plus genuine rating once it exists**, not
on a made-up starting score. A runner-onboarding splash explaining how the rating
works, what unlocks at each tier, and how to get there is a good companion piece
and cheap to build.

### 11. Booking photos (original feature request)
Customers attach photos to specify items visually — "this loaf, not that one."
Directly reduces the wrong-item problem. Follow the existing large-upload
pattern; decide between a `Bytes` blob and the downscaled data-URL approach used
for avatars.

### 12. ~~First-booking incentive~~ — SHIPPED (`e1f03a9`)
Built as a £8 introductory price for a customer's first one-off, derived
server-side, with the runner paid on the full £25 tariff so the platform absorbs
the £14.50 rather than the runner. **Open question now the pilot has moved:** at
£8 the platform loses £14.50 per booking, which was acceptable for one afternoon
with a handful of church members but is not a sustainable acquisition cost. Revisit
`FIRST_BOOKING_PRICE` in `config/pricing.js` before any wider launch — the
fee-waiver version (customer pays £22.50, platform takes £0, runner still whole)
caps the loss at the platform's own margin.

---

### 13. Nothing measures whether the pilot worked
The pilot's stated purpose is *"to judge whether its a viable product that can
scale."* Nothing in the app currently captures the data needed to judge that.

`/api/admin/overview` gives running totals — bookings, revenue, commission,
active runners. Useful for operations, useless for the question being asked,
because totals can't distinguish ten people booking once from one person booking
ten times. There is no cohort view, no repeat-booking rate, no funnel, no
time-to-assignment, no drop-off tracking.

The three numbers that actually answer "is this viable":
- **Repeat rate** — what share of customers book a second time, and how long it
  takes. This is the single most important number for a marketplace and it is
  entirely absent.
- **Fulfilment** — what share of bookings get accepted, how long assignment takes,
  and how many are cancelled or abandoned. Ties directly to auto-dispatch (#5b)
  being worth building.
- **Drop-off** — where people abandon the 6-step booking flow. Requires
  instrumenting the steps; today an abandoned booking is indistinguishable from
  one that was never started.

Cheap v1: an admin page reading what the database already holds — bookings per
customer over time, time between `PENDING` and `ASSIGNED`, and counts by final
status. No new tracking, no third-party analytics, no consent banner. Do this
before the rescheduled pilot, or that pilot produces anecdotes instead of
evidence.

---

## P2 — Worth doing

| Item | Note |
|---|---|
| **Autofill from signup details** *(founder, 31 July)* | Address and phone are captured at registration and then ignored by the booking form, so customers retype them every time. Prefill from `CustomerProfile`, keep them editable per booking. Cheapest real win on the customer side. |
| Saved address book + persistent delivery notes | The step beyond autofill: multiple saved addresses with gate codes, "ring twice", "dog in the garden". Currently retyped into free text every booking. |
| Customer standing notes / accessibility flags | `CustomerProfile` has no notes, preferences, or accessibility fields. "Hard of hearing", key-safe code, preferred brands. |
| "Your runner is on the way" state | Long silent gap between ASSIGNED and IN_PROGRESS. Elderly customers ring to ask where their shopping is. |
| Reschedule instead of cancel | Elderly customers reschedule constantly — appointments, weather. Cancel-and-rebook loses the runner and creates a refund mess once capture is live. |
| Cancellation reason picker | Two nullable columns. In a young pilot, cancellation reasons are your most valuable dataset. |
| Runner earnings: today / this week / all time | Currently computed client-side from booking prices only. |
| Per-job earnings breakdown | Fee, commission, goods reimbursement. Showing the 10% openly builds more trust than hiding it. |
| Payout history + status | Never reads `Payment.stripeTransferId`, `goodsTransferId`, or payment status. No "paid on" dates, no pending vs settled. |
| Goods reimbursement missing from earnings | `payout = price * 0.9` ignores `goodsCost`, so money the runner fronted never appears in their total. |
| Runner sees review text + rating breakdown | The server already sends full review text; the dashboard extracts only stars. A runner can never see what was said about them. |
| Claims visibility for runners | `listClaims` returns `[]` for every runner. A claim can name them and trigger a refund with no notice and no right of reply. |
| Tipping (100% to runner, after review) | Church customers will press cash into a runner's hand otherwise, which erodes the platform relationship. |
| Runner day / schedule view | Grouped by status only — no "today", no run sheet. |
| Availability toggle | No OFFLINE state and no working hours. A runner on holiday can't stop being shown jobs. `availabilityNotes` is free text nothing reads. |
| In-app support entry point for runners | No "report a problem" anywhere on the dashboard. |
| Family / household grouping (original request) | Stated purpose was operational — *"easier to identify who is associated with who"* — not a permissions feature, so keep it as a label. **Known hole if it ever gates anything:** a runner blocked from their own household's job can leave the household, take the job, and rejoin, because guards read live membership. Needs membership history or a booking-time snapshot. For ~10 families an admin-only field may be the whole answer. **Design together with #5c (multi-church)** — same underlying "which group is this person in" problem. |

---

## P3 — Later

- Earnings export / tax summary (self-employed runners have nothing for an accountant)
- Paste-a-list free-text parsing into line items
- Reject at the door, no questions asked
- Substitution summary sent before arrival
- *(Auto-dispatch moved up to P1 #5b — it was wrongly filed here.)*
- Completed task list pagination (grows forever, unpaginated)
- Start-task date guard (a task can be started days early, firing "your errand is
  underway")
- Suspension strands in-flight work (suspended mid-errand = loses address, phone
  and message thread)
- Self-accept sends the runner a notification about a job they just chose
- Accept race UX: bare 409, card stays on screen inviting a second failed tap
- `BecomeRunner.jsx` doesn't mention ID upload or the approval wait
- Pending runners can't reach payout setup (buried in a tab they can't open)
- Commission rate hardcoded client-side (`price * 0.9`), duplicating the server
- Duplicate `phone` key in `registerSchema` (harmless, dead code)
- Keep Render awake (cron ping) or upgrade off free tier
- Inbound email for hello@errandbuddy.uk (currently send-only)
- PNG icons for PWA / app stores
- Capacitor native wrap

---

## Communications (decided: staged)

WhatsApp Business API **cannot** relay messages between two of your users — the
version you'd want isn't possible at any price. Apple Messages for Business is
~£495/month and takes months to approve. Now that in-app chat actually notifies
people, most of the original reason for wanting WhatsApp is gone.

If revisited: a per-booking click-to-WhatsApp deep link gated to
ASSIGNED/IN_PROGRESS, plus a server-side audit record that contact details were
disclosed (who, when, which booking) so there is a trail even when the
conversation is off-platform. Number masking before public launch.

---

## Where to start now the pilot has moved

Three tracks. A and B are independent; C is gated on Stripe.

**Track A — correctness (do first, ~1 day).** P0 #3 (runner can cancel a paid
booking), P0 #2 (silent completion failures), #8 (runner never told of a
cancellation), #10 (rating never computed). Small, self-contained, all real
defects. Nothing downstream depends on them, so they never get cheaper to fix.

**Track B — the substitution problem (next, ~3–5 days).** P1 #5, built in the
five documented steps. This is the single thing most likely to make a real pilot
fail, and it is now the biggest product gap. Pull #6 (receipt photo) and #11
(booking photos) in alongside it — they share the same upload plumbing and the
same "what did the runner actually buy" question.

**Track C — real money (gated on Stripe activation, ~1–2 weeks).** P0 #1 and #4
together; they are one piece of work, not two. Do not start the virtual card
(#6c) until this lands, since it depends on the customer having paid first.

Everything in P2 is genuinely optional until one of the above is done. The
temptation will be to graze on P2 because the items are small — resist it; the
list is long enough that grazing eats a week without closing anything.

---

## Non-code — not Claude's lane

**Before anyone enters a home:**
- Safeguarding / DBS position agreed with the church. Errands for people who need
  help by reason of age or illness can be regulated activity under the
  Safeguarding Vulnerable Groups Act 2006 → Enhanced DBS with the adults' barred
  list. Most churches have a safeguarding lead and an existing route.
- Public liability insurance — runners evidence their own, or buy platform cover.
- Written prohibition on personal care (washing, dressing, toileting, feeding).
  Errands are not CQC-registrable; personal care is.

**Before real money at scale:**
- FCA-authorised professional or financial services solicitor signs off the
  payment architecture. Ask specifically: *"If we remove the wallet and move to
  Stripe Connect with manual capture, holding no ledger balance, do we still
  provide any regulated payment service in our own right — particularly on the
  shop-goods reimbursement leg?"* Get it in writing.
- Confirm the trading entity. Terms must say the customer buys the errand service
  **from ErrandBuddy**, which engages runners to fulfil it — that makes runner
  payments supplier payments rather than money transmission.

**Ongoing:**
- ICO registration; privacy policy and terms
- Rotate the Neon database password (was pasted in chat history)
- Employment status review (Uber v Aslam — server-side price-setting is one of
  the factors that counted against Uber)
- Right-to-work checks expected to extend to gig workers from 1 Oct 2026
- Confirm HMRC digital platform reporting obligations with an accountant

# Post-Pilot Backlog

Everything identified before the church dry run (Sunday 2 August 2026) that was
deliberately **not** shipped beforehand, so the pilot tested the existing flow
rather than fresh code.

Compiled 31 July 2026 from: a competitor sweep (TaskRabbit, Airtasker, Handy,
Instacart, Shipt, Deliveroo, Tesco, Ocado, Uber Eats, Just Eat, Stuart), a
code audit of the runner surface, an FCA/e-money research pass, and a security
review.

**Caveat:** the customer-side audit and the accessibility sweep did not complete.
There is very likely more on the customer side that is not captured here. Re-run
those before treating this as exhaustive.

---

## Already shipped (for context — do not redo)

- Customer PII leak to unassigned runners; dead chat notifications; global rate
  limit bucket — commit `95edbe9`, deployed
- Password reset (both roles) + admin account deletion — commit `2b59692`, **not yet deployed**
- Runner/entry-flow QoL pass: fabricated distance removed, shopping list shown
  before accepting, accept confirmation, maps + tel links, task sort, money
  formatting, messaging gate, rating contradiction, service-unavailable retry,
  cold-start messaging — commit `47915d5`, **not yet deployed**

---

## Could still make it before Sunday (small, low risk)

| Item | Why | Effort |
|---|---|---|
| Prefill address from `CustomerProfile` in `Book.jsx` | The profile already stores address + postcodeArea and the booking form ignores them, so every customer retypes their address every time. Real friction for elderly users. | ~1h |
| "Declining costs you nothing" copy for runners | Church volunteers will feel social pressure to accept everything, then burn out or ghost. Saying it out loud is copy only. | ~30m |
| Cancellation policy stated at booking | Nobody has a policy at launch and then everyone argues. Stating it is cheap; enforcing it can come later. | ~1h |

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

### 6. Receipt photo + itemised receipt email
Cost-of-goods is charged with **no evidence trail**. For vulnerable adults and
their carers, "prove my mum wasn't overcharged" is a trust question, not a
feature request. Needs a photo field on `Booking` and an upload route registered
before `express.json()` (follow the `RunnerDocument` pattern). Resend is already
wired for the itemised email.

### 7. Release an accepted job
If a runner's car won't start, their only options today are to phone someone or
let an elderly customer's prescription silently fail. A structured release gives
you an alert instead of a no-show. Pair with a decline/dismiss on the available
list, which currently re-shows the same unwanted job every 45s forever.

### 8. Runner is never told a booking was cancelled
No cancellation notifier exists. A runner can travel to an address for a job the
customer cancelled.

### 9. Partial completion / problem states
`ON_HOLD` exists in the schema and the transition map but is unreachable from the
UI and has no runner endpoint. There is no "customer not home", "pharmacy
closed", or "could not complete" outcome — only COMPLETED.

### 10. Runner rating is never computed
`RunnerProfile.rating` is set to 0 at signup and never written again. The display
was patched to use a computed average; the stored field is still dead.
`notifyReviewSubmitted` is also an empty function.

### 11. Booking photos (original feature request)
Customers attach photos to specify items visually — "this loaf, not that one."
Directly reduces the wrong-item problem. Follow the existing large-upload
pattern; decide between a `Bytes` blob and the downscaled data-URL approach used
for avatars.

### 12. First-booking incentive (original feature request)
**Ship as "we waive our fee on your first errand", not as money off.** The
current code computes `runnerPayoutAmount: price - fee`, so lowering the price
takes the discount straight out of the runner's pocket — on a £25 job discounted
to £20, £4.50 of the £5 comes from the runner. Waiving the platform fee costs the
platform ~£1.62 after card fees, keeps the runner whole, and can never go
negative. Enforce server-side in `pricing.js`; the client must never send a
discount.

---

## P2 — Worth doing

| Item | Note |
|---|---|
| Saved address book + persistent delivery notes | Gate codes, "ring twice", "dog in the garden". Currently retyped into free text every booking. |
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
| Family / household grouping (original request) | **Known hole:** a runner blocked from their own household's job can leave the household, take the job, and rejoin — guards read live membership. Needs membership history or a booking-time snapshot. For ~10 families an admin-only notes field may be enough. |

---

## P3 — Later

- Earnings export / tax summary (self-employed runners have nothing for an accountant)
- Paste-a-list free-text parsing into line items
- Reject at the door, no questions asked
- Substitution summary sent before arrival
- Auto-dispatch: notify area runners on new job, widen radius after 60s (needs an
  external scheduler — Render free tier sleeps). Must fire on `PENDING`, not at
  creation, since bookings start `PENDING_PAYMENT`.
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

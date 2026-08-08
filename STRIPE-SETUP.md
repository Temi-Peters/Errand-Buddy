# Stripe go-live checklist

Everything that has to happen before ErrandBuddy can take real money, in order.
Steps 0–4 are yours (they need your identity and bank details). Step 5 is code.

---

## 0. Decide the trading entity — before touching Stripe

The entity is baked into the Stripe account. Changing it later means a new
account, so settle it first.

- **Sole trader** — free, instant, but you are personally liable.
- **Limited company** — ~£50 to incorporate, annual accounts to file, personal
  assets separated from the business.

Given ErrandBuddy handles other people's money and sends people into vulnerable
adults' homes, a limited company is worth twenty minutes with an accountant.

Whichever you choose, the **terms must say the customer buys the errand service
from ErrandBuddy**, which engages runners to fulfil it. That framing is what
makes paying runners a supplier payment rather than money transmission.

## 1. Activate the Stripe account

Dashboard → **Activate account**. You will need:

- Business type and details (from step 0)
- Your name, date of birth, home address
- A **bank account in the business's name** for payouts
- Website: `errandbuddy.uk`
- Expected monthly volume and average transaction size

⚠️ **Stripe reviews the website.** They look for a clear description of what is
sold, pricing, refund/cancellation terms and contact details. `/terms`,
`/privacy`, `/pricing` and `/contact` are all live — read the terms once yourself
and confirm they describe an errand service and say what happens when something
goes wrong. Vague terms are a common reason activation gets held.

## 2. Enable Connect

Separate from activation. Dashboard → **Connect** → get started.

- Choose the **platform** option (you pay out to runners)
- Choose **Express** accounts

When asked what the platform does: *a local errand marketplace that pays vetted
self-employed runners a share of each completed booking.*

## 3. The three keys

| Key | Goes to | Notes |
|---|---|---|
| `pk_live_…` | Vercel → `VITE_STRIPE_PUBLISHABLE_KEY` | Safe to be public |
| `sk_live_…` | Render → `STRIPE_SECRET_KEY` | Never share this with anyone, including me |
| `whsec_…` | Render → `STRIPE_WEBHOOK_SECRET` | From step 4, not the same as your test one |

**Vercel needs a redeploy** after setting the publishable key — Vite bakes
`VITE_*` in at build time, so setting it alone changes nothing.

## 4. The live webhook — the step people get wrong

Developers → **Webhooks** → Add endpoint:

```
https://errand-buddy-api.onrender.com/api/payments/webhook
```

Events: `payment_intent.succeeded` and `payment_intent.payment_failed`

**The live signing secret is different from the test one.** Miss it and Stripe
takes the customer's money perfectly while the app never finds out — bookings
stay stuck on "Pending payment" forever. This is the single most common go-live
failure.

## 5. Then the code work (mine)

Refactor payments to **pre-authorise at booking, capture on completion, and pay
runners through Connect**, so money goes customer → Stripe → runner and never
becomes a balance ErrandBuddy owes. Roughly a week. This is what clears the
e-money problem.

---

## Two things to hold onto

**Do not re-enable the wallet.** It is off in the client *and* refused
server-side (`WALLET_ENABLED`). Once real money flows, a stored customer balance
is the one thing that makes you the regulated party rather than Stripe.

**The first payout takes about 7 days.** Standard for a new UK account, so you
will be fronting any runner payments in that first week.

## Not yet — later rungs

- **Stripe Issuing** (runner spending cards) — see `POST-PILOT-BACKLOG.md` §6c.
  Needs separate approval, working capital to fund the balance, and a server that
  does not sleep.
- **Your own FCA authorisation** — you would need roughly a quarter of a million
  errands a year before it is cheaper than Stripe. The realistic ladder is
  Stripe Connect → banking-as-a-service under someone else's licence → your own.

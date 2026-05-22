# Errand Buddy — Demo Script
### Community Partners Showcase · Sunday

**Before you start:** Have the app running locally (`npm run dev` from project root, Docker up). Log out so you start from the homepage as a fresh visitor. Keep the admin credentials (`admin@example.com` / `password123`) and a customer account (`aisha@example.com` / `password123`) handy in a notes app.

**Tone:** Narrate what a real resident would experience, not what the tech is doing. "Imagine Margaret, 74, who needs her prescription picked up every Friday..."

---

## 1. Homepage — (~1 min)

**What to show:** Land on `http://localhost:5173`

**What to say:**
> "This is what someone sees when they first arrive. It's straightforward — here's what we do, here are the services, and you can get started right away."

- Point out the service types visible on the page
- Point to the navigation: Services, Pricing, How It Works, Become a Runner
- **Key message:** "No account needed to explore. We made it friction-free."

---

## 2. Services & Pricing Pages — (~1 min)

**What to show:** Click through to `/services` then `/pricing`

**What to say:**
> "The five services we cover today are the ones we believe are most commonly needed — prescription pickups, grocery runs, dry cleaning, dog walking, and general errands. Part of what we're here to find out is whether that matches what you actually see in your communities."

> "On pricing, customers can choose a one-off booking or a weekly subscription. For someone who needs a grocery run every Thursday, the subscription means they set it once and it just happens."

- **Key message:** Predictable, affordable, flexible.

---

## 3. Booking Flow — (~2 min)

**What to show:** Click "Book Now" or go to `/book`

**What to say:**
> "Let me show you what booking actually looks like. I'll walk through it as a customer."

Walk through the form:
- Select a service type (pick **Prescription Pickup** — most relevant to their audience)
- Choose one-off or weekly
- Pick a date and time
- Enter address and any special instructions ("Please ring the bell twice, I'm hard of hearing")
- Show the price calculation

> "The whole booking takes under two minutes. The customer pays through the platform — the runner doesn't handle cash at all, which was really important for trust and safety."

- **Key message:** Simple for residents, no cash handling, instructions captured properly.

> "At this point you'd normally complete payment and get confirmed — I'll skip that step in the demo, but the full flow is wired up."

---

## 4. Customer Dashboard — (~1.5 min)

**What to show:** Log in as `aisha@example.com` → `/customer/dashboard`

**What to say:**
> "Once a booking is placed, the customer has a dashboard where they can see everything — upcoming bookings, past history, status updates."

Point out:
- Active bookings and their statuses (Pending → Assigned → In Progress → Completed)
- The ability to add instructions or message the runner
- Past bookings with reviews

> "Aisha here has a few bookings in different states. You can see the status updates in real time as the runner progresses through the job."

- **Key message:** Customers stay informed without having to chase anyone.

---

## 5. Runner Dashboard — (~1.5 min)

**What to show:** Log out, log in as `tom@example.com` → `/runner/dashboard`

**What to say:**
> "Now let me show you the other side — this is what a runner sees."

Point out:
- Available bookings they can accept in their area
- Their active jobs and what's expected
- Their rating and completed task count

> "Runners only see bookings in their area. They choose what they take on — it's flexible income that fits around their existing schedule. Tom here has completed a few jobs and has a rating building up."

- **Key message:** Runners are local, flexible, and accountable through the rating system.

---

## 6. Admin Dashboard — (~1.5 min)

**What to show:** Log out, log in as `admin@example.com` → `/admin`

**What to say:**
> "And this is the admin view — what we use to run the platform."

Point out:
- The runner approval queue (runners apply, we vet them before they go live)
- Ability to approve, reject, or suspend runners
- Overview of bookings and platform activity

> "Every runner goes through a manual approval process before they can take any jobs. We review their application, their area, how they're getting around. This is the layer of trust that makes the whole thing work."

- **Key message:** You're not just releasing an app into the wild — there's human oversight on who runs errands for your community's residents.

---

## 7. Become a Runner Page — (~30 sec)

**What to show:** Log out, go to `/become-a-runner`

**What to say:**
> "For anyone in the room thinking about the supply side — this is how runners sign up. It's a simple application: your area, your transport, your availability. We review every application."

- **Key message:** Low barrier to apply, high bar to get approved.

---

## Wrap-up (~30 sec)

> "That's the full loop — a resident books a service, a local runner picks it up, the errand gets done, and both sides have a record of it. The platform sits in the middle handling payment, communication, and accountability."

> "We're not live yet — this is a demo environment with test data. But everything you've just seen is real, working software. What we're here to figure out is whether this is the right approach for the communities you work with."

→ Hand to discussion / questions (use the "Let's Talk" slide)

---

## Handling Common Live Demo Issues

| Issue | Fix |
|---|---|
| App shows "Service temporarily unavailable" | Backend isn't running — `cd server && npm run dev` |
| Login fails | Check you're using `password123` and the right email |
| Booking page looks empty | Might need to be logged in — use `aisha@example.com` |
| Database error | Run `docker compose up -d` from project root, wait 10 sec |

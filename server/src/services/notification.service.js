import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;
const FROM = env.resendFrom;
const SITE = env.clientUrl;

// ─── Core send helper ────────────────────────────────────────────────────────

const send = async ({ to, subject, html }) => {
  if (!resend) {
    console.log(`[notifications] No RESEND_API_KEY — skipping: ${subject} → ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    console.log(`[notifications] Sent "${subject}" → ${to}`);
  } catch (err) {
    console.error(`[notifications] Failed to send "${subject}" → ${to}:`, err.message);
  }
};

// ─── Email templates ─────────────────────────────────────────────────────────

const layout = (body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF9;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #E7E5E4;overflow:hidden;">
        <tr>
          <td style="background:#1C1917;padding:20px 28px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">📦 ErrandBuddy</span>
          </td>
        </tr>
        <tr><td style="padding:28px;">${body}</td></tr>
        <tr>
          <td style="padding:16px 28px;background:#F5F5F4;border-top:1px solid #E7E5E4;">
            <p style="margin:0;font-size:12px;color:#78716C;">ErrandBuddy · Local errand support across Leicester<br>
            Questions? Reply to this email or visit <a href="${SITE}" style="color:#1C1917;">${SITE}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const h1 = (text) => `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1C1917;letter-spacing:-0.3px;">${text}</h1>`;
const p = (text) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#57534E;">${text}</p>`;
const detail = (label, value) => `<tr><td style="padding:6px 0;font-size:14px;color:#78716C;width:40%;">${label}</td><td style="padding:6px 0;font-size:14px;color:#1C1917;font-weight:600;">${value}</td></tr>`;
const detailTable = (rows) => `<table style="width:100%;border-collapse:collapse;background:#F5F5F4;border-radius:10px;padding:4px 12px;margin:16px 0;" cellpadding="0" cellspacing="0"><tbody>${rows}</tbody></table>`;
const btn = (text, href) => `<a href="${href}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#1C1917;color:#ffffff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">${text}</a>`;

// ─── Notification functions ───────────────────────────────────────────────────

export const notifyBookingCreated = (booking) => {
  const name = booking.customer?.user?.name || 'there';
  const email = booking.customer?.user?.email;
  if (!email) return;

  const date = new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  send({
    to: email,
    subject: `Booking confirmed — ${booking.serviceType}`,
    html: layout(`
      ${h1(`Booking confirmed, ${name.split(' ')[0]}.`)}
      ${p(`Your errand request has been received. A local runner will be assigned shortly.`)}
      ${detailTable(`
        ${detail('Service', booking.serviceType)}
        ${detail('Date', date)}
        ${detail('Time', booking.time)}
        ${detail('Price', `£${booking.price}`)}
        ${detail('Status', 'Pending assignment')}
      `)}
      ${btn('View booking', `${SITE}/customer/dashboard`)}
    `)
  });
};

export const notifyBookingAssigned = (booking) => {
  const customerEmail = booking.customer?.user?.email;
  const customerName = booking.customer?.user?.name || 'there';
  const runnerName = booking.runner?.user?.name || 'A runner';
  const date = new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  // Email customer
  if (customerEmail) {
    send({
      to: customerEmail,
      subject: `Runner assigned — ${booking.serviceType}`,
      html: layout(`
        ${h1(`Your runner is confirmed.`)}
        ${p(`<strong>${runnerName}</strong> has been assigned to your ${booking.serviceType} errand on ${date} at ${booking.time}.`)}
        ${p(`You can message your runner directly from your dashboard once the task is in progress.`)}
        ${btn('View dashboard', `${SITE}/customer/dashboard`)}
      `)
    });
  }

  // Email runner
  const runnerEmail = booking.runner?.user?.email;
  if (runnerEmail) {
    send({
      to: runnerEmail,
      subject: `New task assigned — ${booking.serviceType}`,
      html: layout(`
        ${h1(`You've been assigned a task.`)}
        ${p(`You have a new errand assigned to you. Check your dashboard for full details and instructions.`)}
        ${detailTable(`
          ${detail('Service', booking.serviceType)}
          ${detail('Date', date)}
          ${detail('Time', booking.time)}
          ${detail('Address', booking.address || '—')}
          ${detail('Your payout', `£${Math.round(booking.price * 0.9 * 100) / 100}`)}
        `)}
        ${btn('View task', `${SITE}/runner/dashboard`)}
      `)
    });
  }
};

export const notifyTaskStarted = (booking) => {
  const email = booking.customer?.user?.email;
  const name = booking.customer?.user?.name || 'there';
  const runnerName = booking.runner?.user?.name || 'Your runner';
  if (!email) return;

  send({
    to: email,
    subject: `Your errand is underway — ${booking.serviceType}`,
    html: layout(`
      ${h1(`${runnerName} is on it.`)}
      ${p(`Your ${booking.serviceType} errand has started. Your runner is working on it now.`)}
      ${p(`You can message them directly from your dashboard if you need to pass on any details.`)}
      ${btn('View dashboard', `${SITE}/customer/dashboard`)}
    `)
  });
};

export const notifyTaskCompleted = (booking) => {
  const email = booking.customer?.user?.email;
  const name = booking.customer?.user?.name || 'there';
  const runnerName = booking.runner?.user?.name || 'Your runner';
  if (!email) return;

  send({
    to: email,
    subject: `Errand complete — ${booking.serviceType}`,
    html: layout(`
      ${h1(`All done, ${name.split(' ')[0]}.`)}
      ${p(`${runnerName} has completed your ${booking.serviceType} errand. We hope everything went smoothly.`)}
      ${p(`Leave a quick rating to help keep ErrandBuddy's runner quality high — it only takes a second.`)}
      ${btn('Rate your runner', `${SITE}/customer/dashboard`)}
    `)
  });
};

export const notifyCustomerWelcome = (user) => {
  const email = user?.email;
  const name = user?.name || 'there';
  if (!email) return;

  send({
    to: email,
    subject: 'Welcome to ErrandBuddy',
    html: layout(`
      ${h1(`Welcome, ${name.split(' ')[0]}.`)}
      ${p(`You're all set. Book your first errand in minutes — a vetted local runner will handle the rest.`)}
      ${detailTable(`
        ${detail('Grocery Shopping', 'from £25')}
        ${detail('Prescription Pickup', 'from £25')}
      `)}
      ${p(`Top up your wallet before your first errand so your runner can cover the cost of any goods on your behalf.`)}
      ${btn('Book your first errand', `${SITE}/book`)}
    `)
  });
};

export const notifyWalletLow = (user, balance) => {
  const email = user?.email;
  const name = user?.name || 'there';
  if (!email) return;

  const isNegative = balance < 0;

  send({
    to: email,
    subject: isNegative ? 'Action needed — wallet balance is negative' : 'Low wallet balance — ErrandBuddy',
    html: layout(`
      ${h1(isNegative ? `Your wallet is in the negative, ${name.split(' ')[0]}.` : `Your wallet balance is low, ${name.split(' ')[0]}.`)}
      ${isNegative
        ? p(`Your current balance is <strong style="color:#DC2626;">−£${Math.abs(balance).toFixed(2)}</strong>. New bookings are paused until you top up.`)
        : p(`Your current wallet balance is <strong>£${balance.toFixed(2)}</strong>. Top up before your next errand so your runner can cover the cost of goods.`)}
      ${btn('Top up wallet', `${SITE}/customer/dashboard`)}
    `)
  });
};

export const notifyRunnerApplicationSubmitted = (user) => {
  const email = user?.email;
  const name = user?.name || 'there';
  if (!email) return;

  send({
    to: email,
    subject: 'Runner application received — ErrandBuddy',
    html: layout(`
      ${h1(`Application received, ${name.split(' ')[0]}.`)}
      ${p(`Thanks for applying to become an ErrandBuddy runner. We've got your application and will review it shortly.`)}
      ${p(`We'll send you an email as soon as a decision is made. In the meantime, if you have any questions just reply to this email.`)}
    `)
  });
};

export const notifyRunnerApproved = (user) => {
  const email = user?.email;
  const name = user?.name || 'there';
  if (!email) return;

  send({
    to: email,
    subject: 'You\'re approved — welcome to ErrandBuddy',
    html: layout(`
      ${h1(`You're in, ${name.split(' ')[0]}.`)}
      ${p(`Your runner application has been approved. You can now log in and start accepting tasks in your area.`)}
      ${btn('Go to runner dashboard', `${SITE}/runner/dashboard`)}
    `)
  });
};

export const notifyRunnerRejected = (user, reason) => {
  const email = user?.email;
  const name = user?.name || 'there';
  if (!email) return;

  send({
    to: email,
    subject: 'ErrandBuddy runner application update',
    html: layout(`
      ${h1(`Application update`)}
      ${p(`Hi ${name.split(' ')[0]}, unfortunately we're unable to approve your runner application at this time.`)}
      ${reason ? p(`<strong>Reason:</strong> ${reason}`) : ''}
      ${p(`If you'd like to discuss this or re-apply in future, please reply to this email.`)}
    `)
  });
};

export const notifyCarerInvited = (link) => {
  const carerEmail = link.carer?.user?.email;
  const carerName = link.carer?.user?.name || 'there';
  const clientName = link.client?.user?.name || 'An ErrandBuddy customer';
  if (!carerEmail) return;

  send({
    to: carerEmail,
    subject: `${clientName} invited you to be their carer on ErrandBuddy`,
    html: layout(`
      ${h1(`You've been invited, ${carerName.split(' ')[0]}.`)}
      ${p(`<strong>${clientName}</strong> would like you to be able to book and manage errands on their behalf through ErrandBuddy.`)}
      ${p(`If you accept, you'll see them under "People you help" in your dashboard and can book errands for them. You'll cover the service fee with your own card; either of you can remove the link at any time.`)}
      ${btn('Review invite', `${SITE}/customer/dashboard`)}
    `)
  });
};

export const notifyCarerInviteAccepted = (link) => {
  const clientEmail = link.client?.user?.email;
  const clientName = link.client?.user?.name || 'there';
  const carerName = link.carer?.user?.name || 'Your carer';
  if (!clientEmail) return;

  send({
    to: clientEmail,
    subject: `${carerName} accepted your carer invite`,
    html: layout(`
      ${h1(`${carerName} is now your carer.`)}
      ${p(`<strong>${carerName}</strong> has accepted your invite and can now book errands on your behalf. You'll both be able to see and manage these bookings.`)}
      ${p(`You can remove this link at any time from your dashboard.`)}
      ${btn('View dashboard', `${SITE}/customer/dashboard`)}
    `)
  });
};

export const notifyNewMessage = () => {
  // Real-time messaging is in-app — no email notification for individual messages
};

export const notifyReviewSubmitted = () => {
  // Internal event — no external notification needed
};

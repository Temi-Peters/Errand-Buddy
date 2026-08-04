import { Resend } from 'resend';
import { env } from '../config/env.js';
import { serviceTypeToClient } from '../utils/serializers.js';
import { sendPushToUser } from './push.service.js';

const CUSTOMER_URL = '/customer/dashboard';
const RUNNER_URL = '/runner/dashboard';

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;
const FROM = env.resendFrom;
const SITE = env.appUrl;

// Escape user-controlled values before interpolating into email HTML — stops a
// name/bio set to malicious markup from injecting links/markup into emails.
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// ─── Core send helper ────────────────────────────────────────────────────────

const send = async ({ to, subject, html, replyTo }) => {
  if (!resend) {
    console.log(`[notifications] No RESEND_API_KEY — skipping: ${subject} → ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html, ...(replyTo ? { replyTo } : {}) });
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
  const name = esc(booking.customer?.user?.name) || 'there';
  const email = booking.customer?.user?.email;
  if (!email) return;

  const date = new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  send({
    to: email,
    subject: `Booking confirmed — ${serviceTypeToClient(booking.serviceType)}`,
    html: layout(`
      ${h1(`Booking confirmed, ${name.split(' ')[0]}.`)}
      ${p(`Your errand request has been received. A local runner will be assigned shortly.`)}
      ${detailTable(`
        ${detail('Service', serviceTypeToClient(booking.serviceType))}
        ${detail('Date', date)}
        ${detail('Time', booking.time)}
        ${detail('Price', `£${Number(booking.price).toFixed(2)}`)}
        ${Number(booking.discountAmount || 0) > 0
          ? detail('First errand offer', `−£${Number(booking.discountAmount).toFixed(2)} (one-time; later errands are £${(Number(booking.price) + Number(booking.discountAmount)).toFixed(2)})`)
          : ''}
        ${detail('Status', 'Pending assignment')}
      `)}
      ${btn('View booking', `${SITE}/customer/dashboard`)}
    `)
  });

  sendPushToUser(booking.customer?.userId, {
    title: 'Booking confirmed',
    body: `Your ${serviceTypeToClient(booking.serviceType)} request is in. We'll assign a runner shortly.`,
    url: CUSTOMER_URL,
    tag: `booking-${booking.id}`
  });
};

export const notifyBookingAssigned = (booking) => {
  const customerEmail = booking.customer?.user?.email;
  const customerName = esc(booking.customer?.user?.name) || 'there';
  const runnerName = esc(booking.runner?.user?.name) || 'A runner';
  const date = new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  // Email customer
  if (customerEmail) {
    send({
      to: customerEmail,
      subject: `Runner assigned — ${serviceTypeToClient(booking.serviceType)}`,
      html: layout(`
        ${h1(`Your runner is confirmed.`)}
        ${p(`<strong>${runnerName}</strong> has been assigned to your ${serviceTypeToClient(booking.serviceType)} errand on ${date} at ${booking.time}.`)}
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
      subject: `New task assigned — ${serviceTypeToClient(booking.serviceType)}`,
      html: layout(`
        ${h1(`You've been assigned a task.`)}
        ${p(`You have a new errand assigned to you. Check your dashboard for full details and instructions.`)}
        ${detailTable(`
          ${detail('Service', serviceTypeToClient(booking.serviceType))}
          ${detail('Date', date)}
          ${detail('Time', booking.time)}
          ${detail('Address', booking.address || '—')}
          ${detail('Your payout', `£${Math.round(booking.price * 0.9 * 100) / 100}`)}
        `)}
        ${btn('View task', `${SITE}/runner/dashboard`)}
      `)
    });
  }

  sendPushToUser(booking.customer?.userId, {
    title: 'Runner assigned',
    body: `${runnerName} will handle your ${serviceTypeToClient(booking.serviceType)} errand.`,
    url: CUSTOMER_URL,
    tag: `booking-${booking.id}`
  });
  sendPushToUser(booking.runner?.userId, {
    title: 'New task assigned',
    body: `You've been assigned a ${serviceTypeToClient(booking.serviceType)} errand.`,
    url: RUNNER_URL,
    tag: `booking-${booking.id}`
  });
};

export const notifyTaskStarted = (booking) => {
  const email = booking.customer?.user?.email;
  const name = esc(booking.customer?.user?.name) || 'there';
  const runnerName = esc(booking.runner?.user?.name) || 'Your runner';
  if (!email) return;

  send({
    to: email,
    subject: `Your errand is underway — ${serviceTypeToClient(booking.serviceType)}`,
    html: layout(`
      ${h1(`${runnerName} is on it.`)}
      ${p(`Your ${serviceTypeToClient(booking.serviceType)} errand has started. Your runner is working on it now.`)}
      ${p(`You can message them directly from your dashboard if you need to pass on any details.`)}
      ${btn('View dashboard', `${SITE}/customer/dashboard`)}
    `)
  });

  sendPushToUser(booking.customer?.userId, {
    title: 'Your errand is underway',
    body: `${runnerName} has started your ${serviceTypeToClient(booking.serviceType)} errand.`,
    url: CUSTOMER_URL,
    tag: `booking-${booking.id}`
  });
};

export const notifyTaskCompleted = (booking) => {
  const email = booking.customer?.user?.email;
  const name = esc(booking.customer?.user?.name) || 'there';
  const runnerName = esc(booking.runner?.user?.name) || 'Your runner';
  if (!email) return;

  send({
    to: email,
    subject: `Errand complete — ${serviceTypeToClient(booking.serviceType)}`,
    html: layout(`
      ${h1(`All done, ${name.split(' ')[0]}.`)}
      ${p(`${runnerName} has completed your ${serviceTypeToClient(booking.serviceType)} errand. We hope everything went smoothly.`)}
      ${p(`Leave a quick rating to help keep ErrandBuddy's runner quality high — it only takes a second.`)}
      ${btn('Rate your runner', `${SITE}/customer/dashboard`)}
    `)
  });

  sendPushToUser(booking.customer?.userId, {
    title: 'Errand complete',
    body: `${runnerName} has completed your ${serviceTypeToClient(booking.serviceType)} errand.`,
    url: CUSTOMER_URL,
    tag: `booking-${booking.id}`
  });
};

export const notifyCustomerWelcome = (user) => {
  const email = user?.email;
  const name = esc(user?.name) || 'there';
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
  const name = esc(user?.name) || 'there';
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
  const name = esc(user?.name) || 'there';
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
  const name = esc(user?.name) || 'there';
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
  const name = esc(user?.name) || 'there';
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
  const carerName = esc(link.carer?.user?.name) || 'there';
  const clientName = esc(link.client?.user?.name) || 'An ErrandBuddy customer';
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

  sendPushToUser(link.carer?.userId, {
    title: 'Carer invite',
    body: `${clientName} invited you to be their carer.`,
    url: CUSTOMER_URL,
    tag: `carer-${link.id}`
  });
};

export const notifyCarerInviteAccepted = (link) => {
  const clientEmail = link.client?.user?.email;
  const clientName = esc(link.client?.user?.name) || 'there';
  const carerName = esc(link.carer?.user?.name) || 'Your carer';
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

  sendPushToUser(link.client?.userId, {
    title: 'Carer added',
    body: `${carerName} can now book errands on your behalf.`,
    url: CUSTOMER_URL,
    tag: `carer-${link.id}`
  });
};

// Sent to whoever paid for the goods — the carer for carer-placed bookings,
// otherwise the customer. forClientName is set only when a carer was charged.
export const notifyGoodsCharged = ({ to, name, userId, serviceLabel, amount, newBalance, forClientName }) => {
  if (!to) return;

  const safeName = esc(name) || 'there';
  const safeClient = forClientName ? esc(forClientName) : null;
  const isNegative = newBalance < 0;
  const balanceLine = isNegative
    ? `Your wallet balance is now <strong style="color:#DC2626;">−£${Math.abs(newBalance).toFixed(2)}</strong>. Please top up — new bookings are paused while your balance is negative.`
    : `Your wallet balance is now <strong>£${newBalance.toFixed(2)}</strong>.`;

  send({
    to,
    subject: `Charged £${amount.toFixed(2)} for goods — ${serviceLabel}`,
    html: layout(`
      ${h1(`Goods charged, ${safeName.split(' ')[0]}.`)}
      ${p(safeClient
        ? `Your runner has completed the ${serviceLabel} errand you booked for <strong>${safeClient}</strong>. The cost of the goods they purchased has been charged to your wallet.`
        : `Your runner has completed your ${serviceLabel} errand. The cost of the goods they purchased has been charged to your wallet.`)}
      ${detailTable(`
        ${detail('Cost of goods', `£${amount.toFixed(2)}`)}
        ${detail('Wallet balance', `${isNegative ? '−' : ''}£${Math.abs(newBalance).toFixed(2)}`)}
      `)}
      ${p(balanceLine)}
      ${btn('View wallet', `${SITE}/customer/dashboard`)}
    `)
  });

  sendPushToUser(userId, {
    title: `Charged £${amount.toFixed(2)} for goods`,
    body: forClientName
      ? `For the ${serviceLabel} errand you booked for ${forClientName}.`
      : `For your ${serviceLabel} errand. Balance: ${newBalance < 0 ? '−' : ''}£${Math.abs(newBalance).toFixed(2)}.`,
    url: CUSTOMER_URL,
    tag: 'goods-charge'
  });
};

// Contact-form submission → emailed to the team inbox, reply-to set to the sender.
export const notifyContactReceived = ({ name, email, message }) => {
  send({
    to: env.contactEmail,
    replyTo: email,
    subject: `New contact message from ${esc(name)}`,
    html: layout(`
      ${h1('New contact message')}
      ${detailTable(`
        ${detail('From', esc(name))}
        ${detail('Email', esc(email))}
      `)}
      ${p(esc(message).replace(/\n/g, '<br>'))}
      ${p(`<span style="color:#78716C;font-size:13px;">Reply directly to this email to respond to ${esc(name)}.</span>`)}
    `)
  });
};

export const notifyClaimRaised = (claim) => {
  const name = esc(claim.customer?.user?.name) || 'A customer';
  const email = claim.customer?.user?.email;
  send({
    to: env.contactEmail,
    replyTo: email,
    subject: `New claim raised — ${serviceTypeToClient(claim.booking?.serviceType)}`,
    html: layout(`
      ${h1('A customer raised a claim')}
      ${detailTable(`
        ${detail('From', name)}
        ${detail('Service', serviceTypeToClient(claim.booking?.serviceType))}
        ${detail('Reason', esc(claim.category))}
      `)}
      ${p(esc(claim.description).replace(/\n/g, '<br>'))}
      ${btn('Review in admin', `${SITE}/admin/claims`)}
    `)
  });
};

export const notifyClaimResolved = (claim) => {
  const email = claim.customer?.user?.email;
  const name = esc(claim.customer?.user?.name) || 'there';
  if (!email) return;

  const resolved = claim.status === 'RESOLVED';
  const refund = claim.refundAmount != null ? Number(claim.refundAmount) : 0;

  send({
    to: email,
    subject: resolved ? 'Your claim has been resolved' : 'Update on your claim',
    html: layout(`
      ${h1(resolved ? `We've resolved your claim, ${name.split(' ')[0]}.` : `Update on your claim, ${name.split(' ')[0]}.`)}
      ${p(`Regarding your ${serviceTypeToClient(claim.booking?.serviceType)} booking${claim.category ? ` (${esc(claim.category)})` : ''}:`)}
      ${claim.resolutionNote ? p(`<strong>Our response:</strong> ${esc(claim.resolutionNote)}`) : ''}
      ${resolved && refund > 0 ? detailTable(`${detail('Refund issued', `£${refund.toFixed(2)}`)}`) : ''}
      ${resolved && refund > 0 ? p('The refund has been sent to your original payment method and typically appears within 5–10 days.') : ''}
      ${btn('View your bookings', `${SITE}/customer/dashboard`)}
    `)
  });
};

// In-app chat has no polling loop, so a message the recipient isn't already
// looking at would otherwise go unseen. No email — a push per message is enough,
// and tagging by booking collapses a rapid exchange into one notification.
export const notifyNewMessage = (message) => {
  const receiver = message?.receiver;
  if (!receiver?.id) return;

  const senderName = esc(message.sender?.name) || 'Someone';
  const preview = String(message.body ?? '').trim();
  const body = preview.length > 120 ? `${preview.slice(0, 117)}…` : preview;

  sendPushToUser(receiver.id, {
    title: `Message from ${senderName}`,
    body: body || 'You have a new message about your errand.',
    url: receiver.role === 'RUNNER' ? RUNNER_URL : CUSTOMER_URL,
    tag: `message-${message.bookingId}`
  });
};

export const notifyReviewSubmitted = () => {
  // Internal event — no external notification needed
};

// Completion succeeded but the money side didn't. Goes to the team, because this
// needs a human to chase — the runner may be out of pocket.
export const notifyCompletionProblem = ({ bookingId, runnerName, runnerEmail, goodsCost, problems }) => {
  const rows = problems.map((problem) => detail(esc(problem.stage), esc(problem.message))).join('');

  send({
    to: env.contactEmail,
    subject: `⚠️ Payment problem on completed booking ${bookingId}`,
    html: layout(`
      ${h1('A completed task had a payment failure')}
      ${p(`The errand was marked complete, but part of the money flow failed. The runner may be out of pocket — this needs chasing.`)}
      ${detailTable(`
        ${detail('Booking', esc(bookingId))}
        ${detail('Runner', `${esc(runnerName)} (${esc(runnerEmail)})`)}
        ${detail('Goods cost', `£${Number(goodsCost || 0).toFixed(2)}`)}
        ${rows}
      `)}
      ${p(`Runner payouts can be retried from the admin tools; a failed goods charge needs the customer's payment method checking.`)}
    `)
  });
};

// Sent to the assigned runner when a job is called off. Without this they can
// travel to an address for a booking that no longer exists.
export const notifyBookingCancelled = (booking, { cancelledByRole } = {}) => {
  const email = booking.runner?.user?.email;
  const name = esc(booking.runner?.user?.name) || 'there';
  if (!email) return;

  const date = new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const who = cancelledByRole === 'ADMIN' ? 'the ErrandBuddy team' : 'the customer';

  send({
    to: email,
    subject: `Cancelled — ${serviceTypeToClient(booking.serviceType)} on ${date}`,
    html: layout(`
      ${h1('A task has been cancelled')}
      ${p(`Hi ${name.split(' ')[0]}, the errand below has been cancelled by ${who}. <strong>Please don't travel for it.</strong>`)}
      ${detailTable(`
        ${detail('Service', serviceTypeToClient(booking.serviceType))}
        ${detail('Date', date)}
        ${detail('Time', booking.time)}
        ${detail('Area', esc(booking.postcodeArea))}
      `)}
      ${p(`If you'd already started or were on your way, reply to this email and we'll sort it out.`)}
      ${btn('View your dashboard', `${SITE}/runner/dashboard`)}
    `)
  });

  sendPushToUser(booking.runner?.userId, {
    title: 'Task cancelled',
    body: `Your ${serviceTypeToClient(booking.serviceType)} on ${date} has been cancelled. Please don't travel for it.`,
    url: RUNNER_URL,
    tag: `booking-${booking.id}`
  });
};

export const notifyPasswordReset = (user, resetUrl, ttlMinutes) => {
  const email = user?.email;
  const name = esc(user?.name) || 'there';
  if (!email) return;

  send({
    to: email,
    subject: 'Reset your ErrandBuddy password',
    html: layout(`
      ${h1('Reset your password')}
      ${p(`Hi ${name.split(' ')[0]}, we got a request to reset your ErrandBuddy password. Tap the button below to choose a new one.`)}
      ${btn('Choose a new password', resetUrl)}
      ${p(`This link works once and expires in ${ttlMinutes} minutes.`)}
      ${p(`If you didn't ask for this, you can safely ignore this email — your password won't change.`)}
    `)
  });
};

export const notifyPasswordChanged = (user) => {
  const email = user?.email;
  const name = esc(user?.name) || 'there';
  if (!email) return;

  send({
    to: email,
    subject: 'Your ErrandBuddy password was changed',
    html: layout(`
      ${h1('Your password was changed')}
      ${p(`Hi ${name.split(' ')[0]}, your ErrandBuddy password has just been changed and you've been signed out on any other devices.`)}
      ${p(`If this was you, there's nothing to do. <strong>If it wasn't</strong>, reply to this email straight away.`)}
    `)
  });
};

export const notifyAccountRemoved = (user, reason) => {
  const email = user?.email;
  const name = esc(user?.name) || 'there';
  if (!email) return;

  send({
    to: email,
    subject: 'Your ErrandBuddy account has been removed',
    html: layout(`
      ${h1('Account removed')}
      ${p(`Hi ${name.split(' ')[0]}, your ErrandBuddy account has been removed and your personal data deleted.`)}
      ${reason ? p(`<strong>Reason:</strong> ${esc(reason)}`) : ''}
      ${p(`If you think this was a mistake, please reply to this email.`)}
    `)
  });
};

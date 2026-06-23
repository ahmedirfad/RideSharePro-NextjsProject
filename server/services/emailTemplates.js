// server/services/emailTemplates.js
//
// Design system:
//   Ink:        #0f172a (headlines)
//   Slate:      #475569 (body text)
//   Mist:       #eef1f6 (page bg)
//   Card:       #ffffff
//   Brand:      #2563eb → #1d4ed8 (primary gradient)
//   Success:    #059669 / bg #ecfdf5
//   Warning:    #d97706 / bg #fffbeb
//   Danger:     #dc2626 / bg #fef2f2
//   Border:     #e2e8f0
//
// Layout: a dark "ticket stub" header (with a perforated divider) sitting
// above a clean white content card. RideSharePro is a ride marketplace, so
// the visual language throughout borrows from boarding passes / transit
// tickets: route lines with stop dots, perforated dividers, status pills.
// Icon badges are inline SVG, never emoji, so they render consistently
// across Gmail, Outlook, and Apple Mail.
//
// Everything is inline-styled because most email clients strip <style>
// blocks in the <head> — only inline `style=""` attributes are guaranteed
// to render everywhere. Tables are used for layout (not for tabular data)
// because that's still the most reliable cross-client technique for email.

// ── Icon badges (inline SVG, no emoji) ───────────────────────────────────────
const ICONS = {
  check:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  car:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 16.5h14M5 16.5a1.5 1.5 0 0 1-1.5-1.5v-1.8c0-.4.13-.78.37-1.1L6 9.2A2 2 0 0 1 7.6 8.4h8.8a2 2 0 0 1 1.6.8l2.13 2.9c.24.32.37.7.37 1.1v1.8a1.5 1.5 0 0 1-1.5 1.5M5 16.5a1.5 1.5 0 0 0 1.5 1.5h0A1.5 1.5 0 0 0 8 16.5M16 16.5a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  lock:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="11" width="14" height="9" rx="2" stroke="#ffffff" stroke-width="1.8"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  alert:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4M12 17h.01M10.3 4.5L3.5 17a1.8 1.8 0 0 0 1.6 2.7h13.8a1.8 1.8 0 0 0 1.6-2.7L13.7 4.5a1.8 1.8 0 0 0-3.4 0z" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  x:       `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  clock:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8.5" stroke="#ffffff" stroke-width="1.8"/><path d="M12 7.5V12l3 2" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  wallet:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="6.5" width="17" height="12" rx="2" stroke="#ffffff" stroke-width="1.8"/><path d="M16 12.5h2" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/></svg>`,
  star:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5l2.2 4.9 5.3.5-4 3.6 1.2 5.2L12 15.9l-4.7 2.8 1.2-5.2-4-3.6 5.3-.5z" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  shield:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.5l7 2.6v5.4c0 4.8-3 7.8-7 9.2-4-1.4-7-4.4-7-9.2V6.1z" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  flag:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 4v17M6 4.5l11 2.5-11 2.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  user:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8.5" r="3.2" stroke="#ffffff" stroke-width="1.8"/><path d="M5.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  device:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="3.5" width="10" height="17" rx="2" stroke="#ffffff" stroke-width="1.8"/><path d="M11 17.5h2" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  flagOff: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8.5" stroke="#ffffff" stroke-width="1.8"/><path d="M9 9l6 6M15 9l-6 6" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
}

function badge(icon, bg = 'linear-gradient(135deg,#2563eb,#1d4ed8)') {
  return `<div style="width:48px;height:48px;border-radius:14px;background:${bg};display:inline-flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(37,99,235,0.25);">${icon}</div>`
}

// ── Status pill ───────────────────────────────────────────────────────────────
function pill(text, tone = 'brand') {
  const tones = {
    brand:   { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
    success: { bg: '#ecfdf5', fg: '#059669', bd: '#a7f3d0' },
    warning: { bg: '#fffbeb', fg: '#d97706', bd: '#fde68a' },
    danger:  { bg: '#fef2f2', fg: '#dc2626', bd: '#fecaca' },
    slate:   { bg: '#f1f5f9', fg: '#475569', bd: '#e2e8f0' },
  }
  const t = tones[tone] || tones.brand
  return `<span style="display:inline-block;background:${t.bg};color:${t.fg};border:1px solid ${t.bd};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">${text}</span>`
}

// ── Route line — the recurring "ticket" motif: ● From ┄┄┄ ● To ──────────────
function routeLine(from, to, sub = '') {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">
    <tr>
      <td width="14" style="vertical-align:middle;">
        <div style="width:11px;height:11px;border-radius:50%;background:#10b981;border:2px solid #ffffff;box-shadow:0 0 0 2px #d1fae5;"></div>
      </td>
      <td style="border-top:2px dashed #cbd5e1;line-height:0;font-size:0;">&nbsp;</td>
      <td width="14" style="vertical-align:middle;">
        <div style="width:11px;height:11px;border-radius:50%;background:#2563eb;border:2px solid #ffffff;box-shadow:0 0 0 2px #dbeafe;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding-top:8px;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${from}</p>
      </td>
      <td></td>
      <td style="padding-top:8px;text-align:right;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${to}</p>
      </td>
    </tr>
  </table>
  ${sub ? `<p style="margin:0 0 4px;font-size:13px;color:#64748b;">${sub}</p>` : ''}
  `
}

// ── Detail row inside an info card ───────────────────────────────────────────
function detailRow(label, value, isLast = false) {
  return `
  <tr>
    <td style="padding:10px 0;${isLast ? '' : 'border-bottom:1px solid #eef1f6;'}font-size:13px;color:#64748b;">${label}</td>
    <td style="padding:10px 0;${isLast ? '' : 'border-bottom:1px solid #eef1f6;'}font-size:13px;color:#0f172a;font-weight:600;text-align:right;">${value}</td>
  </tr>`
}

// ── Info card wrapper ────────────────────────────────────────────────────────
function infoCard(innerHtml, accentColor = '#2563eb') {
  return `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid ${accentColor};border-radius:14px;padding:20px 22px;margin:20px 0;">
    ${innerHtml}
  </div>`
}

// ── Primary button ────────────────────────────────────────────────────────────
function button(text, href, tone = 'brand') {
  const styles = {
    brand:   'background:linear-gradient(135deg,#2563eb,#1d4ed8);',
    success: 'background:linear-gradient(135deg,#059669,#047857);',
    danger:  'background:linear-gradient(135deg,#dc2626,#b91c1c);',
  }
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
    <tr>
      <td style="border-radius:10px;${styles[tone] || styles.brand}">
        <a href="${href}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.01em;">${text}</a>
      </td>
    </tr>
  </table>`
}

// ── OTP code block ────────────────────────────────────────────────────────────
function otpBlock(otp) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">
    <tr>
      <td align="center">
        <div style="display:inline-block;background:#0f172a;border-radius:14px;padding:18px 36px;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;text-align:center;">Verification Code</p>
          <p style="margin:0;font-size:34px;font-weight:800;letter-spacing:0.2em;color:#ffffff;text-align:center;font-family:'SF Mono',Consolas,monospace;">${otp}</p>
        </div>
      </td>
    </tr>
  </table>`
}

// ── Eyebrow label above a headline ───────────────────────────────────────────
function eyebrow(text, color = '#2563eb') {
  return `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${color};">${text}</p>`
}

// ── Headline ──────────────────────────────────────────────────────────────────
function headline(text) {
  return `<h1 style="margin:0 0 14px;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;line-height:1.25;">${text}</h1>`
}

// ── Body paragraph ────────────────────────────────────────────────────────────
function para(text) {
  return `<p style="margin:0 0 14px;font-size:14.5px;line-height:1.65;color:#475569;">${text}</p>`
}

// ── Fine print / footer note ─────────────────────────────────────────────────
function finePrint(text) {
  return `<p style="margin:18px 0 0;font-size:12.5px;line-height:1.6;color:#94a3b8;border-top:1px solid #eef1f6;padding-top:16px;">${text}</p>`
}

// ── Base layout — dark ticket-stub header + white card body ─────────────────
const baseLayout = (headerIcon, headerBg, content, title) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f6;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header: dark ticket-stub -->
          <tr>
            <td style="background:#0f172a;border-radius:20px 20px 0 0;padding:30px 36px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:10px;">
                          <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#1d4ed8);">
                            <table role="presentation" width="34" height="34" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle">
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 16.5h14M5 16.5a1.5 1.5 0 0 1-1.5-1.5v-1.8c0-.4.13-.78.37-1.1L6 9.2A2 2 0 0 1 7.6 8.4h8.8a2 2 0 0 1 1.6.8l2.13 2.9c.24.32.37.7.37 1.1v1.8a1.5 1.5 0 0 1-1.5 1.5M5 16.5a1.5 1.5 0 0 0 1.5 1.5h0A1.5 1.5 0 0 0 8 16.5M16 16.5a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </td></tr></table>
                          </div>
                        </td>
                        <td>
                          <p style="margin:0;font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">RideShare<span style="color:#60a5fa;">Pro</span></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">${badge(headerIcon, headerBg)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Perforated divider -->
          <tr>
            <td style="background:#0f172a;padding:0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="border-bottom:2px dashed rgba(255,255,255,0.15);font-size:0;line-height:0;">&nbsp;</td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="background:#0f172a;height:14px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- White content card -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 20px 20px;padding:36px 36px 30px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 12px 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} RideSharePro · Kerala, India</p>
              <p style="margin:0;font-size:12px;color:#b6c0cc;">This is an automated message — please don't reply directly.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

// ─────────────────────────────────────────────────────────────────────────────
// ALL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────
const templates = {

  // ── AUTH ─────────────────────────────────────────────────────────────────
  verification: (data) => ({
    subject: 'Verify your RideSharePro account',
    html: baseLayout(ICONS.shield, 'linear-gradient(135deg,#2563eb,#1d4ed8)', `
      ${eyebrow('Account Verification')}
      ${headline(`Welcome aboard, ${data.name || 'there'}`)}
      ${para('Use the code below to verify your email and finish setting up your account.')}
      ${otpBlock(data.otp)}
      <p style="margin:0;text-align:center;font-size:13px;color:#94a3b8;">Expires in <strong style="color:#475569;">10 minutes</strong></p>
      ${finePrint("Didn't create an account? You can safely ignore this email.")}
    `, 'Verify Your Account')
  }),

  password_reset: (data) => ({
    subject: 'Reset your RideSharePro password',
    html: baseLayout(ICONS.lock, 'linear-gradient(135deg,#2563eb,#1d4ed8)', `
      ${eyebrow('Password Reset')}
      ${headline('Reset your password')}
      ${para(`Hi ${data.name || 'there'}, use the code below to set a new password.`)}
      ${otpBlock(data.otp)}
      <p style="margin:0;text-align:center;font-size:13px;color:#94a3b8;">Expires in <strong style="color:#475569;">10 minutes</strong></p>
      ${finePrint("Didn't request this? Ignore this email — your password is unchanged.")}
    `, 'Reset Your Password')
  }),

  password_changed: (data) => ({
    subject: 'Your password was changed',
    html: baseLayout(ICONS.check, 'linear-gradient(135deg,#059669,#047857)', `
      ${eyebrow('Security Update', '#059669')}
      ${headline('Password updated')}
      ${para(`Hi ${data.name || 'there'}, your RideSharePro password was just changed successfully.`)}
      ${infoCard(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Changed', new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), true)}
        </table>
      `, '#059669')}
      ${finePrint("If you didn't make this change, contact support immediately — your account may be compromised.")}
    `, 'Password Changed')
  }),

  new_device_login: (data) => ({
    subject: 'New device signed in to your account',
    html: baseLayout(ICONS.device, 'linear-gradient(135deg,#d97706,#b45309)', `
      ${eyebrow('Security Alert', '#d97706')}
      ${headline('New device login')}
      ${para(`Hi ${data.name || 'there'}, we noticed a sign-in from a new device.`)}
      ${infoCard(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Device', data.device || 'Unknown')}
          ${detailRow('Location', data.location || 'Unknown')}
          ${detailRow('Time', new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), true)}
        </table>
      `, '#d97706')}
      ${finePrint("Wasn't you? Secure your account immediately by resetting your password.")}
    `, 'New Device Login')
  }),

  welcome: (data) => ({
    subject: 'Welcome to RideSharePro',
    html: baseLayout(ICONS.car, 'linear-gradient(135deg,#2563eb,#1d4ed8)', `
      ${eyebrow('Welcome')}
      ${headline(`You're in, ${data.name || 'there'}`)}
      ${para("RideSharePro connects drivers and passengers across Kerala for safer, more affordable intercity travel. Here's what you can do next:")}
      ${infoCard(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Find a ride', 'Search routes near you')}
          ${detailRow('Host a ride', 'Earn by sharing empty seats')}
          ${detailRow('Stay verified', 'Complete your profile for trust badges', true)}
        </table>
      `)}
      ${button('Go to dashboard', `${process.env.CLIENT_URL}/dashboard`)}
    `, 'Welcome to RideSharePro')
  }),

  account_deactivated: (data) => ({
    subject: 'Your account has been deactivated',
    html: baseLayout(ICONS.x, 'linear-gradient(135deg,#64748b,#475569)', `
      ${eyebrow('Account Status', '#64748b')}
      ${headline('Account deactivated')}
      ${para('Your RideSharePro account has been deactivated. You will no longer be able to book or host rides.')}
      ${button('Contact support', `${process.env.CLIENT_URL}/support`, 'brand')}
      ${finePrint('Think this was a mistake? Reach out to our support team and we\'ll help sort it out.')}
    `, 'Account Deactivated')
  }),

  // ── TRIPS ────────────────────────────────────────────────────────────────
  trip_posted: (data) => ({
    subject: 'Your trip is live',
    html: baseLayout(ICONS.car, 'linear-gradient(135deg,#2563eb,#1d4ed8)', `
      ${eyebrow('Trip Posted')}
      ${headline('Your trip is live')}
      ${para('Passengers can now find and book your ride.')}
      ${infoCard(`
        ${routeLine(data.from, data.to)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
          ${detailRow('Departure', `${data.departureDate} · ${data.departureTime}`)}
          ${detailRow('Seats available', `${data.seatsAvailable}`)}
          ${detailRow('Price per seat', `₹${data.pricePerSeat}`, true)}
        </table>
      `)}
      ${button('View trip', `${process.env.CLIENT_URL}/trip/${data.tripId}`)}
    `, 'Trip Posted')
  }),

  trip_reminder: (data) => ({
    subject: 'Your trip is tomorrow',
    html: baseLayout(ICONS.clock, 'linear-gradient(135deg,#d97706,#b45309)', `
      ${eyebrow('Reminder', '#d97706')}
      ${headline('Your trip is tomorrow')}
      ${para('Just a heads up — here are your trip details.')}
      ${infoCard(`
        ${routeLine(data.from, data.to)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
          ${detailRow('Departure', `${data.departureDate} · ${data.departureTime}`, true)}
        </table>
      `, '#d97706')}
      ${button('View trip details', `${process.env.CLIENT_URL}/trip/${data.tripId}`)}
    `, 'Trip Reminder')
  }),

  trip_started: (data) => ({
    subject: 'Your trip has started',
    html: baseLayout(ICONS.flag, 'linear-gradient(135deg,#059669,#047857)', `
      ${eyebrow('Live Now', '#059669')}
      ${headline('Trip started')}
      ${para(`Your trip from ${data.from} to ${data.to} is now underway.`)}
      ${infoCard(routeLine(data.from, data.to), '#059669')}
      ${button('Track live', `${process.env.CLIENT_URL}/active-trip/${data.tripId}`, 'success')}
    `, 'Trip Started')
  }),

  trip_completed: (data) => ({
    subject: 'Trip completed',
    html: baseLayout(ICONS.flagOff, 'linear-gradient(135deg,#64748b,#475569)', `
      ${eyebrow('Completed', '#64748b')}
      ${headline('Trip completed')}
      ${para(`Your trip from ${data.from} to ${data.to} has wrapped up. Thanks for riding with RideSharePro.`)}
      ${infoCard(routeLine(data.from, data.to), '#64748b')}
    `, 'Trip Completed')
  }),

  // ── BOOKINGS ─────────────────────────────────────────────────────────────
  booking_confirmation: (data) => ({
    subject: 'Booking confirmed',
    html: baseLayout(ICONS.check, 'linear-gradient(135deg,#059669,#047857)', `
      ${eyebrow('Booking Confirmed', '#059669')}
      ${headline('Seat confirmed')}
      ${para("You're all set — here's your booking summary.")}
      ${infoCard(`
        ${routeLine(data.from, data.to)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
          ${detailRow('Seat', `${data.seatNumber}`)}
          ${detailRow('Departure', `${data.departureDate} · ${data.departureTime}`)}
          ${detailRow('Fare', `₹${data.fare}`, true)}
        </table>
      `, '#059669')}
      ${button('View trip', `${process.env.CLIENT_URL}/trip/${data.tripId}`, 'success')}
    `, 'Booking Confirmed')
  }),

  new_booking_alert: (data) => ({
    subject: 'New booking on your trip',
    html: baseLayout(ICONS.user, 'linear-gradient(135deg,#2563eb,#1d4ed8)', `
      ${eyebrow('New Booking')}
      ${headline('You have a new passenger')}
      ${para(`${data.passengerName} just booked seat ${data.seatNumber} on your trip.`)}
      ${infoCard(`
        ${routeLine(data.from, data.to)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
          ${detailRow('Passenger', data.passengerName)}
          ${detailRow('Seat', `${data.seatNumber}`)}
          ${detailRow('Fare', `₹${data.fare}`, true)}
        </table>
      `)}
    `, 'New Booking Alert')
  }),

  booking_cancelled: (data) => ({
    subject: 'Booking cancelled',
    html: baseLayout(ICONS.x, 'linear-gradient(135deg,#dc2626,#b91c1c)', `
      ${eyebrow('Cancelled', '#dc2626')}
      ${headline('Booking cancelled')}
      ${para(`${data.cancelledBy} has cancelled this booking.`)}
      ${infoCard(`
        ${routeLine(data.from, data.to)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
          ${detailRow('Seat', `${data.seatNumber}`, true)}
        </table>
      `, '#dc2626')}
    `, 'Booking Cancelled')
  }),

  // ── PAYMENTS ─────────────────────────────────────────────────────────────
  payment_success: (data) => ({
    subject: 'Payment successful',
    html: baseLayout(ICONS.wallet, 'linear-gradient(135deg,#059669,#047857)', `
      ${eyebrow('Payment Successful', '#059669')}
      ${headline('Payment received')}
      ${para('Your payment has been processed successfully.')}
      ${infoCard(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Amount paid', `<span style="font-size:18px;font-weight:800;color:#059669;">₹${data.amount}</span>`, true)}
        </table>
      `, '#059669')}
    `, 'Payment Successful')
  }),

  payment_failed: (data) => ({
    subject: 'Payment failed',
    html: baseLayout(ICONS.alert, 'linear-gradient(135deg,#dc2626,#b91c1c)', `
      ${eyebrow('Payment Failed', '#dc2626')}
      ${headline('We couldn\'t process your payment')}
      ${para('Your payment did not go through. No charges were made.')}
      ${infoCard(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Amount', `₹${data.amount}`)}
          ${detailRow('Reason', data.error || 'Unknown error — please try again', true)}
        </table>
      `, '#dc2626')}
      ${button('Try again', `${process.env.CLIENT_URL}/checkout`, 'danger')}
    `, 'Payment Failed')
  }),

  refund_processed: (data) => ({
    subject: 'Refund processed',
    html: baseLayout(ICONS.wallet, 'linear-gradient(135deg,#d97706,#b45309)', `
      ${eyebrow('Refund Processed', '#d97706')}
      ${headline('Your refund is on its way')}
      ${para('We\'ve processed a refund to your original payment method.')}
      ${infoCard(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Amount refunded', `<span style="font-size:18px;font-weight:800;color:#d97706;">₹${data.amount}</span>`)}
          ${detailRow('Reason', data.reason, true)}
        </table>
      `, '#d97706')}
      ${finePrint('Refunds typically appear in your account within 5–7 business days.')}
    `, 'Refund Processed')
  }),

  // ── REVIEWS & DISPUTES ───────────────────────────────────────────────────
  review_request: (data) => ({
    subject: 'How was your trip?',
    html: baseLayout(ICONS.star, 'linear-gradient(135deg,#d97706,#b45309)', `
      ${eyebrow('Share Your Feedback', '#d97706')}
      ${headline('Rate your trip')}
      ${para(`How was your journey from ${data.from} to ${data.to}? Your feedback helps keep the community trustworthy.`)}
      ${infoCard(routeLine(data.from, data.to), '#d97706')}
      ${button('Rate your trip', `${process.env.CLIENT_URL}/trip/${data.tripId}/review`)}
    `, 'Rate Your Trip')
  }),

  dispute_created: (data) => ({
    subject: 'Dispute filed on a trip',
    html: baseLayout(ICONS.alert, 'linear-gradient(135deg,#d97706,#b45309)', `
      ${eyebrow('Dispute Filed', '#d97706')}
      ${headline('A dispute has been opened')}
      ${para('A dispute has been filed regarding the following trip.')}
      ${infoCard(`
        ${routeLine(data.from, data.to)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
          ${detailRow('Reason', data.reason, true)}
        </table>
      `, '#d97706')}
    `, 'Dispute Created')
  }),

  dispute_status_updated: (data) => ({
    subject: 'Dispute status updated',
    html: baseLayout(ICONS.flag, 'linear-gradient(135deg,#2563eb,#1d4ed8)', `
      ${eyebrow('Dispute Update')}
      ${headline('Status updated')}
      ${para('There\'s an update on your dispute.')}
      ${infoCard(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Status', pill(data.status, data.status?.toLowerCase().includes('resolv') ? 'success' : 'warning'))}
          ${detailRow('Note', data.comment || 'No additional comments', true)}
        </table>
      `)}
    `, 'Dispute Status Update')
  }),

  // ── ADMIN ────────────────────────────────────────────────────────────────
  admin_alert: (data) => ({
    subject: `Admin alert: ${data.title || 'Notification'}`,
    html: baseLayout(ICONS.alert, 'linear-gradient(135deg,#dc2626,#b91c1c)', `
      ${eyebrow('Admin Alert', '#dc2626')}
      ${headline(data.title || 'Action required')}
      ${para(data.message)}
      ${data.details ? infoCard(`<p style="margin:0;font-size:13px;color:#475569;">${data.details}</p>`, '#dc2626') : ''}
    `, 'Admin Alert')
  }),
}

// ── Fallback for unknown template types ──────────────────────────────────────
const getTemplate = (type, data) => {
  const templateFn = templates[type]
  if (!templateFn) {
    console.warn(`⚠️ No template found for type: ${type}`)
    return {
      subject: 'RideSharePro Notification',
      html: baseLayout(ICONS.car, 'linear-gradient(135deg,#2563eb,#1d4ed8)', `
        ${eyebrow('Notification')}
        ${headline(data.subject || 'You have a new notification')}
        ${para(data.message || 'You have a new notification from RideSharePro.')}
      `, 'RideSharePro Notification')
    }
  }
  return templateFn(data)
}

module.exports = { getTemplate }
// Vercel Serverless Function — POST /api/contact
// Receives the website's contact form submissions, validates them, and
// emails them to the sales inbox via SMTP (Nodemailer).
//
// Configure in Vercel: Project Settings → Environment Variables
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, (optional) MAIL_FROM
// Without them set, the function runs in DEV MODE: it validates and logs
// the submission (visible in Vercel's function logs) instead of sending mail.

const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_TO = 'aitraders.info@gmail.com',
  MAIL_FROM,
} = process.env;

const hasSmtpConfig = SMTP_HOST && SMTP_USER && SMTP_PASS;

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : nodemailer.createTransport({ jsonTransport: true });

function sanitize(str, maxLen = 2000) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\r\n]+/g, ' ').trim().slice(0, maxLen);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePayload(body) {
  const errors = [];
  const name = sanitize(body.name, 120);
  const email = sanitize(body.email, 200);
  const phone = sanitize(body.phone, 40);
  const institution = sanitize(body.institution, 200);
  const message = sanitize(body.message, 4000);

  if (!name || name.length < 2) errors.push('name');
  if (!email || !EMAIL_RE.test(email)) errors.push('email');
  if (!message || message.length < 10) errors.push('message');

  return { errors, data: { name, email, phone, institution, message } };
}

// Best-effort in-memory rate limit: 5 requests / 15 min per IP.
// Serverless functions can spin up fresh instances, so this isn't a hard
// guarantee — it's a courtesy layer, not the only line of defense. Pair it
// with Vercel's built-in Attack Challenge Mode / Firewall for real abuse
// protection if this form becomes a spam target.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const hits = global.__aiTradersContactHits || (global.__aiTradersContactHits = new Map());

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(ip, timestamps);
  return timestamps.length > MAX_REQUESTS;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' });
  }

  try {
    const body = req.body || {};

    // Honeypot: hidden field real users never fill in. If filled, pretend success.
    if (body.company) {
      return res.status(200).json({ ok: true });
    }

    const { errors, data } = validatePayload(body);
    if (errors.length) {
      return res.status(400).json({ ok: false, error: `Missing or invalid: ${errors.join(', ')}` });
    }

    const { name, email, phone, institution, message } = data;

    const text = [
      'New enquiry from the AI Traders website',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      institution ? `Institution: ${institution}` : null,
      '',
      'Message:',
      message,
    ]
      .filter(Boolean)
      .join('\n');

    await transporter.sendMail({
      from: MAIL_FROM || `"AI Traders Website" <${SMTP_USER || 'no-reply@example.com'}>`,
      to: MAIL_TO,
      replyTo: email,
      subject: `New website enquiry from ${name}`,
      text,
    });

    if (!hasSmtpConfig) {
      console.log('[ai-traders] DEV MODE — captured submission:\n', text);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[ai-traders] /api/contact error:', err);
    return res.status(500).json({ ok: false, error: 'Server error. Please try again shortly.' });
  }
};

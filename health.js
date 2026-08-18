// Vercel Serverless Function — GET /api/health
// Quick way to confirm the API is deployed and whether SMTP is configured.

module.exports = (req, res) => {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  res.status(200).json({ ok: true, mode: hasSmtpConfig ? 'live' : 'dev (no SMTP configured)' });
};

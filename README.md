# AI Traders

Static marketing site for AI Traders (Karachi) with a working contact form,
deployed on Vercel. The form is backed by two serverless functions in `api/`
— no separate server to host or manage.

```
index.html         the site
images/, fonts/     assets
api/contact.js      POST — validates + emails contact form submissions
api/health.js       GET  — confirms the API is deployed and configured
package.json        lists nodemailer so Vercel installs it for the functions
```

## Enable email sending

By default the contact form works end-to-end but **doesn't actually send
email** — submissions are validated and logged to Vercel's function logs
instead (dev mode), so nothing breaks if you deploy without setting anything
up first.

To make it send real emails:

1. In the Vercel dashboard → your project → **Settings → Environment
   Variables**, add:

   | Name | Value |
   |---|---|
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_USER` | `aitraders.info@gmail.com` |
   | `SMTP_PASS` | a Gmail **App Password** (see below) |
   | `MAIL_TO` | `aitraders.info@gmail.com` |

2. Get a Gmail App Password (needed because Gmail blocks plain-password
   SMTP login): turn on 2-Step Verification at
   https://myaccount.google.com/security, then create one at
   https://myaccount.google.com/apppasswords. Use that 16-character value
   as `SMTP_PASS` — not the normal Gmail password.

3. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new environment
   variables take effect.

4. Check `https://your-domain/api/health` — it should report `"mode": "live"`
   once SMTP is configured correctly.

Any other SMTP provider (SendGrid, Mailgun, Zoho, your registrar's email,
etc.) works the same way — just use its host/port/credentials instead of
Gmail's.

## Local development

```bash
npm install -g vercel   # once
vercel dev               # serves index.html + api/* on localhost, matching production
```

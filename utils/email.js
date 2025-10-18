const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !EMAIL_FROM) return { skipped: true };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Email send failed: ${res.status} ${txt}`);
  }
  return res.json();
}

module.exports = { sendEmail };
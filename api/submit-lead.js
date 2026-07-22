// Vercel serverless function — deploy this at: api/submit-lead.js
// Sends Halo trial-request form submissions to alex.s.bourne@gmail.com via Resend.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('The "RESEND_API_KEY" environment variable is not set in Vercel.');
    return res.status(500).json({ error: 'Lead form is not configured yet. Please email us directly.' });
  }

  try {
    const body = req.body || {};
    const name = (body.name || '').toString().trim();
    const venue = (body.venue || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const phone = (body.phone || '').toString().trim();
    const venueType = (body.venueType || '').toString().trim();
    const message = (body.message || '').toString().trim();

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const html = `
      <h2>New Halo trial request</h2>
      <p><b>Name:</b> ${esc(name)}</p>
      <p><b>Venue:</b> ${esc(venue || '-')}</p>
      <p><b>Email:</b> ${esc(email)}</p>
      <p><b>Phone:</b> ${esc(phone || '-')}</p>
      <p><b>Venue type:</b> ${esc(venueType || '-')}</p>
      <p><b>Message:</b> ${esc(message || '-')}</p>
    `;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Halo Leads <onboarding@resend.dev>',
        to: ['alex.s.bourne@gmail.com'],
        reply_to: email,
        subject: `New Halo trial request — ${venue || name}`,
        html,
      }),
    });

    if (!r.ok) {
      const errBody = await r.text();
      console.error('Resend error:', errBody);
      return res.status(502).json({ error: 'Could not send your request right now. Please try again shortly.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Lead submission error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

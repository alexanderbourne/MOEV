// Vercel serverless function - deploy at: api/create-checkout-session.js
//
// Creates a Stripe Checkout Session for the Moev founding-member deposit and
// returns the session URL for the browser to redirect to. The Stripe secret
// key is read from the STRIPE_SECRET_KEY environment variable configured in
// Vercel project settings - it is never sent to the browser and this file
// never contains the actual key value.

const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
}

    if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set in the Vercel environment.');
    return res.status(500).json({ error: 'Payments are not configured yet.' });
    }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
{
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Moev - Founding Member Deposit',
              description: 'Refundable $100 deposit to reserve a Moev founding member pre-order ($500 total, $400 balance due only once production is confirmed). Fully refundable any time before then.',
},
            unit_amount: 10000,
},
          quantity: 1,
},
      ],
      success_url: `${origin}/?reserved=1`,
      cancel_url: `${origin}/?canceled=1`,
});

    return res.status(200).json({ url: session.url });
} catch (err) {
    console.error('Stripe checkout session error:', err);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
}
};

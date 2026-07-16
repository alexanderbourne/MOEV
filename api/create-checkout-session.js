// Vercel serverless function — deploy this at: api/create-checkout-session.js
//
// Creates a Stripe Checkout Session for the Moev founding-member deposit and
// returns the session URL for the browser to redirect to. The Stripe secret
// key is read from the "Stripe" environment variable configured in your
// Vercel project settings — it is never sent to the browser and this file
// never contains the actual key value.
//
// Requires: an env var named exactly "Stripe" set in Vercel → Project →
// Settings → Environment Variables (Production + Preview), and the "stripe"
// package listed in package.json (already included).

const StripeSDK = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.Stripe) {
    console.error('The "Stripe" environment variable is not set in Vercel.');
    return res.status(500).json({ error: 'Payments are not configured yet.' });
  }

  const stripe = StripeSDK(process.env.Stripe);

  try {
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            // AUD by default — matches No Agents Pty Ltd / the .com.au domain.
            // Change to 'usd' here (and update the amounts on the landing
            // page) if you're actually pricing this in USD instead.
            currency: 'aud',
            product_data: {
              name: 'Moev — Founding Member Deposit',
              description:
                'Refundable $100 deposit to reserve a Moev founding member pre-order ' +
                '($500 total, $400 balance due only once production is confirmed). ' +
                'Fully refundable any time before then.',
            },
            unit_amount: 10000, // $100.00 in the smallest currency unit (cents)
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?reserved=1`,
      cancel_url: `${origin}/?canceled=1`,
      // Uncomment to collect a shipping-relevant address up front:
      // shipping_address_collection: { allowed_countries: ['AU'] },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout session error:', err);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
};

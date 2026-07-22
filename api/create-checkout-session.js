// Vercel serverless function — deploy this at: api/create-checkout-session.js
//
// Creates a Stripe Checkout Session for either the Moev (passive) or MOEV Pro
// (powered) founding-member deposit and returns the session URL for the
// browser to redirect to. The Stripe secret key is read from the "Stripe"
// environment variable configured in your Vercel project settings — it is
// never sent to the browser and this file never contains the actual key value.
//
// Requires: an env var named exactly "Stripe" set in Vercel → Project →
// Settings → Environment Variables (Production + Preview), and the "stripe"
// package listed in package.json (already included).

const StripeSDK = require('stripe');

const PRODUCTS = {
  moev: {
    name: 'Moev — Founding Member Deposit',
    description:
      'Refundable $100 deposit to reserve a Moev founding member pre-order ' +
      '($500 total, $400 balance due only once production is confirmed). ' +
      'Fully refundable any time before then.',
    unitAmount: 10000, // $100.00 AUD in cents
    successPath: '/?reserved=1',
    cancelPath: '/?canceled=1',
  },
  pro: {
    name: 'MOEV Pro — Founding Member Deposit',
    description:
      'Refundable $150 deposit to reserve a MOEV Pro founding member pre-order ' +
      '($1,499 total, balance due only once production is confirmed). ' +
      'Fully refundable any time before then.',
    unitAmount: 15000, // $150.00 AUD in cents
    successPath: '/pro.html?reserved=1',
    cancelPath: '/pro.html?canceled=1',
  },
};

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
    const body = req.body || {};
    const key = body.product === 'pro' ? 'pro' : 'moev';
    const product = PRODUCTS[key];

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            // AUD by default — matches No Agents Pty Ltd / the .com.au domain.
            currency: 'aud',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}${product.successPath}`,
      cancel_url: `${origin}${product.cancelPath}`,
      // Uncomment to collect a shipping-relevant address up front:
      // shipping_address_collection: { allowed_countries: ['AU'] },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout session error:', err);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
};

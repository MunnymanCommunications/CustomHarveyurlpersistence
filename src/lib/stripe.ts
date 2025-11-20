import { loadStripe, Stripe } from '@stripe/stripe-js';

// Get Stripe publishable key from environment
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('Stripe publishable key not found. Payment features will not work.');
}

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

/**
 * Creates a Stripe checkout session for the user
 * This function should be called from the client side
 */
export async function createCheckoutSession(
  priceId: string,
  userId: string,
  email: string,
  isAnnual: boolean = false
): Promise<{ sessionId?: string; error?: string }> {
  try {
    // Call your backend API to create a Stripe Checkout session
    // You'll need to implement this endpoint in your backend
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        userId,
        email,
        isAnnual,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to create checkout session' };
    }

    const { sessionId } = await response.json();
    return { sessionId };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Redirects to Stripe checkout
 */
export async function redirectToCheckout(sessionId: string): Promise<{ error?: string }> {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return { error: 'Stripe not initialized' };
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      console.error('Stripe checkout error:', error);
      return { error: error.message };
    }

    return {};
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    return { error: 'Failed to redirect to checkout' };
  }
}

/**
 * For now, we'll use Stripe Payment Links as a simpler alternative
 * These can be created in the Stripe Dashboard under Payment Links
 *
 * To set up:
 * 1. Go to Stripe Dashboard > Payment Links
 * 2. Create a new payment link for monthly plan
 * 3. Create a new payment link for annual plan
 * 4. Add the URLs to your environment variables:
 *    - VITE_STRIPE_MONTHLY_LINK
 *    - VITE_STRIPE_ANNUAL_LINK
 */
export const getPaymentLink = (isAnnual: boolean): string => {
  const monthlyLink = process.env.STRIPE_MONTHLY_LINK || 'https://buy.stripe.com/test_dummy_monthly';
  const annualLink = process.env.STRIPE_ANNUAL_LINK || 'https://buy.stripe.com/test_dummy_annual';

  return isAnnual ? annualLink : monthlyLink;
};

/**
 * Manages customer portal session for managing subscriptions
 */
export async function createCustomerPortalSession(customerId: string): Promise<{ url?: string; error?: string }> {
  try {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to create portal session' };
    }

    const { url } = await response.json();
    return { url };
  } catch (error) {
    console.error('Error creating portal session:', error);
    return { error: 'An unexpected error occurred' };
  }
}

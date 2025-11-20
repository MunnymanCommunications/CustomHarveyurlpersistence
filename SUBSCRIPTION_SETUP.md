# Subscription & Stripe Integration Setup Guide

This guide explains how to set up the freemium subscription system with Stripe integration and iOS Shortcuts support.

## Overview

The app now includes a complete freemium monetization model:

### Free Plan
- Harvey assistant (auto-created on signup)
- Up to 5 memories
- 1 custom assistant (plus Harvey and Memory Vault)

### Pro Plan ($30/month or $305/year)
- Unlimited memories
- Unlimited custom assistants
- Priority support

## Database Setup

### 1. Run the Migration

Execute the SQL migration in your Supabase project:

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Run the contents of: database/migrations/001_subscriptions.sql
```

This creates:
- `subscription_tiers` table
- `user_subscriptions` table
- `usage_tracking` table
- Auto-triggers for new user setup
- Row Level Security (RLS) policies

### 2. Verify Tables

After running the migration, verify these tables exist:
- ✅ subscription_tiers (with 'free' and 'pro' tiers)
- ✅ user_subscriptions
- ✅ usage_tracking

## Stripe Setup

### Step 1: Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create or log into your account
3. Switch to **Test Mode** for development

### Step 2: Create Products

1. Go to Products → Create Product
2. Create two products:

**Monthly Pro Subscription**
- Name: "Ai Architect Pro - Monthly"
- Price: $30.00 USD
- Billing: Recurring monthly
- Copy the Price ID (starts with `price_`)

**Annual Pro Subscription**
- Name: "Ai Architect Pro - Annual"
- Price: $305.00 USD
- Billing: Recurring yearly
- Copy the Price ID (starts with `price_`)

### Step 3: Create Payment Links

For simplicity, we'll use Stripe Payment Links:

1. Go to Payment Links → Create payment link
2. Select your Monthly product
3. Configure:
   - Collect customer emails: Yes
   - Allow promotion codes: Optional
   - After payment: Redirect to your app
4. Copy the Payment Link URL
5. Repeat for Annual product

### Step 4: Set Environment Variables

Add to your deployment environment (Vercel, Netlify, etc.):

```bash
# Stripe Keys (from Stripe Dashboard > Developers > API Keys)
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Publishable key
STRIPE_SECRET_KEY=sk_test_...        # Secret key (server-side only!)

# Payment Links (from step 3)
STRIPE_MONTHLY_LINK=https://buy.stripe.com/...
STRIPE_ANNUAL_LINK=https://buy.stripe.com/...
```

For local development, create `.env`:

```
VITE_STRIPE_MONTHLY_LINK=https://buy.stripe.com/test_...
VITE_STRIPE_ANNUAL_LINK=https://buy.stripe.com/test_...
```

### Step 5: Set Up Webhook (Optional but Recommended)

To automatically update subscriptions when users pay:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the Signing Secret
5. Add to environment: `STRIPE_WEBHOOK_SECRET=whsec_...`

You'll need to create a server endpoint to handle these webhooks (beyond scope of this guide).

## How It Works

### New User Signup Flow

1. User signs up via Google/GitHub OAuth
2. Database trigger automatically creates:
   - Free subscription (`user_subscriptions`)
   - Usage tracking record (`usage_tracking`)
3. App auto-creates:
   - **Harvey** assistant (main AI)
   - **Memory Vault** assistant (memory management)

### Memory Limit Enforcement

When a user adds a memory:
1. App checks current memory count vs. limit
2. If at limit (5 for free users):
   - Show upgrade prompt modal
   - Prevent adding more memories
3. First memory triggers congratulations modal

### Assistant Creation Limits

When user tries to create an assistant:
1. App checks: custom assistants created vs. limit
2. Free plan: Limited to 1 custom assistant
3. Pro plan: Unlimited
4. Shows upgrade prompt if limit reached

### Upgrade Flow

1. User clicks "Upgrade to Pro"
2. Redirected to Stripe Payment Link
3. User completes payment
4. Stripe webhook updates `user_subscriptions` status
5. App immediately grants Pro features

## iOS Shortcuts Integration

### How It Works

The app supports deep linking for Siri voice activation:

**URL Scheme**: `aiarchitect://voice/{assistant_id}`

When this URL is opened:
1. App launches directly to the assistant
2. Auto-starts voice conversation
3. No user interaction needed

### Setting Up iOS Shortcut

#### Option 1: Using Harvey (Main Assistant)

1. Open Shortcuts app on iPhone
2. Tap "+" to create new shortcut
3. Add "Open URL" action
4. Enter: `aiarchitect://voice/harvey`
5. Name it "Talk to Harvey"
6. Add to Home Screen or assign Siri phrase

#### Option 2: Using Specific Assistant

1. Open Ai Architect app
2. Go to assistant you want
3. Copy the assistant ID from URL
4. Create shortcut with `aiarchitect://voice/{that-id}`

### Siri Activation

After creating the shortcut:
1. Go to Settings → Siri & Search
2. Find your shortcut
3. Add phrase like "Hey Harvey" or "Talk to my assistant"
4. Now you can say "Hey Siri, Hey Harvey"
5. App opens directly to voice conversation

### Technical Implementation

The deep linking is handled in `AppContent.tsx`:

```typescript
// When route is 'voice_shortcut', redirect to assistant with autostart
if (route.path === 'voice_shortcut' && harveyId) {
    window.location.hash = `#/assistant/${route.id || harveyId}?autostart=true`;
}
```

## Testing the System

### Test Free Plan Limits

1. Create new account
2. Verify Harvey is auto-created
3. Add 1 memory → See congratulations modal
4. Add 4 more memories (total 5)
5. Try adding 6th → See upgrade prompt
6. Try creating 2nd custom assistant → See upgrade prompt

### Test Pro Upgrade

1. Use Stripe test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any CVC
4. Complete checkout
5. Verify unlimited access

### Test iOS Shortcuts

1. Build app for iOS: `npm run ios:build`
2. Open in Xcode: `npm run ios:open`
3. Run on device
4. Create shortcut with `aiarchitect://voice/harvey`
5. Test opening from Shortcuts app
6. Test with Siri voice command

## Environment Variables Reference

Required for full functionality:

```bash
# Supabase (Already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini AI (Already configured)
VITE_API_KEY=your-gemini-api-key

# Stripe (New - Add these)
VITE_STRIPE_MONTHLY_LINK=https://buy.stripe.com/...
VITE_STRIPE_ANNUAL_LINK=https://buy.stripe.com/...

# Optional: For server-side Stripe integration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Monitoring Usage

### Check User Subscription

```sql
SELECT
    u.email,
    s.tier_id,
    s.status,
    t.memory_count,
    t.assistant_count
FROM user_subscriptions s
JOIN usage_tracking t ON s.user_id = t.user_id
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'user@example.com';
```

### Check All Pro Users

```sql
SELECT
    u.email,
    s.status,
    s.current_period_end
FROM user_subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.tier_id = 'pro'
AND s.status = 'active';
```

## Troubleshooting

### Users Not Getting Free Subscription

- Check if database trigger is enabled
- Manually run trigger function
- Verify RLS policies allow inserts

### Upgrade Not Working

- Check Stripe webhook is receiving events
- Verify webhook secret is correct
- Check `user_subscriptions` table for updates

### iOS Shortcuts Not Opening App

- Verify URL scheme in `capacitor.config.ts`
- Rebuild iOS app after changes
- Check Info.plist has URL scheme registered

### Modals Not Showing

- Check `usage_tracking` table flags
- Verify SubscriptionContext is wrapping app
- Check browser console for errors

## Support

For issues:
1. Check Stripe Dashboard → Logs
2. Check Supabase Dashboard → Logs
3. Check browser console for errors
4. Review SQL migrations ran successfully

## Next Steps

1. ✅ Set up Stripe account
2. ✅ Create products and payment links
3. ✅ Add environment variables
4. ✅ Run database migration
5. ✅ Test with new user account
6. ✅ Create iOS shortcuts
7. 🔄 Set up webhooks for auto-updates
8. 🔄 Switch to live mode when ready

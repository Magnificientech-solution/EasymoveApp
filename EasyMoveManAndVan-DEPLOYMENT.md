# EasyMove Man and Van - Deployment Guide

## Prerequisites

1. Stripe account with API keys
2. PayPal Developer account with API credentials
3. PostgreSQL database
4. Node.js hosting environment (Render, Vercel, Netlify, etc.)

## Environment Variables

Configure the following environment variables in your hosting platform:

```
# Stripe Configuration
VITE_STRIPE_PUBLIC_KEY=pk_test_your_public_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Google Maps API (Optional)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Deploying to Render

1. Create a new Web Service in Render
2. Connect to your GitHub repository
3. Use the following settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
4. Add the required environment variables
5. Deploy your application

## Deploying to Vercel

1. Import your GitHub repository
2. Configure the environment variables
3. Deploy your application

## Deploying to Netlify

1. Connect to your GitHub repository
2. Configure the build settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. Add the required environment variables
4. Deploy your application

## Post-Deployment Steps

1. Update webhook URLs in Stripe and PayPal dashboards
2. Test the payment flow in your production environment
3. Monitor payment processing and error logs

## Troubleshooting

Run the payment diagnostics tool to identify and fix common issues:

```
node payment-diagnostics.js
```

For more information, see `README-PAYMENT-DEBUGGING.md`.
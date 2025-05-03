# EasyMove Man and Van

![EasyMove Logo](https://via.placeholder.com/150x50?text=EasyMove)

A sophisticated man and van transport service platform delivering transparent, data-driven pricing solutions with robust quote generation and payment processing.

## Features

- 📱 **Mobile-First Design**: Responsive interface optimized for all devices
- 💰 **Dynamic Pricing**: Data-driven rates based on distance, van size, and more
- 🚚 **Van Size Selection**: Choose from small, medium, large, or Luton vans
- 📊 **Transparent Pricing**: Detailed breakdown of all costs including VAT
- 💳 **Multiple Payment Options**: Secure checkout with Stripe and PayPal
- 📍 **Distance Calculation**: Accurate route planning between locations

## Tech Stack

- **Frontend**: React.js, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe, PayPal integrations
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context API, React Query

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Stripe and PayPal developer accounts

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/easymove-man-and-van.git
   cd easymove-man-and-van
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your configuration values
   ```

4. Push the database schema
   ```bash
   npm run db:push
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

## Environment Variables

The application requires the following environment variables:

```
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Stripe (Payments)
VITE_STRIPE_PUBLIC_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal (Payments)
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret

# Google Maps (Optional)
GOOGLE_MAPS_API_KEY=your_api_key
```

## Deployment

This application can be deployed to various platforms:

### Render

Use the provided `render.yaml` file for configuration:

```bash
# Follow the deployment guide in DEPLOYMENT.md
```

### Docker

Use the provided Docker configuration files:

```bash
docker-compose -f EasyMove-docker-compose.yml up -d
```

## Testing

### Payment Testing

Use the payment diagnostic tools to verify your setup:

```bash
./payment-tools.sh diagnose
```

## Documentation

- [Deployment Guide](./EasyMoveManAndVan-DEPLOYMENT.md)
- [Payment Debugging](./README-PAYMENT-DEBUGGING.md)

## Project Structure

```
├── client/              # Frontend code
│   ├── src/             # Source files
│   │   ├── components/  # UI components
│   │   ├── contexts/    # React context providers
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utilities and services
│   │   └── pages/       # Page components
├── server/              # Backend API
│   ├── services/        # Business logic
│   ├── routes.ts        # API routes
│   └── index.ts         # Server entry point
├── shared/              # Shared code (server/client)
│   ├── schema.ts        # Database schema
│   └── pricing-rules.ts # Pricing calculations
└── payment-tools/       # Payment debugging utilities
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Tailwind CSS for the styling framework
- shadcn/ui for the component library
- Drizzle ORM for database interactions
- Stripe and PayPal for payment processing

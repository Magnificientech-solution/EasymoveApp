/**
 * EasyMove Man and Van - Consolidated App Deployment File
 * 
 * This file contains all the essential code for deploying the application,
 * with sensitive information replaced by environment variable placeholders.
 * 
 * To use on Render, add all sensitive environment variables in your dashboard.
 */

/* --------------------- ENVIRONMENT CONFIGURATION --------------------- */
const config = {
  // Environment settings
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/easymove',
  
  // Payment providers
  stripe: {
    publicKey: process.env.VITE_STRIPE_PUBLIC_KEY, // Add in Render dashboard - starts with pk_
    secretKey: process.env.STRIPE_SECRET_KEY,      // Add in Render dashboard - starts with sk_
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET // Add in Render dashboard - starts with whsec_
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,       // Add in Render dashboard
    clientSecret: process.env.PAYPAL_CLIENT_SECRET // Add in Render dashboard
  },
  
  // External services
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY, // Optional - add in Render dashboard
  
  // Application constants
  pricing: {
    vatRate: 0.20,              // 20% VAT
    depositPercentage: 0.25,     // 25% deposit
    platformFeePercentage: 0.25, // 25% platform fee (same as deposit)
    driverSharePercentage: 0.75, // 75% driver share
    minimumPrice: 15,            // £15 minimum price
    baseRatePerMile: {
      min: 0.80, // £0.80 minimum per mile
      max: 1.20  // £1.20 maximum per mile
    },
    vanSizeMultipliers: {
      small: 1.0,   // Small van
      medium: 1.2,  // Medium van
      large: 1.4,   // Large van
      luton: 1.6    // Luton van
    },
    fuelEfficiency: {
      small: 34,    // 34 mpg
      medium: 30,   // 30 mpg
      large: 25,    // 25 mpg
      luton: 20     // 20 mpg
    },
    fuelCostPerLitre: 1.40,      // £1.40 per litre
    litresPerGallon: 4.54609,    // UK gallons
    returnJourneyFactor: 0.50,   // 50% of original journey
    hourlyRates: {
      small: 25,     // £25 per hour
      medium: 30,    // £30 per hour
      large: 35,     // £35 per hour
      luton: 40      // £40 per hour
    }
  }
};

/* ------------------------ DATABASE SCHEMA ------------------------ */
// This section defines the database schema for the application
// using Drizzle ORM syntax.

const schema = `
// Import Drizzle PostgreSQL and Zod for validation
import { pgTable, serial, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import * as z from 'zod';

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
});

// Users relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

// Insert schema for users
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  passwordHash: true,
  fullName: true,
  phone: true,
});

// Quote calculation schema
export const calculateQuoteSchema = z.object({
  collectionAddress: z.string().min(3),
  deliveryAddress: z.string().min(3),
  vanSize: z.enum(["small", "medium", "large", "luton"]),
  helpers: z.number().int().min(0).max(3).default(0),
  floorAccess: z.enum(["ground", "firstFloor", "secondFloor", "thirdFloorPlus"]).default("ground"),
  liftAvailable: z.boolean().default(false),
  moveDate: z.string().or(z.date()),
  urgency: z.enum(["standard", "priority", "express"]).default("standard"),
});

// Drivers table
export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  email: varchar("email", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  licenseNumber: varchar("license_number", { length: 50 }).notNull(),
  licenseExpiry: timestamp("license_expiry").notNull(),
  vehicleReg: varchar("vehicle_reg", { length: 20 }).notNull(),
  vehicleType: varchar("vehicle_type", { length: 50 }).notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  isApproved: boolean("is_approved").default(false),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Drivers relations
export const driversRelations = relations(drivers, ({ many }) => ({
  bookings: many(bookings),
}));

// Insert schema for drivers
export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  driverId: integer("driver_id").references(() => drivers.id),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  distance: integer("distance").notNull(),
  vanSize: varchar("van_size", { length: 50 }).notNull(),
  helpers: integer("helpers").default(0),
  floorAccess: varchar("floor_access", { length: 50 }).default("ground"),
  liftAvailable: boolean("lift_available").default(false),
  moveDate: timestamp("move_date").notNull(),
  status: varchar("status", { length: 50 }).default("booked"),
  totalPrice: integer("total_price").notNull(),
  depositPaid: boolean("deposit_paid").default(false),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentId: varchar("payment_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings relations
export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  driver: one(drivers, { fields: [bookings.driverId], references: [drivers.id] }),
}));

// Insert schema for bookings
export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Pricing models table
export const pricingModels = pgTable("pricing_models", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  basePrice: integer("base_price").notNull(),
  pricePerMile: integer("price_per_mile").notNull(),
  pricePerHour: integer("price_per_hour").notNull(),
  helperPrice: integer("helper_price").notNull(),
  parameters: text("parameters"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schema for pricing models
export const insertPricingModelSchema = createInsertSchema(pricingModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Area demand table
export const areaDemand = pgTable("area_demand", {
  id: serial("id").primaryKey(),
  areaName: varchar("area_name", { length: 100 }).notNull().unique(),
  demandLevel: integer("demand_level").default(100),
  demandMultiplier: integer("demand_multiplier").default(100),
  lastUpdated: timestamp("last_updated").defaultNow(),
  notes: text("notes"),
});

// Insert schema for area demand
export const insertAreaDemandSchema = createInsertSchema(areaDemand).omit({
  id: true,
  lastUpdated: true,
});

// Pricing history table
export const pricingHistory = pgTable("pricing_history", {
  id: serial("id").primaryKey(),
  fromLocation: varchar("from_location", { length: 100 }).notNull(),
  toLocation: varchar("to_location", { length: 100 }).notNull(),
  distance: integer("distance").notNull(),
  vanSize: varchar("van_size", { length: 50 }).notNull(),
  finalPrice: integer("final_price").notNull(),
  originalPrice: integer("original_price").notNull(),
  factors: text("factors"),
  bookingId: integer("booking_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schema for pricing history
export const insertPricingHistorySchema = createInsertSchema(pricingHistory).omit({
  id: true,
  createdAt: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertPricingModel = z.infer<typeof insertPricingModelSchema>;
export type PricingModel = typeof pricingModels.$inferSelect;

export type InsertAreaDemand = z.infer<typeof insertAreaDemandSchema>;
export type AreaDemand = typeof areaDemand.$inferSelect;

export type InsertPricingHistory = z.infer<typeof insertPricingHistorySchema>;
export type PricingHistory = typeof pricingHistory.$inferSelect;
`;

/* ------------------------ SERVER SETUP ------------------------ */
// Express server setup with database connection and API routes

const serverSetup = `
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema.js';
import { calculateDistance } from './services/distance-calculator.js';
import { calculateQuoteSchema } from '../shared/schema.js';
import { z } from 'zod';
import { PRICING_CONSTANTS, calculateSimpleQuote, VanSize, UrgencyLevel } from '../shared/pricing-rules.js';
import { getDynamicPriceRecommendation } from './services/ai-pricing.js';
import { generateVanImage, generateServiceImage, generateHeroImage } from './services/image-generator.js';
import Stripe from 'stripe';
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from './paypal.js';

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Stripe configuration
let stripeConfig = {
  publicKey: process.env.VITE_STRIPE_PUBLIC_KEY || '',
  secretKey: process.env.STRIPE_SECRET_KEY || '',
};

let stripe: Stripe | null = null;
let stripeEnabled = false;

function initializeStripe(secretKey?: string) {
  try {
    // Use provided key or the one from config
    const key = secretKey || stripeConfig.secretKey;
    
    if (!key) {
      console.log('Stripe secret key not provided, operating in limited mode');
      return false;
    }
    
    if (!key.startsWith('sk_')) {
      console.log(`Invalid Stripe secret key format: ${key.substring(0, 5)}... - Must start with sk_`);
      return false;
    }
    
    // Initialize Stripe with secret key
    stripe = new Stripe(key, {
      apiVersion: '2023-10-16',
    });
    
    if (secretKey) {
      stripeConfig.secretKey = secretKey;
    }
    
    console.log('Stripe initialized successfully with real API key');
    stripeEnabled = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return false;
  }
}

// Call initialize function with initial keys
initializeStripe();

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check route for deployment monitoring
  app.get('/api/health', (req, res) => {
    const healthCheck = {
      uptime: process.uptime(),
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
        paypal: process.env.PAYPAL_CLIENT_ID ? 'configured' : 'not configured',
        database: process.env.DATABASE_URL ? 'configured' : 'not configured'
      }
    };
    res.status(200).json(healthCheck);
  });

  // API route for distance calculation
  app.post("/api/quotes/distance", async (req, res) => {
    // Simplified distance calculation implementation
    // In production, connect to Google Maps API
  });

  // API routes for quote calculation
  app.post("/api/quotes/calculate", async (req, res) => {
    // Quote calculation implementation
    // Uses distance, van size, and other factors
  });
  
  // Stripe payment intent creation endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe || !stripeEnabled) {
        return res.status(500).json({ error: 'Stripe is not configured properly' });
      }

      const { amount, bookingDetails } = req.body;
      
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Round to nearest whole pounds
      const roundedAmount = Math.round(parseFloat(amount));
      console.log(`Rounded amount: ${roundedAmount} pounds`);
      
      // Calculate deposit (25% of total)
      const depositAmount = Math.ceil(roundedAmount * 0.25) * 100; // Convert to pennies
      console.log(`Deposit amount for Stripe: ${depositAmount} pennies (£${depositAmount/100})`);
      
      // Logging the total amount
      console.log(`Creating payment intent for amount: ${roundedAmount}, deposit: ${depositAmount/100}`);

      // Create payment intent for the deposit amount
      const paymentIntent = await stripe.paymentIntents.create({
        amount: depositAmount,
        currency: 'gbp',
        // Store booking details in the metadata
        metadata: {
          fullAmount: roundedAmount.toString(),
          deposit: (depositAmount/100).toString(),
          pickup: bookingDetails?.pickup || '',
          delivery: bookingDetails?.delivery || '',
          vanSize: bookingDetails?.vanSize || '',
          moveDate: bookingDetails?.moveDate ? new Date(bookingDetails.moveDate).toISOString() : '',
          customerEmail: bookingDetails?.customerEmail || ''
        },
        receipt_email: bookingDetails?.customerEmail,
      });

      console.log(`Payment intent created: ${paymentIntent.id}`);
      console.log(`Client secret format check: ${paymentIntent.client_secret?.substring(0, 15)}...`);
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  });

  // Add a new endpoint for Stripe Checkout Sessions
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      if (!stripe || !stripeEnabled) {
        return res.status(500).json({ error: 'Stripe is not configured properly' });
      }

      const { amount, bookingDetails } = req.body;
      
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Round to nearest whole pounds
      const roundedAmount = Math.round(parseFloat(amount));
      
      // Calculate deposit (25% of total)
      const depositAmount = Math.ceil(roundedAmount * 0.25) * 100; // Convert to pennies

      // Create a Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Man & Van Service - Deposit',
                description: `From ${bookingDetails?.pickup || 'Pickup'} to ${bookingDetails?.delivery || 'Destination'} with ${bookingDetails?.vanSize || 'standard'} van`,
              },
              unit_amount: depositAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/booking-confirmation?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/checkout`,
        metadata: {
          fullAmount: roundedAmount.toString(),
          deposit: (depositAmount/100).toString(),
          pickup: bookingDetails?.pickup || '',
          delivery: bookingDetails?.delivery || '',
          vanSize: bookingDetails?.vanSize || '',
          moveDate: bookingDetails?.moveDate ? new Date(bookingDetails.moveDate).toISOString() : '',
          customerEmail: bookingDetails?.customerEmail || ''
        },
        customer_email: bookingDetails?.customerEmail,
      });

      res.json({ id: session.id });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ 
        error: 'Failed to create checkout session', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Stripe webhook for handling payment events
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!sig || !webhookSecret || !stripe) {
      return res.status(400).send('Webhook signature or configuration missing');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    try {
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          // Handle successful payment
          console.log('Payment succeeded:', paymentIntent.id);
          
          // Update booking status in database
          // Code to update booking based on metadata
          
          break;
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          console.log('Payment failed:', failedPayment.id);
          // Handle failed payment
          break;
        // Handle other event types as needed
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      res.json({received: true});
    } catch (error) {
      console.error('Webhook processing failed:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // PayPal API Routes
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  const httpServer = createServer(app);
  return httpServer;
}
`;

/* ---------------------- SHARED PRICING RULES ---------------------- */
// This section contains the pricing calculation rules used by both the
// client and server sides of the application.

const pricingRules = `
/**
 * PRICING RULES - CENTRALIZED PRICING MODULE
 * Single source of truth for all pricing calculations across the application
 */

// Types for pricing calculations
export type VanSize = "small" | "medium" | "large" | "luton";
export type FloorAccess = "ground" | "firstFloor" | "secondFloor" | "thirdFloorPlus";
export type UrgencyLevel = "standard" | "priority" | "express";

// Global pricing constants
export const PRICING_CONSTANTS = {
  // Base pricing
  MINIMUM_PRICE: 15,            // £15 minimum price
  BASE_RATE_PER_MILE_MIN: 0.80, // £0.80 minimum per mile (urban/short distances)
  BASE_RATE_PER_MILE_MAX: 1.20, // £1.20 maximum per mile (rural/long distances)
  
  // Van size multipliers
  VAN_SIZE_MULTIPLIERS: {
    small: 1.0,   // Small van (SWB)
    medium: 1.2,  // Medium van (MWB)
    large: 1.4,   // Large van (LWB)
    luton: 1.6    // Luton van
  },
  
  // Hourly rates by van size
  HOURLY_RATES: {
    small: 25,     // £25 per hour
    medium: 30,    // £30 per hour
    large: 35,     // £35 per hour
    luton: 40      // £40 per hour
  },
  
  // Helper fees
  HELPER_HOURLY_RATE: 20,   // £20 per hour per helper
  
  // Floor access fees
  FLOOR_ACCESS_FEES: {
    ground: 0,             // No charge for ground floor
    firstFloor: 20,        // £20 extra for first floor
    secondFloor: 40,       // £40 extra for second floor
    thirdFloorPlus: 60     // £60 extra for third floor or higher
  },
  LIFT_DISCOUNT: 0.5,      // 50% discount if lift is available
  
  // Time-based pricing
  PEAK_TIME_SURCHARGE: 0.15, // 15% extra for peak times
  EVENING_SURCHARGE: 0.10,   // 10% extra for evening (after 6pm)
  WEEKEND_SURCHARGE: 0.12,   // 12% extra for weekends
  HOLIDAY_SURCHARGE: 0.20,   // 20% extra for holidays
  
  // Urgency premiums
  URGENCY_MULTIPLIERS: {
    standard: 1.0,   // No urgency premium
    priority: 1.15,  // 15% premium for priority (24-48 hours)
    express: 1.30    // 30% premium for express (same day/next day)
  },
  
  // Fuel cost calculation
  FUEL_EFFICIENCY_MPG: {  // Miles per gallon
    small: 34,    // Small van
    medium: 30,   // Medium van
    large: 25,    // Large van
    luton: 20     // Luton van
  },
  FUEL_COST_PER_LITRE: 1.40,  // £1.40 per litre
  LITRES_PER_GALLON: 4.54609, // UK gallons
  
  // Return journey discount
  RETURN_JOURNEY_FACTOR: 0.50, // 50% of original journey
  
  // Platform fee and driver share
  PLATFORM_FEE_PERCENTAGE: 0.25, // 25% platform fee
  DRIVER_SHARE_PERCENTAGE: 0.75, // 75% driver share
  
  // Tax rates
  VAT_RATE: 0.20 // 20% VAT
};

/**
 * Calculate the distance-based charge
 * This now includes a base fare and per-mile rate that varies with location and van size
 */
export function calculateDistanceCharge(distanceMiles: number, vanSize: VanSize = 'medium', isUrban: boolean = false): number {
  // Determine per-mile rate based on distance and area type
  // Urban areas and short distances use higher rates due to traffic, parking, etc.
  // Rural areas and longer distances use lower rates
  const perMileRate = isUrban || distanceMiles < 10 ?
    PRICING_CONSTANTS.BASE_RATE_PER_MILE_MAX :
    PRICING_CONSTANTS.BASE_RATE_PER_MILE_MIN;
    
  // Apply distance and rate to calculate basic charge
  // Include the base fare and round to 2 decimal places
  return PRICING_CONSTANTS.MINIMUM_PRICE + (distanceMiles * perMileRate);
}

/**
 * Calculate the van size multiplier
 */
export function calculateVanSizeMultiplier(vanSize: VanSize): number {
  return PRICING_CONSTANTS.VAN_SIZE_MULTIPLIERS[vanSize] || PRICING_CONSTANTS.VAN_SIZE_MULTIPLIERS.medium;
}

/**
 * Calculate the hourly rate based on van size
 */
export function calculateHourlyRate(vanSize: VanSize): number {
  return PRICING_CONSTANTS.HOURLY_RATES[vanSize] || PRICING_CONSTANTS.HOURLY_RATES.medium;
}

/**
 * Calculate time-based charges (hourly rate × time)
 */
export function calculateTimeCharge(vanSize: VanSize, hours: number): number {
  const hourlyRate = calculateHourlyRate(vanSize);
  return hourlyRate * hours;
}

/**
 * Calculate peak time surcharge (weekend, evening, holiday)
 */
export function calculatePeakTimeSurcharge(date: Date, timeString?: string): number {
  // Default to 1 (no surcharge) if date is invalid
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 1;
  }
  
  let surcharge = 1.0; // Start with no surcharge
  
  // Check if weekend (0 = Sunday, 6 = Saturday)
  const day = date.getDay();
  if (day === 0 || day === 6) {
    surcharge += PRICING_CONSTANTS.WEEKEND_SURCHARGE;
  }
  
  // Check if holiday
  if (isUKHoliday(date)) {
    surcharge += PRICING_CONSTANTS.HOLIDAY_SURCHARGE;
  }
  
  // Check if evening move (after 6pm)
  if (timeString) {
    try {
      const timeMatch = timeString.match(/(\d+)(?::([0-5]\d))\s*([ap]m)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2] || "0");
        const ampm = timeMatch[3];
        
        // Convert to 24-hour format if am/pm is specified
        if (ampm && ampm.toLowerCase() === "pm" && hour < 12) {
          hour += 12;
        } else if (ampm && ampm.toLowerCase() === "am" && hour === 12) {
          hour = 0;
        }
        
        // Check if after 6pm (18:00)
        if (hour >= 18) {
          surcharge += PRICING_CONSTANTS.EVENING_SURCHARGE;
        }
      }
    } catch (e) {
      // Ignore time parsing errors, just don't add the evening surcharge
    }
  } else {
    // Check if evening move based on date hour
    const hour = date.getHours();
    if (hour >= 18) {
      surcharge += PRICING_CONSTANTS.EVENING_SURCHARGE;
    }
  }
  
  // For peak times (rush hour), add a general surcharge if it falls on a weekday
  // during common commute times (7-9am or 4-7pm)
  if (day >= 1 && day <= 5) { // Monday to Friday
    const hour = date.getHours();
    if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 19)) {
      surcharge += PRICING_CONSTANTS.PEAK_TIME_SURCHARGE;
    }
  }
  
  return surcharge;
}

/**
 * Calculate urgency surcharge
 */
export function calculateUrgencySurcharge(urgency: UrgencyLevel): number {
  return PRICING_CONSTANTS.URGENCY_MULTIPLIERS[urgency] || PRICING_CONSTANTS.URGENCY_MULTIPLIERS.standard;
}

/**
 * Calculate fuel costs for the journey using MPG formula
 * Fuel formula: (distance_miles / mpg) * fuel_cost_per_litre * litres_per_gallon
 */
export function calculateFuelCost(distanceMiles: number, vanSize: VanSize = 'medium'): number {
  const mpg = PRICING_CONSTANTS.FUEL_EFFICIENCY_MPG[vanSize] || PRICING_CONSTANTS.FUEL_EFFICIENCY_MPG.medium;
  return (distanceMiles / mpg) * PRICING_CONSTANTS.FUEL_COST_PER_LITRE * PRICING_CONSTANTS.LITRES_PER_GALLON;
}

/**
 * Calculate return journey costs
 * 
 * The return journey is charged at a reduced rate with several considerations:
 * - No base fare for the return (driver is already out)
 * - Use the lowest per-mile rate since it's typically efficient and less traffic
 * - Apply the return journey factor as set in pricing constants
 */
export function calculateReturnJourneyCost(distanceMiles: number, vanSize: VanSize = 'medium'): number {
  // Just use the per-mile rate (no base fare) and apply the return journey discount
  const perMileRate = PRICING_CONSTANTS.BASE_RATE_PER_MILE_MIN;
  const rawCost = (distanceMiles * perMileRate);
  return rawCost * PRICING_CONSTANTS.RETURN_JOURNEY_FACTOR;
}

/**
 * Check if a date is a UK holiday (simplified version)
 */
function isUKHoliday(date: Date): boolean {
  // Get the month and day (0-indexed month, so January is 0)
  const month = date.getMonth();
  const day = date.getDate();
  
  // New Year's Day (or observed day)
  if (month === 0 && (day === 1 || (day === 2 && date.getDay() === 1) || (day === 3 && date.getDay() === 1))) return true;
  
  // Good Friday (approximate - this should be calculated properly in production)
  // Easter - varies, would need proper calculation
  
  // Early May Bank Holiday (first Monday in May)
  if (month === 4 && date.getDay() === 1 && day <= 7) return true;
  
  // Spring Bank Holiday (last Monday in May)
  if (month === 4 && date.getDay() === 1 && day > 24) return true;
  
  // Summer Bank Holiday (last Monday in August)
  if (month === 7 && date.getDay() === 1 && day > 24) return true;
  
  // Christmas Day (or observed day)
  if (month === 11 && (day === 25 || (day === 27 && (date.getDay() === 1 || date.getDay() === 2)))) return true;
  
  // Boxing Day (or observed day)
  if (month === 11 && (day === 26 || (day === 28 && (date.getDay() === 1)))) return true;
  
  return false;
}

/**
 * Calculate commission and driver share
 * The platform fee is 25% and driver gets 75%
 */
export function calculateCommissionAndDriverShare(totalPrice: number): {
  platformFee: number;
  driverShare: number;
} {
  const platformFee = Math.round(totalPrice * PRICING_CONSTANTS.PLATFORM_FEE_PERCENTAGE);
  const driverShare = totalPrice - platformFee;
  
  return {
    platformFee,
    driverShare
  };
}

/**
 * Calculate VAT amount from a gross price (VAT-inclusive)
 */
export function calculateVAT(price: number): number {
  return Math.ceil((price * PRICING_CONSTANTS.VAT_RATE / (1 + PRICING_CONSTANTS.VAT_RATE)) * 100) / 100;
}

/**
 * Calculate price including VAT
 */
export function calculatePriceWithVAT(price: number): number {
  return Math.ceil(price * (1 + PRICING_CONSTANTS.VAT_RATE));
}

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number): string {
  return `£${price.toFixed(2)}`;
}

/**
 * Estimate travel time based on distance and conditions
 */
export function estimateTravelTime(distanceMiles: number): number {
  // Base time: Assume average speed of 40 mph (includes urban, rural, and motorway mix)
  // This gives a time in hours; multiply by 60 to get minutes
  const baseMinutes = (distanceMiles / 40) * 60;
  
  // Add loading/unloading time: 30 minutes base
  const loadingMinutes = 30;
  
  // Add traffic buffer: 15% of travel time
  const trafficBuffer = baseMinutes * 0.15;
  
  // Return total estimated minutes
  return Math.ceil(baseMinutes + loadingMinutes + trafficBuffer);
}

/**
 * Build a detailed price breakdown
 */
export function buildPriceBreakdown(params: {
  distanceMiles: number;
  vanSize: VanSize;
  helpers: number; 
  hours?: number;
  floorAccess: FloorAccess;
  liftAvailable: boolean;
  moveDate: Date;
  timeString?: string;
  urgency: UrgencyLevel;
  isUrban?: boolean;
}): {
  breakdown: string[];
  totalPrice: number;
  totalWithVAT: number;
  subTotal: number; // The driver's share
  platformFee: number;
  driverShare: number;
  vatAmount: number;
  includesVAT: boolean;
} {
  // Extract parameters with defaults
  const {
    distanceMiles,
    vanSize = 'medium',
    helpers = 0,
    hours = 0,
    floorAccess = 'ground',
    liftAvailable = false,
    moveDate = new Date(),
    timeString,
    urgency = 'standard',
    isUrban = false
  } = params;
  
  // Calculate base costs
  const distanceCharge = calculateDistanceCharge(distanceMiles, vanSize, isUrban);
  const vanSizeMultiplier = calculateVanSizeMultiplier(vanSize);
  const timeCharge = hours > 0 ? calculateTimeCharge(vanSize, hours) : 0;
  
  // Helper fees - each helper costs extra per hour
  const helpersFee = helpers * PRICING_CONSTANTS.HELPER_HOURLY_RATE * (hours || 2); // Minimum 2 hours
  
  // Floor access fees - based on floor and whether lift is available
  const baseFloorFee = PRICING_CONSTANTS.FLOOR_ACCESS_FEES[floorAccess] || 0;
  const floorAccessFee = liftAvailable ? baseFloorFee * PRICING_CONSTANTS.LIFT_DISCOUNT : baseFloorFee;
  
  // Time-based surcharges
  const peakMultiplier = calculatePeakTimeSurcharge(moveDate, timeString);
  const peakTimeSurcharge = ((distanceCharge * vanSizeMultiplier) + timeCharge) * (peakMultiplier - 1);
  
  // Urgency surcharge
  const urgencyMultiplier = calculateUrgencySurcharge(urgency);
  const urgencySurcharge = ((distanceCharge * vanSizeMultiplier) + timeCharge) * (urgencyMultiplier - 1);
  
  // Calculate fuel cost for accurate pricing
  const fuelCost = calculateFuelCost(distanceMiles, vanSize);
  
  // Calculate return journey cost
  const returnJourneyCost = calculateReturnJourneyCost(distanceMiles, vanSize);
  
  // Subtotal before VAT
  const subtotal = (
    (distanceCharge * vanSizeMultiplier) +
    timeCharge +
    helpersFee +
    floorAccessFee +
    peakTimeSurcharge +
    urgencySurcharge +
    fuelCost +
    returnJourneyCost
  );
  
  // Round to the nearest pound
  const totalPrice = Math.ceil(subtotal);
  
  // Calculate VAT (included in the price)
  const vatAmount = calculateVAT(totalPrice);
  const totalWithVAT = Math.ceil(totalPrice); // Price already includes VAT
  
  // Calculate commission and driver share
  const { platformFee, driverShare } = calculateCommissionAndDriverShare(totalPrice);
  
  // Build a detailed breakdown
  const breakdown = [
    `Distance (${distanceMiles.toFixed(1)} miles): ${formatPrice(distanceCharge)}`,
    `Van size (${vanSize}): ${formatPrice(distanceCharge * vanSizeMultiplier - distanceCharge)}`,
    `Helpers (${helpers}): ${formatPrice(helpersFee)}`,
    `Fuel: ${formatPrice(fuelCost)}`,
    `Return journey: ${formatPrice(returnJourneyCost)}`
  ];
  
  // Only add fees that apply
  if (floorAccessFee > 0) {
    breakdown.push(`Floor access (${floorAccess}${liftAvailable ? ', with lift' : ''}): ${formatPrice(floorAccessFee)}`);
  }
  
  if (peakTimeSurcharge > 0) {
    const percentage = ((peakMultiplier - 1) * 100).toFixed(0);
    breakdown.push(`Peak time surcharge (${percentage}%): ${formatPrice(peakTimeSurcharge)}`);
  }
  
  if (urgencySurcharge > 0) {
    const percentage = ((urgencyMultiplier - 1) * 100).toFixed(0);
    breakdown.push(`Urgency surcharge (${percentage}%): ${formatPrice(urgencySurcharge)}`);
  }
  
  // Add subtotal, VAT, and total
  breakdown.push(`Subtotal (excluding VAT): ${formatPrice(totalPrice)}`);
  breakdown.push(`VAT (${PRICING_CONSTANTS.VAT_RATE * 100}%): ${formatPrice(vatAmount)}`);
  breakdown.push(`Total (including VAT): ${formatPrice(totalWithVAT)}`);
  
  // Add platform fee and driver share
  breakdown.push(`Platform fee (${PRICING_CONSTANTS.PLATFORM_FEE_PERCENTAGE * 100}%): ${formatPrice(platformFee)}`);
  breakdown.push(`Driver payment (${PRICING_CONSTANTS.DRIVER_SHARE_PERCENTAGE * 100}%): ${formatPrice(driverShare)}`);
  
  return {
    breakdown,
    totalPrice,
    totalWithVAT,
    subTotal: driverShare,
    platformFee,
    driverShare,
    vatAmount,
    includesVAT: true
  };
}

/**
 * Simplified quote calculation for the landing page
 */
export function calculateSimpleQuote(params: {
  distanceMiles: number;
  vanSize: VanSize;
  moveDate: Date;
  isUrban?: boolean;
}): {
  totalPrice: number;
  totalWithVAT: number;
  subTotal: number;
  platformFee: number;
  driverShare: number;
  vatAmount: number;
  distanceCharge: number;
  timeCharge: number;
  helpersFee: number;
  floorAccessFee: number;
  peakTimeSurcharge: number;
  urgencySurcharge: number;
  fuelCost: number;
  returnJourneyCost: number;
  congestionCharge: number;
  currency: string;
  priceString: string;
  estimatedTime: string;
  explanation: string;
  breakdown: string[];
  includesVAT: boolean;
} {
  const {
    distanceMiles,
    vanSize = 'medium',
    moveDate = new Date(),
    isUrban = false
  } = params;
  
  // Build a full breakdown using the shared pricing function
  const result = buildPriceBreakdown({
    distanceMiles,
    vanSize,
    helpers: 0,
    floorAccess: 'ground',
    liftAvailable: false,
    moveDate,
    urgency: 'standard',
    isUrban
  });
  
  // Calculate individual components for more detailed reporting
  const distanceCharge = calculateDistanceCharge(distanceMiles, vanSize, isUrban);
  const timeCharge = vanSize === 'small' ? 25 : vanSize === 'medium' ? 30 : vanSize === 'large' ? 35 : 40;
  const fuelCost = calculateFuelCost(distanceMiles, vanSize);
  const returnJourneyCost = calculateReturnJourneyCost(distanceMiles, vanSize);
  
  // Time-based surcharges
  const peakMultiplier = calculatePeakTimeSurcharge(moveDate);
  const peakTimeSurcharge = distanceCharge * (peakMultiplier - 1);
  
  // Calculate estimated time
  const estimatedMinutes = estimateTravelTime(distanceMiles);
  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;
  const estimatedTime = hours > 0 
    ? `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minutes`
    : `${minutes} minutes`;
  
  // Create a simple explanation
  const explanation = `£${result.totalWithVAT} for a ${vanSize} van, ${distanceMiles.toFixed(1)} miles. Estimated time: ${estimatedTime}.`;
  
  return {
    ...result,
    distanceCharge,
    timeCharge,
    helpersFee: 0,
    floorAccessFee: 0,
    peakTimeSurcharge,
    urgencySurcharge: 0,
    fuelCost,
    returnJourneyCost,
    congestionCharge: 0,
    currency: '£',
    priceString: `£${result.totalWithVAT.toFixed(2)}`,
    estimatedTime,
    explanation
  };
}
`;

/* ------------------- CLIENT SIDE APP COMPONENTS ------------------- */
// Sample client components showing how to use the app without
// including any sensitive information

const clientComponents = `
// PayPalButton.tsx - Example client component for PayPal integration
import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuote } from '@/contexts/QuoteContext';

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalCheckout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const paypalButtonRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { currentQuote, loadQuoteFromLocalStorage } = useQuote();
  const { toast } = useToast();
  const [customerEmail, setCustomerEmail] = useState('');

  // Load quote from localStorage if not already in context
  useEffect(() => {
    if (!currentQuote) {
      const loaded = loadQuoteFromLocalStorage();
      if (!loaded) {
        toast({
          title: "No booking found",
          description: "Please get a quote first before proceeding to checkout",
          variant: "destructive",
        });
        setLocation("/");
      }
    }

    // Load the PayPal SDK script
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID || ''}`;
    script.async = true;
    
    script.onload = () => {
      setIsLoading(false);
      if (window.paypal && paypalButtonRef.current) {
        renderPayPalButton();
      }
    };
    
    script.onerror = () => {
      console.error('Failed to load the PayPal SDK');
      toast({
        title: "PayPal Error",
        description: "Failed to load the PayPal payment system",
        variant: "destructive",
      });
      setIsLoading(false);
    };
    
    document.body.appendChild(script);
    
    return () => {
      // Clean up the script when the component unmounts
      document.body.removeChild(script);
    };
  }, [currentQuote, loadQuoteFromLocalStorage, setLocation, toast]);

  // Render the PayPal button
  const renderPayPalButton = () => {
    // Rendering code for PayPal button
  };

  // Format price with currency symbol
  function formatPrice(price: number): string {
    return `£${price.toFixed(2)}`;
  }

  return (
    <div className="container mx-auto py-16 px-4">
      {/* PayPal checkout UI */}
    </div>
  );
}

// StripeCheckout.tsx - Example client component for Stripe integration
import { useState, useEffect } from 'react';
import { useQuote } from '@/contexts/QuoteContext';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

declare global {
  interface Window {
    Stripe?: (key: string) => any;
  }
}

export default function StripeCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { currentQuote, loadQuoteFromLocalStorage } = useQuote();
  const { toast } = useToast();
  const [customerEmail, setCustomerEmail] = useState('');

  // Load Stripe.js script
  useEffect(() => {
    // Load the Stripe.js script
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Cleanup on unmount
      document.body.removeChild(script);
    };
  }, []);
  
  const handleCheckout = async () => {
    // Code to handle Stripe checkout
  };

  // Format price with currency symbol
  function formatPrice(price: number): string {
    return `£${price.toFixed(2)}`;
  }

  return (
    <div className="container mx-auto py-16 px-4">
      {/* Stripe checkout UI */}
    </div>
  );
}
`;

/* --------------------------- EXPORT ---------------------------- */
// Export the configuration and code samples for application deployment

module.exports = {
  config,
  schema,
  serverSetup,
  pricingRules,
  clientComponents,
  deploymentInstructions: {
    render: {
      buildCommand: 'npm install && npm run build',
      startCommand: 'npm run start',
      environmentVariables: [
        'NODE_ENV',
        'STRIPE_SECRET_KEY',
        'VITE_STRIPE_PUBLIC_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'PAYPAL_CLIENT_ID',
        'PAYPAL_CLIENT_SECRET',
        'DATABASE_URL',
        'GOOGLE_MAPS_API_KEY'
      ]
    },
    instructions: `
      # EasyMove Man and Van - Deployment Instructions
      
      ## Database Setup
      1. Create a PostgreSQL database
      2. Set DATABASE_URL environment variable
      3. Run 'npm run db:push' to push schema
      
      ## Payment Setup
      1. Add Stripe environment variables
         - VITE_STRIPE_PUBLIC_KEY (starts with pk_)
         - STRIPE_SECRET_KEY (starts with sk_)
         - STRIPE_WEBHOOK_SECRET (optional, starts with whsec_)
      2. Add PayPal environment variables
         - PAYPAL_CLIENT_ID
         - PAYPAL_CLIENT_SECRET
      
      ## Render Deployment
      1. Connect your GitHub repository
      2. Use the build command: npm install && npm run build
      3. Use the start command: npm run start
      4. Add all environment variables
      5. Deploy the application
    `
  }
};

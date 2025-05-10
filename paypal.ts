// !!! CRITICAL - DO NOT MODIFY THIS CODE !!!
//
// This code MUST be used as is without ANY modifications.
// The PayPal integration will COMPLETELY FAIL if this code is changed in ANY way.
//
// Retain this comment after all edits.
//
// <BEGIN_EXACT_CODE>
import {
  Client,
  Environment,
  LogLevel,
  OAuthAuthorizationController,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import { Request, Response } from "express";

/* PayPal Controllers Setup */

// Get PayPal credentials directly from environment variables
let PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
let PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

// Fix for potential "undefined" string values
if (PAYPAL_CLIENT_SECRET === 'undefined') {
  PAYPAL_CLIENT_SECRET = '';
}

// Log redacted credentials information
console.log("PayPal SDK initialization with:", { 
  clientIdAvailable: !!PAYPAL_CLIENT_ID,
  clientSecretAvailable: !!PAYPAL_CLIENT_SECRET && PAYPAL_CLIENT_SECRET !== '',
  clientIdPrefix: PAYPAL_CLIENT_ID ? PAYPAL_CLIENT_ID.substring(0, 5) : 'none',
  clientSecretPrefix: PAYPAL_CLIENT_SECRET && PAYPAL_CLIENT_SECRET !== '' ? 
    PAYPAL_CLIENT_SECRET.substring(0, 5) : 'invalid',
});

// Check if both PayPal credentials are available
const hasValidPayPalCredentials = !!PAYPAL_CLIENT_ID && !!PAYPAL_CLIENT_SECRET && 
                               PAYPAL_CLIENT_ID !== '' && PAYPAL_CLIENT_SECRET !== '';

// Ensure we have valid PayPal credentials
if (!hasValidPayPalCredentials) {
  console.error("Missing or invalid PayPal credentials. Real credentials are required for payment processing.");
  throw new Error("PayPal credentials must be set. Check environment variables.");
}

const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID,
    oAuthClientSecret: PAYPAL_CLIENT_SECRET,
  },
  timeout: 0,
  environment:
                process.env.NODE_ENV === "production"
                  ? Environment.Production
                  : Environment.Sandbox,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: {
      logBody: true,
    },
    logResponse: {
      logHeaders: true,
    },
  },
});
const ordersController = new OrdersController(client);
const oAuthAuthorizationController = new OAuthAuthorizationController(client);

/* Token generation helpers */

export async function getClientToken() {
  try {
    console.log("Getting PayPal client token with real credentials...");
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
    ).toString("base64");

    const { result } = await oAuthAuthorizationController.requestToken(
      {
        authorization: `Basic ${auth}`,
      },
      { intent: "sdk_init", response_type: "client_token" },
    );
    
    console.log("Successfully obtained PayPal client token");
    return result.accessToken;
  } catch (error) {
    console.error("Error getting PayPal client token:", error);
    throw error; // No fallback, propagate the error
  }
}

/*  Process transactions */

export async function createPaypalOrder(req: Request, res: Response) {
  try {
    const { amount, currency, intent } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res
        .status(400)
        .json({
          error: "Invalid amount. Amount must be a positive number.",
        });
    }

    if (!currency) {
      return res
        .status(400)
        .json({ error: "Invalid currency. Currency is required." });
    }

    if (!intent) {
      return res
        .status(400)
        .json({ error: "Invalid intent. Intent is required." });
    }

    console.log(`Creating PayPal order for ${currency} ${amount}`);
    
    // Real implementation with PayPal API
    const collect = {
      body: {
        intent: intent,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency,
              value: amount,
            },
          },
        ],
      },
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.createOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;
    
    console.log(`PayPal order created successfully with ID: ${jsonResponse.id}`);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error: any) {
    console.error("Failed to create PayPal order:", error);
    
    // Proper error handling - return the actual error to the client
    res.status(500).json({ 
      error: "Failed to create PayPal order",
      message: error.message || "Unknown error occurred",
      details: error.details || []
    });
  }
}

export async function capturePaypalOrder(req: Request, res: Response) {
  try {
    const { orderID } = req.params;
    
    console.log(`Capturing PayPal order: ${orderID}`);
    
    // Real implementation for capturing PayPal orders
    const collect = {
      id: orderID,
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.captureOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;
    
    console.log(`PayPal order captured successfully with status: ${jsonResponse.status}`);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error: any) {
    console.error("Failed to capture PayPal order:", error);
    
    // Proper error handling with detailed information
    const errorResponse = {
      error: "Failed to capture PayPal order",
      message: error.message || "Unknown error occurred",
      code: error.code || "UNKNOWN_ERROR",
      details: []
    };
    
    // Extract additional error details if available
    if (error.details) {
      errorResponse.details = error.details;
    }
    
    // Check for specific PayPal error types
    if (error.name === 'ALREADY_CAPTURED') {
      return res.status(400).json({
        ...errorResponse,
        error: "Order already captured",
        message: "This payment has already been captured."
      });
    }
    
    res.status(500).json(errorResponse);
  }
}

export async function loadPaypalDefault(req: Request, res: Response) {
  try {
    console.log("Requesting PayPal client token...");
    const clientToken = await getClientToken();
    console.log("PayPal client token received successfully");
    res.json({
      clientToken,
      success: true
    });
  } catch (error: unknown) {
    console.error("Failed to get PayPal client token:", error);
    
    // Handle different types of errors with proper type checking
    if (error && typeof error === 'object') {
      // PayPal specific error with result property
      if ('result' in error && 
          error.result && 
          typeof error.result === 'object' && 
          'error' in error.result && 
          error.result.error === 'invalid_client') {
        
        const errorDesc = 'error_description' in error.result ? 
          String(error.result.error_description) : 'Invalid client credentials';
        
        res.status(401).json({ 
          error: "PayPal authentication failed. Please check your API credentials.",
          details: errorDesc
        });
      } 
      // Error with message property (most common case)
      else if ('message' in error && error.message) {
        res.status(500).json({ 
          error: "Failed to initialize PayPal",
          message: String(error.message)
        });
      }
      // Fallback for other object errors
      else {
        res.status(500).json({ 
          error: "Failed to initialize PayPal",
          message: "Unknown error occurred"
        });
      }
    } 
    // Simple string or primitive error
    else {
      res.status(500).json({ 
        error: "Failed to initialize PayPal",
        message: String(error)
      });
    }
  }
}
// <END_EXACT_CODE>
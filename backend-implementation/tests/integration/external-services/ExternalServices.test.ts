/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - EXTERNAL SERVICES INTEGRATION TESTS
 * ============================================================================
 *
 * Comprehensive integration tests for external service integrations:
 * - Mock service implementations for testing
 * - Service health and connectivity testing
 * - Webhook processing and security verification
 * - Error handling and circuit breaker testing
 * - Rate limiting and throttling validation
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from "@jest/globals";
import nock from "nock";
import crypto from "crypto";
import StripeService from "@/services/external/StripeService";
import TwilioService from "@/services/external/TwilioService";
import SendGridService from "@/services/external/SendGridService";
import SamsaraService from "@/services/external/SamsaraService";
import AirtableService from "@/services/external/AirtableService";
import MapsService from "@/services/external/MapsService";
import WebhookSecurityService from "@/services/external/WebhookSecurityService";
import { ExternalServicesManager } from "@/services/external/ExternalServicesManager";
import { CustomerService } from "@/services/CustomerService";

// Mock environment variables
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock";
process.env.TWILIO_ACCOUNT_SID = "AC_test_mock";
process.env.TWILIO_AUTH_TOKEN = "auth_token_mock";
process.env.SENDGRID_API_KEY = "SG.test_mock";
process.env.SAMSARA_API_TOKEN = "samsara_token_mock";
process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN = "pat_mock";
process.env.MAPBOX_ACCESS_TOKEN = "pk.test_mock";

describe("External Services Integration Tests", () => {
  let customerService: CustomerService;
  let stripeService: StripeService;
  let twilioService: TwilioService;
  let sendGridService: SendGridService;
  let samsaraService: SamsaraService;
  let airtableService: AirtableService;
  let mapsService: MapsService;
  let webhookSecurity: WebhookSecurityService;
  let servicesManager: ExternalServicesManager;

  beforeAll(async () => {
    // Initialize services
    customerService = new CustomerService();
    
    stripeService = new StripeService({
      serviceName: "stripe",
      baseURL: "https://api.stripe.com",
      secretKey: process.env.STRIPE_SECRET_KEY!,
      publishableKey: "pk_test_mock",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    }, customerService);

    twilioService = new TwilioService({
      serviceName: "twilio",
      baseURL: "https://api.twilio.com",
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
    });

    sendGridService = new SendGridService({
      serviceName: "sendgrid",
      baseURL: "https://api.sendgrid.com/v3",
      apiKey: process.env.SENDGRID_API_KEY!,
      defaultFromEmail: "test@example.com",
    });

    samsaraService = new SamsaraService({
      serviceName: "samsara",
      baseURL: "https://api.samsara.com",
      apiToken: process.env.SAMSARA_API_TOKEN!,
    });

    airtableService = new AirtableService({
      serviceName: "airtable",
      baseURL: "https://api.airtable.com/v0",
      personalAccessToken: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN!,
    });

    mapsService = new MapsService({
      serviceName: "maps",
      baseURL: "https://api.mapbox.com",
      provider: "mapbox",
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN!,
    });

    webhookSecurity = new WebhookSecurityService();
    servicesManager = new ExternalServicesManager();
  });

  beforeEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    nock.restore();
    await servicesManager.shutdown();
  });

  describe("Stripe Integration", () => {
    it("should create a customer successfully", async () => {
      const mockCustomer = {
        id: "cus_mock123",
        email: "test@example.com",
        name: "Test Customer",
        created: 1234567890,
        metadata: { internal_customer_id: "customer_123" },
      };

      nock("https://api.stripe.com")
        .get("/v1/customers/search")
        .query({ query: 'email:"test@example.com"' })
        .reply(200, { data: [] })
        .post("/v1/customers")
        .reply(200, mockCustomer);

      const result = await stripeService.createOrGetCustomer({
        customerId: "customer_123",
        email: "test@example.com",
        name: "Test Customer",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("cus_mock123");
      expect(result.data?.email).toBe("test@example.com");
    });

    it("should create a payment intent successfully", async () => {
      const mockPaymentIntent = {
        id: "pi_mock123",
        client_secret: "pi_mock123_secret",
        amount: 2000,
        currency: "usd",
        status: "requires_payment_method",
      };

      nock("https://api.stripe.com")
        .post("/v1/payment_intents")
        .reply(200, mockPaymentIntent);

      const result = await stripeService.createPaymentIntent(2000, "usd");

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("pi_mock123");
      expect(result.data?.amount).toBe(2000);
    });

    it("should handle webhook events securely", async () => {
      const payload = JSON.stringify({
        id: "evt_mock123",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_mock123",
            amount: 2000,
            currency: "usd",
          },
        },
        created: Math.floor(Date.now() / 1000),
      });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = this.generateStripeSignature(payload, timestamp, "whsec_test_mock");

      webhookSecurity.registerWebhook("stripe", {
        provider: "stripe",
        secret: "whsec_test_mock",
        tolerance: 300,
      });

      const verification = await webhookSecurity.verifyWebhook(
        "stripe",
        payload,
        `t=${timestamp},v1=${signature}`,
        timestamp
      );

      expect(verification.isValid).toBe(true);
      expect(verification.metadata?.provider).toBe("stripe");
    });
  });

  describe("Twilio Integration", () => {
    it("should send SMS successfully", async () => {
      const mockMessage = {
        sid: "SM_mock123",
        to: "+1234567890",
        from: "+0987654321",
        body: "Test message",
        status: "queued",
        date_created: new Date().toISOString(),
        num_segments: 1,
      };

      nock("https://api.twilio.com")
        .post("/2010-04-01/Accounts/AC_test_mock/Messages.json")
        .reply(201, mockMessage);

      const result = await twilioService.sendSms(
        "+1234567890",
        "Test message",
        "+0987654321"
      );

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("SM_mock123");
      expect(result.data?.status).toBe("queued");
    });

    it("should handle bulk SMS sending with rate limiting", async () => {
      const recipients = Array.from({ length: 25 }, (_, i) => ({
        to: `+123456789${i.toString().padStart(1, "0")}`,
      }));

      // Mock multiple message creation requests
      for (let i = 0; i < 25; i++) {
        nock("https://api.twilio.com")
          .post("/2010-04-01/Accounts/AC_test_mock/Messages.json")
          .reply(201, {
            sid: `SM_mock${i}`,
            to: recipients[i].to,
            from: "+0987654321",
            body: "Bulk message",
            status: "queued",
            date_created: new Date().toISOString(),
            num_segments: 1,
          });
      }

      const result = await twilioService.sendBulkSms({
        recipients,
        body: "Bulk message",
        from: "+0987654321",
      });

      expect(result.success).toBe(true);
      expect(result.data?.successful.length).toBe(25);
      expect(result.data?.failed.length).toBe(0);
    });
  });

  describe("SendGrid Integration", () => {
    it("should send email successfully", async () => {
      nock("https://api.sendgrid.com")
        .post("/v3/mail/send")
        .reply(202, "", {
          "x-message-id": "msg_mock123",
        });

      const result = await sendGridService.sendEmail({
        to: "test@example.com",
        from: { email: "sender@example.com" },
        subject: "Test Email",
        html: "<p>Test content</p>",
      });

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBe("msg_mock123");
    });

    it("should handle webhook events for email tracking", async () => {
      const events = [
        {
          email: "test@example.com",
          timestamp: Math.floor(Date.now() / 1000),
          event: "delivered",
          sg_event_id: "event_mock123",
          sg_message_id: "msg_mock123",
        },
        {
          email: "test@example.com",
          timestamp: Math.floor(Date.now() / 1000),
          event: "open",
          sg_event_id: "event_mock124",
          sg_message_id: "msg_mock123",
        },
      ];

      const result = await sendGridService.processWebhookEvent(events);

      expect(result.success).toBe(true);
      expect(result.data?.processed).toBe(2);
      expect(result.data?.skipped).toBe(0);
    });
  });

  describe("Samsara Integration", () => {
    it("should fetch vehicles successfully", async () => {
      const mockVehicles = {
        data: [
          {
            id: "vehicle_mock123",
            name: "Truck 001",
            vehicleType: "truck",
            make: "Ford",
            model: "F-150",
            year: 2022,
            vin: "1FTFW1ET5DKF12345",
          },
        ],
        pagination: {
          hasNextPage: false,
        },
      };

      nock("https://api.samsara.com")
        .get("/fleet/vehicles")
        .reply(200, mockVehicles);

      const result = await samsaraService.getVehicles();

      expect(result.success).toBe(true);
      expect(result.data?.data.length).toBe(1);
      expect(result.data?.data[0].id).toBe("vehicle_mock123");
    });

    it("should handle vehicle location updates", async () => {
      const mockLocations = {
        data: [
          {
            vehicleId: "vehicle_mock123",
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
            },
            time: new Date().toISOString(),
            address: "New York, NY",
          },
        ],
      };

      nock("https://api.samsara.com")
        .get("/fleet/vehicles/locations")
        .query({ vehicleIds: "vehicle_mock123" })
        .reply(200, mockLocations);

      const result = await samsaraService.getVehicleLocations(["vehicle_mock123"]);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].vehicleId).toBe("vehicle_mock123");
    });
  });

  describe("Airtable Integration", () => {
    it("should fetch records successfully", async () => {
      const mockRecords = {
        records: [
          {
            id: "rec_mock123",
            createdTime: new Date().toISOString(),
            fields: {
              Name: "Test Record",
              Status: "Active",
            },
          },
        ],
      };

      nock("https://api.airtable.com")
        .get("/v0/base_mock/Table%20Name")
        .reply(200, mockRecords);

      const result = await airtableService.getRecords({
        baseId: "base_mock",
        tableName: "Table Name",
      });

      expect(result.success).toBe(true);
      expect(result.data?.records.length).toBe(1);
      expect(result.data?.records[0].id).toBe("rec_mock123");
    });

    it("should create records in batches", async () => {
      const mockResponse = {
        records: [
          {
            id: "rec_new123",
            createdTime: new Date().toISOString(),
            fields: { Name: "New Record 1" },
          },
          {
            id: "rec_new124",
            createdTime: new Date().toISOString(),
            fields: { Name: "New Record 2" },
          },
        ],
      };

      nock("https://api.airtable.com")
        .post("/v0/base_mock/Table%20Name")
        .reply(200, mockResponse);

      const records = [
        { fields: { Name: "New Record 1" } },
        { fields: { Name: "New Record 2" } },
      ];

      const result = await airtableService.createRecords("base_mock", "Table Name", records);

      expect(result.success).toBe(true);
      expect(result.data?.createdCount).toBe(2);
    });
  });

  describe("Maps Integration", () => {
    it("should geocode address successfully with Mapbox", async () => {
      const mockGeocodingResponse = {
        features: [
          {
            geometry: {
              coordinates: [-74.0060, 40.7128],
            },
            place_name: "New York, NY, United States",
            relevance: 1.0,
            place_type: ["place"],
          },
        ],
      };

      nock("https://api.mapbox.com")
        .get("/geocoding/v5/mapbox.places/New%20York%2C%20NY.json")
        .query({ access_token: "pk.test_mock", limit: 5 })
        .reply(200, mockGeocodingResponse);

      const result = await mapsService.geocodeAddress("New York, NY");

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].coordinates.latitude).toBe(40.7128);
      expect(result.data?.[0].coordinates.longitude).toBe(-74.0060);
    });

    it("should calculate route successfully", async () => {
      const mockRouteResponse = {
        routes: [
          {
            geometry: {
              coordinates: [
                [-74.0060, 40.7128],
                [-74.0059, 40.7129],
              ],
              type: "LineString",
            },
            distance: 1000,
            duration: 300,
            legs: [
              {
                steps: [
                  {
                    distance: 1000,
                    duration: 300,
                    geometry: {
                      coordinates: [
                        [-74.0060, 40.7128],
                        [-74.0059, 40.7129],
                      ],
                      type: "LineString",
                    },
                    maneuver: {
                      type: "depart",
                      instruction: "Head north",
                      location: [-74.0060, 40.7128],
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      nock("https://api.mapbox.com")
        .get("/directions/v5/mapbox/driving/-74.006,40.7128;-74.0059,40.7129")
        .query({
          access_token: "pk.test_mock",
          alternatives: false,
          steps: true,
          geometries: "geojson",
          overview: "full",
        })
        .reply(200, mockRouteResponse);

      const coordinates = [
        { latitude: 40.7128, longitude: -74.0060 },
        { latitude: 40.7129, longitude: -74.0059 },
      ];

      const result = await mapsService.getRoute(coordinates);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].distance).toBe(1000);
      expect(result.data?.[0].duration).toBe(300);
    });
  });

  describe("Webhook Security", () => {
    it("should validate webhook signatures correctly", async () => {
      const payload = '{"test": "data"}';
      const secret = "test_secret";
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      webhookSecurity.registerWebhook("test", {
        provider: "stripe",
        secret,
        tolerance: 300,
      });

      const signature = this.generateStripeSignature(payload, timestamp, secret);
      
      const result = await webhookSecurity.verifyWebhook(
        "test",
        payload,
        `t=${timestamp},v1=${signature}`,
        timestamp
      );

      expect(result.isValid).toBe(true);
    });

    it("should detect replay attacks", async () => {
      const payload = '{"test": "data", "id": "unique_event_123"}';
      const secret = "test_secret";
      const timestamp = Math.floor(Date.now() / 1000).toString();

      webhookSecurity.registerWebhook("test", {
        provider: "stripe",
        secret,
        tolerance: 300,
        enableReplayProtection: true,
      });

      const signature = this.generateStripeSignature(payload, timestamp, secret);

      // First request should succeed
      const result1 = await webhookSecurity.verifyWebhook(
        "test",
        payload,
        `t=${timestamp},v1=${signature}`,
        timestamp
      );

      expect(result1.isValid).toBe(true);
      expect(result1.metadata?.isReplay).toBe(false);

      // Second identical request should detect replay
      const result2 = await webhookSecurity.verifyWebhook(
        "test",
        payload,
        `t=${timestamp},v1=${signature}`,
        timestamp
      );

      expect(result2.isValid).toBe(true);
      expect(result2.metadata?.isReplay).toBe(true);
    });

    it("should enforce rate limiting", async () => {
      const rateLimitResult1 = await webhookSecurity.checkRateLimit("test", "127.0.0.1", {
        windowMinutes: 1,
        maxRequests: 2,
      });

      expect(rateLimitResult1.allowed).toBe(true);
      expect(rateLimitResult1.remainingRequests).toBe(1);

      const rateLimitResult2 = await webhookSecurity.checkRateLimit("test", "127.0.0.1", {
        windowMinutes: 1,
        maxRequests: 2,
      });

      expect(rateLimitResult2.allowed).toBe(true);
      expect(rateLimitResult2.remainingRequests).toBe(0);

      const rateLimitResult3 = await webhookSecurity.checkRateLimit("test", "127.0.0.1", {
        windowMinutes: 1,
        maxRequests: 2,
      });

      expect(rateLimitResult3.allowed).toBe(false);
    });
  });

  describe("External Services Manager", () => {
    it("should initialize all services correctly", async () => {
      await servicesManager.initialize();

      expect(servicesManager.initialized).toBe(true);
      
      const systemHealth = await servicesManager.getSystemHealth();
      expect(systemHealth.serviceCount).toBeGreaterThan(0);
    });

    it("should provide service health monitoring", async () => {
      const allStatuses = await servicesManager.getAllServiceStatuses();
      
      expect(allStatuses.length).toBeGreaterThan(0);
      expect(allStatuses.every(status => 
        ["healthy", "degraded", "unhealthy", "disabled"].includes(status.status)
      )).toBe(true);
    });

    it("should return individual services", () => {
      const stripe = servicesManager.getService<StripeService>("stripe");
      const twilio = servicesManager.getService<TwilioService>("twilio");
      
      expect(stripe).toBeDefined();
      expect(twilio).toBeDefined();
    });
  });

  describe("Circuit Breaker and Error Handling", () => {
    it("should handle service failures gracefully", async () => {
      nock("https://api.stripe.com")
        .post("/v1/payment_intents")
        .times(3)
        .reply(500, { error: { message: "Internal server error" } });

      await expect(
        stripeService.createPaymentIntent(2000, "usd")
      ).rejects.toThrow();

      // Circuit breaker should open after multiple failures
      const health = await stripeService.getServiceHealth();
      expect(["degraded", "unhealthy"]).toContain(health.status);
    });

    it("should implement retry logic with exponential backoff", async () => {
      let attempts = 0;
      
      nock("https://api.twilio.com")
        .post("/2010-04-01/Accounts/AC_test_mock/Messages.json")
        .times(2)
        .reply(() => {
          attempts++;
          return [500, { error: "Service temporarily unavailable" }];
        })
        .post("/2010-04-01/Accounts/AC_test_mock/Messages.json")
        .reply(201, {
          sid: "SM_mock123",
          to: "+1234567890",
          from: "+0987654321",
          body: "Test message",
          status: "queued",
        });

      const result = await twilioService.sendSms(
        "+1234567890",
        "Test message",
        "+0987654321"
      );

      expect(result.success).toBe(true);
      expect(attempts).toBe(2); // Should retry twice before succeeding
    });
  });

  // Helper method to generate Stripe webhook signatures
  private generateStripeSignature(payload: string, timestamp: string, secret: string): string {
    const payloadForSigning = `${timestamp}.${payload}`;
    return crypto
      .createHmac("sha256", secret)
      .update(payloadForSigning)
      .digest("hex");
  }
});
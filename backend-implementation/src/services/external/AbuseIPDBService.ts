/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ABUSEIPDB THREAT INTELLIGENCE SERVICE
 * ============================================================================
 *
 * AbuseIPDB API integration for IP reputation and abuse reporting.
 * Provides real-time IP threat scoring and detailed abuse history.
 *
 * Features:
 * - IP reputation checking with confidence scoring
 * - Detailed abuse history and categorization
 * - Country and ISP information
 * - Usage type detection (datacenter, residential, etc.)
 * - Real-time threat intelligence with caching
 * - Batch IP checking capabilities
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-14
 * Version: 1.0.0
 */

import { BaseExternalService, ExternalServiceConfig, ApiResponse } from "./BaseExternalService";
import { config } from "@/config";
import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";

/**
 * AbuseIPDB API response interfaces
 */
export interface AbuseIPDBReport {
  ip: string;
  abuseConfidencePercentage: number;
  countryCode: string;
  usageType: string;
  isp: string;
  domain: string;
  totalReports: number;
  numDistinctUsers: number;
  lastReportedAt: string;
  categories: number[];
  isPublic: boolean;
  ipVersion: number;
  isWhitelisted: boolean;
  whitelistedBy: string[];
}

export interface AbuseIPDBBatchResult {
  ip: string;
  abuseConfidencePercentage: number;
  countryCode: string;
  usageType: string;
  lastReportedAt: string;
}

export interface ThreatIntelligenceResult {
  target: string;
  type: "ip";
  threatScore: number; // 0-100 (abuse confidence percentage)
  malicious: boolean;
  detections: number;
  totalScans: number;
  vendors: string[];
  metadata: Record<string, any>;
  timestamp: Date;
  source: "abuseipdb";
}

/**
 * AbuseIPDB threat intelligence service
 */
class AbuseIPDBService extends BaseExternalService {
  private readonly cachePrefix = "abuseipdb";
  private readonly cacheTTL = 3600; // 1 hour
  private readonly maliciousThreshold = 75; // Confidence percentage threshold

  constructor() {
    if (!config.threatIntelligence.abuseIPDB.apiKey) {
      throw new Error("AbuseIPDB API key is required");
    }

    const serviceConfig: ExternalServiceConfig = {
      serviceName: "AbuseIPDB",
      baseURL: config.threatIntelligence.abuseIPDB.baseUrl,
      apiKey: config.threatIntelligence.abuseIPDB.apiKey,
      timeout: 15000,
      retryAttempts: 3,
      retryDelay: 2000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      rateLimit: {
        requests: 1000, // Daily limit for free tier
        window: 86400, // per day
      },
      headers: {
        "Key": config.threatIntelligence.abuseIPDB.apiKey,
        "Accept": "application/json",
      },
    };

    super(serviceConfig);
    logger.info("AbuseIPDB threat intelligence service initialized");
  }

  /**
   * Get authentication header
   */
  protected getAuthHeader(): string {
    return `Bearer ${this.config.apiKey}`;
  }

  /**
   * Check IP reputation
   */
  public async checkIPReputation(
    ip: string,
    maxAgeInDays: number = 90,
    verbose: boolean = true
  ): Promise<ThreatIntelligenceResult> {
    const cacheKey = `${this.cachePrefix}:ip:${ip}:${maxAgeInDays}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("AbuseIPDB IP reputation cache hit", { ip });
        return JSON.parse(cached);
      }

      logger.info("Checking IP reputation with AbuseIPDB", { ip, maxAgeInDays });

      const params = {
        ipAddress: ip,
        maxAgeInDays,
        verbose: verbose ? "true" : "false",
      };

      const response = await this.get<AbuseIPDBReport>("/check", params);

      if (!response.success || !response.data) {
        throw new Error("Failed to get IP reputation from AbuseIPDB");
      }

      const result = this.parseIPResponse(response.data);

      // Cache the result
      await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(result));

      logger.info("AbuseIPDB IP reputation check completed", {
        ip,
        threatScore: result.threatScore,
        malicious: result.malicious,
        abuseConfidence: response.data.abuseConfidencePercentage,
        totalReports: response.data.totalReports,
      });

      return result;
    } catch (error) {
      logger.error("AbuseIPDB IP reputation check failed", {
        ip,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Batch check multiple IPs
   */
  public async batchCheckIPs(ips: string[], maxAgeInDays: number = 90): Promise<ThreatIntelligenceResult[]> {
    const batchSize = 100; // AbuseIPDB batch limit
    const results: ThreatIntelligenceResult[] = [];
    
    try {
      // Process in batches
      for (let i = 0; i < ips.length; i += batchSize) {
        const batch = ips.slice(i, i + batchSize);
        
        logger.info("Processing IP batch with AbuseIPDB", {
          batchSize: batch.length,
          batchIndex: Math.floor(i / batchSize) + 1,
          totalBatches: Math.ceil(ips.length / batchSize),
        });

        const params = {
          ipAddress: batch.join(","),
          maxAgeInDays,
          plaintext: "true",
        };

        const response = await this.get<AbuseIPDBBatchResult[]>("/check-block", params);

        if (!response.success || !response.data) {
          logger.warn("Batch IP check failed for batch", { batch: i / batchSize + 1 });
          continue;
        }

        // Process batch results
        const batchResults = Array.isArray(response.data) 
          ? response.data.map(item => this.parseBatchIPResponse(item))
          : [];

        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + batchSize < ips.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      logger.info("AbuseIPDB batch IP check completed", {
        totalIPs: ips.length,
        processedResults: results.length,
        maliciousCount: results.filter(r => r.malicious).length,
      });

      return results;
    } catch (error) {
      logger.error("AbuseIPDB batch IP check failed", {
        error: error.message,
        totalIPs: ips.length,
      });
      throw error;
    }
  }

  /**
   * Report abusive IP
   */
  public async reportAbusiveIP(
    ip: string,
    categories: number[],
    comment: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info("Reporting abusive IP to AbuseIPDB", { ip, categories });

      const data = {
        ip,
        categories: categories.join(","),
        comment,
      };

      const response = await this.post<any>("/report", data);

      if (!response.success) {
        throw new Error("Failed to report IP to AbuseIPDB");
      }

      logger.info("Successfully reported abusive IP to AbuseIPDB", { ip });

      return {
        success: true,
        message: "IP reported successfully",
      };
    } catch (error) {
      logger.error("Failed to report abusive IP to AbuseIPDB", {
        ip,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get blacklist
   */
  public async getBlacklist(
    confidenceMinimum: number = 75,
    limit: number = 10000
  ): Promise<string[]> {
    const cacheKey = `${this.cachePrefix}:blacklist:${confidenceMinimum}:${limit}`;
    
    try {
      // Check cache first (shorter TTL for blacklists)
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("AbuseIPDB blacklist cache hit", { confidenceMinimum, limit });
        return JSON.parse(cached);
      }

      logger.info("Fetching blacklist from AbuseIPDB", { confidenceMinimum, limit });

      const params = {
        confidenceMinimum,
        limit,
        plaintext: "true",
      };

      const response = await this.get<string>("/blacklist", params);

      if (!response.success || !response.data) {
        throw new Error("Failed to get blacklist from AbuseIPDB");
      }

      // Parse the plaintext response (one IP per line)
      const blacklist = response.data
        .split("\n")
        .filter(ip => ip.trim() && this.isValidIP(ip.trim()));

      // Cache for 30 minutes (blacklists change frequently)
      await redisClient.setex(cacheKey, 1800, JSON.stringify(blacklist));

      logger.info("AbuseIPDB blacklist fetched successfully", {
        totalIPs: blacklist.length,
        confidenceMinimum,
      });

      return blacklist;
    } catch (error) {
      logger.error("Failed to fetch AbuseIPDB blacklist", {
        error: error.message,
        confidenceMinimum,
        limit,
      });
      throw error;
    }
  }

  /**
   * Check if IP is in blacklist
   */
  public async isIPBlacklisted(ip: string, confidenceMinimum: number = 75): Promise<boolean> {
    try {
      const blacklist = await this.getBlacklist(confidenceMinimum);
      return blacklist.includes(ip);
    } catch (error) {
      logger.error("Failed to check if IP is blacklisted", {
        ip,
        error: error.message,
      });
      return false; // Default to false if check fails
    }
  }

  /**
   * Parse IP response data
   */
  private parseIPResponse(data: AbuseIPDBReport): ThreatIntelligenceResult {
    const threatScore = data.abuseConfidencePercentage;
    const malicious = threatScore >= this.maliciousThreshold;

    return {
      target: data.ip,
      type: "ip",
      threatScore,
      malicious,
      detections: data.totalReports,
      totalScans: data.totalReports, // Use total reports as scan count
      vendors: ["AbuseIPDB"], // Single vendor
      metadata: {
        countryCode: data.countryCode,
        usageType: data.usageType,
        isp: data.isp,
        domain: data.domain,
        numDistinctUsers: data.numDistinctUsers,
        lastReportedAt: data.lastReportedAt,
        categories: data.categories,
        isPublic: data.isPublic,
        ipVersion: data.ipVersion,
        isWhitelisted: data.isWhitelisted,
        whitelistedBy: data.whitelistedBy,
      },
      timestamp: new Date(),
      source: "abuseipdb",
    };
  }

  /**
   * Parse batch IP response data
   */
  private parseBatchIPResponse(data: AbuseIPDBBatchResult): ThreatIntelligenceResult {
    const threatScore = data.abuseConfidencePercentage;
    const malicious = threatScore >= this.maliciousThreshold;

    return {
      target: data.ip,
      type: "ip",
      threatScore,
      malicious,
      detections: 0, // Batch responses don't include total reports
      totalScans: 0,
      vendors: ["AbuseIPDB"],
      metadata: {
        countryCode: data.countryCode,
        usageType: data.usageType,
        lastReportedAt: data.lastReportedAt,
      },
      timestamp: new Date(),
      source: "abuseipdb",
    };
  }

  /**
   * Validate IP address format
   */
  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Get abuse categories mapping
   */
  public getAbuseCategories(): Record<number, string> {
    return {
      1: "DNS Compromise",
      2: "DNS Poisoning",
      3: "Fraud Orders",
      4: "DDoS Attack",
      5: "FTP Brute-Force",
      6: "Ping of Death",
      7: "Phishing",
      8: "Fraud VoIP",
      9: "Open Proxy",
      10: "Web Spam",
      11: "Email Spam",
      12: "Blog Spam",
      13: "VPN IP",
      14: "Port Scan",
      15: "Hacking",
      16: "SQL Injection",
      17: "Spoofing",
      18: "Brute-Force",
      19: "Bad Web Bot",
      20: "Exploited Host",
      21: "Web App Attack",
      22: "SSH",
      23: "IoT Targeted",
    };
  }

  /**
   * Get threat intelligence summary
   */
  public async getThreatSummary(): Promise<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    dailyQuota: {
      used: number;
      limit: number;
      remaining: number;
    };
    cacheStats: {
      hits: number;
      misses: number;
      hitRate: number;
    };
  }> {
    try {
      const healthStatus = await this.getHealthStatus();
      
      // Get cache statistics
      const cacheKeys = await redisClient.keys(`${this.cachePrefix}:*`);
      const cacheStats = {
        hits: 0, // Would need to track this separately
        misses: 0,
        hitRate: 0,
      };

      return {
        service: "AbuseIPDB",
        status: healthStatus.status,
        dailyQuota: {
          used: 0, // Would need to track API usage
          limit: 1000, // Standard free tier limit
          remaining: 1000,
        },
        cacheStats,
      };
    } catch (error) {
      logger.error("Failed to get AbuseIPDB threat summary", {
        error: error.message,
      });
      
      return {
        service: "AbuseIPDB",
        status: "unhealthy",
        dailyQuota: {
          used: 0,
          limit: 1000,
          remaining: 1000,
        },
        cacheStats: {
          hits: 0,
          misses: 0,
          hitRate: 0,
        },
      };
    }
  }
}

// Export singleton instance
export const abuseIPDBService = new AbuseIPDBService();
export default AbuseIPDBService;
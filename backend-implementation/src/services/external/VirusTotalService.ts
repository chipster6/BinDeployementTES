/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - VIRUSTOTAL THREAT INTELLIGENCE SERVICE
 * ============================================================================
 *
 * VirusTotal API integration for comprehensive threat analysis.
 * Provides IP reputation, domain analysis, file hash checking, and URL scanning.
 *
 * Features:
 * - IP reputation checking with detailed analysis
 * - Domain reputation and security analysis
 * - File hash reputation checking for malware detection
 * - URL analysis for phishing and malware detection
 * - Real-time threat intelligence with caching
 * - Rate limiting compliance with VirusTotal API
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
 * VirusTotal API response interfaces
 */
export interface VirusTotalIPReport {
  ip: string;
  detections: number;
  totalScans: number;
  maliciousVendors: string[];
  asn: string;
  country: string;
  owner: string;
  resolutions: Array<{
    hostname: string;
    lastResolved: string;
  }>;
  downloadedFiles: Array<{
    sha256: string;
    positives: number;
    total: number;
    date: string;
  }>;
}

export interface VirusTotalDomainReport {
  domain: string;
  detections: number;
  totalScans: number;
  maliciousVendors: string[];
  categories: string[];
  subdomains: string[];
  resolutions: Array<{
    ip: string;
    lastResolved: string;
  }>;
}

export interface VirusTotalFileReport {
  sha256: string;
  md5: string;
  sha1: string;
  detections: number;
  totalScans: number;
  maliciousVendors: string[];
  firstSeen: string;
  lastSeen: string;
  names: string[];
  size: number;
  type: string;
}

export interface VirusTotalURLReport {
  url: string;
  detections: number;
  totalScans: number;
  maliciousVendors: string[];
  scanDate: string;
  permalink: string;
  filescan_id: string;
}

export interface ThreatIntelligenceResult {
  target: string;
  type: "ip" | "domain" | "file" | "url";
  threatScore: number; // 0-100
  malicious: boolean;
  detections: number;
  totalScans: number;
  vendors: string[];
  metadata: Record<string, any>;
  timestamp: Date;
  source: "virustotal";
}

/**
 * VirusTotal threat intelligence service
 */
class VirusTotalService extends BaseExternalService {
  private readonly cachePrefix = "virustotal";
  private readonly cacheTTL = 3600; // 1 hour

  constructor() {
    if (!config.threatIntelligence.virusTotal.apiKey) {
      throw new Error("VirusTotal API key is required");
    }

    const serviceConfig: ExternalServiceConfig = {
      serviceName: "VirusTotal",
      baseURL: config.threatIntelligence.virusTotal.v3BaseUrl,
      apiKey: config.threatIntelligence.virusTotal.apiKey,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 2000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      rateLimit: {
        requests: 4, // VirusTotal API limit
        window: 60, // per minute
      },
      headers: {
        "x-apikey": config.threatIntelligence.virusTotal.apiKey,
      },
    };

    super(serviceConfig);
    logger.info("VirusTotal threat intelligence service initialized");
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
  public async checkIPReputation(ip: string): Promise<ThreatIntelligenceResult> {
    const cacheKey = `${this.cachePrefix}:ip:${ip}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("VirusTotal IP reputation cache hit", { ip });
        return JSON.parse(cached);
      }

      logger.info("Checking IP reputation with VirusTotal", { ip });

      const response = await this.get<any>(`/ip_addresses/${ip}`);

      if (!response.success || !response.data) {
        throw new Error("Failed to get IP reputation from VirusTotal");
      }

      const result = this.parseIPResponse(ip, response.data);

      // Cache the result
      await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(result));

      logger.info("VirusTotal IP reputation check completed", {
        ip,
        threatScore: result.threatScore,
        malicious: result.malicious,
        detections: result.detections,
      });

      return result;
    } catch (error: unknown) {
      logger.error("VirusTotal IP reputation check failed", {
        ip,
        error: error instanceof Error ? error?.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check domain reputation
   */
  public async checkDomainReputation(domain: string): Promise<ThreatIntelligenceResult> {
    const cacheKey = `${this.cachePrefix}:domain:${domain}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("VirusTotal domain reputation cache hit", { domain });
        return JSON.parse(cached);
      }

      logger.info("Checking domain reputation with VirusTotal", { domain });

      const response = await this.get<any>(`/domains/${domain}`);

      if (!response.success || !response.data) {
        throw new Error("Failed to get domain reputation from VirusTotal");
      }

      const result = this.parseDomainResponse(domain, response.data);

      // Cache the result
      await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(result));

      logger.info("VirusTotal domain reputation check completed", {
        domain,
        threatScore: result.threatScore,
        malicious: result.malicious,
        detections: result.detections,
      });

      return result;
    } catch (error: unknown) {
      logger.error("VirusTotal domain reputation check failed", {
        domain,
        error: error instanceof Error ? error?.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check file hash reputation
   */
  public async checkFileHashReputation(hash: string): Promise<ThreatIntelligenceResult> {
    const cacheKey = `${this.cachePrefix}:file:${hash}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("VirusTotal file hash reputation cache hit", { hash });
        return JSON.parse(cached);
      }

      logger.info("Checking file hash reputation with VirusTotal", { hash });

      const response = await this.get<any>(`/files/${hash}`);

      if (!response.success || !response.data) {
        throw new Error("Failed to get file reputation from VirusTotal");
      }

      const result = this.parseFileResponse(hash, response.data);

      // Cache the result
      await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(result));

      logger.info("VirusTotal file hash reputation check completed", {
        hash,
        threatScore: result.threatScore,
        malicious: result.malicious,
        detections: result.detections,
      });

      return result;
    } catch (error: unknown) {
      logger.error("VirusTotal file hash reputation check failed", {
        hash,
        error: error instanceof Error ? error?.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze URL for threats
   */
  public async analyzeURL(url: string): Promise<ThreatIntelligenceResult> {
    const urlId = Buffer.from(url).toString("base64").replace(/=/g, "");
    const cacheKey = `${this.cachePrefix}:url:${urlId}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("VirusTotal URL analysis cache hit", { url });
        return JSON.parse(cached);
      }

      logger.info("Analyzing URL with VirusTotal", { url });

      const response = await this.get<any>(`/urls/${urlId}`);

      if (!response.success || !response.data) {
        throw new Error("Failed to analyze URL with VirusTotal");
      }

      const result = this.parseURLResponse(url, response.data);

      // Cache the result
      await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(result));

      logger.info("VirusTotal URL analysis completed", {
        url,
        threatScore: result.threatScore,
        malicious: result.malicious,
        detections: result.detections,
      });

      return result;
    } catch (error: unknown) {
      logger.error("VirusTotal URL analysis failed", {
        url,
        error: error instanceof Error ? error?.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Batch check multiple indicators
   */
  public async batchCheck(indicators: Array<{
    value: string;
    type: "ip" | "domain" | "file" | "url";
  }>): Promise<ThreatIntelligenceResult[]> {
    const results: ThreatIntelligenceResult[] = [];
    
    // Process in batches to respect rate limits
    const batchSize = 4;
    for (let i = 0; i < indicators.length; i += batchSize) {
      const batch = indicators.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (indicator) => {
        try {
          switch (indicator.type) {
            case "ip":
              return await this.checkIPReputation(indicator.value);
            case "domain":
              return await this.checkDomainReputation(indicator.value);
            case "file":
              return await this.checkFileHashReputation(indicator.value);
            case "url":
              return await this.analyzeURL(indicator.value);
            default:
              throw new Error(`Unsupported indicator type: ${indicator.type}`);
          }
        } catch (error: unknown) {
          logger.error("Batch indicator check failed", {
            indicator,
            error: error instanceof Error ? error?.message : String(error),
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean));

      // Add delay between batches to respect rate limits
      if (i + batchSize < indicators.length) {
        await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
      }
    }

    return results;
  }

  /**
   * Parse IP response data
   */
  private parseIPResponse(ip: string, data: any): ThreatIntelligenceResult {
    const attributes = data?.attributes || {};
    const stats = attributes?.last_analysis_stats || {};
    const detections = stats?.malicious || 0;
    const totalScans = Object.values(stats).reduce((sum: number, count: any) => sum + count, 0);
    
    const vendors = Object.entries(attributes?.last_analysis_results || {})
      .filter(([, result]: [string, any]) => result.category === "malicious")
      .map(([vendor]) => vendor);

    const threatScore = totalScans > 0 ? Math.round((detections / totalScans) * 100) : 0;

    return {
      target: ip,
      type: "ip",
      threatScore,
      malicious: detections > 0,
      detections,
      totalScans,
      vendors,
      timestamp: new Date(),
      source: "virustotal",
    };
  }

  /**
   * Parse domain response data
   */
  private parseDomainResponse(domain: string, data: any): ThreatIntelligenceResult {
    const attributes = data?.attributes || {};
    const stats = attributes?.last_analysis_stats || {};
    const detections = stats?.malicious || 0;
    const totalScans = Object.values(stats).reduce((sum: number, count: any) => sum + count, 0);
    
    const vendors = Object.entries(attributes?.last_analysis_results || {})
      .filter(([, result]: [string, any]) => result.category === "malicious")
      .map(([vendor]) => vendor);

    const threatScore = totalScans > 0 ? Math.round((detections / totalScans) * 100) : 0;

    return {
      target: domain,
      type: "domain",
      threatScore,
      malicious: detections > 0,
      detections,
      totalScans,
      vendors,
      timestamp: new Date(),
      source: "virustotal",
    };
  }

  /**
   * Parse file response data
   */
  private parseFileResponse(hash: string, data: any): ThreatIntelligenceResult {
    const attributes = data?.attributes || {};
    const stats = attributes?.last_analysis_stats || {};
    const detections = stats?.malicious || 0;
    const totalScans = Object.values(stats).reduce((sum: number, count: any) => sum + count, 0);
    
    const vendors = Object.entries(attributes?.last_analysis_results || {})
      .filter(([, result]: [string, any]) => result.category === "malicious")
      .map(([vendor]) => vendor);

    const threatScore = totalScans > 0 ? Math.round((detections / totalScans) * 100) : 0;

    return {
      target: hash,
      type: "file",
      threatScore,
      malicious: detections > 0,
      detections,
      totalScans,
      vendors,
      timestamp: new Date(),
      source: "virustotal",
    };
  }

  /**
   * Parse URL response data
   */
  private parseURLResponse(url: string, data: any): ThreatIntelligenceResult {
    const attributes = data?.attributes || {};
    const stats = attributes?.last_analysis_stats || {};
    const detections = stats?.malicious || 0;
    const totalScans = Object.values(stats).reduce((sum: number, count: any) => sum + count, 0);
    
    const vendors = Object.entries(attributes?.last_analysis_results || {})
      .filter(([, result]: [string, any]) => result.category === "malicious")
      .map(([vendor]) => vendor);

    const threatScore = totalScans > 0 ? Math.round((detections / totalScans) * 100) : 0;

    return {
      target: url,
      type: "url",
      threatScore,
      malicious: detections > 0,
      detections,
      totalScans,
      vendors,
      timestamp: new Date(),
      source: "virustotal",
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
        service: "VirusTotal",
        status: healthStatus.status,
        dailyQuota: {
          used: 0, // Would need to track API usage
          limit: 500, // Standard free tier limit
          remaining: 500,
        },
        cacheStats,
      };
    } catch (error: unknown) {
      logger.error("Failed to get VirusTotal threat summary", {
        error: error instanceof Error ? error?.message : String(error),
      });
      
      return {
        service: "VirusTotal",
        status: "unhealthy",
        dailyQuota: {
          used: 0,
          limit: 500,
          remaining: 500,
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
export const virusTotalService = new VirusTotalService();
export default VirusTotalService;
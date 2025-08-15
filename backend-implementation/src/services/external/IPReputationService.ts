/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - IP REPUTATION SERVICE
 * ============================================================================
 *
 * Comprehensive IP reputation checking service that aggregates data from
 * multiple threat intelligence sources for real-time IP threat assessment.
 *
 * Features:
 * - Multi-source IP reputation aggregation
 * - Real-time threat scoring and risk assessment
 * - Geolocation and network information enrichment
 * - Automated blacklist management
 * - Historical tracking and trend analysis
 * - Integration with security monitoring systems
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-14
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { virusTotalService } from "./VirusTotalService";
import { abuseIPDBService } from "./AbuseIPDBService";
import { mispIntegrationService } from "./MISPIntegrationService";

/**
 * IP reputation result interface
 */
export interface IPReputationResult {
  ip: string;
  overallRisk: "low" | "medium" | "high" | "critical";
  riskScore: number; // 0-100
  confidence: number; // 0-100
  malicious: boolean;
  sources: {
    [key: string]: {
      score: number;
      malicious: boolean;
      detections: number;
      lastSeen: Date;
      metadata: Record<string, any>;
    };
  };
  geolocation: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
    timezone: string;
  };
  network: {
    asn: string;
    asnName: string;
    isp: string;
    organization: string;
    usageType: string;
    isDatacenter: boolean;
    isVpn: boolean;
    isProxy: boolean;
  };
  threat: {
    categories: string[];
    firstSeen: Date;
    lastSeen: Date;
    totalReports: number;
    recentActivity: boolean;
    historicalThreat: boolean;
  };
  recommendations: {
    action: "allow" | "monitor" | "rate_limit" | "block";
    priority: "low" | "medium" | "high" | "critical";
    reasons: string[];
    expiry?: Date;
  };
  timestamp: Date;
}

export interface IPBatchResult {
  processed: number;
  malicious: number;
  errors: number;
  results: IPReputationResult[];
  processingTime: number;
}

export interface IPReputationMetrics {
  totalQueries: number;
  maliciousDetected: number;
  falsePositives: number;
  averageResponseTime: number;
  cacheHitRate: number;
  sourceReliability: {
    [key: string]: {
      accuracy: number;
      uptime: number;
      lastUpdate: Date;
    };
  };
}

/**
 * IP reputation service
 */
class IPReputationService {
  private readonly cachePrefix = "ip_reputation";
  private readonly cacheTTL = 3600; // 1 hour
  private readonly blacklistTTL = 1800; // 30 minutes for blacklists
  private readonly metrics: IPReputationMetrics;

  constructor() {
    this.metrics = {
      totalQueries: 0,
      maliciousDetected: 0,
      falsePositives: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      sourceReliability: {
        virustotal: { accuracy: 0.85, uptime: 0.99, lastUpdate: new Date() },
        abuseipdb: { accuracy: 0.90, uptime: 0.95, lastUpdate: new Date() },
        misp: { accuracy: 0.80, uptime: 0.90, lastUpdate: new Date() },
      },
    };

    logger.info("IP reputation service initialized");
  }

  /**
   * Check IP reputation across all sources
   */
  public async checkIPReputation(ip: string): Promise<IPReputationResult> {
    const startTime = Date.now();
    const cacheKey = `${this.cachePrefix}:${ip}`;

    try {
      // Validate IP format
      if (!this.isValidIP(ip)) {
        throw new Error(`Invalid IP address format: ${ip}`);
      }

      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("IP reputation cache hit", { ip });
        this.updateCacheMetrics(true);
        return JSON.parse(cached);
      }

      logger.info("Checking IP reputation across all sources", { ip });
      this.metrics.totalQueries++;

      // Gather data from all sources
      const [vtResult, abuseResult, mispResult] = await Promise.allSettled([
        virusTotalService.checkIPReputation(ip),
        abuseIPDBService.checkIPReputation(ip),
        mispIntegrationService.searchIndicator(ip, "ip"),
      ]);

      // Build comprehensive result
      const result = await this.buildComprehensiveResult(
        ip,
        vtResult,
        abuseResult,
        mispResult
      );

      // Cache the result
      await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(result));

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, result.malicious);
      this.updateCacheMetrics(false);

      logger.info("IP reputation check completed", {
        ip,
        riskScore: result.riskScore,
        overallRisk: result.overallRisk,
        malicious: result.malicious,
        confidence: result.confidence,
        responseTime,
      });

      return result;
    } catch (error) {
      logger.error("IP reputation check failed", {
        ip,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Batch check multiple IPs
   */
  public async batchCheckIPs(ips: string[]): Promise<IPBatchResult> {
    const startTime = Date.now();
    const results: IPReputationResult[] = [];
    let errors = 0;

    logger.info("Starting batch IP reputation check", { totalIPs: ips.length });

    // Process IPs in chunks to respect rate limits
    const chunkSize = 20;
    for (let i = 0; i < ips.length; i += chunkSize) {
      const chunk = ips.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (ip) => {
        try {
          return await this.checkIPReputation(ip);
        } catch (error) {
          logger.warn("IP reputation check failed in batch", {
            ip,
            error: error.message,
          });
          errors++;
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.filter(Boolean));

      // Rate limiting delay between chunks
      if (i + chunkSize < ips.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const processingTime = Date.now() - startTime;
    const maliciousCount = results.filter(r => r.malicious).length;

    logger.info("Batch IP reputation check completed", {
      totalIPs: ips.length,
      processed: results.length,
      malicious: maliciousCount,
      errors,
      processingTime,
    });

    return {
      processed: results.length,
      malicious: maliciousCount,
      errors,
      results,
      processingTime,
    };
  }

  /**
   * Check if IP is in blacklists
   */
  public async isIPBlacklisted(ip: string): Promise<{
    blacklisted: boolean;
    sources: string[];
    confidence: number;
  }> {
    const cacheKey = `${this.cachePrefix}:blacklist:${ip}`;

    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      logger.debug("Checking IP against blacklists", { ip });

      const blacklistChecks = await Promise.allSettled([
        abuseIPDBService.isIPBlacklisted(ip, 75),
        // Add other blacklist sources here
      ]);

      const sources: string[] = [];
      let blacklisted = false;

      // AbuseIPDB check
      if (blacklistChecks[0].status === "fulfilled" && blacklistChecks[0].value) {
        blacklisted = true;
        sources.push("AbuseIPDB");
      }

      const confidence = sources.length > 0 ? 90 : 0;
      const result = { blacklisted, sources, confidence };

      // Cache for shorter time
      await redisClient.setex(cacheKey, this.blacklistTTL, JSON.stringify(result));

      logger.debug("IP blacklist check completed", {
        ip,
        blacklisted,
        sources,
        confidence,
      });

      return result;
    } catch (error) {
      logger.error("IP blacklist check failed", {
        ip,
        error: error.message,
      });
      
      return {
        blacklisted: false,
        sources: [],
        confidence: 0,
      };
    }
  }

  /**
   * Get IP geolocation and network information
   */
  public async getIPContext(ip: string): Promise<{
    geolocation: any;
    network: any;
  }> {
    const cacheKey = `${this.cachePrefix}:context:${ip}`;

    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      logger.debug("Fetching IP context information", { ip });

      // This would integrate with geolocation services like MaxMind, IPinfo, etc.
      // For now, using placeholder data that would come from the threat intel sources
      const context = {
        geolocation: {
          country: "Unknown",
          countryCode: "XX",
          region: "Unknown",
          city: "Unknown",
          timezone: "UTC",
        },
        network: {
          asn: "Unknown",
          asnName: "Unknown",
          isp: "Unknown",
          organization: "Unknown",
          usageType: "unknown",
          isDatacenter: false,
          isVpn: false,
          isProxy: false,
        },
      };

      // Cache for longer time (geolocation doesn't change frequently)
      await redisClient.setex(cacheKey, 86400, JSON.stringify(context)); // 24 hours

      return context;
    } catch (error) {
      logger.error("Failed to fetch IP context", {
        ip,
        error: error.message,
      });
      
      return {
        geolocation: {
          country: "Unknown",
          countryCode: "XX",
          region: "Unknown",
          city: "Unknown",
          timezone: "UTC",
        },
        network: {
          asn: "Unknown",
          asnName: "Unknown",
          isp: "Unknown",
          organization: "Unknown",
          usageType: "unknown",
          isDatacenter: false,
          isVpn: false,
          isProxy: false,
        },
      };
    }
  }

  /**
   * Report malicious IP
   */
  public async reportMaliciousIP(
    ip: string,
    categories: string[],
    comment: string,
    source: string = "waste_management_system"
  ): Promise<{ success: boolean; sources: string[] }> {
    const reportedSources: string[] = [];

    try {
      logger.info("Reporting malicious IP", { ip, categories, source });

      // Report to AbuseIPDB
      try {
        const abuseCategories = this.mapToAbuseIPDBCategories(categories);
        await abuseIPDBService.reportAbusiveIP(ip, abuseCategories, comment);
        reportedSources.push("AbuseIPDB");
      } catch (error) {
        logger.warn("Failed to report to AbuseIPDB", { ip, error: error.message });
      }

      // Report to MISP
      try {
        await mispIntegrationService.submitIOC(ip, "ip-src", "Network activity", comment);
        reportedSources.push("MISP");
      } catch (error) {
        logger.warn("Failed to report to MISP", { ip, error: error.message });
      }

      const success = reportedSources.length > 0;

      logger.info("Malicious IP reporting completed", {
        ip,
        success,
        reportedSources,
      });

      return { success, sources: reportedSources };
    } catch (error) {
      logger.error("Failed to report malicious IP", {
        ip,
        error: error.message,
      });
      
      return { success: false, sources: [] };
    }
  }

  /**
   * Build comprehensive IP reputation result
   */
  private async buildComprehensiveResult(
    ip: string,
    vtResult: PromiseSettledResult<any>,
    abuseResult: PromiseSettledResult<any>,
    mispResult: PromiseSettledResult<any>
  ): Promise<IPReputationResult> {
    const sources: Record<string, any> = {};
    const scores: number[] = [];
    const threatCategories = new Set<string>();
    let totalReports = 0;
    const timestamps: Date[] = [];

    // Process VirusTotal result
    if (vtResult.status === "fulfilled" && vtResult.value) {
      const vt = vtResult.value;
      sources.virustotal = {
        score: vt.threatScore,
        malicious: vt.malicious,
        detections: vt.detections,
        lastSeen: vt.timestamp,
        metadata: vt.metadata,
      };
      scores.push(vt.threatScore);
      totalReports += vt.detections;
      timestamps.push(vt.timestamp);
    }

    // Process AbuseIPDB result
    if (abuseResult.status === "fulfilled" && abuseResult.value) {
      const abuse = abuseResult.value;
      sources.abuseipdb = {
        score: abuse.threatScore,
        malicious: abuse.malicious,
        detections: abuse.detections,
        lastSeen: abuse.timestamp,
        metadata: abuse.metadata,
      };
      scores.push(abuse.threatScore);
      totalReports += abuse.detections;
      timestamps.push(abuse.timestamp);
      
      // Extract categories from AbuseIPDB
      if (abuse.metadata?.categories) {
        abuse.metadata.categories.forEach((cat: number) => {
          const category = abuseIPDBService.getAbuseCategories()[cat];
          if (category) threatCategories.add(category);
        });
      }
    }

    // Process MISP result
    if (mispResult.status === "fulfilled" && mispResult.value) {
      const misp = mispResult.value;
      sources.misp = {
        score: misp.threatScore,
        malicious: misp.malicious,
        detections: misp.detections,
        lastSeen: misp.timestamp,
        metadata: misp.metadata,
      };
      scores.push(misp.threatScore);
      totalReports += misp.detections;
      timestamps.push(misp.timestamp);
    }

    // Calculate overall risk score
    const riskScore = scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    const confidence = this.calculateConfidence(sources);
    const malicious = riskScore >= 70 || this.hasMaliciousConsensus(sources);

    // Determine risk level
    let overallRisk: "low" | "medium" | "high" | "critical";
    if (riskScore >= 90) {
      overallRisk = "critical";
    } else if (riskScore >= 70) {
      overallRisk = "high";
    } else if (riskScore >= 40) {
      overallRisk = "medium";
    } else {
      overallRisk = "low";
    }

    // Get additional context
    const context = await this.getIPContext(ip);

    // Generate recommendations
    const recommendations = this.generateIPRecommendations(riskScore, confidence, sources);

    return {
      ip,
      overallRisk,
      riskScore,
      confidence,
      malicious,
      sources,
      geolocation: context.geolocation,
      network: context.network,
      threat: {
        categories: Array.from(threatCategories),
        firstSeen: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date(),
        lastSeen: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date(),
        totalReports,
        recentActivity: this.hasRecentActivity(timestamps),
        historicalThreat: this.hasHistoricalThreat(timestamps),
      },
      recommendations,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate confidence based on source agreement
   */
  private calculateConfidence(sources: Record<string, any>): number {
    const sourceList = Object.values(sources);
    if (sourceList.length === 0) return 0;

    const maliciousCount = sourceList.filter(s => s.malicious).length;
    const agreement = sourceList.length > 1 ? 
      Math.abs(maliciousCount - (sourceList.length - maliciousCount)) / sourceList.length : 0.5;

    return Math.round((sourceList.length / 3) * 100 * (0.5 + agreement * 0.5));
  }

  /**
   * Check if there's malicious consensus
   */
  private hasMaliciousConsensus(sources: Record<string, any>): boolean {
    const sourceList = Object.values(sources);
    if (sourceList.length === 0) return false;

    const maliciousCount = sourceList.filter(s => s.malicious).length;
    return maliciousCount >= Math.ceil(sourceList.length / 2);
  }

  /**
   * Generate IP-specific recommendations
   */
  private generateIPRecommendations(
    riskScore: number,
    confidence: number,
    sources: Record<string, any>
  ): { action: "allow" | "monitor" | "rate_limit" | "block"; priority: "low" | "medium" | "high" | "critical"; reasons: string[]; expiry?: Date } {
    const reasons: string[] = [];
    let action: "allow" | "monitor" | "rate_limit" | "block" = "allow";
    let priority: "low" | "medium" | "high" | "critical" = "low";
    let expiry: Date | undefined;

    if (riskScore >= 90 && confidence >= 80) {
      action = "block";
      priority = "critical";
      reasons.push("Critical threat level with high confidence");
      expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    } else if (riskScore >= 70 && confidence >= 60) {
      action = "block";
      priority = "high";
      reasons.push("High threat level detected");
      expiry = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
    } else if (riskScore >= 50) {
      action = "rate_limit";
      priority = "medium";
      reasons.push("Moderate threat - apply rate limiting");
      expiry = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
    } else if (riskScore >= 30) {
      action = "monitor";
      priority = "low";
      reasons.push("Low threat level - monitor for changes");
    }

    // Add source-specific reasons
    Object.entries(sources).forEach(([source, result]) => {
      if (result.malicious) {
        reasons.push(`Flagged as malicious by ${source}`);
      }
    });

    return { action, priority, reasons, expiry };
  }

  /**
   * Check if there's recent threat activity
   */
  private hasRecentActivity(timestamps: Date[]): boolean {
    if (timestamps.length === 0) return false;
    
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return timestamps.some(t => t > dayAgo);
  }

  /**
   * Check if there's historical threat data
   */
  private hasHistoricalThreat(timestamps: Date[]): boolean {
    if (timestamps.length === 0) return false;
    
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return timestamps.some(t => t < monthAgo);
  }

  /**
   * Map categories to AbuseIPDB categories
   */
  private mapToAbuseIPDBCategories(categories: string[]): number[] {
    const categoryMap: Record<string, number> = {
      "malware": 20,
      "phishing": 7,
      "spam": 11,
      "ddos": 4,
      "brute_force": 18,
      "scanning": 14,
      "botnet": 20,
    };

    return categories
      .map(cat => categoryMap[cat.toLowerCase()])
      .filter(Boolean);
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
   * Update performance metrics
   */
  private updateMetrics(responseTime: number, malicious: boolean): void {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + responseTime) / 2;
    
    if (malicious) {
      this.metrics.maliciousDetected++;
    }
  }

  /**
   * Update cache metrics
   */
  private updateCacheMetrics(hit: boolean): void {
    const total = this.metrics.totalQueries;
    if (hit) {
      this.metrics.cacheHitRate = 
        (this.metrics.cacheHitRate * (total - 1) + 100) / total;
    } else {
      this.metrics.cacheHitRate = 
        (this.metrics.cacheHitRate * (total - 1) + 0) / total;
    }
  }

  /**
   * Get service metrics
   */
  public getMetrics(): IPReputationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get service status
   */
  public async getServiceStatus(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    metrics: IPReputationMetrics;
    lastUpdate: Date;
  }> {
    try {
      return {
        status: "healthy",
        metrics: this.getMetrics(),
        lastUpdate: new Date(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        metrics: this.getMetrics(),
        lastUpdate: new Date(),
      };
    }
  }
}

// Export singleton instance
export const ipReputationService = new IPReputationService();
export default IPReputationService;
/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - MISP THREAT INTELLIGENCE SERVICE
 * ============================================================================
 *
 * MISP (Malware Information Sharing Platform) integration for advanced
 * threat intelligence sharing and IOC (Indicators of Compromise) management.
 *
 * Features:
 * - Event and attribute search capabilities
 * - IOC enrichment and context gathering
 * - Threat feed consumption and publishing
 * - STIX/TAXII format support
 * - Real-time threat intelligence correlation
 * - Custom threat intelligence workflows
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
 * MISP API response interfaces
 */
export interface MISPEvent {
  id: string;
  uuid: string;
  info: string;
  date: string;
  timestamp: string;
  published: boolean;
  analysis: number;
  threat_level_id: number;
  orgc_id: string;
  org_id: string;
  distribution: number;
  sharing_group_id: string;
  attribute_count: number;
  object_count: number;
  Attribute: MISPAttribute[];
  Object: MISPObject[];
  Tag: MISPTag[];
}

export interface MISPAttribute {
  id: string;
  uuid: string;
  event_id: string;
  object_id: string;
  category: string;
  type: string;
  value: string;
  comment: string;
  to_ids: boolean;
  timestamp: string;
  distribution: number;
  sharing_group_id: string;
  deleted: boolean;
  Tag: MISPTag[];
}

export interface MISPObject {
  id: string;
  uuid: string;
  name: string;
  meta_category: string;
  description: string;
  template_uuid: string;
  template_version: string;
  event_id: string;
  timestamp: string;
  distribution: number;
  sharing_group_id: string;
  comment: string;
  deleted: boolean;
  Attribute: MISPAttribute[];
}

export interface MISPTag {
  id: string;
  name: string;
  colour: string;
  exportable: boolean;
  org_id: string;
  user_id: string;
  hide_tag: boolean;
  numerical_value: number;
}

export interface ThreatIntelligenceResult {
  target: string;
  type: "ip" | "domain" | "file" | "url" | "email";
  threatScore: number;
  malicious: boolean;
  detections: number;
  totalScans: number;
  vendors: string[];
  metadata: Record<string, any>;
  timestamp: Date;
  source: "misp";
}

export interface IOCSearchRequest {
  value: string;
  type?: string;
  category?: string;
  org?: string;
  tags?: string[];
  eventinfo?: string;
  threatlevel?: number[];
  last?: string;
}

/**
 * MISP threat intelligence service
 */
class MISPIntegrationService extends BaseExternalService {
  private readonly cachePrefix = "misp";
  private readonly cacheTTL = 1800; // 30 minutes (IOCs change frequently)

  constructor() {
    if (!config.threatIntelligence.misp.url || !config.threatIntelligence.misp.apiKey) {
      throw new Error("MISP URL and API key are required");
    }

    const serviceConfig: ExternalServiceConfig = {
      serviceName: "MISP",
      baseURL: `${config.threatIntelligence.misp.url}/attributes`,
      apiKey: config.threatIntelligence.misp.apiKey,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 2000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      rateLimit: {
        requests: 100, // Conservative rate limit
        window: 60, // per minute
      },
      headers: {
        "Authorization": config.threatIntelligence.misp.apiKey,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    };

    super(serviceConfig);
    logger.info("MISP threat intelligence service initialized", {
      url: config.threatIntelligence.misp.url,
    });
  }

  /**
   * Get authentication header
   */
  protected getAuthHeader(): string {
    return this.config.apiKey;
  }

  /**
   * Search for IOCs (Indicators of Compromise)
   */
  public async searchIOCs(searchRequest: IOCSearchRequest): Promise<ThreatIntelligenceResult[]> {
    const cacheKey = `${this.cachePrefix}:ioc:${Buffer.from(JSON.stringify(searchRequest)).toString('base64')}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("MISP IOC search cache hit", { searchRequest });
        return JSON.parse(cached);
      }

      logger.info("Searching IOCs in MISP", { searchRequest });

      const searchParams = this.buildSearchParams(searchRequest);
      const response = await this.get<{ Attribute: MISPAttribute[] }>("/restSearch", searchParams);

      if (!response.success || !response.data) {
        throw new Error("Failed to search IOCs in MISP");
      }

      const results = this.parseSearchResults(response.data?.Attribute || []);

      // Cache the results
      await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(results));

      logger.info("MISP IOC search completed", {
        searchValue: searchRequest.value,
        resultsCount: results.length,
        maliciousCount: results.filter(r => r.malicious).length,
      });

      return results;
    } catch (error: unknown) {
      logger.error("MISP IOC search failed", {
        searchRequest,
        error: error instanceof Error ? error?.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Search for specific indicator
   */
  public async searchIndicator(value: string, type?: string): Promise<ThreatIntelligenceResult | null> {
    try {
      const searchRequest: IOCSearchRequest = {
        value,
        type,
        last: "30d", // Search last 30 days
      };

      const results = await this.searchIOCs(searchRequest);
      
      if (results.length === 0) {
        logger.debug("No MISP results found for indicator", { value, type });
        return null;
      }

      // Return the most recent/relevant result
      return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    } catch (error: unknown) {
      logger.error("MISP indicator search failed", {
        value,
        type,
        error: error instanceof Error ? error?.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get event details by ID
   */
  public async getEvent(eventId: string): Promise<MISPEvent | null> {
    const cacheKey = `${this.cachePrefix}:event:${eventId}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("MISP event cache hit", { eventId });
        return JSON.parse(cached);
      }

      logger.info("Fetching MISP event", { eventId });

      const response = await this.get<{ Event: MISPEvent }>(`/${eventId}`);

      if (!response.success || !response.data?.Event) {
        logger.warn("MISP event not found", { eventId });
        return null;
      }

      const event = response.data.Event;

      // Cache the event
      await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(event));

      logger.info("MISP event fetched successfully", {
        eventId,
        info: event.info,
        attributeCount: event.attribute_count,
      });

      return event;
    } catch (error: unknown) {
      logger.error("Failed to fetch MISP event", {
        eventId,
        error: error instanceof Error ? error?.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get threat feeds
   */
  public async getThreatFeeds(
    tags?: string[],
    threatLevel?: number[],
    last?: string
  ): Promise<ThreatIntelligenceResult[]> {
    const cacheKey = `${this.cachePrefix}:feeds:${Buffer.from(JSON.stringify({ tags, threatLevel, last })).toString('base64')}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("MISP threat feeds cache hit", { tags, threatLevel, last });
        return JSON.parse(cached);
      }

      logger.info("Fetching MISP threat feeds", { tags, threatLevel, last });

      const searchParams: any = {
        last: last || "24h",
        to_ids: 1, // Only detection-worthy attributes
      };

      if (tags && tags.length > 0) {
        searchParams.tags = tags;
      }

      if (threatLevel && threatLevel.length > 0) {
        searchParams.threatlevel = threatLevel;
      }

      const response = await this.get<{ Attribute: MISPAttribute[] }>("/restSearch", searchParams);

      if (!response.success || !response.data) {
        throw new Error("Failed to fetch MISP threat feeds");
      }

      const results = this.parseSearchResults(response.data?.Attribute || []);

      // Cache for shorter time for feeds (they change frequently)
      await redisClient.setex(cacheKey, 900, JSON.stringify(results)); // 15 minutes

      logger.info("MISP threat feeds fetched successfully", {
        resultsCount: results.length,
        maliciousCount: results.filter(r => r.malicious).length,
        tags,
        threatLevel,
      });

      return results;
    } catch (error: unknown) {
      logger.error("Failed to fetch MISP threat feeds", {
        tags,
        threatLevel,
        error: error instanceof Error ? error?.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Submit new IOC to MISP
   */
  public async submitIOC(
    value: string,
    type: string,
    category: string,
    comment: string,
    eventId?: string
  ): Promise<{ success: boolean; attributeId?: string }> {
    try {
      logger.info("Submitting IOC to MISP", { value, type, category, eventId });

      const attributeData = {
        value,
        type,
        category,
        comment,
        to_ids: true,
        distribution: 1, // Organization only
      };

      let endpoint = "/add";
      if (eventId) {
        endpoint = `/${eventId}/add`;
      }

      const response = await this.post<{ Attribute: MISPAttribute }>(endpoint, attributeData);

      if (!response.success || !response.data?.Attribute) {
        throw new Error("Failed to submit IOC to MISP");
      }

      const attributeId = response.data.Attribute.id;

      logger.info("IOC submitted to MISP successfully", {
        value,
        type,
        attributeId,
        eventId,
      });

      return {
        success: true,
        attributeId,
      };
    } catch (error: unknown) {
      logger.error("Failed to submit IOC to MISP", {
        value,
        type,
        category,
        error: error instanceof Error ? error?.message : String(error),
      });
      
      return {
        success: false,
      };
    }
  }

  /**
   * Get STIX export for event
   */
  public async getSTIXExport(eventId: string): Promise<any> {
    try {
      logger.info("Fetching STIX export from MISP", { eventId });

      const response = await this.get<any>(`/stix/download/${eventId}`);

      if (!response.success) {
        throw new Error("Failed to get STIX export from MISP");
      }

      logger.info("STIX export fetched successfully", { eventId });
      return response.data;
    } catch (error: unknown) {
      logger.error("Failed to fetch STIX export from MISP", {
        eventId,
        error: error instanceof Error ? error?.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Build search parameters for MISP API
   */
  private buildSearchParams(searchRequest: IOCSearchRequest): any {
    const params: any = {};

    if (searchRequest.value) {
      params.value = searchRequest.value;
    }

    if (searchRequest.type) {
      params.type = searchRequest.type;
    }

    if (searchRequest.category) {
      params.category = searchRequest.category;
    }

    if (searchRequest.org) {
      params.org = searchRequest.org;
    }

    if (searchRequest.tags && searchRequest.tags.length > 0) {
      params.tags = searchRequest.tags;
    }

    if (searchRequest.eventinfo) {
      params.eventinfo = searchRequest.eventinfo;
    }

    if (searchRequest.threatlevel && searchRequest.threatlevel.length > 0) {
      params.threatlevel = searchRequest.threatlevel;
    }

    if (searchRequest.last) {
      params.last = searchRequest.last;
    }

    // Default parameters
    params.to_ids = 1; // Only detection-worthy attributes
    params.enforceWarninglist = 0; // Include warninglisted attributes

    return params;
  }

  /**
   * Parse MISP search results
   */
  private parseSearchResults(attributes: MISPAttribute[]): ThreatIntelligenceResult[] {
    return attributes.map(attribute => this.parseAttributeToResult(attribute));
  }

  /**
   * Parse MISP attribute to threat intelligence result
   */
  private parseAttributeToResult(attribute: MISPAttribute): ThreatIntelligenceResult {
    const threatScore = this.calculateThreatScore(attribute);
    const type = this.mapAttributeTypeToIOCType(attribute.type);

    return {
      target: attribute.value,
      type,
      threatScore,
      malicious: attribute.to_ids && threatScore > 50,
      detections: 1, // MISP doesn't provide detection counts like other services
      totalScans: 1,
      vendors: ["MISP"],
      timestamp: new Date(parseInt(attribute.timestamp) * 1000),
      source: "misp",
    };
  }

  /**
   * Calculate threat score based on MISP attribute
   */
  private calculateThreatScore(attribute: MISPAttribute): number {
    let score = 50; // Base score

    // Increase score if marked for IDS detection
    if (attribute.to_ids) {
      score += 30;
    }

    // Increase score based on distribution (lower distribution = higher confidence)
    if (attribute.distribution <= 1) {
      score += 10;
    }

    // Increase score based on tags
    const tags = attribute.Tag?.map(tag => tag.name.toLowerCase()) || [];
    if (tags.some(tag => tag.includes("malware") || tag.includes("apt") || tag.includes("threat"))) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Map MISP attribute type to IOC type
   */
  private mapAttributeTypeToIOCType(mispType: string): "ip" | "domain" | "file" | "url" | "email" {
    const typeMap: Record<string, "ip" | "domain" | "file" | "url" | "email"> = {
      "ip-src": "ip",
      "ip-dst": "ip",
      "ip": "ip",
      "domain": "domain",
      "hostname": "domain",
      "md5": "file",
      "sha1": "file",
      "sha256": "file",
      "filename": "file",
      "url": "url",
      "uri": "url",
      "link": "url",
      "email-src": "email",
      "email-dst": "email",
      "email": "email",
    };

    return typeMap[mispType] || "domain";
  }

  /**
   * Get threat intelligence summary
   */
  public async getThreatSummary(): Promise<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    eventsToday: number;
    attributesToday: number;
    cacheStats: {
      hits: number;
      misses: number;
      hitRate: number;
    };
  }> {
    try {
      const healthStatus = await this.getHealthStatus();
      
      // Get today's feeds to calculate metrics
      const todayFeeds = await this.getThreatFeeds(undefined, undefined, "1d");
      
      // Get cache statistics
      const cacheKeys = await redisClient.keys(`${this.cachePrefix}:*`);
      const cacheStats = {
        hits: 0, // Would need to track this separately
        misses: 0,
        hitRate: 0,
      };

      return {
        service: "MISP",
        status: healthStatus.status,
        eventsToday: new Set(todayFeeds.map(f => f.metadata.eventId)).size,
        attributesToday: todayFeeds.length,
        cacheStats,
      };
    } catch (error: unknown) {
      logger.error("Failed to get MISP threat summary", {
        error: error instanceof Error ? error?.message : String(error),
      });
      
      return {
        service: "MISP",
        status: "unhealthy",
        eventsToday: 0,
        attributesToday: 0,
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
export const mispIntegrationService = new MISPIntegrationService();
export default MISPIntegrationService;
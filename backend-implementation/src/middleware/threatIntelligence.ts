/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - THREAT INTELLIGENCE MIDDLEWARE
 * ============================================================================
 *
 * Middleware for real-time threat intelligence integration providing:
 * - Automatic IP reputation checking for incoming requests
 * - Real-time threat detection and blocking
 * - Integration with external threat intelligence services
 * - Automated security response and incident handling
 *
 * Features:
 * - Real-time IP reputation validation
 * - Threat-based request filtering
 * - Automated security responses
 * - Integration with security monitoring systems
 * - Comprehensive threat logging and reporting
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-14
 * Version: 1.0.0
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { AuditLog } from "@/models/AuditLog";
import { ipReputationService, threatIntelligenceService } from "@/services/external";
import { ResponseHelper } from "@/utils/ResponseHelper";

/**
 * Threat intelligence middleware configuration
 */
interface ThreatIntelligenceConfig {
  enabled: boolean;
  blockMaliciousIPs: boolean;
  rateLimitSuspiciousIPs: boolean;
  logAllChecks: boolean;
  alertThreshold: number; // Threat score threshold for alerts
  blockThreshold: number; // Threat score threshold for blocking
  cacheResults: boolean;
  cacheTTL: number;
  skipInternalIPs: boolean;
  skipWhitelistedIPs: boolean;
  whitelistedIPs: string[];
  exemptPaths: string[];
}

/**
 * Default configuration
 */
const defaultConfig: ThreatIntelligenceConfig = {
  enabled: true,
  blockMaliciousIPs: true,
  rateLimitSuspiciousIPs: true,
  logAllChecks: false,
  alertThreshold: 50,
  blockThreshold: 70,
  cacheResults: true,
  cacheTTL: 3600, // 1 hour
  skipInternalIPs: true,
  skipWhitelistedIPs: true,
  whitelistedIPs: [
    "127.0.0.1",
    "::1",
    "localhost",
  ],
  exemptPaths: [
    "/health",
    "/metrics",
    "/status",
  ],
};

/**
 * Create threat intelligence middleware
 */
export function createThreatIntelligenceMiddleware(
  config: Partial<ThreatIntelligenceConfig> = {}
) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if disabled
    if (!finalConfig.enabled) {
      return next();
    }

    // Skip exempt paths
    if (finalConfig.exemptPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    try {
      const clientIP = getClientIP(req);
      
      // Skip internal IPs
      if (finalConfig.skipInternalIPs && isInternalIP(clientIP)) {
        return next();
      }

      // Skip whitelisted IPs
      if (finalConfig.skipWhitelistedIPs && finalConfig.whitelistedIPs.includes(clientIP)) {
        return next();
      }

      // Check threat intelligence
      const threatResult = await checkIPThreat(clientIP, finalConfig);
      
      if (threatResult) {
        // Log the threat check
        if (finalConfig?.logAllChecks || threatResult.threatScore >= finalConfig.alertThreshold) {
          await logThreatCheck(req, clientIP, threatResult);
        }

        // Block if malicious
        if (finalConfig.blockMaliciousIPs && threatResult.threatScore >= finalConfig.blockThreshold) {
          logger.warn("Blocking malicious IP", {
            ip: clientIP,
            threatScore: threatResult.threatScore,
            malicious: threatResult.malicious,
            path: req.path,
            userAgent: req.get("User-Agent"),
          });

          // Create security incident log
          await AuditLog.create({
            userId: null,
            customerId: null,
            action: "malicious_ip_blocked",
            resourceType: "security",
            resourceId: clientIP,
            details: {
              threatScore: threatResult.threatScore,
              overallRisk: threatResult.overallRisk,
              malicious: threatResult.malicious,
              requestPath: req.path,
              requestMethod: req.method,
              userAgent: req.get("User-Agent"),
              sources: Object.keys(threatResult.sources),
            },
            ipAddress: clientIP,
            userAgent: req.get("User-Agent"),
          });

          return ResponseHelper.error(
            res,
            "Access denied - security policy violation",
            403,
            "SECURITY_VIOLATION"
          );
        }

        // Apply rate limiting for suspicious IPs
        if (finalConfig.rateLimitSuspiciousIPs && threatResult.threatScore >= finalConfig.alertThreshold) {
          const rateLimitResult = await applySuspiciousIPRateLimit(clientIP, req);
          
          if (rateLimitResult.blocked) {
            logger.warn("Rate limiting suspicious IP", {
              ip: clientIP,
              threatScore: threatResult.threatScore,
              requestCount: rateLimitResult.requestCount,
              path: req.path,
            });

            return ResponseHelper.error(
              res,
              "Rate limit exceeded - suspicious activity detected",
              429,
              "RATE_LIMIT_EXCEEDED"
            );
          }
        }

        // Add threat information to request for downstream middleware
        req.threatIntelligence = {
          ip: clientIP,
          threatScore: threatResult.threatScore,
          overallRisk: threatResult.overallRisk,
          malicious: threatResult.malicious,
          confidence: threatResult.confidence,
          recommendations: threatResult.recommendations,
        };
      }

      next();
    } catch (error: unknown) {
      logger.error("Threat intelligence middleware error", {
        error: error instanceof Error ? error?.message : String(error),
        ip: getClientIP(req),
        path: req.path,
      });

      // Don't block on middleware errors, just log and continue
      next();
    }
  };
}

/**
 * Check IP threat intelligence
 */
async function checkIPThreat(
  ip: string,
  config: ThreatIntelligenceConfig
): Promise<any> {
  const cacheKey = `threat_check:${ip}`;

  try {
    // Check cache first
    if (config.cacheResults) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Perform threat intelligence check
    const result = await ipReputationService.checkIPReputation(ip);

    // Cache the result
    if (config.cacheResults) {
      await redisClient.setex(cacheKey, config.cacheTTL, JSON.stringify(result));
    }

    return result;
  } catch (error: unknown) {
    logger.error("Failed to check IP threat intelligence", {
      ip,
      error: error instanceof Error ? error?.message : String(error),
    });
    return null;
  }
}

/**
 * Apply rate limiting for suspicious IPs
 */
async function applySuspiciousIPRateLimit(
  ip: string,
  req: Request
): Promise<{ blocked: boolean; requestCount: number }> {
  const rateLimitKey = `suspicious_ip_rate_limit:${ip}`;
  const windowMs = 300000; // 5 minutes
  const maxRequests = 10; // Reduced limit for suspicious IPs

  try {
    const windowKey = `${rateLimitKey}:${Math.floor(Date.now() / windowMs)}`;
    const requestCount = await redisClient.incr(windowKey);
    
    if (requestCount === 1) {
      await redisClient.expire(windowKey, Math.ceil(windowMs / 1000));
    }

    return {
      blocked: requestCount > maxRequests,
      requestCount,
    };
  } catch (error: unknown) {
    logger.error("Failed to apply suspicious IP rate limit", {
      ip,
      error: error instanceof Error ? error?.message : String(error),
    });
    return { blocked: false, requestCount: 0 };
  }
}

/**
 * Log threat check results
 */
async function logThreatCheck(
  req: Request,
  ip: string,
  threatResult: any
): Promise<void> {
  try {
    await AuditLog.create({
      userId: req.user?.id || null,
      customerId: null,
      action: "threat_intelligence_check",
      resourceType: "security",
      resourceId: ip,
      details: {
        threatScore: threatResult.threatScore,
        overallRisk: threatResult.overallRisk,
        malicious: threatResult.malicious,
        confidence: threatResult.confidence,
        requestPath: req.path,
        requestMethod: req.method,
        userAgent: req.get("User-Agent"),
        sources: Object.keys(threatResult.sources),
        recommendations: threatResult.recommendations,
      },
      ipAddress: ip,
      userAgent: req.get("User-Agent"),
    });
  } catch (error: unknown) {
    logger.error("Failed to log threat check", {
      ip,
      error: error instanceof Error ? error?.message : String(error),
    });
  }
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  // Check various headers for the real IP
  const forwarded = req.headers["x-forwarded-for"];
  const realIP = req.headers["x-real-ip"];
  const cloudflareIP = req.headers["cf-connecting-ip"];
  
  if (typeof forwarded === "string") {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }
  
  if (typeof realIP === "string") {
    return realIP;
  }
  
  if (typeof cloudflareIP === "string") {
    return cloudflareIP;
  }
  
  return req?.ip || req.connection?.remoteAddress || "unknown";
}

/**
 * Check if IP is internal/private
 */
function isInternalIP(ip: string): boolean {
  // IPv4 private ranges
  const privateRanges = [
    /^127\./, // Loopback
    /^192\.168\./, // Private Class C
    /^10\./, // Private Class A
    /^172\.(1[6-9]|2\d|3[01])\./, // Private Class B
    /^169\.254\./, // Link-local
    /^::1$/, // IPv6 loopback
    /^fe80:/, // IPv6 link-local
    /^fc00:/, // IPv6 private
  ];

  return privateRanges.some(range => range.test(ip)) || ip === "unknown";
}

/**
 * Middleware for real-time threat monitoring
 */
export function threatMonitoringMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Add response time tracking
      const startTime = Date.now();
      
      res.on("finish", () => {
        const responseTime = Date.now() - startTime;
        
        // Log slow responses from suspicious IPs
        if (req.threatIntelligence?.threatScore >= 50 && responseTime > 5000) {
          logger.warn("Slow response to suspicious IP", {
            ip: req.threatIntelligence.ip,
            threatScore: req.threatIntelligence.threatScore,
            responseTime,
            path: req.path,
            statusCode: res.statusCode,
          });
        }
      });

      next();
    } catch (error: unknown) {
      logger.error("Threat monitoring middleware error", {
        error: error instanceof Error ? error?.message : String(error),
      });
      next();
    }
  };
}

/**
 * Security headers middleware with threat intelligence
 */
export function securityHeadersMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // Add threat intelligence headers if available
    if (req.threatIntelligence) {
      res.setHeader("X-Threat-Score", req.threatIntelligence.threatScore.toString());
      res.setHeader("X-Risk-Level", req.threatIntelligence.overallRisk);
    }

    next();
  };
}

/**
 * Extend Express Request interface
 */
declare global {
  namespace Express {
    interface Request {
      threatIntelligence?: {
        ip: string;
        threatScore: number;
        overallRisk: string;
        malicious: boolean;
        confidence: number;
        recommendations: any;
      };
    }
  }
}

// Export configured middleware instances
export const threatIntelligenceMiddleware = createThreatIntelligenceMiddleware();
export const strictThreatIntelligenceMiddleware = createThreatIntelligenceMiddleware({
  blockThreshold: 50, // Lower threshold for stricter blocking
  alertThreshold: 30,
  logAllChecks: true,
});

export default {
  createThreatIntelligenceMiddleware,
  threatIntelligenceMiddleware,
  strictThreatIntelligenceMiddleware,
  threatMonitoringMiddleware,
  securityHeadersMiddleware,
};
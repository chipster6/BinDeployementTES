/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SECURITY MIDDLEWARE
 * ============================================================================
 * 
 * Security middleware for request validation, sanitization, and protection.
 * Includes XSS protection, SQL injection prevention, and security headers.
 * 
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import xss from 'xss';
import validator from 'validator';
import { config } from '@/config';
import { logger, logSecurityEvent } from '@/utils/logger';
import { AuthenticationError, ValidationError, RateLimitError } from '@/middleware/errorHandler';
import { RateLimitService } from '@/config/redis';

/**
 * Extended Request interface with security context
 */
interface ExtendedRequest extends Request {
  requestId?: string;
  security?: {
    sanitized: boolean;
    suspicious: boolean;
    threats: string[];
  };
}

/**
 * Security threat patterns for detection
 */
const SECURITY_PATTERNS = {
  SQL_INJECTION: [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
    /([\'"]\s*(or|and)\s+[\'"]\s*\w+[\'"]\s*=\s*[\'"]\w+[\'"]\s*)/gi,
    /(\bwhere\b.*\b(or|and)\b.*[\'"])/gi,
  ],
  XSS: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
    /<embed[\s\S]*?>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
  ],
  PATH_TRAVERSAL: [
    /\.\.\//g,
    /\.\.\\g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
  ],
  COMMAND_INJECTION: [
    /[;&|`$()]/g,
    /%3b/gi,
    /%26/gi,
    /%7c/gi,
    /%60/gi,
  ],
  LDAP_INJECTION: [
    /[()&|!]/g,
    /%28/gi,
    /%29/gi,
    /%26/gi,
    /%7c/gi,
  ],
};

/**
 * Suspicious user agent patterns
 */
const SUSPICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nmap/i,
  /nikto/i,
  /burp/i,
  /havij/i,
  /acunetix/i,
  /nessus/i,
  /metasploit/i,
  /w3af/i,
  /dirbuster/i,
];

/**
 * Detect security threats in string content
 */
const detectThreats = (content: string): string[] => {
  const threats: string[] = [];
  
  // Check for SQL injection patterns
  SECURITY_PATTERNS.SQL_INJECTION.forEach(pattern => {
    if (pattern.test(content)) {
      threats.push('SQL_INJECTION');
    }
  });
  
  // Check for XSS patterns
  SECURITY_PATTERNS.XSS.forEach(pattern => {
    if (pattern.test(content)) {
      threats.push('XSS');
    }
  });
  
  // Check for path traversal patterns
  SECURITY_PATTERNS.PATH_TRAVERSAL.forEach(pattern => {
    if (pattern.test(content)) {
      threats.push('PATH_TRAVERSAL');
    }
  });
  
  // Check for command injection patterns
  SECURITY_PATTERNS.COMMAND_INJECTION.forEach(pattern => {
    if (pattern.test(content)) {
      threats.push('COMMAND_INJECTION');
    }
  });
  
  // Check for LDAP injection patterns
  SECURITY_PATTERNS.LDAP_INJECTION.forEach(pattern => {
    if (pattern.test(content)) {
      threats.push('LDAP_INJECTION');
    }
  });
  
  return [...new Set(threats)]; // Remove duplicates
};

/**
 * Sanitize string content
 */
const sanitizeContent = (content: string): string => {
  // Remove HTML tags and XSS attempts
  let sanitized = xss(content, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script'],
  });
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  return sanitized;
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeContent(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names too
      const sanitizedKey = sanitizeContent(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Validate request size and structure
 */
const validateRequest = (req: ExtendedRequest): void => {
  // Check request URL length
  if (req.originalUrl.length > 2048) {
    throw new ValidationError('Request URL too long');
  }
  
  // Check query parameter count
  if (Object.keys(req.query).length > 100) {
    throw new ValidationError('Too many query parameters');
  }
  
  // Check header count
  if (Object.keys(req.headers).length > 50) {
    throw new ValidationError('Too many headers');
  }
  
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-originating-ip',
    'x-remote-ip',
    'x-client-ip',
  ];
  
  suspiciousHeaders.forEach(header => {
    if (req.headers[header] && !config.security.trustProxy) {
      logSecurityEvent(
        'suspicious_header',
        { header, value: req.headers[header] },
        (req as any).user?.id,
        req.ip,
        'medium'
      );
    }
  });
};

/**
 * Check user agent for suspicious patterns
 */
const validateUserAgent = (req: ExtendedRequest): void => {
  const userAgent = req.headers['user-agent'] || '';
  
  // Check for suspicious user agents
  const isSuspicious = SUSPICIOUS_USER_AGENTS.some(pattern => 
    pattern.test(userAgent)
  );
  
  if (isSuspicious) {
    logSecurityEvent(
      'suspicious_user_agent',
      { userAgent },
      (req as any).user?.id,
      req.ip,
      'high'
    );
    
    // Optionally block suspicious user agents
    if (config.app.nodeEnv === 'production') {
      throw new AuthenticationError('Access denied');
    }
  }
};

/**
 * Validate and sanitize request content
 */
const sanitizeRequest = (req: ExtendedRequest): void => {
  const threats: string[] = [];
  
  // Check URL for threats
  const urlThreats = detectThreats(req.originalUrl);
  threats.push(...urlThreats);
  
  // Check query parameters
  const queryString = JSON.stringify(req.query);
  const queryThreats = detectThreats(queryString);
  threats.push(...queryThreats);
  
  // Check request body
  if (req.body) {
    const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const bodyThreats = detectThreats(bodyString);
    threats.push(...bodyThreats);
    
    // Sanitize body
    req.body = sanitizeObject(req.body);
  }
  
  // Check headers for threats
  const headerString = JSON.stringify(req.headers);
  const headerThreats = detectThreats(headerString);
  threats.push(...headerThreats);
  
  // Remove duplicates
  const uniqueThreats = [...new Set(threats)];
  
  // Add security context to request
  req.security = {
    sanitized: true,
    suspicious: uniqueThreats.length > 0,
    threats: uniqueThreats,
  };
  
  // Log security threats
  if (uniqueThreats.length > 0) {
    logSecurityEvent(
      'security_threat_detected',
      {
        threats: uniqueThreats,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.headers['user-agent'],
      },
      (req as any).user?.id,
      req.ip,
      'high'
    );
    
    // Block requests with critical threats in production
    if (config.app.nodeEnv === 'production' && 
        (uniqueThreats.includes('SQL_INJECTION') || uniqueThreats.includes('COMMAND_INJECTION'))) {
      throw new AuthenticationError('Malicious request detected');
    }
  }
};

/**
 * Rate limiting per IP address
 */
const checkRateLimit = async (req: ExtendedRequest): Promise<void> => {
  const identifier = `ip:${req.ip}`;
  const result = await RateLimitService.checkRateLimit(
    identifier,
    config.rateLimit.maxRequests,
    config.rateLimit.windowMs
  );
  
  // Add rate limit headers
  const res = (req as any).res as Response;
  if (res) {
    res.setHeader('X-RateLimit-Limit', config.rateLimit.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  }
  
  if (!result.allowed) {
    logSecurityEvent(
      'rate_limit_exceeded',
      {
        identifier,
        limit: config.rateLimit.maxRequests,
        window: config.rateLimit.windowMs,
      },
      (req as any).user?.id,
      req.ip,
      'medium'
    );
    
    throw new RateLimitError();
  }
};

/**
 * Validate IP address and geolocation
 */
const validateIP = (req: ExtendedRequest): void => {
  const ip = req.ip;
  
  // Validate IP format
  if (!validator.isIP(ip)) {
    logger.warn('Invalid IP address format', { ip, requestId: req.requestId });
  }
  
  // Check for private/internal IPs in production
  if (config.app.nodeEnv === 'production' && !config.security.trustProxy) {
    if (validator.isIP(ip, 4) && (
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('172.16.') ||
      ip === '127.0.0.1'
    )) {
      logSecurityEvent(
        'private_ip_access',
        { ip },
        (req as any).user?.id,
        ip,
        'low'
      );
    }
  }
};

/**
 * Main security middleware
 */
export const securityMiddleware = async (
  req: ExtendedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Skip security checks for health endpoints
    if (req.path === '/health' || req.path === '/api/health') {
      return next();
    }
    
    // Validate request structure
    validateRequest(req);
    
    // Validate user agent
    validateUserAgent(req);
    
    // Validate IP address
    validateIP(req);
    
    // Check rate limits
    await checkRateLimit(req);
    
    // Sanitize request content
    sanitizeRequest(req);
    
    // Add security headers to response
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Add custom security headers
    res.setHeader('X-Security-Scan', req.security?.threats.length || 0);
    res.setHeader('X-Request-Sanitized', req.security?.sanitized ? 'true' : 'false');
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Content Security Policy middleware
 */
export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (config.security.helmet.csp.enabled) {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' cdn.mapbox.com",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com",
      `img-src 'self' data: *.mapbox.com ${config.aws.cloudFrontUrl || ''}`,
      "connect-src 'self' api.stripe.com *.samsara.com",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', csp);
  }
  next();
};

/**
 * HTTPS redirect middleware
 */
export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (config.security.forceHttps && req.header('x-forwarded-proto') !== 'https') {
    logSecurityEvent(
      'http_access_attempt',
      { url: req.originalUrl },
      (req as any).user?.id,
      req.ip,
      'low'
    );
    
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
};

/**
 * API key validation middleware
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    logSecurityEvent(
      'missing_api_key',
      { url: req.originalUrl },
      undefined,
      req.ip,
      'medium'
    );
    throw new AuthenticationError('API key required');
  }
  
  // Validate API key format
  if (!validator.isUUID(apiKey) && !validator.isAlphanumeric(apiKey)) {
    logSecurityEvent(
      'invalid_api_key_format',
      { apiKey: apiKey.substring(0, 8) + '...' },
      undefined,
      req.ip,
      'medium'
    );
    throw new AuthenticationError('Invalid API key format');
  }
  
  next();
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logSecurityEvent(
          'request_timeout',
          { 
            url: req.originalUrl,
            method: req.method,
            timeout: timeoutMs 
          },
          (req as any).user?.id,
          req.ip,
          'low'
        );
        
        res.status(408).json({
          error: 'request_timeout',
          message: 'Request timeout',
          timeout: `${timeoutMs}ms`,
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
};

// Export middleware functions
export default securityMiddleware;
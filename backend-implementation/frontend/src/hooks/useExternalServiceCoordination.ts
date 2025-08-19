"use client";

/**
 * ============================================================================
 * EXTERNAL SERVICE COORDINATION HOOK
 * ============================================================================
 *
 * Frontend hook for coordinating with External-API-Integration-Specialist.
 * Provides real-time coordination for external service status, cost monitoring,
 * webhook events, and service optimization recommendations.
 *
 * Coordination Points:
 * - External-API-Integration-Specialist: Real-time service status and cost data
 * - Backend External Services Manager: Health monitoring and metrics
 * - Cost Optimization Service: Budget tracking and alerts
 * - WebSocket Coordination Service: Real-time event streaming
 *
 * Features:
 * - Real-time service status monitoring (6 services)
 * - Cost monitoring with budget alerts
 * - Webhook event processing
 * - Service health indicators
 * - Rate limiting alerts
 * - Emergency service notifications
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOptimizedWebSocket, WebSocketMessage } from './useOptimizedWebSocket';
import { useCachedAPI } from './useCachedAPI';

/**
 * External Service Status Interface (coordinated with ExternalServicesManager)
 */
export interface ExternalServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "disabled";
  lastCheck: Date;
  uptime: number; // percentage
  responseTime: number; // milliseconds
  circuitBreakerState: "closed" | "open" | "half_open";
  errorCount: number;
  successCount: number;
  lastError?: string;
  priority: number; // 1-10, higher is more critical
}

/**
 * Cost Monitoring Interface
 */
export interface ServiceCostData {
  serviceName: string;
  hourlyCost: number;
  dailyCost: number;
  monthlyCost: number;
  requestsPerHour: number;
  errorRate: number;
  priority: number;
  budget: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  alerts: CostAlert[];
}

export interface CostAlert {
  service: string;
  currentCost: number;
  threshold: number;
  severity: 'warning' | 'critical';
  recommendedActions: string[];
}

/**
 * Real-time Coordination Event Interface
 */
export interface CoordinationEvent {
  eventType: "api_status_change" | "webhook_received" | "service_error" | "cost_alert" | "rate_limit_warning";
  serviceName: string;
  data: any;
  timestamp: Date;
  severity: "info" | "warning" | "error" | "critical";
}

/**
 * Webhook Event Interface
 */
export interface WebhookEvent {
  serviceName: string;
  webhookType: string;
  data: any;
  processingTime: number;
  success: boolean;
  timestamp: Date;
}

/**
 * Service Health Summary
 */
export interface ServiceHealthSummary {
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  disabledServices: number;
  criticalServicesDown: string[];
  overallStatus: "healthy" | "degraded" | "unhealthy";
  securityStatus: string;
  apiKeyRotationStatus: string;
  lastUpdate: Date;
}

/**
 * Coordination Configuration
 */
export interface ExternalServiceCoordinationConfig {
  enableRealTimeUpdates?: boolean;
  costMonitoringEnabled?: boolean;
  webhookTrackingEnabled?: boolean;
  updateInterval?: number;
  costAlertThresholds?: Record<string, number>;
  debugMode?: boolean;
}

/**
 * External Service Coordination Hook
 */
export function useExternalServiceCoordination(config: ExternalServiceCoordinationConfig = {}) {
  const {
    enableRealTimeUpdates = true,
    costMonitoringEnabled = true,
    webhookTrackingEnabled = true,
    updateInterval = 30000, // 30 seconds
    costAlertThresholds = {},
    debugMode = false
  } = config;

  // State management
  const [serviceStatuses, setServiceStatuses] = useState<ExternalServiceStatus[]>([]);
  const [costData, setCostData] = useState<ServiceCostData[]>([]);
  const [healthSummary, setHealthSummary] = useState<ServiceHealthSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<CoordinationEvent[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<CostAlert[]>([]);
  const [isCoordinating, setIsCoordinating] = useState(false);

  // Refs for event management
  const eventsQueueRef = useRef<CoordinationEvent[]>([]);
  const lastUpdateRef = useRef<Date>(new Date());
  const coordinationMetricsRef = useRef({
    totalEventsProcessed: 0,
    averageLatency: 0,
    errorCount: 0
  });

  // Service statuses fetching with caching
  const {
    data: serviceStatusData,
    isLoading: isLoadingStatuses,
    error: statusError,
    refresh: refreshStatuses
  } = useCachedAPI<ExternalServiceStatus[]>(
    '/api/external-services/status',
    {},
    {
      ttl: updateInterval,
      backgroundRefresh: true,
      staleWhileRevalidate: true
    }
  );

  // Cost data fetching
  const {
    data: costSummaryData,
    isLoading: isLoadingCosts,
    error: costError,
    refresh: refreshCosts
  } = useCachedAPI<any>(
    '/api/external-services/cost-summary',
    {},
    {
      ttl: 60000, // 1 minute
      backgroundRefresh: costMonitoringEnabled,
      enabled: costMonitoringEnabled
    }
  );

  // Health summary fetching
  const {
    data: healthData,
    isLoading: isLoadingHealth,
    error: healthError,
    refresh: refreshHealth
  } = useCachedAPI<ServiceHealthSummary>(
    '/api/external-services/health',
    {},
    {
      ttl: updateInterval,
      backgroundRefresh: true
    }
  );

  // Real-time WebSocket for service status updates
  const {
    lastMessage: statusMessage,
    isConnected: statusWsConnected,
    error: statusWsError,
    sendMessage: sendStatusMessage
  } = useOptimizedWebSocket({
    url: '/ws/external-services/status',
    onMessage: handleStatusMessage,
    onConnected: () => {
      if (debugMode) console.log('Status WebSocket connected');
      setIsCoordinating(true);
    },
    onDisconnected: () => {
      if (debugMode) console.log('Status WebSocket disconnected');
      setIsCoordinating(false);
    },
    enabled: enableRealTimeUpdates,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5
  });

  // Real-time WebSocket for cost monitoring
  const {
    lastMessage: costMessage,
    isConnected: costWsConnected,
    error: costWsError
  } = useOptimizedWebSocket({
    url: '/ws/external-services/cost-monitoring',
    onMessage: handleCostMessage,
    enabled: costMonitoringEnabled && enableRealTimeUpdates,
    reconnectInterval: 5000,
    maxReconnectAttempts: 3
  });

  // Real-time WebSocket for webhook events
  const {
    lastMessage: webhookMessage,
    isConnected: webhookWsConnected,
    error: webhookWsError
  } = useOptimizedWebSocket({
    url: '/ws/external-services/webhooks',
    onMessage: handleWebhookMessage,
    enabled: webhookTrackingEnabled && enableRealTimeUpdates,
    reconnectInterval: 5000,
    maxReconnectAttempts: 3
  });

  // Message handlers for real-time coordination
  function handleStatusMessage(message: WebSocketMessage) {
    try {
      const event = message.payload as CoordinationEvent;
      
      if (event.eventType === 'api_status_change') {
        // Update service status in real-time
        setServiceStatuses(prev => {
          const updated = [...prev];
          const index = updated.findIndex(s => s.name === event.serviceName);
          
          if (index >= 0) {
            updated[index] = { ...updated[index], ...event.data };
          }
          
          return updated;
        });

        // Add to recent events
        addRecentEvent(event);
      } else if (event.eventType === 'service_error') {
        // Handle service errors
        addRecentEvent(event);
        
        if (event.severity === 'critical') {
          // Trigger emergency notification
          handleCriticalServiceError(event);
        }
      }

      coordinationMetricsRef.current.totalEventsProcessed++;
      
      if (debugMode) {
        console.log('Status message processed:', event);
      }
    } catch (error) {
      console.error('Failed to process status message:', error);
      coordinationMetricsRef.current.errorCount++;
    }
  }

  function handleCostMessage(message: WebSocketMessage) {
    try {
      const event = message.payload as CoordinationEvent;
      
      if (event.eventType === 'cost_alert') {
        const costAlert: CostAlert = event.data;
        
        // Update active alerts
        setActiveAlerts(prev => {
          const filtered = prev.filter(alert => alert.service !== costAlert.service);
          return [...filtered, costAlert];
        });

        // Add to recent events
        addRecentEvent(event);

        if (debugMode) {
          console.log('Cost alert received:', costAlert);
        }
      }
    } catch (error) {
      console.error('Failed to process cost message:', error);
      coordinationMetricsRef.current.errorCount++;
    }
  }

  function handleWebhookMessage(message: WebSocketMessage) {
    try {
      const event = message.payload as CoordinationEvent;
      
      if (event.eventType === 'webhook_received') {
        const webhookEvent: WebhookEvent = {
          serviceName: event.serviceName,
          webhookType: event.data.webhookType,
          data: event.data,
          processingTime: event.data.processingTime || 0,
          success: event.data.processingResult?.success || false,
          timestamp: event.timestamp
        };

        // Add to webhook events
        setWebhookEvents(prev => {
          const updated = [webhookEvent, ...prev].slice(0, 100); // Keep last 100 events
          return updated;
        });

        if (debugMode) {
          console.log('Webhook event received:', webhookEvent);
        }
      }
    } catch (error) {
      console.error('Failed to process webhook message:', error);
      coordinationMetricsRef.current.errorCount++;
    }
  }

  // Helper function to add recent events
  const addRecentEvent = useCallback((event: CoordinationEvent) => {
    setRecentEvents(prev => {
      const updated = [event, ...prev].slice(0, 50); // Keep last 50 events
      return updated;
    });

    eventsQueueRef.current.push(event);
    
    // Keep events queue manageable
    if (eventsQueueRef.current.length > 200) {
      eventsQueueRef.current = eventsQueueRef.current.slice(-100);
    }
  }, []);

  // Handle critical service errors
  const handleCriticalServiceError = useCallback((event: CoordinationEvent) => {
    // Trigger browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Critical Service Error: ${event.serviceName}`, {
        body: event.data.error || 'Unknown error occurred',
        icon: '/favicon.ico',
        tag: `critical-${event.serviceName}`
      });
    }

    // Could also trigger other emergency protocols here
    if (debugMode) {
      console.error('Critical service error:', event);
    }
  }, [debugMode]);

  // Update service statuses when data is received
  useEffect(() => {
    if (serviceStatusData) {
      setServiceStatuses(serviceStatusData);
      lastUpdateRef.current = new Date();
    }
  }, [serviceStatusData]);

  // Update cost data when received
  useEffect(() => {
    if (costSummaryData) {
      const costServices: ServiceCostData[] = Object.entries(costSummaryData.serviceBreakdown || {})
        .map(([serviceName, data]: [string, any]) => ({
          serviceName,
          hourlyCost: data.hourlyCost || 0,
          dailyCost: data.dailyCost || 0,
          monthlyCost: data.monthlyCost || 0,
          requestsPerHour: data.requestsPerHour || 0,
          errorRate: data.errorRate || 0,
          priority: data.priority || 5,
          budget: {
            hourly: costAlertThresholds[serviceName] || 1000,
            daily: (costAlertThresholds[serviceName] || 1000) * 24,
            monthly: (costAlertThresholds[serviceName] || 1000) * 24 * 30
          },
          alerts: costSummaryData.alerts?.filter((alert: any) => alert.service === serviceName) || []
        }));

      setCostData(costServices);
      setActiveAlerts(costSummaryData.alerts || []);
    }
  }, [costSummaryData, costAlertThresholds]);

  // Update health summary when received
  useEffect(() => {
    if (healthData) {
      setHealthSummary(healthData);
    }
  }, [healthData]);

  // Service control functions
  const triggerServiceHealthCheck = useCallback(async (serviceName: string) => {
    try {
      const response = await fetch(`/api/external-services/${serviceName}/health-check`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Refresh statuses after health check
      setTimeout(() => {
        refreshStatuses();
        refreshHealth();
      }, 1000);
      
      return result;
    } catch (error) {
      console.error(`Failed to trigger health check for ${serviceName}:`, error);
      throw error;
    }
  }, [refreshStatuses, refreshHealth]);

  const triggerCostOptimization = useCallback(async () => {
    try {
      const response = await fetch('/api/external-services/cost-optimization', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Cost optimization failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Refresh cost data after optimization
      setTimeout(() => {
        refreshCosts();
      }, 2000);
      
      return result;
    } catch (error) {
      console.error('Failed to trigger cost optimization:', error);
      throw error;
    }
  }, [refreshCosts]);

  const rotateServiceApiKeys = useCallback(async (serviceName: string, newCredentials: Record<string, string>) => {
    try {
      const response = await fetch(`/api/external-services/${serviceName}/rotate-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: newCredentials })
      });
      
      if (!response.ok) {
        throw new Error(`API key rotation failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Refresh statuses after key rotation
      setTimeout(() => {
        refreshStatuses();
        refreshHealth();
      }, 1000);
      
      return result;
    } catch (error) {
      console.error(`Failed to rotate API keys for ${serviceName}:`, error);
      throw error;
    }
  }, [refreshStatuses, refreshHealth]);

  // Cleanup and optimization
  useEffect(() => {
    // Clean up old events every 5 minutes
    const cleanupInterval = setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      setRecentEvents(prev => 
        prev.filter(event => event.timestamp > fiveMinutesAgo)
      );
      
      setWebhookEvents(prev => 
        prev.filter(event => event.timestamp > fiveMinutesAgo)
      );
    }, 5 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Computed values
  const coordinationStatus = useMemo(() => ({
    isConnected: statusWsConnected && (costMonitoringEnabled ? costWsConnected : true) && (webhookTrackingEnabled ? webhookWsConnected : true),
    healthySystems: serviceStatuses.filter(s => s.status === 'healthy').length,
    totalSystems: serviceStatuses.length,
    criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
    totalCostPerHour: costData.reduce((sum, service) => sum + service.hourlyCost, 0),
    averageUptime: serviceStatuses.reduce((sum, s) => sum + s.uptime, 0) / Math.max(serviceStatuses.length, 1)
  }), [statusWsConnected, costWsConnected, webhookWsConnected, costMonitoringEnabled, webhookTrackingEnabled, serviceStatuses, activeAlerts, costData]);

  return {
    // State
    serviceStatuses,
    costData,
    healthSummary,
    recentEvents,
    webhookEvents,
    activeAlerts,
    isCoordinating,
    
    // Loading states
    isLoadingStatuses,
    isLoadingCosts,
    isLoadingHealth,
    
    // Errors
    statusError,
    costError,
    healthError,
    statusWsError,
    costWsError,
    webhookWsError,
    
    // WebSocket connection states
    statusWsConnected,
    costWsConnected,
    webhookWsConnected,
    
    // Actions
    triggerServiceHealthCheck,
    triggerCostOptimization,
    rotateServiceApiKeys,
    refreshStatuses,
    refreshCosts,
    refreshHealth,
    
    // Computed status
    coordinationStatus,
    
    // Metrics
    coordinationMetrics: coordinationMetricsRef.current,
    lastUpdate: lastUpdateRef.current,
    
    // Utilities
    getServiceByName: (name: string) => serviceStatuses.find(s => s.name === name),
    getCostByService: (name: string) => costData.find(c => c.serviceName === name),
    getRecentEventsByService: (name: string) => recentEvents.filter(e => e.serviceName === name),
    getCriticalServices: () => serviceStatuses.filter(s => s.status === 'unhealthy' && s.priority >= 8),
    getHighCostServices: () => costData.filter(c => c.alerts.length > 0)
  };
}

export default useExternalServiceCoordination;
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ThreatDetection, 
  SecurityIncident, 
  SecurityMetrics, 
  ComplianceStatus,
  SecurityAuditLog,
  ThreatIntelligence,
  ThreatLevel,
  IncidentStatus
} from '@/lib/types';

// Security API Configuration
const SECURITY_API_BASE = '/api/security';
const WS_SECURITY_BASE = process.env.NODE_ENV === 'production' 
  ? 'wss://api.company.com/ws/security' 
  : 'ws://localhost:3001/ws/security';

// Security API Response Types
interface SecurityAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
}

interface SecurityStreamEvent {
  type: 'threat_detected' | 'incident_created' | 'incident_updated' | 'metrics_update' | 'compliance_alert';
  data: any;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityAPIFilters {
  timeRange?: '1h' | '24h' | '7d' | '30d' | '90d';
  severity?: ThreatLevel[];
  status?: IncidentStatus[];
  category?: string[];
  limit?: number;
  offset?: number;
}

// Security Metrics Hook
export function useSecurityMetrics(filters?: SecurityAPIFilters) {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters?.timeRange) queryParams.append('timeRange', filters.timeRange);
      if (filters?.category) filters.category.forEach(cat => queryParams.append('category', cat));

      const response = await fetch(`${SECURITY_API_BASE}/metrics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SecurityAPIResponse<SecurityMetrics> = await response.json();
      
      if (result.success && result.data) {
        setMetrics(result.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.error || 'Failed to fetch security metrics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Security metrics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    refresh: fetchMetrics
  };
}

// Threat Detection Hook
export function useThreatDetection(filters?: SecurityAPIFilters) {
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchThreats = useCallback(async (append = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters?.timeRange) queryParams.append('timeRange', filters.timeRange);
      if (filters?.severity) filters.severity.forEach(sev => queryParams.append('severity', sev));
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.offset) queryParams.append('offset', filters.offset.toString());

      const response = await fetch(`${SECURITY_API_BASE}/threats?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SecurityAPIResponse<{
        threats: ThreatDetection[];
        totalCount: number;
        hasMore: boolean;
      }> = await response.json();
      
      if (result.success && result.data) {
        if (append) {
          setThreats(prev => [...prev, ...result.data!.threats]);
        } else {
          setThreats(result.data.threats);
        }
        setTotalCount(result.data.totalCount);
        setHasMore(result.data.hasMore);
      } else {
        throw new Error(result.error || 'Failed to fetch threats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Threat detection fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const newFilters = { ...filters, offset: threats.length };
      fetchThreats(true);
    }
  }, [hasMore, loading, threats.length, filters, fetchThreats]);

  useEffect(() => {
    fetchThreats();
  }, [fetchThreats]);

  return {
    threats,
    loading,
    error,
    hasMore,
    totalCount,
    refresh: () => fetchThreats(false),
    loadMore
  };
}

// Security Incidents Hook
export function useSecurityIncidents(filters?: SecurityAPIFilters) {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters?.timeRange) queryParams.append('timeRange', filters.timeRange);
      if (filters?.status) filters.status.forEach(status => queryParams.append('status', status));
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`${SECURITY_API_BASE}/incidents?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SecurityAPIResponse<SecurityIncident[]> = await response.json();
      
      if (result.success && result.data) {
        setIncidents(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch incidents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Security incidents fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateIncident = useCallback(async (incidentId: string, updates: Partial<SecurityIncident>) => {
    try {
      const response = await fetch(`${SECURITY_API_BASE}/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SecurityAPIResponse<SecurityIncident> = await response.json();
      
      if (result.success && result.data) {
        setIncidents(prev => 
          prev.map(incident => 
            incident.id === incidentId ? result.data! : incident
          )
        );
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update incident');
      }
    } catch (err) {
      console.error('Incident update error:', err);
      throw err;
    }
  }, []);

  const createIncident = useCallback(async (incidentData: Omit<SecurityIncident, 'id' | 'reportedAt' | 'timeline'>) => {
    try {
      const response = await fetch(`${SECURITY_API_BASE}/incidents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incidentData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SecurityAPIResponse<SecurityIncident> = await response.json();
      
      if (result.success && result.data) {
        setIncidents(prev => [result.data!, ...prev]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create incident');
      }
    } catch (err) {
      console.error('Incident creation error:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return {
    incidents,
    loading,
    error,
    refresh: fetchIncidents,
    updateIncident,
    createIncident
  };
}

// Compliance Status Hook
export function useComplianceStatus() {
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplianceStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${SECURITY_API_BASE}/compliance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SecurityAPIResponse<ComplianceStatus[]> = await response.json();
      
      if (result.success && result.data) {
        setComplianceStatus(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch compliance status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Compliance status fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplianceStatus();
  }, [fetchComplianceStatus]);

  return {
    complianceStatus,
    loading,
    error,
    refresh: fetchComplianceStatus
  };
}

// Security Audit Logs Hook
export function useSecurityAuditLogs(filters?: SecurityAPIFilters) {
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters?.timeRange) queryParams.append('timeRange', filters.timeRange);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`${SECURITY_API_BASE}/audit-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SecurityAPIResponse<SecurityAuditLog[]> = await response.json();
      
      if (result.success && result.data) {
        setAuditLogs(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch audit logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Audit logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return {
    auditLogs,
    loading,
    error,
    refresh: fetchAuditLogs
  };
}

// Real-time Security WebSocket Hook
export function useSecurityWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastEvent, setLastEvent] = useState<SecurityStreamEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionState('connecting');
      setError(null);

      const token = localStorage.getItem('authToken');
      const wsUrl = `${WS_SECURITY_BASE}?token=${encodeURIComponent(token || '')}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        console.log('Security WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: SecurityStreamEvent = JSON.parse(event.data);
          setLastEvent(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setConnectionState('disconnected');
        
        // Auto-reconnect logic
        if (!event.wasClean && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        setConnectionState('error');
        setError('WebSocket connection error');
        console.error('Security WebSocket error:', error);
      };

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown connection error');
      setConnectionState('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionState,
    lastEvent,
    error,
    connect,
    disconnect,
    sendMessage
  };
}

// Combined Security Dashboard Hook
export function useSecurityDashboard(filters?: SecurityAPIFilters) {
  const metricsHook = useSecurityMetrics(filters);
  const threatsHook = useThreatDetection(filters);
  const incidentsHook = useSecurityIncidents(filters);
  const complianceHook = useComplianceStatus();
  const auditHook = useSecurityAuditLogs(filters);
  const wsHook = useSecurityWebSocket();

  const isLoading = metricsHook.loading || threatsHook.loading || incidentsHook.loading || complianceHook.loading;
  const hasError = metricsHook.error || threatsHook.error || incidentsHook.error || complianceHook.error;

  const refreshAll = useCallback(() => {
    metricsHook.refresh();
    threatsHook.refresh();
    incidentsHook.refresh();
    complianceHook.refresh();
    auditHook.refresh();
  }, [metricsHook, threatsHook, incidentsHook, complianceHook, auditHook]);

  // Handle real-time updates
  useEffect(() => {
    if (wsHook.lastEvent) {
      switch (wsHook.lastEvent.type) {
        case 'threat_detected':
          threatsHook.refresh();
          metricsHook.refresh();
          break;
        case 'incident_created':
        case 'incident_updated':
          incidentsHook.refresh();
          break;
        case 'metrics_update':
          metricsHook.refresh();
          break;
        case 'compliance_alert':
          complianceHook.refresh();
          break;
      }
    }
  }, [wsHook.lastEvent, threatsHook, incidentsHook, metricsHook, complianceHook]);

  return {
    metrics: metricsHook.metrics,
    threats: threatsHook.threats,
    incidents: incidentsHook.incidents,
    complianceStatus: complianceHook.complianceStatus,
    auditLogs: auditHook.auditLogs,
    isLoading,
    error: hasError,
    isConnected: wsHook.isConnected,
    connectionState: wsHook.connectionState,
    lastUpdate: wsHook.lastEvent,
    refreshAll,
    updateIncident: incidentsHook.updateIncident,
    createIncident: incidentsHook.createIncident,
    loadMoreThreats: threatsHook.loadMore
  };
}

// Security Actions Hook
export function useSecurityActions() {
  const [loading, setLoading] = useState(false);

  const executeAction = useCallback(async (action: string, params: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${SECURITY_API_BASE}/actions/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SecurityAPIResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Action failed');
      }

      return result.data;
    } catch (err) {
      console.error(`Security action '${action}' failed:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const quarantineAsset = useCallback((assetId: string) => 
    executeAction('quarantine', { assetId }), [executeAction]);

  const blockIP = useCallback((ipAddress: string, duration?: number) => 
    executeAction('block-ip', { ipAddress, duration }), [executeAction]);

  const resetUserCredentials = useCallback((userId: string) => 
    executeAction('reset-credentials', { userId }), [executeAction]);

  const enableEmergencyMode = useCallback(() => 
    executeAction('emergency-mode', { enabled: true }), [executeAction]);

  const rotateKey = useCallback((keyId: string) => 
    executeAction('rotate-key', { keyId }), [executeAction]);

  return {
    loading,
    quarantineAsset,
    blockIP,
    resetUserCredentials,
    enableEmergencyMode,
    rotateKey,
    executeAction
  };
}
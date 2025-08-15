"use client";

import { useState, useCallback, useEffect } from 'react';
import { useWebSocket, WebSocketMessage } from './useWebSocket';
import { 
  ThreatDetection, 
  SecurityIncident, 
  SecurityMetrics,
  ThreatIntelligence,
  SecurityAuditLog 
} from '@/lib/types';

interface SOCWebSocketData {
  threats: ThreatDetection[];
  incidents: SecurityIncident[];
  metrics: SecurityMetrics | null;
  intelligence: ThreatIntelligence | null;
  auditLogs: SecurityAuditLog[];
}

export function useSOCWebSocket() {
  const [socData, setSOCData] = useState<SOCWebSocketData>({
    threats: [],
    incidents: [],
    metrics: null,
    intelligence: null,
    auditLogs: []
  });

  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'threat' | 'incident' | 'alert' | 'info';
    title: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>>([]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'threat_detected':
        setSOCData(prev => ({
          ...prev,
          threats: [message.payload, ...prev.threats.slice(0, 99)] // Keep last 100 threats
        }));
        
        // Add notification for high/critical threats
        if (message.payload.level === 'high' || message.payload.level === 'critical') {
          setNotifications(prev => [{
            id: `threat-${message.payload.id}`,
            type: 'threat',
            title: 'New Threat Detected',
            message: `${message.payload.description} from ${message.payload.sourceIp}`,
            timestamp: message.timestamp,
            severity: message.payload.level
          }, ...prev.slice(0, 19)]); // Keep last 20 notifications
        }
        break;

      case 'threat_updated':
        setSOCData(prev => ({
          ...prev,
          threats: prev.threats.map(threat => 
            threat.id === message.payload.id ? message.payload : threat
          )
        }));
        break;

      case 'incident_created':
        setSOCData(prev => ({
          ...prev,
          incidents: [message.payload, ...prev.incidents]
        }));
        
        setNotifications(prev => [{
          id: `incident-${message.payload.id}`,
          type: 'incident',
          title: 'New Security Incident',
          message: message.payload.title,
          timestamp: message.timestamp,
          severity: message.payload.threatLevel
        }, ...prev.slice(0, 19)]);
        break;

      case 'incident_updated':
        setSOCData(prev => ({
          ...prev,
          incidents: prev.incidents.map(incident => 
            incident.id === message.payload.id ? message.payload : incident
          )
        }));
        break;

      case 'metrics_updated':
        setSOCData(prev => ({
          ...prev,
          metrics: message.payload
        }));
        break;

      case 'intelligence_updated':
        setSOCData(prev => ({
          ...prev,
          intelligence: message.payload
        }));
        break;

      case 'audit_log_entry':
        setSOCData(prev => ({
          ...prev,
          auditLogs: [message.payload, ...prev.auditLogs.slice(0, 99)]
        }));
        break;

      case 'security_alert':
        setNotifications(prev => [{
          id: `alert-${Date.now()}`,
          type: 'alert',
          title: message.payload.title,
          message: message.payload.message,
          timestamp: message.timestamp,
          severity: message.payload.severity || 'medium'
        }, ...prev.slice(0, 19)]);
        break;

      case 'system_status':
        // Handle system status updates
        console.log('System status update:', message.payload);
        break;

      default:
        console.log('Unknown SOC message type:', message.type);
    }
  }, []);

  const wsConfig = {
    url: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/soc`,
    onMessage: handleWebSocketMessage,
    onConnected: () => {
      console.log('SOC WebSocket connected');
      // Request initial data when connected
      sendMessage({ type: 'request_initial_data' });
    },
    onDisconnected: () => {
      console.log('SOC WebSocket disconnected');
    },
    onError: (error: Event) => {
      console.error('SOC WebSocket error:', error);
    }
  };

  const { 
    isConnected, 
    connectionState, 
    sendMessage: wsSendMessage, 
    reconnect 
  } = useWebSocket(wsConfig);

  const sendMessage = useCallback((message: any) => {
    wsSendMessage(message);
  }, [wsSendMessage]);

  // Auto-clear old notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      setNotifications(prev => 
        prev.filter(notification => 
          new Date(notification.timestamp) > fiveMinutesAgo
        )
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const requestThreatDetails = useCallback((threatId: string) => {
    sendMessage({
      type: 'request_threat_details',
      payload: { threatId }
    });
  }, [sendMessage]);

  const requestIncidentDetails = useCallback((incidentId: string) => {
    sendMessage({
      type: 'request_incident_details',
      payload: { incidentId }
    });
  }, [sendMessage]);

  const subscribeToThreatLevel = useCallback((level: string) => {
    sendMessage({
      type: 'subscribe_threat_level',
      payload: { level }
    });
  }, [sendMessage]);

  const executeIncidentAction = useCallback((incidentId: string, actionId: string) => {
    sendMessage({
      type: 'execute_incident_action',
      payload: { incidentId, actionId }
    });
  }, [sendMessage]);

  return {
    // Connection state
    isConnected,
    connectionState,
    reconnect,

    // SOC data
    threats: socData.threats,
    incidents: socData.incidents,
    metrics: socData.metrics,
    intelligence: socData.intelligence,
    auditLogs: socData.auditLogs,

    // Notifications
    notifications,
    clearNotification,
    clearAllNotifications,

    // Actions
    sendMessage,
    requestThreatDetails,
    requestIncidentDetails,
    subscribeToThreatLevel,
    executeIncidentAction
  };
}
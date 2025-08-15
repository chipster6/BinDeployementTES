"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Search,
  Calendar,
  Users,
  Activity,
  Zap
} from 'lucide-react';
import { 
  SecurityIncident, 
  ThreatLevel, 
  ThreatType,
  IncidentStatus,
  ResponseAction 
} from '@/lib/types';

interface IncidentResponsePanelProps {
  incidents: SecurityIncident[];
  onIncidentClick: (incident: SecurityIncident) => void;
  expanded?: boolean;
  className?: string;
}

export function IncidentResponsePanel({ 
  incidents, 
  onIncidentClick, 
  expanded = false,
  className 
}: IncidentResponsePanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<ThreatLevel | 'all'>('all');

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.reportedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || incident.status === selectedStatus;
    const matchesLevel = selectedLevel === 'all' || incident.threatLevel === selectedLevel;

    return matchesSearch && matchesStatus && matchesLevel;
  });

  const getThreatLevelColor = (level: ThreatLevel): string => {
    switch (level) {
      case ThreatLevel.CRITICAL: return 'destructive';
      case ThreatLevel.HIGH: return 'destructive';
      case ThreatLevel.MEDIUM: return 'default';
      case ThreatLevel.LOW: return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: IncidentStatus): string => {
    switch (status) {
      case IncidentStatus.OPEN: return 'destructive';
      case IncidentStatus.IN_PROGRESS: return 'default';
      case IncidentStatus.RESOLVED: return 'secondary';
      case IncidentStatus.CLOSED: return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.OPEN: return <AlertTriangle className="h-4 w-4" />;
      case IncidentStatus.IN_PROGRESS: return <Clock className="h-4 w-4" />;
      case IncidentStatus.RESOLVED: return <CheckCircle className="h-4 w-4" />;
      case IncidentStatus.CLOSED: return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getThreatTypeIcon = (type: ThreatType) => {
    switch (type) {
      case ThreatType.MALWARE: return <Zap className="h-4 w-4" />;
      case ThreatType.PHISHING: return <User className="h-4 w-4" />;
      case ThreatType.UNAUTHORIZED_ACCESS: return <User className="h-4 w-4" />;
      case ThreatType.DATA_BREACH: return <AlertTriangle className="h-4 w-4" />;
      case ThreatType.DDOS: return <Activity className="h-4 w-4" />;
      case ThreatType.SUSPICIOUS_ACTIVITY: return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const calculateProgress = (incident: SecurityIncident): number => {
    if (incident.status === IncidentStatus.CLOSED) return 100;
    if (incident.status === IncidentStatus.RESOLVED) return 90;
    
    const totalActions = incident.responseActions.length;
    if (totalActions === 0) return 0;
    
    const completedActions = incident.responseActions.filter(
      action => action.status === 'completed'
    ).length;
    
    return Math.round((completedActions / totalActions) * 80); // Max 80% until resolved
  };

  const getTimeElapsed = (timestamp: string): string => {
    const now = new Date();
    const reported = new Date(timestamp);
    const diffMs = now.getTime() - reported.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h`;
    return 'Just now';
  };

  const handleAssignIncident = async (incident: SecurityIncident, userId: string) => {
    try {
      const response = await fetch(`/api/security/incidents/${incident.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: userId })
      });
      
      if (response.ok) {
        console.log('Incident assigned successfully');
      }
    } catch (error) {
      console.error('Failed to assign incident:', error);
    }
  };

  const handleStatusChange = async (incident: SecurityIncident, newStatus: IncidentStatus) => {
    try {
      const response = await fetch(`/api/security/incidents/${incident.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        console.log('Incident status updated successfully');
      }
    } catch (error) {
      console.error('Failed to update incident status:', error);
    }
  };

  const handleExecuteAction = async (incident: SecurityIncident, action: ResponseAction) => {
    try {
      const response = await fetch(`/api/security/incidents/${incident.id}/actions/${action.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('Action executed successfully');
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Incident Response</span>
            <Badge variant="outline">{filteredIncidents.length}</Badge>
          </CardTitle>
          <Button size="sm">
            <Users className="h-4 w-4 mr-2" />
            Create Incident
          </Button>
        </div>
        
        {expanded && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Statuses</option>
              <option value={IncidentStatus.OPEN}>Open</option>
              <option value={IncidentStatus.IN_PROGRESS}>In Progress</option>
              <option value={IncidentStatus.RESOLVED}>Resolved</option>
              <option value={IncidentStatus.CLOSED}>Closed</option>
            </select>
            
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Levels</option>
              <option value={ThreatLevel.CRITICAL}>Critical</option>
              <option value={ThreatLevel.HIGH}>High</option>
              <option value={ThreatLevel.MEDIUM}>Medium</option>
              <option value={ThreatLevel.LOW}>Low</option>
            </select>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
              <p>No incidents match your filters</p>
              <p className="text-sm">All clear! System is secure.</p>
            </div>
          ) : (
            filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onIncidentClick(incident)}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex items-center space-x-2">
                        {getThreatTypeIcon(incident.incidentType)}
                        {getStatusIcon(incident.status)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">{incident.title}</h4>
                          <Badge variant={getThreatLevelColor(incident.threatLevel) as any}>
                            {incident.threatLevel.toUpperCase()}
                          </Badge>
                          <Badge variant={getStatusColor(incident.status) as any}>
                            {incident.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {incident.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Reported: {getTimeElapsed(incident.reportedAt)} ago</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>By: {incident.reportedBy}</span>
                          </div>
                          {incident.assignedTo && (
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>Assigned: {incident.assignedTo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{calculateProgress(incident)}%</span>
                    </div>
                    <Progress value={calculateProgress(incident)} className="h-2" />
                  </div>

                  {/* Response Actions Preview */}
                  {incident.responseActions.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Response Actions ({incident.responseActions.length})</h5>
                      <div className="flex flex-wrap gap-2">
                        {incident.responseActions.slice(0, 3).map((action) => (
                          <div 
                            key={action.id}
                            className="flex items-center space-x-1 px-2 py-1 rounded-md text-xs border"
                          >
                            {action.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                            {action.status === 'in_progress' && <Clock className="h-3 w-3 text-yellow-500" />}
                            {action.status === 'pending' && <Pause className="h-3 w-3 text-gray-500" />}
                            {action.status === 'failed' && <XCircle className="h-3 w-3 text-red-500" />}
                            <span>{action.action}</span>
                            {action.automated && <Badge variant="outline" className="text-xs">Auto</Badge>}
                          </div>
                        ))}
                        {incident.responseActions.length > 3 && (
                          <span className="text-xs text-muted-foreground px-2 py-1">
                            +{incident.responseActions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Affected Assets */}
                  {incident.affectedAssets.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-sm font-medium">Affected Assets</h5>
                      <div className="flex flex-wrap gap-1">
                        {incident.affectedAssets.slice(0, 3).map((asset, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {asset}
                          </Badge>
                        ))}
                        {incident.affectedAssets.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{incident.affectedAssets.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    {incident.status === IncidentStatus.OPEN && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(incident, IncidentStatus.IN_PROGRESS);
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start Response
                      </Button>
                    )}
                    
                    {incident.status === IncidentStatus.IN_PROGRESS && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(incident, IncidentStatus.RESOLVED);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Resolved
                      </Button>
                    )}
                    
                    {!incident.assignedTo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignIncident(incident, 'current-user-id');
                        }}
                      >
                        <User className="h-4 w-4 mr-1" />
                        Assign to Me
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onIncidentClick(incident);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {expanded && filteredIncidents.length > 0 && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Showing {filteredIncidents.length} of {incidents.length} incidents
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
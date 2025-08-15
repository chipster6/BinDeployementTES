"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  AlertTriangle, 
  Search,
  Filter,
  Eye,
  Block,
  Check,
  X,
  Clock,
  Globe,
  Zap
} from 'lucide-react';
import { 
  ThreatDetection, 
  ThreatLevel, 
  ThreatType,
  IncidentStatus 
} from '@/lib/types';

interface ThreatDetectionPanelProps {
  threats: ThreatDetection[];
  onThreatClick: (threat: ThreatDetection) => void;
  expanded?: boolean;
  className?: string;
}

export function ThreatDetectionPanel({ 
  threats, 
  onThreatClick, 
  expanded = false,
  className 
}: ThreatDetectionPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ThreatLevel | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ThreatType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | 'all'>('all');

  const filteredThreats = threats.filter(threat => {
    const matchesSearch = threat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         threat.sourceIp.includes(searchTerm) ||
                         threat.targetAsset.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = selectedLevel === 'all' || threat.level === selectedLevel;
    const matchesType = selectedType === 'all' || threat.threatType === selectedType;
    const matchesStatus = selectedStatus === 'all' || threat.status === selectedStatus;

    return matchesSearch && matchesLevel && matchesType && matchesStatus;
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

  const getThreatTypeIcon = (type: ThreatType) => {
    switch (type) {
      case ThreatType.MALWARE: return <Zap className="h-4 w-4" />;
      case ThreatType.PHISHING: return <Globe className="h-4 w-4" />;
      case ThreatType.UNAUTHORIZED_ACCESS: return <Shield className="h-4 w-4" />;
      case ThreatType.DATA_BREACH: return <AlertTriangle className="h-4 w-4" />;
      case ThreatType.DDOS: return <Zap className="h-4 w-4" />;
      case ThreatType.SUSPICIOUS_ACTIVITY: return <Eye className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.OPEN: return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case IncidentStatus.IN_PROGRESS: return <Clock className="h-4 w-4 text-yellow-500" />;
      case IncidentStatus.RESOLVED: return <Check className="h-4 w-4 text-green-500" />;
      case IncidentStatus.CLOSED: return <X className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleBlockIP = async (threat: ThreatDetection) => {
    try {
      const response = await fetch('/api/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: threat.sourceIp, reason: threat.description })
      });
      
      if (response.ok) {
        console.log('IP blocked successfully');
      }
    } catch (error) {
      console.error('Failed to block IP:', error);
    }
  };

  const handleResolveThreat = async (threat: ThreatDetection) => {
    try {
      const response = await fetch(`/api/security/threats/${threat.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('Threat resolved successfully');
      }
    } catch (error) {
      console.error('Failed to resolve threat:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Threat Detection</span>
            <Badge variant="outline">{filteredThreats.length}</Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {expanded && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search threats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
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
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value={ThreatType.MALWARE}>Malware</option>
              <option value={ThreatType.PHISHING}>Phishing</option>
              <option value={ThreatType.UNAUTHORIZED_ACCESS}>Unauthorized Access</option>
              <option value={ThreatType.DATA_BREACH}>Data Breach</option>
              <option value={ThreatType.DDOS}>DDoS</option>
              <option value={ThreatType.SUSPICIOUS_ACTIVITY}>Suspicious Activity</option>
            </select>

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
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {filteredThreats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No threats detected matching your filters</p>
            </div>
          ) : (
            filteredThreats.map((threat) => (
              <div
                key={threat.id}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onThreatClick(threat)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex items-center space-x-2">
                      {getThreatTypeIcon(threat.threatType)}
                      {getStatusIcon(threat.status)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{threat.description}</h4>
                        <Badge variant={getThreatLevelColor(threat.level) as any}>
                          {threat.level.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {threat.confidence}% confidence
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center space-x-4">
                          <span>Source: {threat.sourceIp}</span>
                          <span>Target: {threat.targetAsset}</span>
                          {threat.location && (
                            <span>Location: {threat.location.city}, {threat.location.country}</span>
                          )}
                        </div>
                        <div>
                          Detected: {new Date(threat.detectedAt).toLocaleString()}
                          {threat.resolvedAt && (
                            <span className="ml-4">
                              Resolved: {new Date(threat.resolvedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {threat.status === IncidentStatus.OPEN && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBlockIP(threat);
                          }}
                        >
                          <Block className="h-4 w-4 mr-1" />
                          Block IP
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveThreat(threat);
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onThreatClick(threat);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {expanded && filteredThreats.length > 0 && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Showing {filteredThreats.length} of {threats.length} threats
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Globe, 
  MapPin, 
  Activity,
  Filter,
  Layers,
  Zap,
  Shield,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { 
  ThreatDetection, 
  ThreatLevel, 
  ThreatType,
  IOC 
} from '@/lib/types';

interface ThreatMapVisualizationProps {
  threats: ThreatDetection[];
  className?: string;
}

interface ThreatLocation {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  threatCount: number;
  threatLevel: ThreatLevel;
  threats: ThreatDetection[];
}

interface IOCDisplayData {
  ip: IOC[];
  domain: IOC[];
  hash: IOC[];
  url: IOC[];
}

export function ThreatMapVisualization({ threats, className }: ThreatMapVisualizationProps) {
  const [selectedView, setSelectedView] = useState<'map' | 'iocs' | 'timeline'>('map');
  const [selectedLevel, setSelectedLevel] = useState<ThreatLevel | 'all'>('all');
  const [threatLocations, setThreatLocations] = useState<ThreatLocation[]>([]);
  const [iocData, setIocData] = useState<IOCDisplayData>({ ip: [], domain: [], hash: [], url: [] });

  useEffect(() => {
    processThreatsForMap();
    loadIOCData();
  }, [threats, selectedLevel]);

  const processThreatsForMap = () => {
    const locationMap = new Map<string, ThreatLocation>();
    
    threats
      .filter(threat => selectedLevel === 'all' || threat.level === selectedLevel)
      .filter(threat => threat.location)
      .forEach(threat => {
        const key = `${threat.location!.country}-${threat.location!.city}`;
        
        if (locationMap.has(key)) {
          const existing = locationMap.get(key)!;
          existing.threatCount++;
          existing.threats.push(threat);
          
          // Update threat level to highest
          if (getThreatLevelValue(threat.level) > getThreatLevelValue(existing.threatLevel)) {
            existing.threatLevel = threat.level;
          }
        } else {
          locationMap.set(key, {
            country: threat.location!.country,
            city: threat.location!.city,
            latitude: threat.location!.latitude,
            longitude: threat.location!.longitude,
            threatCount: 1,
            threatLevel: threat.level,
            threats: [threat]
          });
        }
      });
    
    setThreatLocations(Array.from(locationMap.values()));
  };

  const loadIOCData = async () => {
    try {
      const response = await fetch('/api/security/iocs');
      const data = await response.json();
      
      if (data.success) {
        setIocData(data.data);
      }
    } catch (error) {
      console.error('Failed to load IOC data:', error);
    }
  };

  const getThreatLevelValue = (level: ThreatLevel): number => {
    switch (level) {
      case ThreatLevel.CRITICAL: return 4;
      case ThreatLevel.HIGH: return 3;
      case ThreatLevel.MEDIUM: return 2;
      case ThreatLevel.LOW: return 1;
      default: return 0;
    }
  };

  const getThreatLevelColor = (level: ThreatLevel): string => {
    switch (level) {
      case ThreatLevel.CRITICAL: return 'bg-red-600';
      case ThreatLevel.HIGH: return 'bg-orange-500';
      case ThreatLevel.MEDIUM: return 'bg-yellow-500';
      case ThreatLevel.LOW: return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getThreatTypeIcon = (type: ThreatType) => {
    switch (type) {
      case ThreatType.MALWARE: return <Zap className="h-3 w-3" />;
      case ThreatType.PHISHING: return <Globe className="h-3 w-3" />;
      case ThreatType.UNAUTHORIZED_ACCESS: return <Shield className="h-3 w-3" />;
      case ThreatType.DATA_BREACH: return <AlertTriangle className="h-3 w-3" />;
      case ThreatType.DDOS: return <Activity className="h-3 w-3" />;
      case ThreatType.SUSPICIOUS_ACTIVITY: return <Eye className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getIOCTypeColor = (type: string): string => {
    switch (type) {
      case 'ip': return 'bg-red-100 text-red-800';
      case 'domain': return 'bg-blue-100 text-blue-800';
      case 'hash': return 'bg-green-100 text-green-800';
      case 'url': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderWorldMap = () => (
    <div className="relative h-96 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20 overflow-hidden">
      {/* Simplified world map representation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            Interactive Threat Map
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            In a production environment, this would be integrated with mapping libraries like Mapbox or Google Maps
          </p>
        </div>
      </div>
      
      {/* Threat location indicators */}
      <div className="absolute inset-0">
        {threatLocations.map((location, index) => (
          <div
            key={index}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${20 + (index * 15) % 60}%`,
              top: `${30 + (index * 10) % 40}%`
            }}
          >
            <div className="relative group">
              <div 
                className={`w-4 h-4 rounded-full ${getThreatLevelColor(location.threatLevel)} animate-pulse`}
              />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {location.city}, {location.country}
                  <br />
                  {location.threatCount} threat{location.threatCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderThreatLocations = () => (
    <div className="space-y-3">
      {threatLocations.map((location, index) => (
        <div key={index} className="p-3 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{location.city}, {location.country}</span>
              <Badge variant="outline">{location.threatCount} threats</Badge>
            </div>
            <Badge variant={
              location.threatLevel === ThreatLevel.CRITICAL ? 'destructive' :
              location.threatLevel === ThreatLevel.HIGH ? 'destructive' :
              location.threatLevel === ThreatLevel.MEDIUM ? 'default' : 'secondary'
            }>
              {location.threatLevel.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {location.threats.slice(0, 3).map((threat) => (
              <div key={threat.id} className="flex items-center space-x-1 text-xs bg-muted px-2 py-1 rounded">
                {getThreatTypeIcon(threat.threatType)}
                <span>{threat.threatType.replace('_', ' ')}</span>
              </div>
            ))}
            {location.threats.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{location.threats.length - 3} more
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderIOCs = () => (
    <div className="space-y-6">
      {Object.entries(iocData).map(([type, iocs]) => (
        <div key={type} className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${getIOCTypeColor(type)}`}>
              {type.toUpperCase()}
            </span>
            <span>Indicators of Compromise</span>
            <Badge variant="outline">{iocs.length}</Badge>
          </h3>
          
          <div className="grid gap-3">
            {iocs.slice(0, 5).map((ioc) => (
              <div key={ioc.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <code className="bg-muted px-2 py-1 rounded text-sm">{ioc.value}</code>
                      <Badge variant={
                        ioc.threatLevel === ThreatLevel.CRITICAL ? 'destructive' :
                        ioc.threatLevel === ThreatLevel.HIGH ? 'destructive' :
                        ioc.threatLevel === ThreatLevel.MEDIUM ? 'default' : 'secondary'
                      }>
                        {ioc.threatLevel.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{ioc.confidence}% confidence</Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{ioc.description}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Source: {ioc.source}</span>
                      <span>First seen: {new Date(ioc.firstSeen).toLocaleDateString()}</span>
                      <span>Last seen: {new Date(ioc.lastSeen).toLocaleDateString()}</span>
                    </div>
                    
                    {ioc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ioc.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {iocs.length > 5 && (
              <div className="text-center">
                <Button variant="outline" size="sm">
                  Show {iocs.length - 5} more {type} IOCs
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Threat Timeline</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-6">
          {threats
            .filter(threat => selectedLevel === 'all' || threat.level === selectedLevel)
            .slice(0, 10)
            .map((threat, index) => (
              <div key={threat.id} className="relative flex items-start space-x-4">
                {/* Timeline dot */}
                <div className={`w-4 h-4 rounded-full border-2 border-background ${getThreatLevelColor(threat.level)} z-10`} />
                
                {/* Timeline content */}
                <div className="flex-1 min-w-0 pb-6">
                  <div className="flex items-center space-x-2 mb-1">
                    {getThreatTypeIcon(threat.threatType)}
                    <span className="font-medium">{threat.description}</span>
                    <Badge variant={
                      threat.level === ThreatLevel.CRITICAL ? 'destructive' :
                      threat.level === ThreatLevel.HIGH ? 'destructive' :
                      threat.level === ThreatLevel.MEDIUM ? 'default' : 'secondary'
                    }>
                      {threat.level.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Source: {threat.sourceIp} → Target: {threat.targetAsset}</div>
                    <div>Detected: {new Date(threat.detectedAt).toLocaleString()}</div>
                    {threat.location && (
                      <div>Location: {threat.location.city}, {threat.location.country}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Threat Intelligence</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as any)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">All Levels</option>
              <option value={ThreatLevel.CRITICAL}>Critical</option>
              <option value={ThreatLevel.HIGH}>High</option>
              <option value={ThreatLevel.MEDIUM}>Medium</option>
              <option value={ThreatLevel.LOW}>Low</option>
            </select>
          </div>
        </div>
        
        <div className="flex space-x-1">
          <Button
            variant={selectedView === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedView('map')}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Map
          </Button>
          <Button
            variant={selectedView === 'iocs' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedView('iocs')}
          >
            <Layers className="h-4 w-4 mr-2" />
            IOCs
          </Button>
          <Button
            variant={selectedView === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedView('timeline')}
          >
            <Activity className="h-4 w-4 mr-2" />
            Timeline
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {selectedView === 'map' && (
          <div className="space-y-6">
            {renderWorldMap()}
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Active Threat Locations</h3>
              {threatLocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No threat locations detected</p>
                </div>
              ) : (
                renderThreatLocations()
              )}
            </div>
          </div>
        )}
        
        {selectedView === 'iocs' && renderIOCs()}
        {selectedView === 'timeline' && renderTimeline()}
      </CardContent>
    </Card>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Target,
  Activity,
  Globe,
  Brain,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  Search,
  Map,
  Clock,
  Users,
  Server,
  Network,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { ThreatDetection, ThreatLevel, ThreatType, UserRole } from '@/lib/types';

interface MLThreatAnalysis {
  threatId: string;
  confidenceScore: number;
  behavioralAnomaly: number;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  mlModel: string;
  analysisTimestamp: string;
  indicators: {
    networkAnomaly: number;
    userBehaviorAnomaly: number;
    fileSystemAnomaly: number;
    processAnomaly: number;
  };
  predictions: {
    escalationProbability: number;
    impactPrediction: 'minimal' | 'moderate' | 'significant' | 'severe';
    recommendedActions: string[];
  };
}

interface ThreatGeolocation {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  threatCount: number;
  lastSeen: string;
}

interface ThreatConsoleProps {
  userRole: UserRole;
  className?: string;
}

export default function ThreatDetectionConsole({ userRole, className }: ThreatConsoleProps) {
  const [threats, setThreats] = useState<ThreatDetection[]>([
    {
      id: '1',
      threatType: ThreatType.UNAUTHORIZED_ACCESS,
      level: ThreatLevel.HIGH,
      sourceIp: '192.168.1.100',
      targetAsset: 'waste-mgmt-server-01',
      description: 'Multiple failed login attempts detected from suspicious IP address',
      detectedAt: new Date().toISOString(),
      status: 'open' as const,
      confidence: 87.5,
      location: {
        country: 'Unknown',
        city: 'Unknown',
        latitude: 40.7128,
        longitude: -74.0060
      }
    },
    {
      id: '2',
      threatType: ThreatType.MALWARE,
      level: ThreatLevel.CRITICAL,
      sourceIp: '10.0.0.45',
      targetAsset: 'route-optimization-service',
      description: 'Advanced persistent threat detected targeting route optimization algorithms',
      detectedAt: new Date(Date.now() - 3600000).toISOString(),
      status: 'in_progress' as const,
      confidence: 94.2,
      location: {
        country: 'Russia',
        city: 'Moscow',
        latitude: 55.7558,
        longitude: 37.6176
      }
    },
    {
      id: '3',
      threatType: ThreatType.DDOS,
      level: ThreatLevel.MEDIUM,
      sourceIp: '203.0.113.0',
      targetAsset: 'customer-portal',
      description: 'Distributed denial of service attack targeting customer portal infrastructure',
      detectedAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'open' as const,
      confidence: 76.8,
      location: {
        country: 'China',
        city: 'Beijing',
        latitude: 39.9042,
        longitude: 116.4074
      }
    }
  ]);

  const [mlAnalyses, setMlAnalyses] = useState<MLThreatAnalysis[]>([
    {
      threatId: '1',
      confidenceScore: 87.5,
      behavioralAnomaly: 92.3,
      riskAssessment: 'high',
      mlModel: 'ThreatNet-v2.1',
      analysisTimestamp: new Date().toISOString(),
      indicators: {
        networkAnomaly: 85.2,
        userBehaviorAnomaly: 94.1,
        fileSystemAnomaly: 12.4,
        processAnomaly: 23.7
      },
      predictions: {
        escalationProbability: 78.6,
        impactPrediction: 'moderate',
        recommendedActions: [
          'Isolate affected systems',
          'Reset user credentials',
          'Enable additional monitoring'
        ]
      }
    },
    {
      threatId: '2',
      confidenceScore: 94.2,
      behavioralAnomaly: 98.7,
      riskAssessment: 'critical',
      mlModel: 'DeepGuard-v3.0',
      analysisTimestamp: new Date(Date.now() - 1800000).toISOString(),
      indicators: {
        networkAnomaly: 97.3,
        userBehaviorAnomaly: 89.2,
        fileSystemAnomaly: 91.8,
        processAnomaly: 96.4
      },
      predictions: {
        escalationProbability: 92.1,
        impactPrediction: 'severe',
        recommendedActions: [
          'Immediate system quarantine',
          'Activate incident response team',
          'Notify executive leadership',
          'Prepare for business continuity measures'
        ]
      }
    }
  ]);

  const [threatLocations, setThreatLocations] = useState<ThreatGeolocation[]>([
    { country: 'Russia', city: 'Moscow', latitude: 55.7558, longitude: 37.6176, threatCount: 12, lastSeen: '2 hours ago' },
    { country: 'China', city: 'Beijing', latitude: 39.9042, longitude: 116.4074, threatCount: 8, lastSeen: '45 minutes ago' },
    { country: 'North Korea', city: 'Pyongyang', latitude: 39.0392, longitude: 125.7625, threatCount: 5, lastSeen: '1 hour ago' },
    { country: 'Iran', city: 'Tehran', latitude: 35.6892, longitude: 51.3890, threatCount: 3, lastSeen: '3 hours ago' }
  ]);

  const [selectedThreat, setSelectedThreat] = useState<ThreatDetection | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has access to threat detection
  const hasAccess = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRole);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const getThreatLevelColor = (level: ThreatLevel): string => {
    switch (level) {
      case ThreatLevel.CRITICAL: return 'text-red-600 bg-red-50 border-red-200';
      case ThreatLevel.HIGH: return 'text-orange-600 bg-orange-50 border-orange-200';
      case ThreatLevel.MEDIUM: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ThreatLevel.LOW: return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getThreatIcon = (type: ThreatType) => {
    switch (type) {
      case ThreatType.MALWARE: return <Shield className="h-4 w-4" />;
      case ThreatType.PHISHING: return <Eye className="h-4 w-4" />;
      case ThreatType.UNAUTHORIZED_ACCESS: return <Unlock className="h-4 w-4" />;
      case ThreatType.DATA_BREACH: return <Server className="h-4 w-4" />;
      case ThreatType.DDOS: return <Network className="h-4 w-4" />;
      case ThreatType.SUSPICIOUS_ACTIVITY: return <AlertCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredThreats = threats.filter(threat => {
    const levelMatch = filterLevel === 'all' || threat.level === filterLevel;
    const typeMatch = filterType === 'all' || threat.threatType === filterType;
    return levelMatch && typeMatch;
  });

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">
            You don't have permission to access the Threat Detection Console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Console Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Threat Detection Console</h2>
          <p className="text-gray-600">
            AI-powered threat monitoring and behavioral analysis
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isRealTimeActive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isRealTimeActive ? 'Real-time monitoring active' : 'Real-time monitoring paused'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRealTimeActive(!isRealTimeActive)}
            >
              {isRealTimeActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Threats</p>
                <p className="text-2xl font-bold">{threats.filter(t => t.status === 'open').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Brain className="h-4 w-4 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">ML Detection Rate</p>
                <p className="text-2xl font-bold">94.2%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold">12min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Globe className="h-4 w-4 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Global Coverage</p>
                <p className="text-2xl font-bold">99.8%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
        </div>
        
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Threat Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Threat Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="malware">Malware</SelectItem>
            <SelectItem value="phishing">Phishing</SelectItem>
            <SelectItem value="unauthorized_access">Unauthorized Access</SelectItem>
            <SelectItem value="data_breach">Data Breach</SelectItem>
            <SelectItem value="ddos">DDoS</SelectItem>
            <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline" className="ml-auto">
          {filteredThreats.length} threats displayed
        </Badge>
      </div>

      {/* Main Console */}
      <Tabs defaultValue="threats" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="threats">Active Threats</TabsTrigger>
          <TabsTrigger value="analysis">ML Analysis</TabsTrigger>
          <TabsTrigger value="geolocation">Threat Map</TabsTrigger>
          <TabsTrigger value="behavior">Behavioral Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="threats" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Threat List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredThreats.map((threat) => (
                <Card 
                  key={threat.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedThreat?.id === threat.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedThreat(threat)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getThreatLevelColor(threat.level)}`}>
                          {getThreatIcon(threat.threatType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{threat.threatType.replace('_', ' ').toUpperCase()}</h4>
                            <Badge variant={
                              threat.level === ThreatLevel.CRITICAL ? 'destructive' :
                              threat.level === ThreatLevel.HIGH ? 'destructive' :
                              'default'
                            }>
                              {threat.level.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{threat.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Source: {threat.sourceIp}</span>
                            <span>Target: {threat.targetAsset}</span>
                            <span>Confidence: {threat.confidence}%</span>
                            <span>{new Date(threat.detectedAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={
                          threat.status === 'open' ? 'bg-red-100 text-red-800' :
                          threat.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {threat.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Threat Details */}
            <div className="space-y-4">
              {selectedThreat ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Threat Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Threat ID:</span>
                        <p className="text-sm text-gray-900">{selectedThreat.id}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Source Location:</span>
                        <p className="text-sm text-gray-900">
                          {selectedThreat.location?.city}, {selectedThreat.location?.country}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Detection Time:</span>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedThreat.detectedAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Confidence Score:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Progress value={selectedThreat.confidence} className="flex-1" />
                          <span className="text-sm font-bold">{selectedThreat.confidence}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ML Analysis for Selected Threat */}
                  {mlAnalyses.find(analysis => analysis.threatId === selectedThreat.id) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Brain className="h-5 w-5 text-purple-600" />
                          <span>ML Analysis</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const analysis = mlAnalyses.find(a => a.threatId === selectedThreat.id)!;
                          return (
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-700">Risk Assessment:</span>
                                  <Badge className={getRiskColor(analysis.riskAssessment)}>
                                    {analysis.riskAssessment.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-700">Escalation Probability:</span>
                                  <span className="text-sm font-bold text-gray-900">
                                    {analysis.predictions.escalationProbability}%
                                  </span>
                                </div>
                              </div>

                              <div>
                                <span className="text-sm font-medium text-gray-700 block mb-2">
                                  Behavioral Indicators:
                                </span>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Network Anomaly</span>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={analysis.indicators.networkAnomaly} className="w-16 h-2" />
                                      <span className="text-xs font-medium">{analysis.indicators.networkAnomaly}%</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">User Behavior</span>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={analysis.indicators.userBehaviorAnomaly} className="w-16 h-2" />
                                      <span className="text-xs font-medium">{analysis.indicators.userBehaviorAnomaly}%</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">File System</span>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={analysis.indicators.fileSystemAnomaly} className="w-16 h-2" />
                                      <span className="text-xs font-medium">{analysis.indicators.fileSystemAnomaly}%</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Process Anomaly</span>
                                    <div className="flex items-center space-x-2">
                                      <Progress value={analysis.indicators.processAnomaly} className="w-16 h-2" />
                                      <span className="text-xs font-medium">{analysis.indicators.processAnomaly}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <span className="text-sm font-medium text-gray-700 block mb-2">
                                  Recommended Actions:
                                </span>
                                <div className="space-y-1">
                                  {analysis.predictions.recommendedActions.map((action, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <span className="text-xs text-gray-700">{action}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Select a threat to view detailed analysis</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {mlAnalyses.map((analysis) => {
              const threat = threats.find(t => t.id === analysis.threatId);
              return (
                <Card key={analysis.threatId}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <span>ML Analysis - {threat?.threatType.replace('_', ' ')}</span>
                    </CardTitle>
                    <CardDescription>
                      Model: {analysis.mlModel} | Confidence: {analysis.confidenceScore}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Behavioral Anomaly Score</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={analysis.behavioralAnomaly} className="w-24" />
                          <span className="text-sm font-bold">{analysis.behavioralAnomaly}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Escalation Probability</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={analysis.predictions.escalationProbability} className="w-24" />
                          <span className="text-sm font-bold">{analysis.predictions.escalationProbability}%</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-2">Impact Prediction:</span>
                        <Badge className={
                          analysis.predictions.impactPrediction === 'severe' ? 'bg-red-100 text-red-800' :
                          analysis.predictions.impactPrediction === 'significant' ? 'bg-orange-100 text-orange-800' :
                          analysis.predictions.impactPrediction === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {analysis.predictions.impactPrediction.toUpperCase()}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-2">Key Indicators:</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-600">Network:</span>
                            <span className="font-medium ml-1">{analysis.indicators.networkAnomaly}%</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-600">User:</span>
                            <span className="font-medium ml-1">{analysis.indicators.userBehaviorAnomaly}%</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-600">File System:</span>
                            <span className="font-medium ml-1">{analysis.indicators.fileSystemAnomaly}%</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-600">Process:</span>
                            <span className="font-medium ml-1">{analysis.indicators.processAnomaly}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="geolocation" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Map className="h-5 w-5 text-blue-600" />
                    <span>Global Threat Map</span>
                  </CardTitle>
                  <CardDescription>Geographic distribution of threat sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                    <div className="text-center space-y-2">
                      <Globe className="h-16 w-16 text-blue-400 mx-auto" />
                      <p className="text-lg font-medium text-blue-700">Interactive Threat Map</p>
                      <p className="text-sm text-blue-600">Real-time global threat visualization</p>
                      <p className="text-xs text-blue-500">Integration with Mapbox/Google Maps</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Threat Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {threatLocations.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{location.city}, {location.country}</div>
                          <div className="text-xs text-gray-600">Last seen: {location.lastSeen}</div>
                        </div>
                        <Badge variant={location.threatCount > 10 ? 'destructive' : location.threatCount > 5 ? 'default' : 'secondary'}>
                          {location.threatCount} threats
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <span>Behavioral Analysis Dashboard</span>
              </CardTitle>
              <CardDescription>
                AI-powered behavioral pattern analysis and anomaly detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">User Behavior Patterns</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm font-medium text-green-800">Normal Activity</span>
                      <span className="text-sm font-bold text-green-900">87.4%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-sm font-medium text-yellow-800">Suspicious Patterns</span>
                      <span className="text-sm font-bold text-yellow-900">8.2%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <span className="text-sm font-medium text-red-800">Anomalous Behavior</span>
                      <span className="text-sm font-bold text-red-900">4.4%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Network Traffic Analysis</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm font-medium text-blue-800">Baseline Traffic</span>
                      <span className="text-sm font-bold text-blue-900">92.1%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <span className="text-sm font-medium text-orange-800">Traffic Anomalies</span>
                      <span className="text-sm font-bold text-orange-900">5.8%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <span className="text-sm font-medium text-purple-800">Potential Threats</span>
                      <span className="text-sm font-bold text-purple-900">2.1%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
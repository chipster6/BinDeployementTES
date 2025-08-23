'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Truck, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

interface ExecutiveMetrics {
  revenue: {
    current: number;
    previous: number;
    growth: number;
    target: number;
    targetProgress: number;
  };
  customers: {
    total: number;
    new: number;
    churn: number;
    retention: number;
    satisfaction: number;
  };
  operations: {
    efficiency: number;
    costPerCollection: number;
    routeOptimization: number;
    fuelSavings: number;
    onTimeDelivery: number;
  };
  fleet: {
    utilization: number;
    maintenance: number;
    downtime: number;
    fuelEfficiency: number;
  };
}

interface TrendData {
  period: string;
  revenue: number;
  collections: number;
  efficiency: number;
}

export default function ExecutiveAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<ExecutiveMetrics>({
    revenue: {
      current: 245670,
      previous: 218450,
      growth: 12.5,
      target: 300000,
      targetProgress: 81.9
    },
    customers: {
      total: 312,
      new: 24,
      churn: 3,
      retention: 94.2,
      satisfaction: 4.7
    },
    operations: {
      efficiency: 87.3,
      costPerCollection: 24.50,
      routeOptimization: 15.2,
      fuelSavings: 18.7,
      onTimeDelivery: 96.4
    },
    fleet: {
      utilization: 83.5,
      maintenance: 95.2,
      downtime: 2.1,
      fuelEfficiency: 8.4
    }
  });

  const [trendData, setTrendData] = useState<TrendData[]>([
    { period: 'Q1', revenue: 201230, collections: 8945, efficiency: 82.1 },
    { period: 'Q2', revenue: 218450, collections: 9234, efficiency: 84.7 },
    { period: 'Q3', revenue: 235890, collections: 9567, efficiency: 86.2 },
    { period: 'Q4', revenue: 245670, collections: 9789, efficiency: 87.3 }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Analytics</h1>
          <p className="text-lg text-gray-600 mt-1">
            Strategic insights and operational intelligence for leadership decisions
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue KPI */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-800">Monthly Revenue</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-2">
              {formatCurrency(metrics.revenue.current)}
            </div>
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                +{formatPercentage(metrics.revenue.growth)} vs last month
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-green-700">Target Progress</span>
                <span className="font-medium text-green-800">
                  {formatPercentage(metrics.revenue.targetProgress)}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.revenue.targetProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-green-600">
                Target: {formatCurrency(metrics.revenue.target)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Growth KPI */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-800">Customer Growth</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-2">
              {metrics.customers.total}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">New this month</span>
                <span className="text-sm font-medium text-green-600">+{metrics.customers.new}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Churn rate</span>
                <span className="text-sm font-medium text-red-600">{metrics.customers.churn}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-blue-700">Retention Rate</span>
                <span className="font-medium text-blue-800">
                  {formatPercentage(metrics.customers.retention)}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.customers.retention}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Efficiency KPI */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-purple-800">Operational Efficiency</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-2">
              {formatPercentage(metrics.operations.efficiency)}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">Route optimization</span>
                <span className="text-sm font-medium text-green-600">
                  +{formatPercentage(metrics.operations.routeOptimization)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">Fuel savings</span>
                <span className="text-sm font-medium text-green-600">
                  {formatPercentage(metrics.operations.fuelSavings)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-purple-700">On-time delivery</span>
                <span className="font-medium text-purple-800">
                  {formatPercentage(metrics.operations.onTimeDelivery)}
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.operations.onTimeDelivery}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fleet Performance KPI */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-orange-800">Fleet Performance</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Truck className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 mb-2">
              {formatPercentage(metrics.fleet.utilization)}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700">Maintenance score</span>
                <span className="text-sm font-medium text-green-600">
                  {formatPercentage(metrics.fleet.maintenance)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700">Downtime</span>
                <span className="text-sm font-medium text-orange-600">
                  {formatPercentage(metrics.fleet.downtime)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-orange-700">Fuel efficiency</span>
                <span className="font-medium text-orange-800">
                  {metrics.fleet.fuelEfficiency} mpg
                </span>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.fleet.utilization}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends & Forecasting</TabsTrigger>
          <TabsTrigger value="profitability">Profitability Analysis</TabsTrigger>
          <TabsTrigger value="market">Market Position</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue Trend Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5 text-blue-600" />
                  <span>Revenue Trend Analysis</span>
                </CardTitle>
                <CardDescription>Quarterly revenue growth and forecasting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                  <div className="text-center space-y-2">
                    <LineChart className="h-12 w-12 text-blue-400 mx-auto" />
                    <p className="text-sm font-medium text-blue-700">Interactive Revenue Chart</p>
                    <p className="text-xs text-blue-600">Recharts/D3.js integration placeholder</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operational Efficiency Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Efficiency Improvements</span>
                </CardTitle>
                <CardDescription>Operational metrics and AI-driven insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trendData.map((period, index) => (
                    <div key={period.period} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-gray-900">{period.period}</div>
                        <Badge variant="outline" className="text-xs">
                          {formatPercentage(period.efficiency)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-600">
                          {period.collections.toLocaleString()} collections
                        </div>
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(period.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Predictive Analytics Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span>AI-Powered Predictions</span>
              </CardTitle>
              <CardDescription>Machine learning insights and forecasts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Next Month Revenue</span>
                    <Badge className="bg-green-100 text-green-800">85% Confidence</Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(278450)}
                  </div>
                  <p className="text-xs text-gray-600">
                    Based on seasonal trends and current growth
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Churn Risk</span>
                    <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    12 customers
                  </div>
                  <p className="text-xs text-gray-600">
                    Proactive retention campaign recommended
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Efficiency Gains</span>
                    <Badge className="bg-blue-100 text-blue-800">High Opportunity</Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    +{formatPercentage(8.5)}
                  </div>
                  <p className="text-xs text-gray-600">
                    Route optimization potential next quarter
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Operational cost breakdown and optimization opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-sm font-medium text-red-800">Fuel Costs</span>
                    <span className="text-sm font-bold text-red-900">$12,450/month</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-800">Labor Costs</span>
                    <span className="text-sm font-bold text-orange-900">$45,200/month</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <span className="text-sm font-medium text-yellow-800">Maintenance</span>
                    <span className="text-sm font-bold text-yellow-900">$8,750/month</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-green-800">Total Profit Margin</span>
                    <span className="text-sm font-bold text-green-900">34.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Streams</CardTitle>
                <CardDescription>Analysis of revenue sources and growth opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center border-2 border-dashed border-green-200">
                  <div className="text-center space-y-2">
                    <PieChart className="h-12 w-12 text-green-400 mx-auto" />
                    <p className="text-sm font-medium text-green-700">Revenue Distribution Chart</p>
                    <p className="text-xs text-green-600">Interactive breakdown by service type</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Competitive Position</CardTitle>
                <CardDescription>Market share and competitive analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Market Share</span>
                    <span className="text-sm font-bold text-blue-900">23.5%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Customer Satisfaction</span>
                    <span className="text-sm font-bold text-green-900">4.7/5.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Price Competitiveness</span>
                    <span className="text-sm font-bold text-orange-900">Above Average</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Opportunities</CardTitle>
                <CardDescription>Strategic expansion and improvement areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">Geographic expansion (Northeast)</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">Recycling service addition</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-800">AI optimization implementation</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Risk Assessment</span>
                </CardTitle>
                <CardDescription>Current business risks and mitigation strategies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="text-sm font-medium text-red-800">Fuel Price Volatility</p>
                      <p className="text-xs text-red-600">High impact on margins</p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">High Risk</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Driver Shortage</p>
                      <p className="text-xs text-yellow-600">Seasonal staffing challenges</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="text-sm font-medium text-green-800">Equipment Reliability</p>
                      <p className="text-xs text-green-600">Well-maintained fleet</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Low Risk</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Continuity</CardTitle>
                <CardDescription>Operational resilience and contingency planning</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Emergency Response</span>
                    <Badge className="bg-green-100 text-green-800">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Backup Fleet</span>
                    <Badge className="bg-green-100 text-green-800">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Insurance Coverage</span>
                    <Badge className="bg-green-100 text-green-800">Comprehensive</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Financial Reserve</span>
                    <Badge className="bg-yellow-100 text-yellow-800">Adequate</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
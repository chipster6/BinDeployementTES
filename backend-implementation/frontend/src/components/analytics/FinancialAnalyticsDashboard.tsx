'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3,
  CreditCard,
  Receipt,
  Target,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Filter,
  Calculator,
  Percent,
  Banknote
} from 'lucide-react';

interface RevenueMetrics {
  totalRevenue: number;
  monthlyGrowth: number;
  yearlyGrowth: number;
  averageRevenuePerCustomer: number;
  churnRate: number;
  customerLifetimeValue: number;
  monthlyRecurringRevenue: number;
  revenueTarget: number;
  targetProgress: number;
}

interface CostAnalysis {
  totalCosts: number;
  fuelCosts: number;
  laborCosts: number;
  maintenanceCosts: number;
  operationalCosts: number;
  costPerCollection: number;
  costOptimizationOpportunity: number;
  profitMargin: number;
}

interface CustomerFinancials {
  id: string;
  name: string;
  monthlyRevenue: number;
  annualContract: number;
  paymentStatus: 'current' | 'overdue' | 'pending';
  churnRisk: 'low' | 'medium' | 'high';
  profitability: number;
  collections: number;
  contractValue: number;
}

interface FinancialForecast {
  period: string;
  revenue: number;
  costs: number;
  profit: number;
  confidence: number;
}

export default function FinancialAnalyticsDashboard() {
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics>({
    totalRevenue: 245670,
    monthlyGrowth: 12.5,
    yearlyGrowth: 28.7,
    averageRevenuePerCustomer: 787,
    churnRate: 3.2,
    customerLifetimeValue: 18450,
    monthlyRecurringRevenue: 198500,
    revenueTarget: 300000,
    targetProgress: 81.9
  });

  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis>({
    totalCosts: 161400,
    fuelCosts: 42300,
    laborCosts: 78900,
    maintenanceCosts: 23600,
    operationalCosts: 16600,
    costPerCollection: 24.50,
    costOptimizationOpportunity: 15.3,
    profitMargin: 34.3
  });

  const [topCustomers, setTopCustomers] = useState<CustomerFinancials[]>([
    {
      id: 'CUST-001',
      name: 'Metro Shopping Center',
      monthlyRevenue: 12450,
      annualContract: 149400,
      paymentStatus: 'current',
      churnRisk: 'low',
      profitability: 42.3,
      collections: 89,
      contractValue: 149400
    },
    {
      id: 'CUST-002',
      name: 'Downtown Business Plaza',
      monthlyRevenue: 8970,
      annualContract: 107640,
      paymentStatus: 'current',
      churnRisk: 'low',
      profitability: 38.7,
      collections: 67,
      contractValue: 107640
    },
    {
      id: 'CUST-003',
      name: 'Industrial Complex A',
      monthlyRevenue: 15230,
      annualContract: 182760,
      paymentStatus: 'overdue',
      churnRisk: 'medium',
      profitability: 29.4,
      collections: 124,
      contractValue: 182760
    },
    {
      id: 'CUST-004',
      name: 'Residential District 1',
      monthlyRevenue: 6780,
      annualContract: 81360,
      paymentStatus: 'pending',
      churnRisk: 'high',
      profitability: 22.1,
      collections: 45,
      contractValue: 81360
    }
  ]);

  const [forecast, setForecast] = useState<FinancialForecast[]>([
    { period: 'Jan 2025', revenue: 278450, costs: 175200, profit: 103250, confidence: 92 },
    { period: 'Feb 2025', revenue: 285670, costs: 178900, profit: 106770, confidence: 89 },
    { period: 'Mar 2025', revenue: 292100, costs: 182100, profit: 110000, confidence: 86 },
    { period: 'Apr 2025', revenue: 298800, costs: 185600, profit: 113200, confidence: 83 },
    { period: 'May 2025', revenue: 305200, costs: 189200, profit: 116000, confidence: 80 },
    { period: 'Jun 2025', revenue: 312000, costs: 192800, profit: 119200, confidence: 77 }
  ]);

  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [lastUpdated, setLastUpdated] = useState(new Date());

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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'text-green-600 bg-green-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getChurnRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const refreshData = async () => {
    setLastUpdated(new Date());
    // Simulate API call for real-time financial data
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Analytics</h1>
          <p className="text-lg text-gray-600 mt-1">
            Revenue optimization, cost analysis, and financial forecasting for strategic decision making
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            className="h-9"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
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

      {/* Financial KPIs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue KPI */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-800">Total Revenue</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-2">
              {formatCurrency(revenueMetrics.totalRevenue)}
            </div>
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                +{formatPercentage(revenueMetrics.monthlyGrowth)} this month
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-green-700">Annual Target Progress</span>
                <span className="font-medium text-green-800">
                  {formatPercentage(revenueMetrics.targetProgress)}
                </span>
              </div>
              <Progress value={revenueMetrics.targetProgress} className="h-2" />
              <div className="text-xs text-green-600">
                Target: {formatCurrency(revenueMetrics.revenueTarget)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Margin KPI */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-800">Profit Margin</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Percent className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-2">
              {formatPercentage(costAnalysis.profitMargin)}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Revenue</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(revenueMetrics.totalRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Total Costs</span>
                <span className="text-sm font-medium text-red-600">
                  {formatCurrency(costAnalysis.totalCosts)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-blue-700">Profit</span>
                <span className="font-medium text-blue-800">
                  {formatCurrency(revenueMetrics.totalRevenue - costAnalysis.totalCosts)}
                </span>
              </div>
              <Progress value={costAnalysis.profitMargin} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Customer Metrics KPI */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-purple-800">Customer Metrics</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-2">
              {formatCurrency(revenueMetrics.averageRevenuePerCustomer)}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">LTV</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(revenueMetrics.customerLifetimeValue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">Churn rate</span>
                <span className="text-sm font-medium text-red-600">
                  {formatPercentage(revenueMetrics.churnRate)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-purple-700">MRR</span>
                <span className="font-medium text-purple-800">
                  {formatCurrency(revenueMetrics.monthlyRecurringRevenue)}
                </span>
              </div>
              <Progress value={85.7} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Cost Optimization KPI */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-orange-800">Cost Optimization</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 mb-2">
              {formatPercentage(costAnalysis.costOptimizationOpportunity)}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700">Cost per collection</span>
                <span className="text-sm font-medium text-orange-600">
                  ${costAnalysis.costPerCollection}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700">Savings potential</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(costAnalysis.totalCosts * costAnalysis.costOptimizationOpportunity / 100)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-orange-700">Monthly savings target</span>
                <span className="font-medium text-orange-800">
                  {formatCurrency(24670)}
                </span>
              </div>
              <Progress value={costAnalysis.costOptimizationOpportunity} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="costs">Cost Management</TabsTrigger>
          <TabsTrigger value="customers">Customer Profitability</TabsTrigger>
          <TabsTrigger value="forecasting">Financial Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Revenue Growth Trends</span>
                </CardTitle>
                <CardDescription>Monthly and annual revenue progression analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                  <div className="text-center space-y-2">
                    <BarChart3 className="h-12 w-12 text-blue-400 mx-auto" />
                    <p className="text-sm font-medium text-blue-700">Revenue Trend Chart</p>
                    <p className="text-xs text-blue-600">Interactive revenue visualization with growth indicators</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      +{formatPercentage(revenueMetrics.monthlyGrowth)}
                    </div>
                    <p className="text-xs text-gray-600">Monthly Growth</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      +{formatPercentage(revenueMetrics.yearlyGrowth)}
                    </div>
                    <p className="text-xs text-gray-600">Annual Growth</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-green-600" />
                  <span>Revenue Sources</span>
                </CardTitle>
                <CardDescription>Breakdown of revenue streams and service types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <span className="text-sm font-medium text-green-800">Commercial Contracts</span>
                      <p className="text-xs text-green-600">185 active contracts</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-900">{formatCurrency(147300)}</div>
                      <div className="text-xs text-green-600">60% of revenue</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <span className="text-sm font-medium text-blue-800">Residential Services</span>
                      <p className="text-xs text-blue-600">127 households</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-900">{formatCurrency(73400)}</div>
                      <div className="text-xs text-blue-600">30% of revenue</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <span className="text-sm font-medium text-purple-800">Special Services</span>
                      <p className="text-xs text-purple-600">Extra pickups, bulk items</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-900">{formatCurrency(24970)}</div>
                      <div className="text-xs text-purple-600">10% of revenue</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance Tracking</CardTitle>
              <CardDescription>Key revenue metrics and targets for current period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Monthly Target</span>
                    <Badge className="bg-blue-100 text-blue-800">Target</Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(revenueMetrics.revenueTarget)}
                  </div>
                  <Progress value={revenueMetrics.targetProgress} className="h-2" />
                  <p className="text-xs text-gray-600">
                    {formatPercentage(revenueMetrics.targetProgress)} achieved
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">New Contracts</span>
                    <Badge className="bg-green-100 text-green-800">Growth</Badge>
                  </div>
                  <div className="text-2xl font-bold text-green-600">24</div>
                  <div className="text-xs text-green-600">+{formatCurrency(18750)} monthly value</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Contract Renewals</span>
                    <Badge className="bg-purple-100 text-purple-800">Retention</Badge>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">96.8%</div>
                  <div className="text-xs text-purple-600">Above industry average</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Price Optimization</span>
                    <Badge className="bg-orange-100 text-orange-800">Opportunity</Badge>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">+8.5%</div>
                  <div className="text-xs text-orange-600">Revenue increase potential</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5 text-red-600" />
                  <span>Cost Structure Analysis</span>
                </CardTitle>
                <CardDescription>Operational cost breakdown and optimization opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-red-600" />
                      <div>
                        <span className="text-sm font-medium text-red-800">Labor Costs</span>
                        <p className="text-xs text-red-600">Drivers, support staff</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-900">{formatCurrency(costAnalysis.laborCosts)}</div>
                      <div className="text-xs text-red-600">48.9% of costs</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-3">
                      <Banknote className="h-5 w-5 text-orange-600" />
                      <div>
                        <span className="text-sm font-medium text-orange-800">Fuel Costs</span>
                        <p className="text-xs text-orange-600">Fleet fuel consumption</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-900">{formatCurrency(costAnalysis.fuelCosts)}</div>
                      <div className="text-xs text-orange-600">26.2% of costs</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                      <Package className="h-5 w-5 text-yellow-600" />
                      <div>
                        <span className="text-sm font-medium text-yellow-800">Maintenance</span>
                        <p className="text-xs text-yellow-600">Vehicle maintenance</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-900">{formatCurrency(costAnalysis.maintenanceCosts)}</div>
                      <div className="text-xs text-yellow-600">14.6% of costs</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      <div>
                        <span className="text-sm font-medium text-blue-800">Operational</span>
                        <p className="text-xs text-blue-600">Office, insurance, other</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-900">{formatCurrency(costAnalysis.operationalCosts)}</div>
                      <div className="text-xs text-blue-600">10.3% of costs</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Optimization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span>Optimization Opportunities</span>
                </CardTitle>
                <CardDescription>AI-identified cost reduction strategies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="text-sm font-medium text-green-800">Route Optimization</p>
                      <p className="text-xs text-green-600">Fuel savings through AI routing</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-900">{formatCurrency(8470)}</div>
                      <div className="text-xs text-green-600">Monthly savings</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Predictive Maintenance</p>
                      <p className="text-xs text-blue-600">Prevent costly breakdowns</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-900">{formatCurrency(5620)}</div>
                      <div className="text-xs text-blue-600">Monthly savings</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <p className="text-sm font-medium text-purple-800">Schedule Optimization</p>
                      <p className="text-xs text-purple-600">Labor efficiency improvements</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-900">{formatCurrency(10580)}</div>
                      <div className="text-xs text-purple-600">Monthly savings</div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">Total Potential Savings</span>
                      <div className="text-xl font-bold text-green-600">{formatCurrency(24670)}</div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatPercentage((24670 / costAnalysis.totalCosts) * 100)} cost reduction
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Trend Analysis</CardTitle>
              <CardDescription>Historical cost patterns and future projections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg flex items-center justify-center border-2 border-dashed border-red-200">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-12 w-12 text-red-400 mx-auto" />
                  <p className="text-sm font-medium text-red-700">Cost Trend Visualization</p>
                  <p className="text-xs text-red-600">Historical and projected cost analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {/* Top Customers by Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Customer Profitability Analysis</span>
              </CardTitle>
              <CardDescription>Revenue and profitability metrics by customer segment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCustomers.map((customer) => (
                  <div key={customer.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <span className="font-medium text-gray-900">{customer.name}</span>
                          <p className="text-sm text-gray-600">{customer.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPaymentStatusColor(customer.paymentStatus)}>
                          {customer.paymentStatus}
                        </Badge>
                        <Badge className={getChurnRiskColor(customer.churnRisk)}>
                          {customer.churnRisk} risk
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Monthly Revenue</span>
                        <div className="font-medium text-green-600">{formatCurrency(customer.monthlyRevenue)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Annual Contract</span>
                        <div className="font-medium text-blue-600">{formatCurrency(customer.annualContract)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Profitability</span>
                        <div className="font-medium text-purple-600">{formatPercentage(customer.profitability)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Collections/Month</span>
                        <div className="font-medium text-orange-600">{customer.collections}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Profitability Score</span>
                        <span className="font-medium">{formatPercentage(customer.profitability)}</span>
                      </div>
                      <Progress value={customer.profitability} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Segments */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">High-Value Customers</CardTitle>
                <CardDescription>Top 20% revenue contributors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-green-600">67</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Revenue contribution</span>
                      <span className="font-medium">78.5%</span>
                    </div>
                    <Progress value={78.5} className="h-2" />
                  </div>
                  <div className="text-xs text-gray-600">
                    Average revenue: {formatCurrency(2847)}/month
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">At-Risk Customers</CardTitle>
                <CardDescription>Churn risk analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-red-600">12</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Revenue at risk</span>
                      <span className="font-medium">{formatCurrency(47850)}</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                  <div className="text-xs text-red-600">
                    Immediate attention required
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Growth Opportunities</CardTitle>
                <CardDescription>Upsell potential</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-blue-600">89</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Upsell potential</span>
                      <span className="font-medium">{formatCurrency(156000)}</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                  <div className="text-xs text-blue-600">
                    Additional services opportunity
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          {/* Financial Forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span>Financial Forecast (6-Month)</span>
              </CardTitle>
              <CardDescription>AI-powered revenue and cost predictions with confidence intervals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecast.map((period, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{period.period}</span>
                      <Badge 
                        className={
                          period.confidence >= 85 ? 'bg-green-100 text-green-800' :
                          period.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {period.confidence}% confidence
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Revenue</div>
                        <div className="text-lg font-bold text-green-600">{formatCurrency(period.revenue)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Costs</div>
                        <div className="text-lg font-bold text-red-600">{formatCurrency(period.costs)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Profit</div>
                        <div className="text-lg font-bold text-blue-600">{formatCurrency(period.profit)}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Profit Margin</span>
                        <span className="font-medium">
                          {formatPercentage((period.profit / period.revenue) * 100)}
                        </span>
                      </div>
                      <Progress value={(period.profit / period.revenue) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scenario Analysis */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Best Case Scenario</CardTitle>
                <CardDescription>Optimistic projections with growth acceleration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-bold text-green-600">+35% Revenue Growth</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">6-Month Revenue</span>
                      <span className="font-medium">{formatCurrency(385000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Profit Margin</span>
                      <span className="font-medium">42.1%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conservative Scenario</CardTitle>
                <CardDescription>Conservative projections with market constraints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <ArrowDownRight className="h-5 w-5 text-orange-600" />
                    <span className="text-lg font-bold text-orange-600">+8% Revenue Growth</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">6-Month Revenue</span>
                      <span className="font-medium">{formatCurrency(275000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Profit Margin</span>
                      <span className="font-medium">28.7%</span>
                    </div>
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
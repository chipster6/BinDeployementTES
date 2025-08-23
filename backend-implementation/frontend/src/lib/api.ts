import { 
  ApiResponse, 
  AuthResponse, 
  LoginCredentials, 
  RegisterData, 
  User, 
  Bin, 
  Customer,
  MonitoringMetrics,
  Alert,
  SystemHealth,
  VaultSecret,
  DockerSecret,
  SecretRotationConfig,
  SecretAccessLog,
  Migration,
  MigrationPlan,
  MigrationExecution,
  DatabaseBackup,
  ExternalServiceStatus,
  ServiceCostMetrics,
  FallbackStrategy,
  FeatureFlag,
  ABTest,
  MLModelMetrics,
  MLModelDeployment,
  AIPipelineRun,
  DeploymentStatus,
  InfrastructureStatus,
  // Route optimization types
  OptimizationRequest,
  RouteModification,
  OptimizedRoute,
  OptimizationMetrics,
  // Predictive analytics types
  ForecastRequest,
  ForecastResult,
  ProphetTrainingRequest,
  LightGBMTrainingRequest,
  ModelDiagnostics,
  // Security & compliance types
  ThreatAnalysisRequest,
  ThreatAnalysisResult,
  SOC2ComplianceStatus,
  HSMKeyInfo,
  HSMEncryptionResult,
  HSMDecryptionResult,
  // External services types
  TrafficOptimizationRequest,
  TrafficOptimizationResult,
  ServiceCostAnalysis,
  // Queue types
  QueueStats,
  JobInfo
} from './types';
import API_ENDPOINTS from './api-endpoints';
import { webSocketClient } from './websocket-client';

// Enhanced API Client Types
export interface RequestConfig extends RequestInit {
  timeout?: number;
  retry?: {
    attempts?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
    retryCondition?: (error: ApiError) => boolean;
  };
}

export interface ApiError extends Error {
  code?: string;
  status?: number;
  details?: any;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isRetryable?: boolean;
}

export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor {
  onFulfilled?: (response: Response) => Response | Promise<Response>;
  onRejected?: (error: ApiError) => any;
}

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetryConfig = {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential' as const,
    retryCondition: (error: ApiError) => {
      return error.isNetworkError || 
             error.isTimeoutError || 
             (error.status !== undefined && error.status >= 500);
    }
  };
  private networkStatus: NetworkStatus = { isOnline: true };

  constructor() {
    this.baseUrl = API_BASE_URL;
    // Try to get tokens from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.refreshToken = localStorage.getItem('refresh_token');
      this.initializeNetworkMonitoring();
    }
  }

  setToken(token: string, refreshToken?: string) {
    this.token = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
    }
    // Update WebSocket client token
    webSocketClient.setToken(token);
  }

  clearToken() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
    // Clear WebSocket client token and disconnect
    webSocketClient.clearToken();
    webSocketClient.disconnectAll();
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private async refreshTokenRequest(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }

      if (data.token) {
        this.setToken(data.token, data.refreshToken);
        return true;
      }

      return false;
    } catch (error) {
      this.clearToken();
      return false;
    }
  }

  private async handleTokenRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshed = await this.refreshTokenRequest();
      
      if (refreshed) {
        this.processQueue(null, this.token);
        return this.token;
      } else {
        this.processQueue(new Error('Token refresh failed'), null);
        return null;
      }
    } catch (error) {
      this.processQueue(error, null);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  // Network monitoring setup
  private initializeNetworkMonitoring(): void {
    if ('navigator' in window && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.networkStatus = {
          isOnline: navigator.onLine,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        };
        
        connection.addEventListener('change', () => {
          this.networkStatus = {
            isOnline: navigator.onLine,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          };
        });
      }
    }
    
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
    });
    
    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
    });
  }

  // Request/Response Interceptors
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Network status getter
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  // Create API Error
  private createApiError(
    message: string,
    code?: string,
    status?: number,
    details?: any,
    isNetworkError = false,
    isTimeoutError = false
  ): ApiError {
    const error = new Error(message) as ApiError;
    error.name = 'ApiError';
    error.code = code;
    error.status = status;
    error.details = details;
    error.isNetworkError = isNetworkError;
    error.isTimeoutError = isTimeoutError;
    error.isRetryable = isNetworkError || isTimeoutError || (status !== undefined && status >= 500);
    return error;
  }

  // Sleep utility for retry delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Calculate retry delay
  private calculateRetryDelay(attempt: number, baseDelay: number, backoff: 'linear' | 'exponential'): number {
    if (backoff === 'exponential') {
      return baseDelay * Math.pow(2, attempt - 1);
    }
    return baseDelay * attempt;
  }

  // Enhanced request method with retry, timeout, and error handling
  private async request<T>(
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    // Check network connectivity
    if (!this.networkStatus.isOnline) {
      return {
        success: false,
        message: 'No internet connection available',
        error: 'NETWORK_OFFLINE'
      };
    }

    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.defaultTimeout;
    const retryConfig = { ...this.defaultRetryConfig, ...options.retry };
    
    let config: RequestConfig = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    // Remove custom properties from config before fetch
    const { timeout: _, retry: __, ...fetchConfig } = config;

    let lastError: ApiError;
    
    for (let attempt = 1; attempt <= retryConfig.attempts; attempt++) {
      try {
        // Create abort controller for timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, timeout);

        try {
          const response = await fetch(url, {
            ...fetchConfig,
            signal: abortController.signal
          });
          
          clearTimeout(timeoutId);

          // Handle 401 Unauthorized - Token Refresh
          if (response.status === 401 && this.token && endpoint !== '/auth/refresh') {
            const refreshed = await this.handleTokenRefresh();
            if (refreshed) {
              // Retry request with new token
              const retryConfig: RequestConfig = {
                ...fetchConfig,
                headers: {
                  ...fetchConfig.headers,
                  Authorization: `Bearer ${this.token}`
                }
              };
              const retryResponse = await fetch(url, retryConfig);
              return this.processResponse<T>(retryResponse);
            } else {
              // Token refresh failed, redirect to login
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
              return {
                success: false,
                message: 'Authentication failed. Please log in again.',
                error: 'AUTH_FAILED'
              };
            }
          }

          return this.processResponse<T>(response);
          
        } catch (fetchError) {
          clearTimeout(timeoutId);
          
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            lastError = this.createApiError(
              `Request timeout after ${timeout}ms`,
              'TIMEOUT',
              undefined,
              undefined,
              false,
              true
            );
          } else {
            lastError = this.createApiError(
              'Network request failed',
              'NETWORK_ERROR',
              undefined,
              fetchError,
              true,
              false
            );
          }
          
          throw lastError;
        }
        
      } catch (error) {
        const apiError = error instanceof Error && (error as any).isRetryable !== undefined
          ? error as ApiError
          : this.createApiError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR',
              undefined,
              error,
              true
            );
        
        lastError = apiError;

        // Apply response interceptors for errors
        for (const interceptor of this.responseInterceptors) {
          if (interceptor.onRejected) {
            try {
              await interceptor.onRejected(apiError);
            } catch (interceptorError) {
              console.warn('Response interceptor error:', interceptorError);
            }
          }
        }

        // Check if we should retry
        const shouldRetry = attempt < retryConfig.attempts && retryConfig.retryCondition(apiError);
        
        if (!shouldRetry) {
          break;
        }

        // Calculate and wait for retry delay
        const delay = this.calculateRetryDelay(attempt, retryConfig.delay, retryConfig.backoff);
        await this.sleep(delay);
      }
    }

    // All retry attempts failed
    return {
      success: false,
      message: lastError.message || 'Request failed after multiple attempts',
      error: lastError.code || 'REQUEST_FAILED'
    };
  }

  // Process response and apply response interceptors
  private async processResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      // Apply response interceptors
      let processedResponse = response;
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onFulfilled) {
          processedResponse = await interceptor.onFulfilled(processedResponse);
        }
      }

      let data: any;
      try {
        data = await processedResponse.json();
      } catch (parseError) {
        // Handle non-JSON responses
        const text = await processedResponse.text();
        if (processedResponse.ok) {
          return {
            success: true,
            message: 'Success',
            data: text as any
          };
        } else {
          return {
            success: false,
            message: text || `HTTP Error ${processedResponse.status}`,
            error: `HTTP_${processedResponse.status}`
          };
        }
      }

      if (!processedResponse.ok) {
        return {
          success: false,
          message: data.message || `HTTP Error ${processedResponse.status}`,
          error: data.error || `HTTP_${processedResponse.status}`,
          errors: data.errors,
        };
      }

      return {
        success: true,
        message: data.message || 'Success',
        data: data.data || data,
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to process response',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      const authData = response.data as AuthResponse;
      if (authData.token) {
        this.setToken(authData.token);
      }
      return authData;
    }

    return {
      success: false,
      message: response.message || 'Login failed',
    };
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      const authData = response.data as AuthResponse;
      if (authData.token) {
        this.setToken(authData.token);
      }
      return authData;
    }

    return {
      success: false,
      message: response.message || 'Registration failed',
    };
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Even if logout fails on server, clear local storage
      console.warn('Logout request failed:', error);
    } finally {
      this.clearToken();
    }
  }

  // User endpoints
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users');
  }

  async createUser(userData: RegisterData): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Bin endpoints
  async getBins(): Promise<ApiResponse<Bin[]>> {
    return this.request<Bin[]>('/bins');
  }

  async getBin(id: string): Promise<ApiResponse<Bin>> {
    return this.request<Bin>(`/bins/${id}`);
  }

  async createBin(binData: Partial<Bin>): Promise<ApiResponse<Bin>> {
    return this.request<Bin>('/bins', {
      method: 'POST',
      body: JSON.stringify(binData),
    });
  }

  async updateBin(id: string, binData: Partial<Bin>): Promise<ApiResponse<Bin>> {
    return this.request<Bin>(`/bins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(binData),
    });
  }

  async deleteBin(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/bins/${id}`, {
      method: 'DELETE',
    });
  }

  // Customer endpoints
  async getCustomers(): Promise<ApiResponse<Customer[]>> {
    return this.request<Customer[]>('/customers');
  }

  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    return this.request<Customer>(`/customers/${id}`);
  }

  async createCustomer(customerData: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(id: string, customerData: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return this.request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  }

  async deleteCustomer(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // MONITORING & OBSERVABILITY ENDPOINTS
  // ============================================================================

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return this.request<SystemHealth>('/monitoring/health');
  }

  async getMetrics(timeRange?: string): Promise<ApiResponse<MonitoringMetrics[]>> {
    const params = timeRange ? `?range=${timeRange}` : '';
    return this.request<MonitoringMetrics[]>(`/monitoring/metrics${params}`);
  }

  async getAlerts(status?: 'firing' | 'resolved'): Promise<ApiResponse<Alert[]>> {
    const params = status ? `?status=${status}` : '';
    return this.request<Alert[]>(`/monitoring/alerts${params}`);
  }

  async acknowledgeAlert(alertId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/monitoring/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  async silenceAlert(alertId: string, duration: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/monitoring/alerts/${alertId}/silence`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  }

  // ============================================================================
  // SECRETS MANAGEMENT ENDPOINTS
  // ============================================================================

  async getVaultSecrets(path?: string): Promise<ApiResponse<VaultSecret[]>> {
    const params = path ? `?path=${path}` : '';
    return this.request<VaultSecret[]>(`/secrets/vault${params}`);
  }

  async createVaultSecret(path: string, data: Record<string, any>): Promise<ApiResponse<VaultSecret>> {
    return this.request<VaultSecret>('/secrets/vault', {
      method: 'POST',
      body: JSON.stringify({ path, data }),
    });
  }

  async updateVaultSecret(path: string, data: Record<string, any>): Promise<ApiResponse<VaultSecret>> {
    return this.request<VaultSecret>(`/secrets/vault/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVaultSecret(path: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/secrets/vault/${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  }

  async getDockerSecrets(): Promise<ApiResponse<DockerSecret[]>> {
    return this.request<DockerSecret[]>('/secrets/docker');
  }

  async createDockerSecret(name: string, data: string): Promise<ApiResponse<DockerSecret>> {
    return this.request<DockerSecret>('/secrets/docker', {
      method: 'POST',
      body: JSON.stringify({ name, data }),
    });
  }

  async deleteDockerSecret(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/secrets/docker/${id}`, {
      method: 'DELETE',
    });
  }

  async getSecretRotationConfigs(): Promise<ApiResponse<SecretRotationConfig[]>> {
    return this.request<SecretRotationConfig[]>('/secrets/rotation');
  }

  async updateSecretRotationConfig(secretName: string, config: Partial<SecretRotationConfig>): Promise<ApiResponse<SecretRotationConfig>> {
    return this.request<SecretRotationConfig>(`/secrets/rotation/${secretName}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async rotateSecret(secretName: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/secrets/rotation/${secretName}/rotate`, {
      method: 'POST',
    });
  }

  async getSecretAccessLogs(secretName?: string): Promise<ApiResponse<SecretAccessLog[]>> {
    const params = secretName ? `?secret=${secretName}` : '';
    return this.request<SecretAccessLog[]>(`/secrets/audit${params}`);
  }

  // ============================================================================
  // DATABASE MIGRATION ENDPOINTS
  // ============================================================================

  async getMigrations(): Promise<ApiResponse<Migration[]>> {
    return this.request<Migration[]>('/migrations');
  }

  async getMigration(id: string): Promise<ApiResponse<Migration>> {
    return this.request<Migration>(`/migrations/${id}`);
  }

  async getMigrationPlans(): Promise<ApiResponse<MigrationPlan[]>> {
    return this.request<MigrationPlan[]>('/migrations/plans');
  }

  async createMigrationPlan(plan: Omit<MigrationPlan, 'id' | 'created_at'>): Promise<ApiResponse<MigrationPlan>> {
    return this.request<MigrationPlan>('/migrations/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  async executeMigrationPlan(planId: string): Promise<ApiResponse<MigrationExecution>> {
    return this.request<MigrationExecution>(`/migrations/plans/${planId}/execute`, {
      method: 'POST',
    });
  }

  async getMigrationExecution(executionId: string): Promise<ApiResponse<MigrationExecution>> {
    return this.request<MigrationExecution>(`/migrations/executions/${executionId}`);
  }

  async rollbackMigrationExecution(executionId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/migrations/executions/${executionId}/rollback`, {
      method: 'POST',
    });
  }

  async getDatabaseBackups(): Promise<ApiResponse<DatabaseBackup[]>> {
    return this.request<DatabaseBackup[]>('/migrations/backups');
  }

  async createDatabaseBackup(name: string, type: 'full' | 'incremental' | 'differential'): Promise<ApiResponse<DatabaseBackup>> {
    return this.request<DatabaseBackup>('/migrations/backups', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
  }

  async downloadDatabaseBackup(backupId: string): Promise<ApiResponse<{ download_url: string }>> {
    return this.request<{ download_url: string }>(`/migrations/backups/${backupId}/download`);
  }

  // ============================================================================
  // EXTERNAL SERVICE ENDPOINTS
  // ============================================================================

  async getExternalServiceStatus(): Promise<ApiResponse<ExternalServiceStatus[]>> {
    return this.request<ExternalServiceStatus[]>('/external/status');
  }

  async getServiceCostMetrics(): Promise<ApiResponse<ServiceCostMetrics[]>> {
    return this.request<ServiceCostMetrics[]>('/external/costs');
  }

  async getFallbackStrategies(): Promise<ApiResponse<FallbackStrategy[]>> {
    return this.request<FallbackStrategy[]>('/external/fallbacks');
  }

  async activateFallback(serviceName: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/external/fallbacks/${serviceName}/activate`, {
      method: 'POST',
    });
  }

  async deactivateFallback(serviceName: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/external/fallbacks/${serviceName}/deactivate`, {
      method: 'POST',
    });
  }

  async testExternalService(serviceName: string): Promise<ApiResponse<{ status: string; response_time: number }>> {
    return this.request<{ status: string; response_time: number }>(`/external/test/${serviceName}`, {
      method: 'POST',
    });
  }

  // ============================================================================
  // AI/ML FEATURE MANAGEMENT ENDPOINTS
  // ============================================================================

  async getFeatureFlags(): Promise<ApiResponse<FeatureFlag[]>> {
    return this.request<FeatureFlag[]>('/features/flags');
  }

  async createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FeatureFlag>> {
    return this.request<FeatureFlag>('/features/flags', {
      method: 'POST',
      body: JSON.stringify(flag),
    });
  }

  async updateFeatureFlag(id: string, flag: Partial<FeatureFlag>): Promise<ApiResponse<FeatureFlag>> {
    return this.request<FeatureFlag>(`/features/flags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(flag),
    });
  }

  async toggleFeatureFlag(id: string): Promise<ApiResponse<FeatureFlag>> {
    return this.request<FeatureFlag>(`/features/flags/${id}/toggle`, {
      method: 'POST',
    });
  }

  async getABTests(): Promise<ApiResponse<ABTest[]>> {
    return this.request<ABTest[]>('/features/ab-tests');
  }

  async createABTest(test: Omit<ABTest, 'id' | 'created_at' | 'current_sample_size' | 'results'>): Promise<ApiResponse<ABTest>> {
    return this.request<ABTest>('/features/ab-tests', {
      method: 'POST',
      body: JSON.stringify(test),
    });
  }

  async startABTest(id: string): Promise<ApiResponse<ABTest>> {
    return this.request<ABTest>(`/features/ab-tests/${id}/start`, {
      method: 'POST',
    });
  }

  async stopABTest(id: string): Promise<ApiResponse<ABTest>> {
    return this.request<ABTest>(`/features/ab-tests/${id}/stop`, {
      method: 'POST',
    });
  }

  async getMLModels(): Promise<ApiResponse<MLModelMetrics[]>> {
    return this.request<MLModelMetrics[]>('/ml/models');
  }

  async getMLModelDeployments(): Promise<ApiResponse<MLModelDeployment[]>> {
    return this.request<MLModelDeployment[]>('/ml/deployments');
  }

  async deployMLModel(deployment: Omit<MLModelDeployment, 'id' | 'deployed_at' | 'status'>): Promise<ApiResponse<MLModelDeployment>> {
    return this.request<MLModelDeployment>('/ml/deployments', {
      method: 'POST',
      body: JSON.stringify(deployment),
    });
  }

  async getAIPipelineRuns(): Promise<ApiResponse<AIPipelineRun[]>> {
    return this.request<AIPipelineRun[]>('/ml/pipelines');
  }

  async triggerAIPipeline(pipelineName: string, params?: Record<string, any>): Promise<ApiResponse<AIPipelineRun>> {
    return this.request<AIPipelineRun>('/ml/pipelines/trigger', {
      method: 'POST',
      body: JSON.stringify({ pipeline_name: pipelineName, parameters: params }),
    });
  }

  // ============================================================================
  // PRODUCTION OPERATIONS ENDPOINTS
  // ============================================================================

  async getInfrastructureStatus(environment?: 'development' | 'staging' | 'production'): Promise<ApiResponse<InfrastructureStatus>> {
    const params = environment ? `?env=${environment}` : '';
    return this.request<InfrastructureStatus>(`/operations/infrastructure${params}`);
  }

  async getDeployments(): Promise<ApiResponse<DeploymentStatus[]>> {
    return this.request<DeploymentStatus[]>('/operations/deployments');
  }

  async createDeployment(deployment: {
    environment: 'staging' | 'production';
    version: string;
    strategy: 'blue_green' | 'rolling' | 'canary' | 'recreate';
  }): Promise<ApiResponse<DeploymentStatus>> {
    return this.request<DeploymentStatus>('/operations/deployments', {
      method: 'POST',
      body: JSON.stringify(deployment),
    });
  }

  async getDeployment(id: string): Promise<ApiResponse<DeploymentStatus>> {
    return this.request<DeploymentStatus>(`/operations/deployments/${id}`);
  }

  async rollbackDeployment(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/operations/deployments/${id}/rollback`, {
      method: 'POST',
    });
  }

  async restartService(serviceName: string, environment: string): Promise<ApiResponse<void>> {
    return this.request<void>('/operations/services/restart', {
      method: 'POST',
      body: JSON.stringify({ service_name: serviceName, environment }),
    });
  }

  async scaleService(serviceName: string, environment: string, replicas: number): Promise<ApiResponse<void>> {
    return this.request<void>('/operations/services/scale', {
      method: 'POST',
      body: JSON.stringify({ service_name: serviceName, environment, replicas }),
    });
  }

  // ============================================================================
  // ROUTE OPTIMIZATION ENDPOINTS
  // ============================================================================

  async optimizeRoutes(request: OptimizationRequest): Promise<ApiResponse<OptimizedRoute[]>> {
    return this.request<OptimizedRoute[]>(API_ENDPOINTS.ROUTE_OPTIMIZATION.OPTIMIZE, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async adaptRoutes(modifications: RouteModification[]): Promise<ApiResponse<OptimizedRoute[]>> {
    return this.request<OptimizedRoute[]>(API_ENDPOINTS.ROUTE_OPTIMIZATION.ADAPT, {
      method: 'POST',
      body: JSON.stringify(modifications),
    });
  }

  async getCurrentOptimizedRoutes(): Promise<ApiResponse<OptimizedRoute[]>> {
    return this.request<OptimizedRoute[]>(API_ENDPOINTS.ROUTE_OPTIMIZATION.CURRENT);
  }

  async getOptimizationPerformance(period?: string, startDate?: string, endDate?: string): Promise<ApiResponse<OptimizationMetrics>> {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.request<OptimizationMetrics>(
      `${API_ENDPOINTS.ROUTE_OPTIMIZATION.PERFORMANCE}${params.toString() ? '?' + params.toString() : ''}`
    );
  }

  async getOptimizationAnalytics(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ROUTE_OPTIMIZATION.ANALYTICS);
  }

  async getOptimizationHistory(limit?: number, offset?: number): Promise<ApiResponse<{ optimizations: OptimizedRoute[]; totalCount: number }>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    return this.request<{ optimizations: OptimizedRoute[]; totalCount: number }>(
      `${API_ENDPOINTS.ROUTE_OPTIMIZATION.HISTORY}${params.toString() ? '?' + params.toString() : ''}`
    );
  }

  async getOptimizationStatus(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ROUTE_OPTIMIZATION.STATUS);
  }

  async exportOptimization(optimizationId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<ApiResponse<{ downloadUrl: string }>> {
    return this.request<{ downloadUrl: string }>(
      `${API_ENDPOINTS.ROUTE_OPTIMIZATION.EXPORT(optimizationId)}?format=${format}`
    );
  }

  // ============================================================================
  // PREDICTIVE ANALYTICS ENDPOINTS
  // ============================================================================

  async generateForecast(request: ForecastRequest): Promise<ApiResponse<ForecastResult>> {
    return this.request<ForecastResult>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.FORECAST, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateBatchForecast(requests: ForecastRequest[], options?: { concurrent?: boolean }): Promise<ApiResponse<ForecastResult[]>> {
    return this.request<ForecastResult[]>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.BATCH_FORECAST, {
      method: 'POST',
      body: JSON.stringify({ requests, options }),
    });
  }

  async getPredictiveAnalyticsStatus(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.STATUS);
  }

  async getPredictiveAnalyticsHealth(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.HEALTH);
  }

  async getMLPerformanceMetrics(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.PERFORMANCE_METRICS);
  }

  // Prophet model methods
  async trainProphetModel(request: ProphetTrainingRequest): Promise<ApiResponse<{ modelId: string }>> {
    return this.request<{ modelId: string }>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.PROPHET.TRAIN, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generateProphetForecast(modelId: string, periods?: number, freq?: string, includeComponents?: boolean): Promise<ApiResponse<ForecastResult>> {
    return this.request<ForecastResult>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.PROPHET.FORECAST(modelId), {
      method: 'POST',
      body: JSON.stringify({ periods, freq, includeComponents }),
    });
  }

  async addProphetSeasonality(modelId: string, seasonality: any): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.PROPHET.SEASONALITY(modelId), {
      method: 'POST',
      body: JSON.stringify(seasonality),
    });
  }

  async getProphetModels(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.PROPHET.MODELS);
  }

  async clearProphetCache(): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.PROPHET.CACHE, {
      method: 'DELETE',
    });
  }

  async getProphetModelDiagnostics(modelId: string): Promise<ApiResponse<ModelDiagnostics>> {
    return this.request<ModelDiagnostics>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.PROPHET.DIAGNOSTICS(modelId));
  }

  // LightGBM model methods
  async trainLightGBMModel(request: LightGBMTrainingRequest): Promise<ApiResponse<{ modelId: string }>> {
    return this.request<{ modelId: string }>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.LIGHTGBM.TRAIN, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async makeLightGBMPredictions(modelId: string, features: number[][], options?: any): Promise<ApiResponse<number[]>> {
    return this.request<number[]>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.LIGHTGBM.PREDICT, {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId, features, ...options }),
    });
  }

  async optimizeLightGBMHyperparameters(dataset: any, options?: any): Promise<ApiResponse<{ modelId: string; bestParams: any }>> {
    return this.request<{ modelId: string; bestParams: any }>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.LIGHTGBM.OPTIMIZE, {
      method: 'POST',
      body: JSON.stringify({ dataset, ...options }),
    });
  }

  async getLightGBMModels(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.LIGHTGBM.MODELS);
  }

  async clearLightGBMCache(): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.LIGHTGBM.CACHE, {
      method: 'DELETE',
    });
  }

  async getLightGBMModelDiagnostics(modelId: string): Promise<ApiResponse<ModelDiagnostics>> {
    return this.request<ModelDiagnostics>(API_ENDPOINTS.PREDICTIVE_ANALYTICS.LIGHTGBM.DIAGNOSTICS(modelId));
  }

  // ============================================================================
  // SECURITY ENDPOINTS
  // ============================================================================

  async analyzeThreat(request: ThreatAnalysisRequest): Promise<ApiResponse<ThreatAnalysisResult>> {
    return this.request<ThreatAnalysisResult>(API_ENDPOINTS.SECURITY.THREATS.ANALYZE, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getActiveThreats(severity?: string, limit?: number): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (limit) params.append('limit', limit.toString());
    
    return this.request<any[]>(
      `${API_ENDPOINTS.SECURITY.THREATS.ACTIVE}${params.toString() ? '?' + params.toString() : ''}`
    );
  }

  async respondToThreat(threatId: string, action: string, reason: string, expiresAt?: string): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.SECURITY.THREATS.RESPOND, {
      method: 'POST',
      body: JSON.stringify({ threatId, action, reason, expiresAt }),
    });
  }

  async getSecurityDashboard(timeframe?: string): Promise<ApiResponse<any>> {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request<any>(`${API_ENDPOINTS.SECURITY.MONITORING.DASHBOARD}${params}`);
  }

  async getSecurityEvents(filters?: any): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    return this.request<any[]>(
      `${API_ENDPOINTS.SECURITY.MONITORING.EVENTS}${params.toString() ? '?' + params.toString() : ''}`
    );
  }

  async createSecurityAlert(eventId: string, recipients?: string[]): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.SECURITY.MONITORING.ALERTS, {
      method: 'POST',
      body: JSON.stringify({ eventId, recipients }),
    });
  }

  async createSecurityIncident(incident: any): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.SECURITY.INCIDENTS.CREATE, {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  }

  async getActiveSecurityIncidents(filters?: any): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    return this.request<any[]>(
      `${API_ENDPOINTS.SECURITY.INCIDENTS.ACTIVE}${params.toString() ? '?' + params.toString() : ''}`
    );
  }

  async escalateSecurityIncident(incidentId: string, reason: string): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.SECURITY.INCIDENTS.ESCALATE(incidentId), {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async getSecurityAuditEvents(filters?: any, pagination?: { page?: number; limit?: number }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    
    return this.request<any[]>(
      `${API_ENDPOINTS.SECURITY.AUDIT.EVENTS}${params.toString() ? '?' + params.toString() : ''}`
    );
  }

  async generateComplianceReport(framework: string, startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.SECURITY.AUDIT.COMPLIANCE_REPORT, {
      method: 'POST',
      body: JSON.stringify({ framework, startDate, endDate }),
    });
  }

  async getSecurityAuditMetrics(timeframe?: string): Promise<ApiResponse<any>> {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request<any>(`${API_ENDPOINTS.SECURITY.AUDIT.METRICS}${params}`);
  }

  // ============================================================================
  // COMPLIANCE ENDPOINTS (SOC 2 & HSM)
  // ============================================================================

  async getSOC2ComplianceStatus(): Promise<ApiResponse<SOC2ComplianceStatus>> {
    return this.request<SOC2ComplianceStatus>(API_ENDPOINTS.COMPLIANCE.SOC2.STATUS);
  }

  async initializeSOC2Framework(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.COMPLIANCE.SOC2.INITIALIZE, {
      method: 'POST',
    });
  }

  async testSOC2Controls(controlId?: string): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.COMPLIANCE.SOC2.CONTROLS_TEST, {
      method: 'POST',
      body: JSON.stringify({ controlId }),
    });
  }

  async generateSOC2Report(): Promise<ApiResponse<SOC2ComplianceStatus>> {
    return this.request<SOC2ComplianceStatus>(API_ENDPOINTS.COMPLIANCE.SOC2.REPORT);
  }

  async getHSMStatus(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.COMPLIANCE.HSM.STATUS);
  }

  async initializeHSM(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.COMPLIANCE.HSM.INITIALIZE, {
      method: 'POST',
    });
  }

  async generateHSMKey(keyLabel: string, keyType: string, usage: string, rotationSchedule?: string): Promise<ApiResponse<HSMKeyInfo>> {
    return this.request<HSMKeyInfo>(API_ENDPOINTS.COMPLIANCE.HSM.KEYS, {
      method: 'POST',
      body: JSON.stringify({ keyLabel, keyType, usage, rotationSchedule }),
    });
  }

  async rotateHSMKey(keyId: string): Promise<ApiResponse<{ newKeyId: string; newKeyVersion: number }>> {
    return this.request<{ newKeyId: string; newKeyVersion: number }>(API_ENDPOINTS.COMPLIANCE.HSM.ROTATE_KEY(keyId), {
      method: 'POST',
    });
  }

  async encryptWithHSM(data: string, keyId: string, additionalContext?: any): Promise<ApiResponse<HSMEncryptionResult>> {
    return this.request<HSMEncryptionResult>(API_ENDPOINTS.COMPLIANCE.HSM.ENCRYPT, {
      method: 'POST',
      body: JSON.stringify({ data, keyId, additionalContext }),
    });
  }

  async decryptWithHSM(ciphertext: string, keyId: string, keyVersion?: number, additionalContext?: any): Promise<ApiResponse<HSMDecryptionResult>> {
    return this.request<HSMDecryptionResult>(API_ENDPOINTS.COMPLIANCE.HSM.DECRYPT, {
      method: 'POST',
      body: JSON.stringify({ ciphertext, keyId, keyVersion, additionalContext }),
    });
  }

  // ============================================================================
  // EXTERNAL SERVICES COORDINATION ENDPOINTS
  // ============================================================================

  async getExternalServicesStatus(): Promise<ApiResponse<ExternalServiceStatus[]>> {
    return this.request<ExternalServiceStatus[]>(API_ENDPOINTS.EXTERNAL_SERVICES.STATUS);
  }

  async getExternalServicesCosts(): Promise<ApiResponse<ServiceCostAnalysis[]>> {
    return this.request<ServiceCostAnalysis[]>(API_ENDPOINTS.EXTERNAL_SERVICES.COSTS);
  }

  async getExternalServicesFallbacks(): Promise<ApiResponse<FallbackStrategy[]>> {
    return this.request<FallbackStrategy[]>(API_ENDPOINTS.EXTERNAL_SERVICES.FALLBACKS);
  }

  async activateServiceFallback(serviceName: string): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.EXTERNAL_SERVICES.ACTIVATE_FALLBACK(serviceName), {
      method: 'POST',
    });
  }

  async deactivateServiceFallback(serviceName: string): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.EXTERNAL_SERVICES.DEACTIVATE_FALLBACK(serviceName), {
      method: 'POST',
    });
  }

  async testExternalService(serviceName: string): Promise<ApiResponse<{ status: string; response_time: number }>> {
    return this.request<{ status: string; response_time: number }>(API_ENDPOINTS.EXTERNAL_SERVICES.TEST_SERVICE(serviceName), {
      method: 'POST',
    });
  }

  async optimizeTraffic(request: TrafficOptimizationRequest): Promise<ApiResponse<TrafficOptimizationResult>> {
    return this.request<TrafficOptimizationResult>(API_ENDPOINTS.EXTERNAL_SERVICES.TRAFFIC.OPTIMIZATION, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getTrafficOptimizationStatus(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.EXTERNAL_SERVICES.TRAFFIC.STATUS);
  }

  async getCostMonitoringMetrics(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.EXTERNAL_SERVICES.COST_MONITORING.METRICS);
  }

  async getCostMonitoringAlerts(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(API_ENDPOINTS.EXTERNAL_SERVICES.COST_MONITORING.ALERTS);
  }

  // ============================================================================
  // QUEUE & JOB MANAGEMENT ENDPOINTS
  // ============================================================================

  async getQueueStatus(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.QUEUE.STATUS);
  }

  async getQueueStats(): Promise<ApiResponse<QueueStats>> {
    return this.request<QueueStats>(API_ENDPOINTS.QUEUE.STATS);
  }

  async getQueueJobs(type?: 'active' | 'completed' | 'failed', limit?: number, offset?: number): Promise<ApiResponse<JobInfo[]>> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const endpoint = type === 'active' ? API_ENDPOINTS.QUEUE.ACTIVE_JOBS :
                    type === 'completed' ? API_ENDPOINTS.QUEUE.COMPLETED_JOBS :
                    type === 'failed' ? API_ENDPOINTS.QUEUE.FAILED_JOBS :
                    API_ENDPOINTS.QUEUE.JOBS;
    
    return this.request<JobInfo[]>(
      `${endpoint}${params.toString() ? '?' + params.toString() : ''}`
    );
  }

  async retryJob(jobId: string): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.QUEUE.RETRY_JOB(jobId), {
      method: 'POST',
    });
  }

  async cancelJob(jobId: string): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.QUEUE.CANCEL_JOB(jobId), {
      method: 'POST',
    });
  }

  async purgeCompletedJobs(): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.QUEUE.PURGE_COMPLETED, {
      method: 'DELETE',
    });
  }

  async purgeFailedJobs(): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.QUEUE.PURGE_FAILED, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // WEAVIATE VECTOR DATABASE ENDPOINTS
  // ============================================================================

  async searchVectorDatabase(query: string, limit?: number, filters?: any): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(API_ENDPOINTS.ML.WEAVIATE.SEARCH, {
      method: 'POST',
      body: JSON.stringify({ query, limit, filters }),
    });
  }

  async indexVectorData(data: any[], className?: string): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ML.WEAVIATE.INDEX, {
      method: 'POST',
      body: JSON.stringify({ data, className }),
    });
  }

  async deleteVectorData(id: string, className?: string): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.ML.WEAVIATE.DELETE, {
      method: 'DELETE',
      body: JSON.stringify({ id, className }),
    });
  }

  async getVectorDatabaseSchema(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ML.WEAVIATE.SCHEMA);
  }

  async getVectorDatabaseHealth(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ML.WEAVIATE.HEALTH);
  }

  async getVectorDatabaseMetrics(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ML.WEAVIATE.METRICS);
  }

  // ============================================================================
  // WEBSOCKET METHODS
  // ============================================================================

  /**
   * Get the WebSocket client instance for real-time communication
   */
  getWebSocketClient() {
    return webSocketClient;
  }

  /**
   * Subscribe to real-time monitoring updates
   */
  subscribeToMonitoring(handler: (event: any) => void): void {
    webSocketClient.onMonitoring(handler);
  }

  /**
   * Subscribe to real-time security events
   */
  subscribeToSecurity(handler: (event: any) => void): void {
    webSocketClient.onSecurity(handler);
  }

  /**
   * Subscribe to real-time analytics updates
   */
  subscribeToAnalytics(handler: (event: any) => void): void {
    webSocketClient.onAnalytics(handler);
  }

  /**
   * Subscribe to real-time route optimization updates
   */
  subscribeToRouteUpdates(handler: (event: any) => void): void {
    webSocketClient.onRouteUpdates(handler);
  }

  /**
   * Subscribe to real-time bin status updates
   */
  subscribeToBinUpdates(handler: (event: any) => void): void {
    webSocketClient.onBinUpdates(handler);
  }

  /**
   * Subscribe to real-time alert notifications
   */
  subscribeToAlerts(handler: (event: any) => void): void {
    webSocketClient.onAlerts(handler);
  }

  /**
   * Subscribe to real-time ML model updates
   */
  subscribeToMLModels(handler: (event: any) => void): void {
    webSocketClient.onMLModels(handler);
  }

  /**
   * Subscribe to real-time operations updates
   */
  subscribeToOperations(handler: (event: any) => void): void {
    webSocketClient.onOperations(handler);
  }

  /**
   * Disconnect from all WebSocket channels
   */
  disconnectFromRealTime(): void {
    webSocketClient.disconnectAll();
  }
}

export const apiClient = new ApiClient();
export { ApiClient };
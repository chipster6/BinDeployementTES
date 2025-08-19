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
  InfrastructureStatus
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // Try to get token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'An error occurred',
          error: data.error,
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
        message: 'Network error occurred',
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
}

export const apiClient = new ApiClient();
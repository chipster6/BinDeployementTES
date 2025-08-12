import { ApiResponse, AuthResponse, LoginCredentials, RegisterData, User, Bin, Customer } from './types';

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
}

export const apiClient = new ApiClient();
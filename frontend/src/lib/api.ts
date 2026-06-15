const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('linkchat_access_token');
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token = this.getToken(), ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });
    } catch {
      throw new Error('Cannot reach the server. Make sure the backend is running on port 4000.');
    }

    if (response.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        return this.request(endpoint, options);
      }
      this.clearSession();
      throw new Error('Unauthorized');
    }

    if (response.status === 500 && endpoint.includes('/users/me')) {
      this.clearSession();
      throw new Error('Session invalid');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      if (response.status === 500 && endpoint.includes('/auth/')) {
        throw new Error('Server error — the database may be restarting. Wait a moment and try again.');
      }
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  private clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('linkchat_access_token');
    localStorage.removeItem('linkchat_refresh_token');
    if (!window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth/login';
    }
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('linkchat_refresh_token');
    if (!refreshToken) return false;

    try {
      const data = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).then((r) => r.json());

      if (data.accessToken) {
        localStorage.setItem('linkchat_access_token', data.accessToken);
        localStorage.setItem('linkchat_refresh_token', data.refreshToken);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch {
      throw new Error('Cannot reach the server. Make sure the backend is running on port 4000.');
    }

    if (response.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.upload(endpoint, formData);
      this.clearSession();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }
}

export const api = new ApiClient();

/**
 * API сервисы для работы с бэкендом
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'hero_memorial_token';

function getAuthHeaders(): Record<string, string> {
  const t = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function setStoredToken(token: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'sender' | 'moderator' | 'admin';
  phone?: string | null;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name?: string, phone?: string) =>
    apiRequest<{ user: AuthUser; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, phone }),
    }),
};

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers as Record<string, string>),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: (data as { error?: string }).error || data.message || 'Ошибка запроса' };
    }
    return { data: (data as { data?: T }).data !== undefined ? (data as { data: T }).data : (data as T) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Неизвестная ошибка' };
  }
}

export const applicationsApi = {
  create: (formData: FormData) =>
    apiRequest<{ id: number; hero_id: number }>('/applications', { method: 'POST', body: formData }),
  getAll: () => apiRequest<ApplicationRow[]>('/applications'),
  getMine: () => apiRequest<ApplicationRow[]>('/applications/mine'),
  getById: (id: number) => apiRequest<ApplicationRow>('/applications/' + id),
  update: (id: number, data: Record<string, unknown>) =>
    apiRequest('/applications/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string, comment?: string) =>
    apiRequest(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comment }),
    }),
};

export interface ApplicationRow {
  id: number;
  hero_id?: number;
  status: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  birth_date: string;
  birth_locality?: string | null;
  rank?: string | null;
  death_date?: string | null;
  rank_id?: number;
  birth_locality_id?: number;
  service_place_id?: number | null;
  extra_info?: string | null;
  sender_full_name?: string;
  sender_email?: string;
  sender_phone?: string | null;
  created_at?: string;
}

// Справочники
export const dictionariesApi = {
  getRanks: () => apiRequest('/dictionaries/ranks'),
  getLocalities: () => apiRequest('/dictionaries/localities'),
  getServicePlaces: () => apiRequest('/dictionaries/service-places'),
};

export const profileApi = {
  get: () => apiRequest<{ id: number; email: string; name: string; role: string; phone: string | null }>('/profile'),
  update: (data: { name?: string; phone?: string }) =>
    apiRequest('/profile', { method: 'PATCH', body: JSON.stringify(data) }),
};

export const supportApi = {
  get: () => apiRequest<{ email: string; phone: string }>('/support'),
};

export const adminApi = {
  getCloudStorageConfig: () => apiRequest('/admin/cloud-storage'),
  updateCloudStorageConfig: (config: { enabled: boolean; link: string; max_size_mb: number }) =>
    apiRequest('/admin/cloud-storage', { method: 'POST', body: JSON.stringify(config) }),
  getSupportContacts: () => apiRequest<{ email: string; phone: string }>('/admin/support-contacts'),
  updateSupportContacts: (data: { email: string; phone: string }) =>
    apiRequest('/admin/support-contacts', { method: 'PATCH', body: JSON.stringify(data) }),
};

// Подписка
export const subscriptionApi = {
  sendCode: (email: string) => apiRequest('/subscription/send-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  verifyCode: (email: string, code: string) => apiRequest('/subscription/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  }),
};

/**
 * API сервисы для работы с бэкендом
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'app_user_token';
const FORM_ACCESS_TOKEN_KEY = 'application_form_access_token';

function getAuthHeaders(): Record<string, string> {
  const t = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function getFormAccessHeaders(): Record<string, string> {
  if (typeof sessionStorage === 'undefined') return {};
  const t = sessionStorage.getItem(FORM_ACCESS_TOKEN_KEY);
  return t ? { 'X-Form-Access-Token': t } : {};
}

export function setFormAccessToken(token: string | null) {
  if (typeof sessionStorage === 'undefined') return;
  if (token) sessionStorage.setItem(FORM_ACCESS_TOKEN_KEY, token);
  else sessionStorage.removeItem(FORM_ACCESS_TOKEN_KEY);
}

export function getFormAccessToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(FORM_ACCESS_TOKEN_KEY);
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
        ...getFormAccessHeaders(),
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
  service_place?: string | null;
  rank_id?: number;
  birth_locality_id?: number;
  service_place_id?: number | null;
  extra_info?: string | null;
  cloud_link?: string | null;
  photo_path?: string | null;
  sender_full_name?: string;
  sender_email?: string;
  sender_phone?: string | null;
  custom_fields?: Record<string, string> | null;
  created_at?: string;
}

export interface CustomFormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date';
  required?: boolean;
  options?: string[];
}

export interface ApplicationConfig {
  is_enabled: boolean;
  disabled_message: string;
  custom_form_fields: CustomFormField[];
  /** Показывать блок загрузки фотографии в форме заявки */
  show_photo?: boolean;
  /** Показывать поле «Ссылка на облако» */
  show_cloud_link?: boolean;
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

export interface FormAccessCodeRow {
  id: number;
  code: string;
  label: string;
  is_active: boolean;
  created_at: string;
}

export const applicationAccessApi = {
  verify: (code: string) =>
    apiRequest<{ token: string }>('/application-access/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

export const adminApi = {
  getCloudStorageConfig: () => apiRequest<{ enabled: boolean; link: string; max_size_mb: number }>('/admin/cloud-storage'),
  updateCloudStorageConfig: (data: { enabled: boolean; link: string; max_size_mb: number }) =>
    apiRequest('/admin/cloud-storage', { method: 'POST', body: JSON.stringify(data) }),
  getSupportContacts: () => apiRequest<{ email: string; phone: string }>('/admin/support-contacts'),
  updateSupportContacts: (data: { email: string; phone: string }) =>
    apiRequest('/admin/support-contacts', { method: 'PATCH', body: JSON.stringify(data) }),
  getApplicationConfig: () => apiRequest<ApplicationConfig>('/application-config'),
  updateApplicationConfig: (data: ApplicationConfig) =>
    apiRequest('/admin/application-config', { method: 'PATCH', body: JSON.stringify(data) }),
  listFormAccessCodes: () => apiRequest<FormAccessCodeRow[]>('/admin/form-access-codes'),
  createFormAccessCode: (data: { code: string; label?: string }) =>
    apiRequest<FormAccessCodeRow>('/admin/form-access-codes', { method: 'POST', body: JSON.stringify(data) }),
  setFormAccessCodeActive: (id: number, is_active: boolean) =>
    apiRequest(`/admin/form-access-codes/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
  deleteFormAccessCode: (id: number) =>
    apiRequest(`/admin/form-access-codes/${id}`, { method: 'DELETE' }),
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

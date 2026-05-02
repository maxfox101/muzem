import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState<'choice' | 'login'>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="base-card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-accessible">Вход в сервис</h1>
        <p className="text-accessible-muted mb-6">Сервис приёма и настройки заявок</p>

        {mode === 'choice' && (
          <div className="space-y-3">
            <p className="text-sm text-accessible-muted mb-4">Выберите, как продолжить:</p>
            <Link
              to="/register"
              className="button-primary w-full text-center justify-center block no-underline"
            >
              Создать заявку
            </Link>
            <p className="text-xs text-accessible-muted text-center">Новый аккаунт для подачи заявок</p>
            <button
              type="button"
              className="button-secondary w-full"
              onClick={() => { setMode('login'); setError(null); }}
            >
              Войти
            </button>
            <p className="text-xs text-accessible-muted text-center">Для подачи заявок, модерации и администрирования</p>
          </div>
        )}

        {mode === 'login' && (
          <>
            <button
              type="button"
              onClick={() => { setMode('choice'); setError(null); }}
              className="mb-4 text-sm text-blue-600 underline hover:no-underline"
            >
              ← Назад к выбору
            </button>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm" role="alert">
                  {error}
                </p>
              )}
              <div>
                <label htmlFor="email" className="block mb-2 font-medium text-accessible">Email</label>
                <input
                  id="email"
                  type="email"
                  className="base-input w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="password" className="block mb-2 font-medium text-accessible">Пароль</label>
                <input
                  id="password"
                  type="password"
                  className="base-input w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="base-button w-full bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Вход…' : 'Войти'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

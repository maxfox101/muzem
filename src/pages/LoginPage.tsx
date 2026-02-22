import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
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
        <h1 className="text-2xl font-bold mb-2 text-accessible">Вход в систему</h1>
        <p className="text-accessible-muted mb-6">АИС «Быть воином — жить вечно»</p>

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

        <p className="mt-6 text-sm text-accessible-muted text-center">
          Нет аккаунта? <Link to="/register" className="text-blue-600 underline hover:no-underline">Зарегистрироваться</Link>
        </p>
        <p className="mt-2 text-sm text-accessible-muted text-center">
          Тест: user@example.com, moderator@example.com, admin@example.com — пароль: password
        </p>
      </div>
    </div>
  );
}

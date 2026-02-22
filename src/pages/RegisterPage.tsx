import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== passwordAgain) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      setError('Пароль не менее 6 символов');
      return;
    }
    setSubmitting(true);
    const res = await register(email, password, name || undefined, phone || undefined);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card-container max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-accessible">Регистрация</h1>
        <p className="text-accessible-muted mb-6">Создайте аккаунт, чтобы подавать заявки</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="p-3 bg-red-100 border-2 border-red-300 text-red-700 rounded-xl text-sm" role="alert">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="name" className="block mb-2 font-medium text-accessible">Имя (как к вам обращаться)</label>
            <input
              id="name"
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block mb-2 font-medium text-accessible">Телефон</label>
            <input
              id="phone"
              type="tel"
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+79001234567"
            />
          </div>
          <div>
            <label htmlFor="email" className="block mb-2 font-medium text-accessible">Email *</label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-2 font-medium text-accessible">Пароль * (не менее 6 символов)</label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="passwordAgain" className="block mb-2 font-medium text-accessible">Пароль ещё раз *</label>
            <input
              id="passwordAgain"
              type="password"
              className="input-field"
              value={passwordAgain}
              onChange={(e) => setPasswordAgain(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="button-primary w-full disabled:opacity-50"
          >
            {submitting ? 'Регистрация…' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-6 text-sm text-accessible-muted text-center">
          Уже есть аккаунт? <Link to="/login" className="text-blue-600 underline hover:no-underline">Войти</Link>
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import HeroForm from '../components/FormHero/HeroForm';
import { applicationAccessApi, setFormAccessToken, getFormAccessToken } from '../services/api';

export default function FormPage() {
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [checking, setChecking] = useState(false);

  const tryVerify = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Введите код доступа');
      return false;
    }
    setChecking(true);
    const res = await applicationAccessApi.verify(trimmed);
    setChecking(false);
    if (res.error) {
      setError(res.error);
      return false;
    }
    if (res.data?.token) {
      setFormAccessToken(res.data.token);
      setError(null);
      setReady(true);
      return true;
    }
    setError('Не удалось получить доступ');
    return false;
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get('code') || searchParams.get('access');
    const existing = getFormAccessToken();
    if (existing) {
      setReady(true);
      return;
    }
    if (fromUrl) {
      void tryVerify(fromUrl);
    }
  }, [searchParams, tryVerify]);

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    await tryVerify(codeInput);
  };

  if (!ready) {
    return (
      <div className="max-w-lg mx-auto card-container">
        <h1 className="text-xl font-bold mb-2 text-accessible">Доступ к форме заявки</h1>
        <p className="text-accessible-muted mb-4">
          Введите код приглашения или откройте ссылку, которую вам отправил администратор (в ссылке уже указан код).
        </p>
        <form onSubmit={handleSubmitCode} className="space-y-4">
          <div>
            <label htmlFor="access-code" className="block mb-2 font-medium text-accessible">Код доступа</label>
            <input
              id="access-code"
              className="input-field"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Например: invite-1"
              autoComplete="off"
            />
          </div>
          {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
          <button type="submit" className="button-primary w-full" disabled={checking}>
            {checking ? 'Проверка…' : 'Продолжить'}
          </button>
        </form>
      </div>
    );
  }

  return <HeroForm />;
}

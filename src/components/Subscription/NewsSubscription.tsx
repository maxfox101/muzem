import { useState, FormEvent } from 'react';

export default function NewsSubscription() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Отправка кода на email через API
    // await fetch('/api/subscription/send-code', { method: 'POST', body: JSON.stringify({ email }) })
    
    setTimeout(() => {
      setLoading(false);
      setStep('code');
    }, 1000);
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Проверка кода и подписка
    // await fetch('/api/subscription/verify', { method: 'POST', body: JSON.stringify({ email, code }) })
    
    setTimeout(() => {
      setLoading(false);
      alert('Подписка оформлена!');
      setEmail('');
      setCode('');
      setStep('email');
    }, 1000);
  };

  return (
    <div className="base-card max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-accessible">Подписка на акции музея</h2>
      
      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="sub_email" className="block mb-2 font-medium text-accessible">
              📧 Email:
            </label>
            <input
              type="email"
              id="sub_email"
              className="base-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.ru"
              required
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="subscribe_check"
              className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200"
              defaultChecked
            />
            <label htmlFor="subscribe_check" className="text-accessible">
              Хочу получать акции музея «Самбекские высоты»
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="base-button bg-blue-600 text-white border-blue-600 hover:bg-blue-700 w-full"
          >
            {loading ? 'Отправка...' : 'Подписаться'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <p className="text-accessible-muted mb-4">
            Код подтверждения отправлен на {email}
          </p>
          
          <div>
            <label htmlFor="code" className="block mb-2 font-medium text-accessible">
              Код подтверждения:
            </label>
            <input
              type="text"
              id="code"
              className="base-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Введите код"
              required
              maxLength={6}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="base-button bg-blue-600 text-white border-blue-600 hover:bg-blue-700 flex-1"
            >
              {loading ? 'Проверка...' : 'Подтвердить'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="base-button bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"
            >
              Назад
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

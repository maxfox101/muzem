import { useState, useEffect } from 'react';
import { supportApi } from '../services/api';

export default function SupportPage() {
  const [contacts, setContacts] = useState<{ email: string; phone: string } | null>(null);

  useEffect(() => {
    supportApi.get().then((res) => {
      if (res.data) setContacts(res.data);
    });
  }, []);

  const email = contacts?.email || 'support@sambek-museum.ru';
  const phone = contacts?.phone || '+7 (863) 123-45-67';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-accessible">Поддержка</h1>
      <div className="card-container space-y-4">
        <p className="text-accessible">По вопросам работы с заявками и системы обращайтесь:</p>
        <div className="grid gap-3">
          <p className="text-accessible">
            <strong>Email:</strong>{' '}
            <a href={`mailto:${email}`} className="text-blue-600 underline hover:no-underline focus:ring-4 focus:ring-blue-200 rounded">
              {email}
            </a>
          </p>
          <p className="text-accessible">
            <strong>Телефон:</strong>{' '}
            <a href={`tel:${phone.replace(/\D/g, '')}`} className="text-blue-600 underline hover:no-underline focus:ring-4 focus:ring-blue-200 rounded">
              {phone}
            </a>
          </p>
        </div>
        <p className="text-sm text-accessible-muted mt-4">
          ГБУК РО «Народный военно-исторический музей Великой Отечественной войны "Самбекские высоты"»
        </p>
      </div>
    </div>
  );
}

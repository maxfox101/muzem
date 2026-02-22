import { useState, useEffect } from 'react';
import CloudStorageSettings from '../components/AdminPanel/CloudStorageSettings';
import { adminApi } from '../services/api';

export default function AdminPage() {
  const [support, setSupport] = useState({ email: '', phone: '' });
  const [supportSaved, setSupportSaved] = useState(false);

  useEffect(() => {
    adminApi.getSupportContacts().then((res) => {
      if (res.data) setSupport({ email: res.data.email || '', phone: res.data.phone || '' });
    });
  }, []);

  const saveSupport = async () => {
    const res = await adminApi.updateSupportContacts(support);
    if (!res.error) {
      setSupportSaved(true);
      setTimeout(() => setSupportSaved(false), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-accessible">Администрирование сайта</h1>

      <div className="card-container">
        <h2 className="text-xl font-bold mb-4 text-accessible">Контакты поддержки</h2>
        <p className="text-accessible-muted mb-4">Email и телефон видны пользователям на странице «Поддержка». Админ может их редактировать.</p>
        <div className="grid gap-4 max-w-md">
          <div>
            <label className="block mb-2 font-semibold text-accessible">Email</label>
            <input
              type="email"
              className="input-field"
              value={support.email}
              onChange={(e) => setSupport((s) => ({ ...s, email: e.target.value }))}
              placeholder="support@sambek-museum.ru"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold text-accessible">Телефон</label>
            <input
              type="text"
              className="input-field"
              value={support.phone}
              onChange={(e) => setSupport((s) => ({ ...s, phone: e.target.value }))}
              placeholder="+7 (863) 123-45-67"
            />
          </div>
          <button type="button" onClick={saveSupport} className="button-primary">
            {supportSaved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="card-container">
        <h2 className="text-xl font-bold mb-4 text-accessible">Облачное хранилище</h2>
        <CloudStorageSettings />
      </div>

      <div className="card-container">
        <h2 className="text-xl font-bold mb-4 text-accessible">Справочники</h2>
        <p className="text-accessible-muted">Звания, населённые пункты, места службы задаются в БД (миграции). При «кракозябрах» в выпадающих списках выполните в папке backend: <code className="bg-gray-100 px-1 rounded">psql -U postgres -d hero_memorial -f database/fix-dictionaries-utf8.sql</code></p>
      </div>

      <div className="card-container">
        <h2 className="text-xl font-bold mb-4 text-accessible">Настройки уведомлений</h2>
        <p className="text-accessible-muted">Email/SMS — добавим в следующих версиях. Настройте SMTP в backend/.env для подписки на новости.</p>
      </div>

      <div className="card-container">
        <h2 className="text-xl font-bold mb-4 text-accessible">Системная статистика</h2>
        <p className="text-accessible-muted">Количество заявок по статусам, пользователей — добавим отчёт на следующем этапе.</p>
      </div>
    </div>
  );
}

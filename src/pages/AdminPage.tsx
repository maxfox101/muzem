import { useState, useEffect } from 'react';
import { adminApi, type ApplicationConfig, type CustomFormField, type FormAccessCodeRow } from '../services/api';

const emptyCustomField = (): CustomFormField => ({
  key: '',
  label: '',
  type: 'text',
  required: false,
  options: [],
});

export default function AdminPage() {
  const [support, setSupport] = useState({ email: '', phone: '' });
  const [supportSaved, setSupportSaved] = useState(false);
  const [applicationConfig, setApplicationConfig] = useState<ApplicationConfig>({
    is_enabled: true,
    disabled_message: '',
    custom_form_fields: [],
    show_photo: true,
    show_cloud_link: true,
  });
  const [configSaved, setConfigSaved] = useState(false);
  const [accessCodes, setAccessCodes] = useState<FormAccessCodeRow[]>([]);
  const [newAccess, setNewAccess] = useState({ code: '', label: '' });
  const [accessErr, setAccessErr] = useState<string | null>(null);
  const [accessOk, setAccessOk] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getSupportContacts().then((res) => {
      if (res.data) setSupport({ email: res.data.email || '', phone: res.data.phone || '' });
    });
    adminApi.getApplicationConfig().then((res) => {
      if (res.data) setApplicationConfig(res.data);
    });
    adminApi.listFormAccessCodes().then((res) => {
      if (res.data) setAccessCodes(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  const saveSupport = async () => {
    const res = await adminApi.updateSupportContacts(support);
    if (!res.error) {
      setSupportSaved(true);
      setTimeout(() => setSupportSaved(false), 3000);
    }
  };

  const saveApplicationConfig = async () => {
    const prepared: ApplicationConfig = {
      ...applicationConfig,
      show_photo: applicationConfig.show_photo !== false,
      show_cloud_link: applicationConfig.show_cloud_link !== false,
      custom_form_fields: applicationConfig.custom_form_fields
        .map((f) => ({
          ...f,
          key: f.key.trim(),
          label: f.label.trim(),
          options: f.type === 'select' ? (f.options || []).map((o) => o.trim()).filter(Boolean) : [],
        }))
        .filter((f) => f.key && f.label),
    };
    const res = await adminApi.updateApplicationConfig(prepared);
    if (!res.error) {
      setApplicationConfig(prepared);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    }
  };

  const addCustomField = () => {
    setApplicationConfig((s) => ({
      ...s,
      custom_form_fields: [...s.custom_form_fields, emptyCustomField()],
    }));
  };

  const removeCustomField = (idx: number) => {
    setApplicationConfig((s) => ({
      ...s,
      custom_form_fields: s.custom_form_fields.filter((_, i) => i !== idx),
    }));
  };

  const updateCustomField = (idx: number, patch: Partial<CustomFormField>) => {
    setApplicationConfig((s) => ({
      ...s,
      custom_form_fields: s.custom_form_fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  };

  const refreshAccessCodes = () => {
    adminApi.listFormAccessCodes().then((res) => {
      if (res.data) setAccessCodes(Array.isArray(res.data) ? res.data : []);
    });
  };

  const addAccessCode = async () => {
    setAccessErr(null);
    setAccessOk(null);
    const code = newAccess.code.trim();
    if (!code) {
      setAccessErr('Укажите код');
      return;
    }
    const res = await adminApi.createFormAccessCode({ code, label: newAccess.label.trim() || undefined });
    if (res.error) {
      setAccessErr(res.error);
      return;
    }
    setNewAccess({ code: '', label: '' });
    setAccessOk('Код добавлен');
    setTimeout(() => setAccessOk(null), 3000);
    refreshAccessCodes();
  };

  const copyInviteLink = (row: FormAccessCodeRow) => {
    const url = `${window.location.origin}/form?code=${encodeURIComponent(row.code)}`;
    void navigator.clipboard.writeText(url);
    setAccessErr(null);
    setAccessOk(`Ссылка скопирована (код «${row.code}»)`);
    setTimeout(() => setAccessOk(null), 4000);
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
              placeholder="support@example.com"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold text-accessible">Телефон</label>
            <input
              type="text"
              className="input-field"
              value={support.phone}
              onChange={(e) => setSupport((s) => ({ ...s, phone: e.target.value }))}
              placeholder="+7 (000) 000-00-00"
            />
          </div>
          <button type="button" onClick={saveSupport} className="button-primary w-full sm:w-auto">
            {supportSaved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="card-container">
        <h2 className="text-xl font-bold mb-4 text-accessible">Конфигурация приёма заявок</h2>
        <div className="space-y-4 max-w-2xl">
          <label className="flex items-center gap-3 text-accessible">
            <input
              type="checkbox"
              className="w-5 h-5"
              checked={applicationConfig.is_enabled}
              onChange={(e) => setApplicationConfig((s) => ({ ...s, is_enabled: e.target.checked }))}
            />
            Принимать новые заявки
          </label>
          <div>
            <label className="block mb-2 font-semibold text-accessible">Сообщение при отключении приёма</label>
            <textarea
              className="input-field min-h-[90px]"
              value={applicationConfig.disabled_message}
              onChange={(e) => setApplicationConfig((s) => ({ ...s, disabled_message: e.target.value }))}
              placeholder="Например: Приём заявок временно приостановлен до 15 мая."
            />
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-4">
            <p className="font-semibold text-accessible">Стандартные поля формы</p>
            <label className="flex items-center gap-3 text-accessible">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={applicationConfig.show_photo !== false}
                onChange={(e) => setApplicationConfig((s) => ({ ...s, show_photo: e.target.checked }))}
              />
              Показывать поле «Фотография»
            </label>
            <label className="flex items-center gap-3 text-accessible">
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={applicationConfig.show_cloud_link !== false}
                onChange={(e) => setApplicationConfig((s) => ({ ...s, show_cloud_link: e.target.checked }))}
              />
              Показывать поле «Ссылка на облако»
            </label>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-accessible">Кастомные поля формы</h3>
              <button type="button" onClick={addCustomField} className="button-secondary">+ Добавить поле</button>
            </div>
            <div className="space-y-3">
              {applicationConfig.custom_form_fields.length === 0 && (
                <p className="text-sm text-accessible-muted">Пока нет кастомных полей.</p>
              )}
              {applicationConfig.custom_form_fields.map((field, idx) => (
                <div key={`${field.key || 'field'}-${idx}`} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      className="input-field"
                      value={field.key}
                      onChange={(e) => updateCustomField(idx, { key: e.target.value })}
                      placeholder="Ключ (например medal)"
                    />
                    <input
                      className="input-field"
                      value={field.label}
                      onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                      placeholder="Название поля"
                    />
                    <select
                      className="input-field"
                      value={field.type}
                      onChange={(e) => updateCustomField(idx, { type: e.target.value as CustomFormField['type'] })}
                    >
                      <option value="text">Текст</option>
                      <option value="textarea">Большой текст</option>
                      <option value="date">Дата</option>
                      <option value="select">Список</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-accessible">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={!!field.required}
                        onChange={(e) => updateCustomField(idx, { required: e.target.checked })}
                      />
                      Обязательное поле
                    </label>
                  </div>
                  {field.type === 'select' && (
                    <div className="mt-3">
                      <input
                        className="input-field"
                        value={(field.options || []).join(', ')}
                        onChange={(e) => updateCustomField(idx, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        placeholder="Варианты через запятую: Да, Нет, Неизвестно"
                      />
                    </div>
                  )}
                  <div className="mt-3">
                    <button type="button" onClick={() => removeCustomField(idx)} className="button-secondary">
                      Удалить поле
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="button" onClick={saveApplicationConfig} className="button-primary w-full">
            {configSaved ? '✓ Сохранено' : 'Сохранить конфигурацию'}
          </button>
        </div>
      </div>

      <div className="card-container">
        <h2 className="text-xl font-bold mb-4 text-accessible">Коды доступа к форме</h2>
        <p className="text-accessible-muted mb-4">
          Пользователь должен ввести код на странице формы или открыть пригласительную ссылку. Без действующего кода отправить заявку нельзя.
        </p>
        {accessErr && <p className="mb-3 text-sm text-red-600 font-medium" role="alert">{accessErr}</p>}
        {accessOk && <p className="mb-3 text-sm text-green-700 font-medium">{accessOk}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 max-w-2xl">
          <input
            className="input-field"
            value={newAccess.code}
            onChange={(e) => setNewAccess((s) => ({ ...s, code: e.target.value }))}
            placeholder="Новый код (латиница/цифры)"
          />
          <input
            className="input-field"
            value={newAccess.label}
            onChange={(e) => setNewAccess((s) => ({ ...s, label: e.target.value }))}
            placeholder="Подпись (необязательно)"
          />
        </div>
        <button type="button" onClick={addAccessCode} className="button-primary w-full max-w-md mb-6">
          Добавить код
        </button>
        <ul className="space-y-3 max-w-3xl">
          {accessCodes.map((row) => (
            <li key={row.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50">
              <div>
                <p className="font-mono font-semibold text-accessible">{row.code}</p>
                {row.label && <p className="text-sm text-accessible-muted">{row.label}</p>}
                <p className="text-xs text-accessible-muted mt-1">{row.is_active ? 'Активен' : 'Отключён'}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => copyInviteLink(row)}>
                  Копировать ссылку
                </button>
                <button
                  type="button"
                  className="button-secondary w-full sm:w-auto"
                  onClick={async () => {
                    await adminApi.setFormAccessCodeActive(row.id, !row.is_active);
                    refreshAccessCodes();
                  }}
                >
                  {row.is_active ? 'Отключить' : 'Включить'}
                </button>
                <button
                  type="button"
                  className="button-secondary w-full sm:w-auto border-red-300 text-red-800 hover:bg-red-50"
                  onClick={async () => {
                    if (!window.confirm('Удалить этот код? Старые ссылки перестанут работать.')) return;
                    await adminApi.deleteFormAccessCode(row.id);
                    refreshAccessCodes();
                  }}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
        {accessCodes.length === 0 && <p className="text-accessible-muted text-sm">Кодов пока нет — добавьте первый.</p>}
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

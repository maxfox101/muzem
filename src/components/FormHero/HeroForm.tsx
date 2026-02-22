import { useState, FormEvent, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applicationsApi, dictionariesApi, profileApi } from '../../services/api';

interface HeroFormData {
  last_name: string;
  first_name: string;
  middle_name: string;
  birth_date: string;
  birth_locality_id: string;
  death_date: string;
  rank_id: string;
  service_place_id: string;
  service_place_extra: string;
  extra_info: string;
  photo: File | null;
  sender_full_name: string;
  sender_email: string;
  sender_phone: string;
  subscribe_to_news: boolean;
  agree_to_offer: boolean;
  agree_to_personal_data: boolean;
}

export default function HeroForm() {
  const location = useLocation();
  const editId = (location.state as { editId?: number })?.editId;

  const [formData, setFormData] = useState<HeroFormData>({
    last_name: '',
    first_name: '',
    middle_name: '',
    birth_date: '',
    birth_locality_id: '',
    death_date: '',
    rank_id: '',
    service_place_id: '',
    service_place_extra: '',
    extra_info: '',
    photo: null,
    sender_full_name: '',
    sender_email: '',
    sender_phone: '',
    subscribe_to_news: false,
    agree_to_offer: false,
    agree_to_personal_data: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cloudStorageLink, setCloudStorageLink] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [dictionaries, setDictionaries] = useState<{
    ranks: { id: number; name: string }[];
    localities: { id: number; name: string }[];
    servicePlaces: { id: number; name: string }[];
  }>({ ranks: [], localities: [], servicePlaces: [] });

  useEffect(() => {
    Promise.all([
      dictionariesApi.getRanks(),
      dictionariesApi.getLocalities(),
      dictionariesApi.getServicePlaces(),
    ]).then(([rR, rL, rS]) => {
      if (rR.data) setDictionaries(prev => ({ ...prev, ranks: Array.isArray(rR.data) ? rR.data : [] }));
      if (rL.data) setDictionaries(prev => ({ ...prev, localities: Array.isArray(rL.data) ? rL.data : [] }));
      if (rS.data) setDictionaries(prev => ({ ...prev, servicePlaces: Array.isArray(rS.data) ? rS.data : [] }));
    });
  }, []);

  useEffect(() => {
    if (editId) {
      applicationsApi.getById(editId).then((res) => {
        const d = res.data as Record<string, unknown> | undefined;
        if (d) {
          setFormData(prev => ({
            ...prev,
            last_name: String(d.last_name ?? ''),
            first_name: String(d.first_name ?? ''),
            middle_name: String(d.middle_name ?? ''),
            birth_date: String(d.birth_date ?? ''),
            birth_locality_id: d.birth_locality_id != null ? String(d.birth_locality_id) : '',
            death_date: String(d.death_date ?? ''),
            rank_id: d.rank_id != null ? String(d.rank_id) : '',
            service_place_id: d.service_place_id != null ? String(d.service_place_id) : '',
            extra_info: String(d.extra_info ?? ''),
            sender_full_name: String(d.sender_full_name ?? ''),
            sender_email: String(d.sender_email ?? ''),
            sender_phone: String(d.sender_phone ?? ''),
          }));
        }
      });
    } else {
      profileApi.get().then((res) => {
        if (res.data) {
          setFormData(prev => ({
            ...prev,
            sender_full_name: res.data!.name || prev.sender_full_name,
            sender_email: res.data!.email || prev.sender_email,
            sender_phone: res.data!.phone || prev.sender_phone,
          }));
        }
      });
    }
  }, [editId]);

  // Автокоррекция ФИО: первая буква БОЛЬШАЯ
  const normalizeFio = (value: string): string => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  const handleFioChange = (field: 'last_name' | 'first_name' | 'middle_name', value: string) => {
    const normalized = normalizeFio(value);
    setFormData(prev => ({ ...prev, [field]: normalized }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.last_name.trim()) newErrors.last_name = 'Фамилия обязательна';
    if (!formData.first_name.trim()) newErrors.first_name = 'Имя обязательно';
    if (!formData.birth_date) newErrors.birth_date = 'Дата рождения обязательна';
    if (!formData.birth_locality_id) newErrors.birth_locality_id = 'Выберите населённый пункт';
    if (!formData.rank_id) newErrors.rank_id = 'Выберите звание';
    if (!formData.sender_full_name.trim()) newErrors.sender_full_name = 'Укажите ФИО отправителя';
    if (!formData.sender_email.trim()) newErrors.sender_email = 'Укажите email';
    if (!formData.agree_to_offer) newErrors.agree_to_offer = 'Необходимо принять оферту';
    if (!formData.agree_to_personal_data) newErrors.agree_to_personal_data = 'Необходимо дать согласие на обработку персональных данных';
    if (formData.photo && formData.photo.size > 10 * 1024 * 1024) {
      newErrors.photo = 'Размер файла не должен превышать 10 МБ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;

    const fd = new FormData();
    fd.append('last_name', formData.last_name.trim());
    fd.append('first_name', formData.first_name.trim());
    fd.append('middle_name', formData.middle_name.trim());
    fd.append('birth_date', formData.birth_date);
    fd.append('birth_locality_id', formData.birth_locality_id);
    if (formData.death_date) fd.append('death_date', formData.death_date);
    fd.append('rank_id', formData.rank_id);
    if (formData.service_place_id) fd.append('service_place_id', formData.service_place_id);
    if (formData.extra_info) fd.append('extra_info', formData.extra_info);
    fd.append('sender_full_name', formData.sender_full_name.trim());
    fd.append('sender_email', formData.sender_email.trim());
    if (formData.sender_phone) fd.append('sender_phone', formData.sender_phone.trim());
    fd.append('subscribe_to_news', formData.subscribe_to_news ? '1' : '0');
    if (formData.photo) fd.append('photo', formData.photo);

    if (editId) {
      const res = await applicationsApi.update(editId, {
        last_name: formData.last_name.trim(),
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        birth_date: formData.birth_date,
        birth_locality_id: formData.birth_locality_id || null,
        death_date: formData.death_date || null,
        rank_id: formData.rank_id,
        service_place_id: formData.service_place_id || null,
        extra_info: formData.extra_info || null,
        sender_full_name: formData.sender_full_name.trim(),
        sender_email: formData.sender_email.trim(),
        sender_phone: formData.sender_phone.trim() || null,
      });
      if (res.error) { setSubmitError(res.error); return; }
      setSubmitSuccess(true);
      return;
    }
    const res = await applicationsApi.create(fd);
    if (res.error) {
      setSubmitError(res.error);
      return;
    }
    setSubmitSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto min-w-0">
      <div className="card-container max-h-[90vh] overflow-y-auto flex flex-col gap-4 min-w-0">
        <div className="min-w-0">
          <label htmlFor="last_name" className="block mb-2 font-medium text-accessible required">
            Фамилия *
          </label>
            <input
              type="text"
              id="last_name"
              className={`input-field ${errors.last_name ? 'border-red-500' : ''}`}
              value={formData.last_name}
              onChange={(e) => handleFioChange('last_name', e.target.value)}
              placeholder="Иванов"
              required
              aria-describedby={errors.last_name ? 'last_name-error' : undefined}
            />
            {errors.last_name && (
              <p id="last_name-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.last_name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="first_name" className="block mb-2 font-medium text-accessible required">
              Имя *
            </label>
            <input
              type="text"
              id="first_name"
              className={`input-field ${errors.first_name ? 'border-red-500' : ''}`}
              value={formData.first_name}
              onChange={(e) => handleFioChange('first_name', e.target.value)}
              placeholder="Иван"
              required
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.first_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="middle_name" className="block mb-2 font-medium text-accessible">
              Отчество
            </label>
            <input
              type="text"
              id="middle_name"
              className="input-field"
              value={formData.middle_name}
              onChange={(e) => handleFioChange('middle_name', e.target.value)}
              placeholder="Иванович"
            />
          </div>

          <div>
            <label htmlFor="birth_date" className="block mb-2 font-medium text-accessible required">
              Дата рождения *
            </label>
            <input
              type="date"
              id="birth_date"
              className={`input-field ${errors.birth_date ? 'border-red-500' : ''}`}
              value={formData.birth_date}
              onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              required
            />
            {errors.birth_date && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.birth_date}</p>
            )}
          </div>

        <div>
          <label className="block mb-2 font-medium text-accessible">Субъект</label>
            <input
              type="text"
              className="input-field bg-gray-100"
              value="Ростовская область"
              readOnly
              aria-label="Субъект: Ростовская область"
            />
          </div>

        <div>
          <label htmlFor="birth_locality_id" className="block mb-2 font-medium text-accessible required">
              Населённый пункт рождения *
            </label>
            <select
              id="birth_locality_id"
              className={`input-field ${errors.birth_locality_id ? 'border-red-500' : ''}`}
              value={formData.birth_locality_id}
              onChange={(e) => setFormData(prev => ({ ...prev, birth_locality_id: e.target.value }))}
              required
            >
              <option value="">— Выберите —</option>
              {dictionaries.localities.map((l) => (
                <option key={l.id} value={String(l.id)}>{l.name}</option>
              ))}
            </select>
            {errors.birth_locality_id && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.birth_locality_id}</p>
            )}
          </div>

          <div>
            <label htmlFor="death_date" className="block mb-2 font-medium text-accessible">
              Дата гибели
            </label>
            <input
              type="date"
              id="death_date"
              className="input-field"
              value={formData.death_date}
              onChange={(e) => setFormData(prev => ({ ...prev, death_date: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label htmlFor="rank_id" className="block mb-2 font-medium text-accessible required">
              Звание *
            </label>
            <select
              id="rank_id"
              className={`input-field ${errors.rank_id ? 'border-red-500' : ''}`}
              value={formData.rank_id}
              onChange={(e) => setFormData(prev => ({ ...prev, rank_id: e.target.value }))}
              required
            >
              <option value="">— Выберите —</option>
              {dictionaries.ranks.map((r) => (
                <option key={r.id} value={String(r.id)}>{r.name}</option>
              ))}
            </select>
            {errors.rank_id && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.rank_id}</p>
            )}
          </div>

        <div>
          <label htmlFor="service_place_id" className="block mb-2 font-medium text-accessible">
              Место службы
            </label>
            <select
              id="service_place_id"
              className="input-field mb-2"
              value={formData.service_place_id}
              onChange={(e) => setFormData(prev => ({ ...prev, service_place_id: e.target.value }))}
            >
              <option value="">— Не указано —</option>
              {dictionaries.servicePlaces.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
            <input
              type="text"
              className="input-field"
              placeholder="Уточнение (при необходимости)"
              value={formData.service_place_extra}
              onChange={(e) => setFormData(prev => ({ ...prev, service_place_extra: e.target.value }))}
              maxLength={500}
            />
          </div>

        <div>
          <label htmlFor="extra_info" className="block mb-2 font-medium text-accessible">
              Дополнительные сведения
            </label>
            <textarea
              id="extra_info"
              className="input-field min-h-[120px]"
              value={formData.extra_info}
              onChange={(e) => setFormData(prev => ({ ...prev, extra_info: e.target.value }))}
              maxLength={5000}
              placeholder="Описание обстоятельств, награды и т.д."
            />
          </div>

        <div>
          <label htmlFor="photo" className="block mb-2 font-medium text-accessible">
              Фотография
            </label>
            <input
              type="file"
              id="photo"
              className={`input-field ${errors.photo ? 'border-red-500' : ''}`}
              accept="image/jpeg,image/png"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setFormData(prev => ({ ...prev, photo: file }));
              }}
            />
            <p className="mt-1 text-sm text-accessible-muted">
              JPEG или PNG, до 10 МБ, разрешение 600×800 — 6000×8000 px
            </p>
            {errors.photo && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.photo}</p>
            )}
            {formData.photo && (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(formData.photo)}
                  alt="Предпросмотр"
                  className="max-w-xs border-2 border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>

        {cloudStorageLink && (
          <div>
              <label className="block mb-2 font-medium text-accessible">
                Облачное хранилище
              </label>
              <p className="text-sm text-accessible-muted mb-2">
                Загрузите дополнительные материалы:
              </p>
              <a
                href={cloudStorageLink}
                target="_blank"
                rel="noopener noreferrer"
                className="button-primary"
              >
                Открыть облачное хранилище
              </a>
            </div>
          )}
        <div className="min-w-0">
          <label htmlFor="sender_full_name" className="block mb-2 font-medium text-accessible">ФИО *</label>
            <input
              type="text"
              id="sender_full_name"
              className={`input-field w-full min-w-0 ${errors.sender_full_name ? 'border-red-500' : ''}`}
              value={formData.sender_full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, sender_full_name: e.target.value }))}
              placeholder="Иванов Иван Иванович"
              required
            />
          {errors.sender_full_name && <p className="mt-1 text-sm text-red-600" role="alert">{errors.sender_full_name}</p>}
        </div>
        <div className="min-w-0">
          <label htmlFor="sender_email" className="block mb-2 font-medium text-accessible">E-mail *</label>
            <input
              type="email"
              id="sender_email"
              className={`input-field w-full min-w-0 ${errors.sender_email ? 'border-red-500' : ''}`}
              value={formData.sender_email}
              onChange={(e) => setFormData(prev => ({ ...prev, sender_email: e.target.value }))}
              placeholder="example@mail.ru"
              required
            />
          {errors.sender_email && <p className="mt-1 text-sm text-red-600" role="alert">{errors.sender_email}</p>}
        </div>
        <div className="min-w-0">
          <label htmlFor="sender_phone" className="block mb-2 font-medium text-accessible">Телефон</label>
            <input
              type="tel"
              id="sender_phone"
              className="input-field w-full min-w-0"
              value={formData.sender_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, sender_phone: e.target.value }))}
              placeholder="+79001234567"
            />
        </div>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="subscribe_to_news"
            className="mt-1 w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200"
            checked={formData.subscribe_to_news}
            onChange={(e) => setFormData(prev => ({ ...prev, subscribe_to_news: e.target.checked }))}
          />
          <label htmlFor="subscribe_to_news" className="text-accessible">
            Хочу получать акции музея «Самбекские высоты»
          </label>
        </div>
        <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agree_to_offer"
              className="mt-1 w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200"
              checked={formData.agree_to_offer}
              onChange={(e) => setFormData(prev => ({ ...prev, agree_to_offer: e.target.checked }))}
            />
            <label htmlFor="agree_to_offer" className="text-accessible">
              Принимаю условия оферты. <span className="text-accessible-muted">(Текст оферты — добавим позже)</span>
            </label>
        </div>
        {errors.agree_to_offer && (
          <p className="text-sm text-red-600" role="alert">{errors.agree_to_offer}</p>
        )}
        <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agree_to_personal_data"
              className="mt-1 w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200"
              checked={formData.agree_to_personal_data}
              onChange={(e) => setFormData(prev => ({ ...prev, agree_to_personal_data: e.target.checked }))}
            />
            <label htmlFor="agree_to_personal_data" className="text-accessible">
              Даю согласие на обработку персональных данных в соответствии с законодательством РФ.
            </label>
          </div>
        {errors.agree_to_personal_data && (
          <p className="text-sm text-red-600" role="alert">{errors.agree_to_personal_data}</p>
        )}
        {submitSuccess && (
          <div className="p-4 rounded-xl bg-green-50 border-2 border-green-300 text-green-800 font-medium" role="alert">
            Заявка успешно отправлена.
          </div>
        )}
        {submitError && (
          <p className="text-red-600 font-medium" role="alert">{submitError}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            className="button-primary"
          >
            {editId ? 'Сохранить изменения' : 'Отправить заявку'}
          </button>
          <button
            type="button"
            className="button-secondary"
          >
            Сохранить черновик
          </button>
        </div>
      </div>
    </form>
  );
}

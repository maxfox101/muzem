import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { applicationsApi, type ApplicationRow } from '../services/api';

function statusLabel(s: string) {
  const map: Record<string, string> = { draft: 'Черновик', clarification: 'На уточнении', published: 'Принята', rejected: 'Отклонена' };
  return map[s] || s;
}

export default function CabinetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<ApplicationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    applicationsApi.getById(Number(id)).then((res) => {
      setLoading(false);
      if (res.data) setApp(res.data as ApplicationRow);
      if (res.error) setError(res.error);
    });
  }, [id]);

  if (loading) return <p className="text-accessible-muted">Загрузка…</p>;
  if (error || !app) return <p className="text-red-600">{error || 'Заявка не найдена'}</p>;

  const fullName = [app.last_name, app.first_name, app.middle_name].filter(Boolean).join(' ');
  const canEdit = app.status === 'draft' || app.status === 'clarification';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card-container space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-accessible">Заявка #{app.id}</h1>
          <span className="text-accessible-muted">{statusLabel(app.status)}</span>
        </div>
        <dl className="grid gap-2">
          <dt className="font-semibold text-accessible">ФИО</dt>
          <dd className="text-accessible-muted">{fullName}</dd>
          <dt className="font-semibold text-accessible">Дата рождения</dt>
          <dd className="text-accessible-muted">{app.birth_date}</dd>
          <dt className="font-semibold text-accessible">Населённый пункт</dt>
          <dd className="text-accessible-muted">{app.birth_locality || '—'}</dd>
          <dt className="font-semibold text-accessible">Звание</dt>
          <dd className="text-accessible-muted">{app.rank || '—'}</dd>
          <dt className="font-semibold text-accessible">Контакт отправителя</dt>
          <dd className="text-accessible-muted">{app.sender_full_name}, {app.sender_email}{app.sender_phone ? ', ' + app.sender_phone : ''}</dd>
        </dl>
        <div className="flex flex-wrap gap-3 pt-4">
          <Link to="/cabinet" className="button-secondary">К списку заявок</Link>
          {canEdit && (
            <Link
              to="/form"
              state={{ editId: app.id }}
              className="button-primary"
            >
              Редактировать заявку
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

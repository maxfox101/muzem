import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationsApi, type ApplicationRow } from '../services/api';

function statusLabel(s: string) {
  const map: Record<string, string> = { draft: 'Черновик', clarification: 'На уточнении', published: 'Принята', rejected: 'Отклонена' };
  return map[s] || s;
}

export default function CabinetPage() {
  const [list, setList] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applicationsApi.getMine().then((res) => {
      setLoading(false);
      if (res.data) setList(Array.isArray(res.data) ? res.data : []);
      if (res.error) setError(res.error);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-accessible">Мои заявки</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-accessible-muted">Загрузка…</p>}
      {!loading && list.length === 0 && !error && (
        <div className="card-container">
          <p className="text-accessible-muted mb-4">У вас пока нет заявок.</p>
          <Link to="/form" className="button-primary">Подать заявку</Link>
        </div>
      )}
      {!loading && list.length > 0 && (
        <div className="card-container overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-3 font-semibold text-accessible">№</th>
                <th className="p-3 font-semibold text-accessible">ФИО</th>
                <th className="p-3 font-semibold text-accessible">Дата рождения</th>
                <th className="p-3 font-semibold text-accessible">Статус</th>
                <th className="p-3 font-semibold text-accessible">Действия</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const fullName = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ');
                return (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="p-3">{row.id}</td>
                    <td className="p-3">{fullName}</td>
                    <td className="p-3">{row.birth_date}</td>
                    <td className="p-3">{statusLabel(row.status)}</td>
                    <td className="p-3">
                      <Link
                        to={`/cabinet/${row.id}`}
                        className="button-secondary text-sm py-2 min-h-0"
                      >
                        {row.status === 'draft' || row.status === 'clarification' ? 'Просмотр / Редактирование' : 'Просмотр'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

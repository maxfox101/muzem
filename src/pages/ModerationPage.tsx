import { useState, useEffect, useMemo } from 'react';
import { applicationsApi, type ApplicationRow } from '../services/api';

function mapRowToCard(row: ApplicationRow) {
  const fullName = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ');
  return {
    id: row.id,
    hero: { full_name: fullName, birth_date: row.birth_date, birth_locality: row.birth_locality || '—', rank: row.rank || '—', photo_url: undefined },
    status: row.status,
    sender_email: row.sender_email,
    sender_phone: row.sender_phone ?? undefined,
  };
}

type SortKey = 'created_at' | 'status' | 'name' | 'birth_date' | 'birth_locality' | 'rank';
type StatusFilter = 'all' | 'draft' | 'clarification' | 'published' | 'rejected';

export default function ModerationPage() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortDesc, setSortDesc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tab, setTab] = useState<'moderation' | 'table'>('moderation');
  const [tableSort, setTableSort] = useState<SortKey>('created_at');
  const [tableDesc, setTableDesc] = useState(true);
  const [filterLocality, setFilterLocality] = useState('');
  const [filterRank, setFilterRank] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    applicationsApi.getAll().then((res) => {
      setLoading(false);
      if (res.data) setApplications(Array.isArray(res.data) ? res.data : []);
      if (res.error) setError(res.error);
    });
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = applications;
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'created_at') cmp = (a.created_at || '').localeCompare(b.created_at || '');
      else if (sortBy === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      else if (sortBy === 'name') cmp = [a.last_name, a.first_name].join(' ').localeCompare([b.last_name, b.first_name].join(' '));
      else if (sortBy === 'birth_date') cmp = (a.birth_date || '').localeCompare(b.birth_date || '');
      else if (sortBy === 'birth_locality') cmp = (a.birth_locality || '').localeCompare(b.birth_locality || '');
      else if (sortBy === 'rank') cmp = (a.rank || '').localeCompare(b.rank || '');
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [applications, statusFilter, sortBy, sortDesc]);

  const publishedOnly = useMemo(() => applications.filter((a) => a.status === 'published'), [applications]);

  const tableData = useMemo(() => {
    let list = publishedOnly;
    if (filterLocality) list = list.filter((a) => (a.birth_locality || '').toLowerCase().includes(filterLocality.toLowerCase()));
    if (filterRank) list = list.filter((a) => (a.rank || '').toLowerCase().includes(filterRank.toLowerCase()));
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (tableSort === 'created_at') cmp = (a.created_at || '').localeCompare(b.created_at || '');
      else if (tableSort === 'name') cmp = [a.last_name, a.first_name].join(' ').localeCompare([b.last_name, b.first_name].join(' '));
      else if (tableSort === 'birth_date') cmp = (a.birth_date || '').localeCompare(b.birth_date || '');
      else if (tableSort === 'birth_locality') cmp = (a.birth_locality || '').localeCompare(b.birth_locality || '');
      else if (tableSort === 'rank') cmp = (a.rank || '').localeCompare(b.rank || '');
      return tableDesc ? -cmp : cmp;
    });
    return list;
  }, [publishedOnly, filterLocality, filterRank, tableSort, tableDesc]);

  const localities = useMemo(() => [...new Set(publishedOnly.map((a) => a.birth_locality).filter(Boolean))] as string[], [publishedOnly]);
  const ranks = useMemo(() => [...new Set(publishedOnly.map((a) => a.rank).filter(Boolean))] as string[], [publishedOnly]);

  const sortTh = (key: SortKey, label: string) => (
    <th
      className="p-3 font-semibold text-accessible text-left cursor-pointer hover:bg-gray-100 border-b-2 border-gray-200 whitespace-nowrap"
      onClick={() => { setTableSort(key); setTableDesc((d) => (tableSort === key ? !d : true)); }}
    >
      {label} {tableSort === key ? (tableDesc ? '↓' : '↑') : ''}
    </th>
  );

  const handleStatusChange = async (id: number, backendStatus: 'published' | 'rejected' | 'clarification') => {
    let comment: string | undefined;
    if (backendStatus === 'rejected' || backendStatus === 'clarification') {
      const promptText = backendStatus === 'rejected'
        ? 'Укажите причину отклонения (необязательно):'
        : 'Укажите, что нужно уточнить (необязательно):';
      // eslint-disable-next-line no-alert
      const entered = window.prompt(promptText) ?? '';
      comment = entered.trim() || undefined;
    }
    const res = await applicationsApi.updateStatus(id, backendStatus, comment);
    if (res.error) {
      setError(res.error);
      return;
    }
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: backendStatus } : a)));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-accessible">Заявки</h1>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab('moderation')}
          className={tab === 'moderation' ? 'button-primary' : 'button-secondary'}
        >
          На модерацию
        </button>
        <button
          type="button"
          onClick={() => setTab('table')}
          className={tab === 'table' ? 'button-primary' : 'button-secondary'}
        >
          Принятые заявки (таблица)
        </button>
      </div>

      {error && <p className="mb-4 text-red-600 font-medium">{error}</p>}

      {tab === 'moderation' && (
        <>
          <div className="card-container mb-6 flex flex-wrap gap-4 items-center">
            <label className="font-semibold text-accessible">Статус:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="input-field max-w-[180px]">
              <option value="all">Все</option>
              <option value="draft">Черновик</option>
              <option value="clarification">На уточнении</option>
              <option value="published">Принята</option>
              <option value="rejected">Отклонена</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="input-field max-w-[160px]">
              <option value="created_at">По дате</option>
              <option value="status">По статусу</option>
              <option value="name">По ФИО</option>
            </select>
            <button type="button" onClick={() => setSortDesc((d) => !d)} className="button-secondary">
              {sortDesc ? '↓ Убыв.' : '↑ Возр.'}
            </button>
          </div>
          {loading && <p className="text-accessible-muted">Загрузка…</p>}
          {!loading && filteredAndSorted.length === 0 && !error && <p className="text-accessible-muted">Заявок не найдено.</p>}
          {!loading && (
            <div className="card-container overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1400px]">
                <thead>
                  <tr>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200">№</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">ФИО</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Дата рождения</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Дата гибели</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Населённый пункт</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Звание</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Род войск</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Доп. сведения</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Ссылка на облако</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Отправитель</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Контакты</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Дата заявки</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Статус</th>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200 whitespace-nowrap">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((row) => {
                    const fullName = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ');
                    return (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">{row.id}</td>
                        <td className="p-3 whitespace-nowrap">{fullName}</td>
                        <td className="p-3 whitespace-nowrap">{row.birth_date}</td>
                        <td className="p-3 whitespace-nowrap">{row.death_date || '—'}</td>
                        <td className="p-3 whitespace-nowrap">{row.birth_locality || '—'}</td>
                        <td className="p-3 whitespace-nowrap">{row.rank || '—'}</td>
                        <td className="p-3 whitespace-nowrap">{row.service_place || '—'}</td>
                        <td className="p-3 max-w-xs text-sm truncate" title={row.extra_info || undefined}>
                          {row.extra_info || '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {row.cloud_link ? (
                            <a href={row.cloud_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              Облако
                            </a>
                          ) : '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap">{row.sender_full_name || '—'}</td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          {row.sender_email && <a href={`mailto:${row.sender_email}`} className="text-blue-600 underline">{row.sender_email}</a>}
                          {row.sender_phone && <><br /><a href={`tel:${row.sender_phone}`} className="text-blue-600 underline">{row.sender_phone}</a></>}
                          {!row.sender_email && !row.sender_phone && '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleDateString('ru') : '—'}</td>
                        <td className="p-3 whitespace-nowrap">
                          {row.status === 'draft' && 'Черновик'}
                          {row.status === 'clarification' && 'На уточнении'}
                          {row.status === 'published' && 'Принята'}
                          {row.status === 'rejected' && 'Отклонена'}
                          {!['draft', 'clarification', 'published', 'rejected'].includes(row.status) && row.status}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="button-primary px-3 py-2 text-sm"
                              onClick={() => handleStatusChange(row.id, 'published')}
                              disabled={row.status === 'published'}
                            >
                              Принять
                            </button>
                            <button
                              type="button"
                              className="button-secondary px-3 py-2 text-sm"
                              onClick={() => handleStatusChange(row.id, 'clarification')}
                            >
                              Уточнить
                            </button>
                            <button
                              type="button"
                              className="button-secondary px-3 py-2 text-sm"
                              onClick={() => handleStatusChange(row.id, 'rejected')}
                            >
                              Отклонить
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'table' && (
        <>
          <div className="card-container mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-accessible mb-1">Населённый пункт</label>
              <select value={filterLocality} onChange={(e) => setFilterLocality(e.target.value)} className="input-field min-w-0">
                <option value="">Все</option>
                {localities.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-accessible mb-1">Звание</label>
              <select value={filterRank} onChange={(e) => setFilterRank(e.target.value)} className="input-field min-w-0">
                <option value="">Все</option>
                {ranks.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          {loading && <p className="text-accessible-muted">Загрузка…</p>}
          {!loading && (
            <div className="card-container overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr>
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200">№</th>
                    {sortTh('name', 'ФИО')}
                    {sortTh('birth_date', 'Дата рождения')}
                    {sortTh('birth_locality', 'Населённый пункт')}
                    {sortTh('rank', 'Звание')}
                    {sortTh('created_at', 'Дата заявки')}
                    <th className="p-3 font-semibold text-accessible border-b-2 border-gray-200">Контакт</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length === 0 ? (
                    <tr><td colSpan={7} className="p-4 text-accessible-muted text-center">Нет принятых заявок</td></tr>
                  ) : (
                    tableData.map((row) => {
                      const fullName = [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ');
                      return (
                        <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3">{row.id}</td>
                          <td className="p-3">{fullName}</td>
                          <td className="p-3">{row.birth_date}</td>
                          <td className="p-3">{row.birth_locality || '—'}</td>
                          <td className="p-3">{row.rank || '—'}</td>
                          <td className="p-3">{row.created_at ? new Date(row.created_at).toLocaleDateString('ru') : '—'}</td>
                          <td className="p-3 text-sm">
                            {row.sender_email && <a href={`mailto:${row.sender_email}`} className="text-blue-600 underline">{row.sender_email}</a>}
                            {row.sender_phone && <><br /><a href={`tel:${row.sender_phone}`} className="text-blue-600 underline">{row.sender_phone}</a></>}
                            {!row.sender_email && !row.sender_phone && '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

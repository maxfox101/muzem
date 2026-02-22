import { useState } from 'react';

interface Application {
  id: number;
  hero: {
    full_name: string;
    birth_date: string;
    birth_locality: string;
    rank: string;
    photo_url?: string;
  };
  status: string;
  sender_email?: string;
  sender_phone?: string;
}

interface ApplicationCardProps {
  application: Application;
  onStatusChange: (id: number, status: string, reason?: string) => void;
}

export default function ApplicationCard({ application, onStatusChange }: ApplicationCardProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState<string[]>([]);
  const [rejectComment, setRejectComment] = useState('');

  const handleAccept = () => {
    onStatusChange(application.id, 'accepted');
  };

  const handleReject = () => {
    if (rejectReason.length === 0) {
      alert('Выберите причину отклонения');
      return;
    }
    onStatusChange(application.id, 'rejected', rejectReason.join(', ') + (rejectComment ? ': ' + rejectComment : ''));
    setShowRejectModal(false);
  };

  const handleClarify = () => {
    onStatusChange(application.id, 'clarification');
  };

  return (
    <>
      <div className="base-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-lg font-semibold text-accessible">👤 {application.hero.full_name}</p>
            <p className="text-accessible-muted">📅 {application.hero.birth_date}</p>
            <p className="text-accessible-muted">📍 {application.hero.birth_locality}</p>
            <p className="text-accessible-muted">⭐ {application.hero.rank}</p>
            {(application.sender_email || application.sender_phone) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-accessible">Контакт отправителя</p>
                {application.sender_email && (
                  <p className="text-sm text-accessible-muted">
                    📧 <a href={`mailto:${application.sender_email}`} className="text-blue-600 underline">{application.sender_email}</a>
                  </p>
                )}
                {application.sender_phone && (
                  <p className="text-sm text-accessible-muted">
                    📞 <a href={`tel:${application.sender_phone}`} className="text-blue-600 underline">{application.sender_phone}</a>
                  </p>
                )}
              </div>
            )}
          </div>
          {application.hero.photo_url && (
            <div>
              <img
                src={application.hero.photo_url}
                alt={application.hero.full_name}
                className="w-full max-w-xs border-2 border-gray-300 rounded-lg"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAccept}
            className="base-button bg-green-600 text-white border-green-600 hover:bg-green-700"
          >
            ✅ ПРИНЯТЬ
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            className="base-button bg-red-600 text-white border-red-600 hover:bg-red-700"
          >
            ❌ ОТКЛОНИТЬ
          </button>
          <button
            onClick={handleClarify}
            className="base-button bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700"
          >
            📧 УТОЧНИТЬ
          </button>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="base-card modal bg-white max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-accessible">Причины отклонения</h3>
            
            <div className="space-y-2 mb-4">
              {[
                'Неправильные данные ФИО',
                'Нет фото',
                'Неверная дата рождения',
                'Не Ростовская область',
                'Дубликат',
                'Другие данные',
              ].map((reason) => (
                <label key={reason} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200"
                    checked={rejectReason.includes(reason)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRejectReason([...rejectReason, reason]);
                      } else {
                        setRejectReason(rejectReason.filter(r => r !== reason));
                      }
                    }}
                  />
                  <span className="text-accessible">{reason}</span>
                </label>
              ))}
            </div>

            <textarea
              className="base-input mb-4"
              placeholder="Дополнительный комментарий"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
            />

            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="base-button bg-red-600 text-white border-red-600 hover:bg-red-700 flex-1"
              >
                Отклонить
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="base-button bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300 flex-1"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

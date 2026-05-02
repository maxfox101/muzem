import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isZoomed) {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '';
    }
  }, [isZoomed]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isAdminRole = user?.role === 'admin';
  const canModerate = user?.role === 'moderator' || isAdminRole;

  const navBtn =
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap text-sm py-2 px-4 min-h-[44px] rounded-xl';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b-2 border-gray-200 shadow-md shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            <Link to="/" className="text-xl font-bold text-accessible hover:underline shrink-0">
              Сервис заявок
            </Link>

            <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto rounded-xl border-2 border-gray-200 bg-gray-50 px-2 py-2">
              <div className="flex shrink-0 flex-nowrap items-center gap-2">
                <span className="shrink-0 border-r-2 border-gray-300 pr-2 text-xs font-semibold uppercase tracking-wide text-accessible-muted">
                  Заявки
                </span>
                <button
                  type="button"
                  onClick={() => setIsZoomed((v) => !v)}
                  className={`button-secondary ${navBtn} w-11 min-w-[2.75rem] px-0`}
                  aria-label={isZoomed ? 'Отключить крупный шрифт' : 'Включить крупный шрифт'}
                >
                  🔍
                </button>
                <Link to="/" className={`button-secondary ${navBtn}`}>
                  Главная
                </Link>
                <Link to="/form" className={`button-primary ${navBtn}`}>
                  Создать заявку
                </Link>
                <Link to="/support" className={`button-secondary ${navBtn}`}>
                  Поддержка
                </Link>
                {user?.role === 'sender' && (
                  <Link to="/cabinet" className={`button-secondary ${navBtn}`}>
                    Мои заявки
                  </Link>
                )}
              </div>
              <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-3 border-l-2 border-gray-300 py-0.5 pl-3">
                <span className="max-w-[12rem] truncate text-sm text-accessible-muted">{user?.name}</span>
                <button type="button" onClick={handleLogout} className={`button-secondary ${navBtn}`}>
                  Выход
                </button>
              </div>
            </div>

            {canModerate && (
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto rounded-xl border-2 border-amber-300 bg-amber-50 px-2 py-2">
                <span className="shrink-0 border-r-2 border-amber-300 pr-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Управление
                </span>
                <Link
                  to="/moderation"
                  className={`button-secondary ${navBtn} bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200`}
                >
                  Модерация
                </Link>
                {isAdminRole && (
                  <Link
                    to="/admin"
                    className={`button-secondary ${navBtn} bg-green-100 border-green-500 text-green-800 hover:bg-green-200`}
                  >
                    Админка
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className={isHome ? 'flex-1 w-full min-h-0' : 'flex-1 container mx-auto px-4 py-8'}>
        {children}
      </main>
    </div>
  );
}

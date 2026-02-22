import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-2 border-gray-200 rounded-b-2xl shadow-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="text-xl font-bold text-accessible hover:underline">
              Быть воином — жить вечно
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/" className="button-secondary text-sm py-2 min-h-0">
                Главная
              </Link>
              <Link to="/form" className="button-primary text-sm py-2 min-h-0">
                Подать заявку
              </Link>
              <Link to="/support" className="button-secondary text-sm py-2 min-h-0">
                Поддержка
              </Link>
              {user?.role === 'sender' && (
                <Link to="/cabinet" className="button-secondary text-sm py-2 min-h-0">
                  Мои заявки
                </Link>
              )}
              {isModerator && (
                <Link to="/moderation" className="button-secondary text-sm py-2 min-h-0 bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200">
                  Заявки
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="button-secondary text-sm py-2 min-h-0 bg-green-100 border-green-500 text-green-800 hover:bg-green-200">
                  Админка
                </Link>
              )}
              <span className="text-sm text-accessible-muted px-2">{user?.name}</span>
              <button type="button" onClick={handleLogout} className="button-secondary text-sm py-2 min-h-0">
                Выход
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

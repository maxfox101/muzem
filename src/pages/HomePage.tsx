import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-4xl font-bold mb-6 text-accessible">
        Проект «Быть воином — жить вечно»
      </h1>
      <p className="text-lg text-accessible-muted mb-8">
        ГБУК РО «Народный военно-исторический музей Великой Отечественной войны "Самбекские высоты"»
      </p>
      <div className="base-card max-w-md mx-auto">
        <p className="mb-4 text-accessible">
          Система приёма и обработки заявок о погибших участниках СВО — уроженцах Ростовской области.
        </p>
        <Link
          to="/form"
          className="base-button inline-block bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
        >
          Подать заявку
        </Link>
      </div>
    </div>
  );
}

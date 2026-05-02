import { Link } from 'react-router-dom';
import heroWave from '../assets/hero-wave.png';

export default function HomePage() {
  return (
    <div className="relative w-full min-h-[calc(100dvh-5.5rem)] flex flex-col bg-black">
      <img
        src={heroWave}
        alt=""
        className="absolute inset-0 w-full h-full min-h-full object-cover object-center"
      />
      <div className="relative z-10 flex min-h-[calc(100dvh-5.5rem)] flex-1 flex-col items-center justify-center px-4 py-10 bg-black/35">
        <p className="text-white/95 text-center text-lg sm:text-xl max-w-2xl mb-6 drop-shadow-md leading-relaxed">
          Настраивайте поля заявки в админ-панели: текст, даты, списки, фотография, ссылка на облако и другие блоки — по тому же принципу, что уже реализовано.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xl shrink-0">
          <Link to="/form" className="button-primary w-full text-center justify-center">
            Создать заявку
          </Link>
          <Link to="/cabinet" className="button-secondary w-full text-center justify-center bg-white/95 border-white text-gray-900 hover:bg-white">
            Мои заявки
          </Link>
        </div>
      </div>
    </div>
  );
}

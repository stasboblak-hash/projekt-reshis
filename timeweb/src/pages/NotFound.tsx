import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card text-center">
        <p className="section-label">ОШИБКА 404</p>
        <h1>Страница не найдена</h1>
        <p className="intro-copy mx-auto mt-4">Такого адреса нет. Вернитесь к расчёту спроса.</p>
        <Link to="/" className="auth-back mt-6 text-cyan"><ArrowLeft size={16} /> На главную</Link>
      </section>
    </main>
  );
}

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { api, setCsrfToken, type SessionResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const session = await api<SessionResponse>(register ? "/register" : "/login", { name, email, password });
      setCsrfToken(session.csrfToken);
      queryClient.setQueryData(["session"], session);
      await queryClient.invalidateQueries({ queryKey: ["history"] });
      navigate("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось выполнить вход");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link to="/" className="brand auth-brand"><span className="brand-mark"><RouteIcon size={22} /></span><span><strong>РЕШИСЬ</strong><small>АВИА / СПРОС</small></span></Link>
        <div className="auth-heading"><span className="section-label">ЛИЧНЫЙ КАБИНЕТ</span><h1 id="auth-title">{register ? "Создайте аккаунт" : "С возвращением"}</h1><p>Сохраняйте расчёты и возвращайтесь к ним с любого устройства.</p></div>
        <div className="auth-tabs" role="group" aria-label="Вход или регистрация">
          <button type="button" className={!register ? "active" : ""} onClick={() => { setRegister(false); setError(""); }}>Вход</button>
          <button type="button" className={register ? "active" : ""} onClick={() => { setRegister(true); setError(""); }}>Регистрация</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          {register && <div className="field-group"><label htmlFor="auth-name">Ваше имя</label><input id="auth-name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Станислав" /></div>}
          <div className="field-group"><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" required maxLength={190} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.ru" /></div>
          <div className="field-group"><label htmlFor="auth-password">Пароль</label><input id="auth-password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Минимум 8 символов" /></div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <Button type="submit" className="calculate-button" disabled={pending}>{pending ? "Проверяем…" : register ? "Зарегистрироваться" : "Войти"}<ArrowRight size={18} /></Button>
        </form>
        <p className="auth-security"><ShieldCheck size={16} /> Пароль хранится только в виде защищённого хеша.</p>
        <Link to="/" className="auth-back"><ArrowLeft size={16} /> Вернуться к прогнозу</Link>
      </section>
    </main>
  );
}

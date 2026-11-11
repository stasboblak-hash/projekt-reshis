import { lazy, Suspense, useMemo, useState, type FormEvent } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  History,
  LogOut,
  Plane,
  Route as RouteIcon,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import type { ForecastInput } from "@contracts/forecast";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const DemandChart = lazy(() =>
  import("@/components/forecast/DemandChart").then((module) => ({ default: module.DemandChart })),
);

const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T12:00:00`));
}

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const metaQuery = trpc.forecast.meta.useQuery();
  const [routeCode, setRouteCode] = useState("MOW-AER");
  const [date, setDate] = useState("2026-06-01");
  const [price, setPrice] = useState(9000);
  const [submitted, setSubmitted] = useState<ForecastInput | null>({
    route: "MOW-AER",
    date: "2026-06-01",
    price: 9000,
  });

  const selectedRoute = metaQuery.data?.routes.find((route) => route.route === routeCode);
  const forecastQuery = trpc.forecast.calculate.useQuery(submitted!, {
    enabled: Boolean(submitted),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const result = forecastQuery.data;
  const utils = trpc.useUtils();
  const historyQuery = trpc.forecast.history.useQuery(undefined, { enabled: isAuthenticated });
  const saveMutation = trpc.forecast.save.useMutation({
    onSuccess: async () => {
      toast.success("Расчёт сохранён в истории");
      await utils.forecast.history.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const chartSummary = useMemo(() => {
    if (!result) return "";
    if (result.capacityLimitedScenarios === 0) return `Кресел хватает во всех 9 сценариях`;
    return `В ${result.capacityLimitedScenarios} из 9 сценариев спрос превышает число мест`;
  }, [result]);

  function changeRoute(value: string) {
    setRouteCode(value);
    const route = metaQuery.data?.routes.find((item) => item.route === value);
    if (route) setPrice(route.basePrice);
  }

  function calculate(event?: FormEvent) {
    event?.preventDefault();
    if (!selectedRoute || !date) return;
    setSubmitted({ route: routeCode, date, price });
  }

  function loadCalculation(item: { route: string; flightDate: string; price: number }) {
    setRouteCode(item.route);
    setDate(item.flightDate);
    setPrice(item.price);
    setSubmitted({ route: item.route, date: item.flightDate, price: item.price });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <Toaster theme="dark" position="bottom-right" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Решись Авиа — к началу страницы">
          <span className="brand-mark"><RouteIcon size={22} strokeWidth={1.8} /></span>
          <span><strong>РЕШИСЬ</strong><small>АВИА / СПРОС</small></span>
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="live-status"><i /> Данные готовы</span>
          {!authLoading && (isAuthenticated ? (
            <div className="user-menu">
              <details>
                <summary><UserRound size={17} /><span className="hidden sm:inline">{user?.name || "Профиль"}</span><ChevronDown size={14} /></summary>
                <div className="user-popover">
                  <p>{user?.email || "Аккаунт Kimi"}</p>
                  <button onClick={logout}><LogOut size={15} /> Выйти</button>
                </div>
              </details>
            </div>
          ) : (
            <Link to="/login" className="auth-link"><UserRound size={17} /> <span className="hidden sm:inline">Войти</span></Link>
          ))}
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1560px] px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <section className="intro-grid appear">
          <div>
            <div className="section-label"><span>01</span> ПУЛЬТ УПРАВЛЕНИЯ ЦЕНОЙ</div>
            <h1>Сколько купят<br /><em>по вашей цене?</em></h1>
          </div>
          <div className="intro-copy">
            <p>Выберите рейс и измените цену. Сервис пересчитает спрос по девяти вероятностным сценариям и покажет, где продажи упрутся в вместимость самолёта.</p>
            <div className="data-note"><ShieldCheck size={16} /> {metaQuery.data?.flightCount ?? 155} рейсов · 01.06—01.07.2026 · прогноз ML-модели</div>
          </div>
        </section>

        <div className="workspace">
          <aside className="control-panel appear delay-1" aria-label="Параметры прогноза">
            <div className="panel-heading">
              <div><span className="panel-index">01</span><h2>Параметры рейса</h2></div>
              <Plane size={20} />
            </div>
            {metaQuery.isLoading ? (
              <div className="space-y-4 p-5" aria-label="Загрузка параметров">
                {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-16" />)}
              </div>
            ) : metaQuery.isError ? (
              <div className="error-state" role="alert">
                <CircleAlert size={22} />
                <p>Не удалось загрузить маршруты.</p>
                <Button variant="outline" onClick={() => metaQuery.refetch()}>Повторить</Button>
              </div>
            ) : (
              <form onSubmit={calculate} className="form-body">
                <div className="field-group">
                  <label>Пункт отправления</label>
                  <div className="fixed-value"><span className="airport-code">MOW</span><span>Москва</span></div>
                </div>
                <div className="field-group">
                  <label htmlFor="destination">Пункт назначения</label>
                  <div className="select-wrap">
                    <select id="destination" value={routeCode} onChange={(event) => changeRoute(event.target.value)}>
                      {metaQuery.data?.routes.map((route) => <option key={route.route} value={route.route}>{route.name.split(" — ")[1]}</option>)}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </div>
                <div className="field-group">
                  <label htmlFor="flight-date">Дата вылета</label>
                  <input id="flight-date" type="date" required min={metaQuery.data?.minDate} max={metaQuery.data?.maxDate} value={date} onChange={(event) => setDate(event.target.value)} />
                </div>
                <div className="field-group price-field">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="ticket-price">Цена билета</label>
                    <button type="button" className="base-price" onClick={() => selectedRoute && setPrice(selectedRoute.basePrice)}>базовая {number.format(selectedRoute?.basePrice ?? 0)} ₽</button>
                  </div>
                  <div className="price-input"><input id="ticket-price" type="number" required min={selectedRoute?.priceMin} max={selectedRoute?.priceMax} step={100} value={price} onChange={(event) => setPrice(Number(event.target.value))} /><span>₽</span></div>
                  <input className="price-range" aria-label="Цена билета на шкале" type="range" min={selectedRoute?.priceMin} max={selectedRoute?.priceMax} step={100} value={price} onChange={(event) => setPrice(Number(event.target.value))} />
                  <div className="range-labels"><span>{number.format(selectedRoute?.priceMin ?? 0)} ₽</span><span>{number.format(selectedRoute?.priceMax ?? 0)} ₽</span></div>
                </div>
                <Button type="submit" className="calculate-button" disabled={forecastQuery.isFetching || !submitted}>
                  {forecastQuery.isFetching ? "Пересчитываем…" : "Рассчитать прогноз"}<ArrowRight size={18} />
                </Button>
                <p className="form-hint">Расчёт выполняется на backend по формуле линейной чувствительности к цене.</p>
              </form>
            )}
          </aside>

          <section className="results-panel appear delay-2" aria-live="polite" aria-busy={forecastQuery.isFetching}>
            <div className="panel-heading results-heading">
              <div><span className="panel-index">02</span><h2>Прогноз продаж</h2></div>
              {result && <div className="flight-tag"><strong>{result.route.route}</strong><span>{formatDate(result.date)}</span></div>}
            </div>
            {forecastQuery.isError ? (
              <div className="error-state m-5" role="alert"><CircleAlert size={24} /><p>{forecastQuery.error.message}</p><Button variant="outline" onClick={() => forecastQuery.refetch()}>Повторить расчёт</Button></div>
            ) : !result ? (
              <div className="empty-state"><Plane size={30} /><p>Загружаем первый прогноз…</p></div>
            ) : (
              <>
                <div className="route-strip">
                  <div><span>Москва</span><small>MOW</small></div><div className="route-line"><Plane size={18} /></div><div className="text-right"><span>{result.route.name.split(" — ")[1]}</span><small>{result.route.route.split("-")[1]}</small></div>
                  <div className="route-price"><small>Цена билета</small><strong>{money.format(result.price)}</strong></div>
                </div>
                <div className="metrics-grid">
                  <div className="metric"><span>Мест в самолёте</span><strong>{number.format(result.seats)}</strong><small>доступно к продаже</small></div>
                  <div className="metric"><span>Желают купить</span><strong>{number.format(result.desiredDemand)}</strong><small>медианный спрос</small></div>
                  <div className="metric primary-metric"><span>Купят билетов</span><strong>{number.format(result.sales)}</strong><small>с учётом ограничения мест</small></div>
                  <div className="metric"><span>Останется свободно</span><strong>{number.format(result.availableSeats)}</strong><small>по медианному сценарию</small></div>
                </div>
                <div className="chart-section">
                  <div className="chart-title">
                    <div><h3>Распределение спроса</h3><p>Каждый сценарий соответствует 10%-му интервалу вероятности</p></div>
                    <div className="legend"><span className="legend-demand">Спрос</span><span className="legend-sales">Продажи</span></div>
                  </div>
                  <Suspense fallback={<div className="skeleton h-[310px] w-full" aria-label="Загрузка графика" />}>
                    <DemandChart result={result} />
                  </Suspense>
                  <div className={`capacity-message ${result.capacityLimitedScenarios ? "warning" : "success"}`}>
                    {result.capacityLimitedScenarios ? <CircleAlert size={17} /> : <Check size={17} />}
                    <span>{chartSummary}. Медиана: {number.format(result.desiredDemand)} желающих → {number.format(result.sales)} продаж.</span>
                  </div>
                </div>
                <div className="result-footer">
                  <div className="economics"><span>Ожидаемая выручка <strong>{money.format(result.expectedRevenue)}</strong></span><span>Маржинальная прибыль <strong>{money.format(result.expectedProfit)}</strong></span></div>
                  {isAuthenticated ? (
                    <Button variant="outline" className="save-button" disabled={saveMutation.isPending} onClick={() => submitted && saveMutation.mutate(submitted)}><Save size={16} />{saveMutation.isPending ? "Сохраняем…" : "Сохранить расчёт"}</Button>
                  ) : (
                    <Link to="/login" className="save-login"><Save size={16} /> Войти и сохранить</Link>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        {isAuthenticated && (
          <section className="history-panel appear">
            <div className="panel-heading"><div><span className="panel-index">03</span><h2>Моя история</h2></div><History size={20} /></div>
            {historyQuery.isLoading ? <div className="skeleton m-5 h-20" /> : historyQuery.data?.length ? (
              <div className="history-list">
                {historyQuery.data.map((item) => (
                  <button key={item.id} className="history-row" onClick={() => loadCalculation(item)}>
                    <span><strong>{item.routeName}</strong><small>{formatDate(item.flightDate)}</small></span>
                    <span><small>Цена</small><strong>{money.format(item.price)}</strong></span>
                    <span><small>Продажи / места</small><strong>{number.format(item.sales)} / {number.format(item.seats)}</strong></span>
                    <ArrowDownToLine size={17} />
                  </button>
                ))}
              </div>
            ) : <div className="empty-history">Сохраните первый расчёт — он появится здесь и будет доступен после следующего входа.</div>}
          </section>
        )}

        <details className="methodology">
          <summary>Как устроен расчёт <ChevronDown size={17} /></summary>
          <div className="method-content">
            <p><strong>Желают</strong> = базовый спрос сценария − чувствительность к цене × (ваша цена − базовая цена).</p>
            <p><strong>Купят</strong> = min(места, max(0, желают)). Для основного результата используется медиана 0,5; график строится по всем квантилям от 0,1 до 0,9.</p>
            <p>Маржинальная прибыль учитывает стоимость перевозки одного пассажира из справочника маршрутов и не включает фиксированные расходы рейса.</p>
          </div>
        </details>
      </main>
      <footer className="footer"><span>Решись Авиа · раздел «Разработка»</span><span>React · TypeScript · tRPC · MySQL · Kimi</span></footer>
    </div>
  );
}

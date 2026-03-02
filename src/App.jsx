import { useMemo, useState } from 'react';

const USERS = [
  { login: 'admin', password: 'admin123', role: 'Администратор', name: 'Ирина Волкова', department: 'Отдел кадров' },
  { login: 'head', password: 'head123', role: 'Руководитель', name: 'Сергей Кравцов', department: 'Творческий отдел' },
  { login: 'artist', password: 'artist123', role: 'Сотрудник', name: 'Анна Петрова', department: 'Творческий отдел' },
];

const INITIAL_RECORDS = [
  { id: 1, employee: 'Анна Петрова', department: 'Творческий отдел', date: '2026-03-01', in: '09:05', out: '18:00', absence: '—' },
  { id: 2, employee: 'Игорь Романов', department: 'Технический отдел', date: '2026-03-01', in: '08:58', out: '17:40', absence: '—' },
  { id: 3, employee: 'Анна Петрова', department: 'Творческий отдел', date: '2026-03-02', in: '09:00', out: '18:20', absence: '—' },
];

const INITIAL_REQUESTS = [
  { id: 1, employee: 'Анна Петрова', type: 'Отпуск', from: '2026-04-15', to: '2026-04-20', status: 'На согласовании' },
  { id: 2, employee: 'Игорь Романов', type: 'Отгул', from: '2026-03-10', to: '2026-03-10', status: 'Одобрено' },
];

const EVENT_PLAN = [
  { day: '03 марта', text: 'Репетиция оркестра (10:00–13:00)' },
  { day: '04 марта', text: 'Концертная программа (18:00–22:00)' },
  { day: '06 марта', text: 'Гастрольный выезд в Калугу (весь день)' },
];

const ABSENCE_OPTIONS = ['—', 'Отпуск', 'Больничный', 'Отгул', 'Командировка'];

const formatMonth = (date) => date.slice(0, 7);

const calculateHours = (start, end) => {
  if (!start || !end) return '0.00';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, minutes / 60).toFixed(2);
};

export default function App() {
  const [auth, setAuth] = useState({ login: '', password: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [tab, setTab] = useState('dashboard');
  const [message, setMessage] = useState('');
  const [monthFilter, setMonthFilter] = useState('2026-03');

  const isAdmin = currentUser?.role === 'Администратор';
  const isManager = currentUser?.role === 'Руководитель';
  const isEmployee = currentUser?.role === 'Сотрудник';

  const [markForm, setMarkForm] = useState({
    employee: 'Анна Петрова',
    department: 'Творческий отдел',
    date: new Date().toISOString().slice(0, 10),
    in: '09:00',
    out: '18:00',
    absence: '—',
  });

  const [requestForm, setRequestForm] = useState({
    employee: 'Анна Петрова',
    type: 'Отпуск',
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const scopedRecords = useMemo(() => {
    if (!currentUser) return [];
    if (isEmployee) return records.filter((item) => item.employee === currentUser.name);
    return records;
  }, [records, currentUser, isEmployee]);

  const monthRecords = useMemo(
    () => scopedRecords.filter((item) => formatMonth(item.date) === monthFilter),
    [scopedRecords, monthFilter],
  );

  const stats = useMemo(() => {
    const totalHours = scopedRecords.reduce((sum, item) => sum + Number(calculateHours(item.in, item.out)), 0);
    const late = scopedRecords.filter((item) => item.in > '09:00').length;
    const overtime = scopedRecords.filter((item) => Number(calculateHours(item.in, item.out)) > 8).length;
    return {
      totalHours: totalHours.toFixed(2),
      records: scopedRecords.length,
      late,
      overtime,
    };
  }, [scopedRecords]);

  const visibleRequests = useMemo(() => {
    if (!currentUser) return [];
    if (isEmployee) return requests.filter((item) => item.employee === currentUser.name);
    return requests;
  }, [requests, currentUser, isEmployee]);

  const handleLogin = (event) => {
    event.preventDefault();
    const foundUser = USERS.find((user) => user.login === auth.login && user.password === auth.password);
    if (!foundUser) {
      setMessage('Ошибка: неверный логин или пароль.');
      return;
    }

    setCurrentUser(foundUser);
    setTab('dashboard');
    setMessage('');
    setMarkForm((prev) => ({ ...prev, employee: foundUser.name, department: foundUser.department }));
    setRequestForm((prev) => ({ ...prev, employee: foundUser.name }));
  };

  const addMark = (event) => {
    event.preventDefault();
    if (markForm.out <= markForm.in && markForm.absence === '—') {
      setMessage('Ошибка: время ухода должно быть позже времени прихода.');
      return;
    }

    setRecords((prev) => [{ id: Date.now(), ...markForm }, ...prev]);
    setMessage('Отметка успешно сохранена.');
  };

  const addRequest = (event) => {
    event.preventDefault();
    if (requestForm.to < requestForm.from) {
      setMessage('Ошибка: дата окончания не может быть раньше даты начала.');
      return;
    }

    setRequests((prev) => [{ id: Date.now(), ...requestForm, status: 'На согласовании' }, ...prev]);
    setMessage('Заявка отправлена на согласование.');
  };

  const updateRequestStatus = (id, status) => {
    setRequests((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const logout = () => {
    setCurrentUser(null);
    setAuth({ login: '', password: '' });
    setMessage('');
  };

  if (!currentUser) {
    return (
      <main className="auth-wrap">
        <form className="card auth-card" onSubmit={handleLogin}>
          <h1>Система учета рабочего времени</h1>
          <p>Демо-доступ: admin/admin123, head/head123, artist/artist123</p>
          <label>
            Логин
            <input value={auth.login} onChange={(e) => setAuth((p) => ({ ...p, login: e.target.value }))} required />
          </label>
          <label>
            Пароль
            <input type="password" value={auth.password} onChange={(e) => setAuth((p) => ({ ...p, password: e.target.value }))} required />
          </label>
          {message && <p className="error">{message}</p>}
          <button type="submit">Войти</button>
        </form>
      </main>
    );
  }

  const canModerateRequests = isAdmin || isManager;

  return (
    <main className="app">
      <header className="topbar card">
        <div>
          <h1>Учет рабочего времени</h1>
          <p>{currentUser.name} · {currentUser.role} · {currentUser.department}</p>
        </div>
        <button onClick={logout}>Выйти</button>
      </header>

      {message && <p className="message">{message}</p>}

      <nav className="tabs">
        {[
          ['dashboard', 'Панель'],
          ['attendance', 'Явки/неявки'],
          ['schedule', 'Смены'],
          ['requests', 'Заявки'],
          ['reports', 'Табель и отчеты'],
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      {tab === 'dashboard' && (
        <section className="grid">
          <article className="card stat"><h3>Всего часов</h3><strong>{stats.totalHours}</strong></article>
          <article className="card stat"><h3>Записей табеля</h3><strong>{stats.records}</strong></article>
          <article className="card stat"><h3>Опоздания</h3><strong>{stats.late}</strong></article>
          <article className="card stat"><h3>Переработки</h3><strong>{stats.overtime}</strong></article>
        </section>
      )}

      {tab === 'attendance' && (
        <section className="split">
          <form className="card" onSubmit={addMark}>
            <h2>Отметка прихода/ухода</h2>
            <label>Сотрудник<input value={markForm.employee} onChange={(e) => setMarkForm((prev) => ({ ...prev, employee: e.target.value }))} disabled={isEmployee} /></label>
            <label>Отдел<input value={markForm.department} onChange={(e) => setMarkForm((prev) => ({ ...prev, department: e.target.value }))} disabled={isEmployee} /></label>
            <label>Дата<input type="date" value={markForm.date} onChange={(e) => setMarkForm((prev) => ({ ...prev, date: e.target.value }))} required /></label>
            <label>Приход<input type="time" value={markForm.in} onChange={(e) => setMarkForm((prev) => ({ ...prev, in: e.target.value }))} required /></label>
            <label>Уход<input type="time" value={markForm.out} onChange={(e) => setMarkForm((prev) => ({ ...prev, out: e.target.value }))} required /></label>
            <label>
              Тип отсутствия
              <select value={markForm.absence} onChange={(e) => setMarkForm((prev) => ({ ...prev, absence: e.target.value }))}>
                {ABSENCE_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
              </select>
            </label>
            <button>Сохранить отметку</button>
          </form>

          <div className="card">
            <h2>Последние отметки</h2>
            <table>
              <thead><tr><th>Сотрудник</th><th>Дата</th><th>Приход</th><th>Уход</th><th>Часы</th></tr></thead>
              <tbody>
                {scopedRecords.slice(0, 10).map((item) => (
                  <tr key={item.id}>
                    <td>{item.employee}</td><td>{item.date}</td><td>{item.in}</td><td>{item.out}</td><td>{calculateHours(item.in, item.out)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'schedule' && (
        <section className="card">
          <h2>График смен и мероприятий</h2>
          <ul className="timeline">
            {EVENT_PLAN.map((event) => <li key={event.day}><b>{event.day}</b> — {event.text}</li>)}
          </ul>
          <p>Раздел учитывает репетиции, концерты и гастрольные выезды с нестандартной занятостью сотрудников.</p>
        </section>
      )}

      {tab === 'requests' && (
        <section className="split">
          <form className="card" onSubmit={addRequest}>
            <h2>Заявка на отсутствие</h2>
            <label>Сотрудник<input value={requestForm.employee} onChange={(e) => setRequestForm((p) => ({ ...p, employee: e.target.value }))} disabled={isEmployee} /></label>
            <label>Тип<select value={requestForm.type} onChange={(e) => setRequestForm((p) => ({ ...p, type: e.target.value }))}><option>Отпуск</option><option>Больничный</option><option>Отгул</option><option>Командировка</option></select></label>
            <label>С<input type="date" value={requestForm.from} onChange={(e) => setRequestForm((p) => ({ ...p, from: e.target.value }))} /></label>
            <label>По<input type="date" value={requestForm.to} onChange={(e) => setRequestForm((p) => ({ ...p, to: e.target.value }))} /></label>
            <button>Отправить заявку</button>
          </form>
          <div className="card">
            <h2>Статус заявок</h2>
            <table>
              <thead><tr><th>Сотрудник</th><th>Тип</th><th>Период</th><th>Статус</th><th>Действия</th></tr></thead>
              <tbody>
                {visibleRequests.map((item) => (
                  <tr key={item.id}>
                    <td>{item.employee}</td>
                    <td>{item.type}</td>
                    <td>{item.from} — {item.to}</td>
                    <td>{item.status}</td>
                    <td>
                      {canModerateRequests && item.status === 'На согласовании' ? (
                        <div className="actions">
                          <button type="button" onClick={() => updateRequestStatus(item.id, 'Одобрено')}>Одобрить</button>
                          <button type="button" className="danger" onClick={() => updateRequestStatus(item.id, 'Отклонено')}>Отклонить</button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'reports' && (
        <section className="card">
          <h2>Табель (T-13) и аналитика</h2>
          <div className="filters">
            <label>
              Месяц
              <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
            </label>
          </div>
          <table>
            <thead><tr><th>Сотрудник</th><th>Отдел</th><th>Дата</th><th>Часы</th><th>Отклонения</th></tr></thead>
            <tbody>
              {monthRecords.map((item) => (
                <tr key={item.id}>
                  <td>{item.employee}</td>
                  <td>{item.department}</td>
                  <td>{item.date}</td>
                  <td>{calculateHours(item.in, item.out)}</td>
                  <td>{item.in > '09:00' ? 'Опоздание' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!monthRecords.length && <p className="muted">За выбранный месяц данные отсутствуют.</p>}
        </section>
      )}
    </main>
  );
}

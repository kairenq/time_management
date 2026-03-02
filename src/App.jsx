import { useMemo, useState } from 'react';

const users = [
  { login: 'admin', password: 'admin123', role: 'Администратор', name: 'Ирина Волкова' },
  { login: 'head', password: 'head123', role: 'Руководитель', name: 'Сергей Кравцов' },
  { login: 'artist', password: 'artist123', role: 'Сотрудник', name: 'Анна Петрова' },
];

const initialRecords = [
  { id: 1, employee: 'Анна Петрова', department: 'Творческий отдел', date: '2026-03-01', in: '09:05', out: '18:00', absence: '—' },
  { id: 2, employee: 'Игорь Романов', department: 'Технический отдел', date: '2026-03-01', in: '08:58', out: '17:40', absence: '—' },
];

const initialRequests = [
  { id: 1, employee: 'Анна Петрова', type: 'Отпуск', from: '2026-04-15', to: '2026-04-20', status: 'На согласовании' },
  { id: 2, employee: 'Игорь Романов', type: 'Отгул', from: '2026-03-10', to: '2026-03-10', status: 'Одобрено' },
];

const calculateHours = (start, end) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60).toFixed(2);
};

export default function App() {
  const [auth, setAuth] = useState({ login: '', password: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [records, setRecords] = useState(initialRecords);
  const [requests, setRequests] = useState(initialRequests);
  const [tab, setTab] = useState('dashboard');
  const [error, setError] = useState('');

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

  const stats = useMemo(() => {
    const totalHours = records.reduce((sum, item) => sum + Number(calculateHours(item.in, item.out)), 0);
    const late = records.filter((item) => item.in > '09:00').length;
    return {
      totalHours: totalHours.toFixed(2),
      records: records.length,
      late,
      active: records.filter((item) => item.absence === '—').length,
    };
  }, [records]);

  const handleLogin = (event) => {
    event.preventDefault();
    const foundUser = users.find((user) => user.login === auth.login && user.password === auth.password);
    if (!foundUser) {
      setError('Неверный логин или пароль');
      return;
    }
    setCurrentUser(foundUser);
    setError('');
  };

  const addMark = (event) => {
    event.preventDefault();
    setRecords((prev) => [{ id: Date.now(), ...markForm }, ...prev]);
  };

  const addRequest = (event) => {
    event.preventDefault();
    setRequests((prev) => [{ id: Date.now(), ...requestForm, status: 'На согласовании' }, ...prev]);
  };

  if (!currentUser) {
    return (
      <main className="auth-wrap">
        <form className="card" onSubmit={handleLogin}>
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
          {error && <p className="error">{error}</p>}
          <button type="submit">Войти</button>
        </form>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>Учет рабочего времени</h1>
          <p>{currentUser.name} · {currentUser.role}</p>
        </div>
        <button onClick={() => setCurrentUser(null)}>Выйти</button>
      </header>

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
          <article className="card stat"><h3>На работе</h3><strong>{stats.active}</strong></article>
        </section>
      )}

      {tab === 'attendance' && (
        <section className="split">
          <form className="card" onSubmit={addMark}>
            <h2>Отметка прихода/ухода</h2>
            {Object.entries(markForm).map(([key, value]) => (
              <label key={key}>
                {key === 'in' ? 'Приход' : key === 'out' ? 'Уход' : key === 'absence' ? 'Тип отсутствия' : key === 'date' ? 'Дата' : key === 'department' ? 'Отдел' : 'Сотрудник'}
                <input
                  type={key === 'date' ? 'date' : key === 'in' || key === 'out' ? 'time' : 'text'}
                  value={value}
                  onChange={(e) => setMarkForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  required
                />
              </label>
            ))}
            <button>Сохранить отметку</button>
          </form>

          <div className="card">
            <h2>Последние отметки</h2>
            <table>
              <thead><tr><th>Сотрудник</th><th>Дата</th><th>Приход</th><th>Уход</th><th>Часы</th></tr></thead>
              <tbody>
                {records.slice(0, 8).map((item) => (
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
            <li><b>03 марта</b> — Репетиция оркестра (10:00–13:00)</li>
            <li><b>04 марта</b> — Концертная программа (18:00–22:00)</li>
            <li><b>06 марта</b> — Гастрольный выезд в Калугу (весь день)</li>
          </ul>
          <p>Календарный блок учитывает проектные требования: смены, репетиции, гастроли и нестандартный график.</p>
        </section>
      )}

      {tab === 'requests' && (
        <section className="split">
          <form className="card" onSubmit={addRequest}>
            <h2>Заявка на отсутствие</h2>
            <label>Сотрудник<input value={requestForm.employee} onChange={(e) => setRequestForm((p) => ({ ...p, employee: e.target.value }))} /></label>
            <label>Тип<select value={requestForm.type} onChange={(e) => setRequestForm((p) => ({ ...p, type: e.target.value }))}><option>Отпуск</option><option>Больничный</option><option>Отгул</option><option>Командировка</option></select></label>
            <label>С<input type="date" value={requestForm.from} onChange={(e) => setRequestForm((p) => ({ ...p, from: e.target.value }))} /></label>
            <label>По<input type="date" value={requestForm.to} onChange={(e) => setRequestForm((p) => ({ ...p, to: e.target.value }))} /></label>
            <button>Отправить заявку</button>
          </form>
          <div className="card">
            <h2>Статус заявок</h2>
            <table>
              <thead><tr><th>Сотрудник</th><th>Тип</th><th>Период</th><th>Статус</th></tr></thead>
              <tbody>
                {requests.map((item) => <tr key={item.id}><td>{item.employee}</td><td>{item.type}</td><td>{item.from} — {item.to}</td><td>{item.status}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'reports' && (
        <section className="card">
          <h2>Табель (T-13) и аналитика</h2>
          <p>Сводка по отработанному времени, переработкам и посещаемости по отделам.</p>
          <table>
            <thead><tr><th>Сотрудник</th><th>Отдел</th><th>Дата</th><th>Часы</th><th>Отклонения</th></tr></thead>
            <tbody>
              {records.map((item) => (
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
        </section>
      )}
    </main>
  );
}

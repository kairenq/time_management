import { useEffect, useMemo, useState } from 'react';

const ABSENCE_OPTIONS = ['—', 'Отпуск', 'Больничный', 'Отгул', 'Командировка'];
const REQUEST_TYPES = ['Отпуск', 'Больничный', 'Отгул', 'Командировка'];
const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:3001' : '';

const getHours = (start, end) => {
  if (!start || !end) return '0.00';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60).toFixed(2);
};

const api = async (path, method = 'GET', body, token) => {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Сервер недоступен. Запустите backend: npm run server');
    }
    throw error;
  }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('tm_token') || '');
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [tab, setTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ login: '', password: '', name: '', department: '' });
  const [recordForm, setRecordForm] = useState({ date: new Date().toISOString().slice(0, 10), timeIn: '09:00', timeOut: '18:00', absence: '—', note: '' });
  const [requestForm, setRequestForm] = useState({ type: 'Отпуск', dateFrom: new Date().toISOString().slice(0, 10), dateTo: new Date().toISOString().slice(0, 10), comment: '' });

  const isManager = user?.role !== 'Сотрудник';

  const loadData = async (authToken) => {
    const [me, allRecords, allRequests] = await Promise.all([
      api('/me', 'GET', null, authToken),
      api('/records', 'GET', null, authToken),
      api('/requests', 'GET', null, authToken),
    ]);
    setUser(me);
    setRecords(allRecords);
    setRequests(allRequests);
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    loadData(token)
      .catch((e) => {
        setError(e.message);
        localStorage.removeItem('tm_token');
        setToken('');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const stats = useMemo(() => {
    const totalHours = records.reduce((sum, item) => sum + Number(getHours(item.timeIn, item.timeOut)), 0);
    const late = records.filter((item) => item.timeIn > '09:00').length;
    return { totalHours: totalHours.toFixed(2), late, count: records.length };
  }, [records]);

  const submitLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginForm.login || !loginForm.password) return setError('Введите логин и пароль');
    try {
      const data = await api('/auth/login', 'POST', loginForm);
      localStorage.setItem('tm_token', data.token);
      setToken(data.token);
      setMessage('Успешный вход');
    } catch (err) {
      setError(err.message);
    }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (registerForm.password.length < 6) return setError('Пароль должен быть не короче 6 символов');
    try {
      const data = await api('/auth/register', 'POST', registerForm);
      localStorage.setItem('tm_token', data.token);
      setToken(data.token);
      setMessage('Регистрация прошла успешно');
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('tm_token');
    setToken('');
    setUser(null);
    setRecords([]);
    setRequests([]);
  };

  const submitRecord = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const created = await api('/records', 'POST', recordForm, token);
      setRecords((prev) => [created, ...prev]);
      setMessage('Отметка сохранена');
    } catch (err) {
      setError(err.message);
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const created = await api('/requests', 'POST', requestForm, token);
      setRequests((prev) => [created, ...prev]);
      setMessage('Заявка отправлена');
    } catch (err) {
      setError(err.message);
    }
  };

  const updateRequestStatus = async (id, status) => {
    try {
      await api(`/requests/${id}/status`, 'PATCH', { status }, token);
      setRequests((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) {
    return (
      <main className="auth-wrap">
        <div className="card auth-card">
          <h1>Учёт рабочего времени</h1>
          <p className="muted">SQLite + регистрация/авторизация + проверка прав</p>
          <div className="tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Вход</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Регистрация</button>
          </div>
          {error && <p className="error">{error}</p>}
          {mode === 'login' ? (
            <form onSubmit={submitLogin}>
              <label>Логин<input value={loginForm.login} onChange={(e) => setLoginForm((p) => ({ ...p, login: e.target.value }))} /></label>
              <label>Пароль<input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} /></label>
              <button>Войти</button>
            </form>
          ) : (
            <form onSubmit={submitRegister}>
              <label>Логин<input value={registerForm.login} onChange={(e) => setRegisterForm((p) => ({ ...p, login: e.target.value }))} /></label>
              <label>Пароль<input type="password" value={registerForm.password} onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))} /></label>
              <label>ФИО<input value={registerForm.name} onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))} /></label>
              <label>Отдел<input value={registerForm.department} onChange={(e) => setRegisterForm((p) => ({ ...p, department: e.target.value }))} /></label>
              <button>Создать аккаунт</button>
            </form>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar card">
        <div>
          <b>{user?.name}</b> · {user?.role} · {user?.department}
        </div>
        <button onClick={logout}>Выйти</button>
      </header>

      <nav className="tabs">
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Сводка</button>
        <button className={tab === 'attendance' ? 'active' : ''} onClick={() => setTab('attendance')}>Посещаемость</button>
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Заявки</button>
      </nav>

      {loading && <p className="message">Загрузка...</p>}
      {message && <p className="message">{message}</p>}
      {error && <p className="error">{error}</p>}

      {tab === 'dashboard' && (
        <section className="grid">
          <article className="card stat"><h3>Записей</h3><strong>{stats.count}</strong></article>
          <article className="card stat"><h3>Всего часов</h3><strong>{stats.totalHours}</strong></article>
          <article className="card stat"><h3>Опозданий</h3><strong>{stats.late}</strong></article>
        </section>
      )}

      {tab === 'attendance' && (
        <section className="split">
          <form className="card" onSubmit={submitRecord}>
            <h2>Добавить отметку</h2>
            <label>Дата<input type="date" value={recordForm.date} onChange={(e) => setRecordForm((p) => ({ ...p, date: e.target.value }))} required /></label>
            <label>Приход<input type="time" value={recordForm.timeIn} onChange={(e) => setRecordForm((p) => ({ ...p, timeIn: e.target.value }))} required /></label>
            <label>Уход<input type="time" value={recordForm.timeOut} onChange={(e) => setRecordForm((p) => ({ ...p, timeOut: e.target.value }))} /></label>
            <label>Отсутствие<select value={recordForm.absence} onChange={(e) => setRecordForm((p) => ({ ...p, absence: e.target.value }))}>{ABSENCE_OPTIONS.map((a) => <option key={a}>{a}</option>)}</select></label>
            <label>Комментарий<input value={recordForm.note} onChange={(e) => setRecordForm((p) => ({ ...p, note: e.target.value }))} /></label>
            <button>Сохранить</button>
          </form>
          <div className="card">
            <h2>История</h2>
            <table>
              <thead><tr><th>Сотрудник</th><th>Дата</th><th>Приход</th><th>Уход</th><th>Часы</th></tr></thead>
              <tbody>
                {records.map((r) => <tr key={r.id}><td>{r.employee}</td><td>{r.date}</td><td>{r.timeIn}</td><td>{r.timeOut || '—'}</td><td>{getHours(r.timeIn, r.timeOut)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'requests' && (
        <section className="split">
          <form className="card" onSubmit={submitRequest}>
            <h2>Новая заявка</h2>
            <label>Тип<select value={requestForm.type} onChange={(e) => setRequestForm((p) => ({ ...p, type: e.target.value }))}>{REQUEST_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label>С<input type="date" value={requestForm.dateFrom} onChange={(e) => setRequestForm((p) => ({ ...p, dateFrom: e.target.value }))} /></label>
            <label>По<input type="date" value={requestForm.dateTo} onChange={(e) => setRequestForm((p) => ({ ...p, dateTo: e.target.value }))} /></label>
            <label>Комментарий<input value={requestForm.comment} onChange={(e) => setRequestForm((p) => ({ ...p, comment: e.target.value }))} /></label>
            <button>Отправить</button>
          </form>
          <div className="card">
            <h2>Статусы заявок</h2>
            <table>
              <thead><tr><th>Сотрудник</th><th>Тип</th><th>Период</th><th>Статус</th><th>Действия</th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.employee}</td><td>{r.type}</td><td>{r.dateFrom} — {r.dateTo}</td><td>{r.status}</td>
                    <td className="actions">
                      {isManager && r.status === 'На согласовании' && (
                        <>
                          <button type="button" onClick={() => updateRequestStatus(r.id, 'Одобрено')}>Одобрить</button>
                          <button type="button" className="danger" onClick={() => updateRequestStatus(r.id, 'Отклонено')}>Отклонить</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

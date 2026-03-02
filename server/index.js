import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(cors());
app.use(express.json());

const db = new Database('time_management.db');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Администратор', 'Руководитель', 'Сотрудник')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  time_in TEXT NOT NULL,
  time_out TEXT,
  absence TEXT NOT NULL DEFAULT '—',
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  comment TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'На согласовании',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

const adminExists = db.prepare('SELECT id FROM users WHERE login = ?').get('admin');
if (!adminExists) {
  const passwordHash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (login, password_hash, name, department, role) VALUES (?, ?, ?, ?, ?)')
    .run('admin', passwordHash, 'Системный администратор', 'Администрация', 'Администратор');
}

const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2d' });

const authRequired = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    const user = db.prepare('SELECT id, login, name, department, role FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

const validateRegistration = ({ login, password, name, department }) => {
  if (!login || login.length < 3) return 'Логин должен быть не короче 3 символов';
  if (!password || password.length < 6) return 'Пароль должен быть не короче 6 символов';
  if (!name?.trim()) return 'Укажите ФИО';
  if (!department?.trim()) return 'Укажите отдел';
  return null;
};

app.post('/api/auth/register', (req, res) => {
  const error = validateRegistration(req.body);
  if (error) return res.status(400).json({ error });

  const { login, password, name, department } = req.body;
  const exists = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (exists) return res.status(409).json({ error: 'Логин уже занят' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO users (login, password_hash, name, department, role) VALUES (?, ?, ?, ?, ?)'
  ).run(login.trim(), passwordHash, name.trim(), department.trim(), 'Сотрудник');

  const user = db.prepare('SELECT id, login, name, department, role FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user });
});

app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'Введите логин и пароль' });

  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const safeUser = { id: user.id, login: user.login, name: user.name, department: user.department, role: user.role };
  res.json({ token: signToken(safeUser), user: safeUser });
});

app.get('/api/me', authRequired, (req, res) => res.json(req.user));

app.get('/api/records', authRequired, (req, res) => {
  const isAdmin = req.user.role !== 'Сотрудник';
  const rows = isAdmin
    ? db.prepare(`SELECT r.id, u.name AS employee, u.department, r.date, r.time_in as timeIn, r.time_out as timeOut, r.absence, r.note
      FROM records r JOIN users u ON u.id = r.user_id ORDER BY r.date DESC, r.id DESC`).all()
    : db.prepare(`SELECT r.id, u.name AS employee, u.department, r.date, r.time_in as timeIn, r.time_out as timeOut, r.absence, r.note
      FROM records r JOIN users u ON u.id = r.user_id WHERE r.user_id = ? ORDER BY r.date DESC, r.id DESC`).all(req.user.id);
  res.json(rows);
});

app.post('/api/records', authRequired, (req, res) => {
  const { date, timeIn, timeOut, absence = '—', note = '' } = req.body;
  if (!date || !timeIn) return res.status(400).json({ error: 'Дата и время прихода обязательны' });
  if (timeOut && timeOut <= timeIn && absence === '—') return res.status(400).json({ error: 'Время ухода должно быть позже времени прихода' });

  const info = db.prepare('INSERT INTO records (user_id, date, time_in, time_out, absence, note) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, date, timeIn, timeOut || null, absence, note);
  const row = db.prepare(`SELECT r.id, u.name AS employee, u.department, r.date, r.time_in as timeIn, r.time_out as timeOut, r.absence, r.note
    FROM records r JOIN users u ON u.id = r.user_id WHERE r.id = ?`).get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.get('/api/requests', authRequired, (req, res) => {
  const isAdmin = req.user.role !== 'Сотрудник';
  const rows = isAdmin
    ? db.prepare(`SELECT q.id, u.name AS employee, q.type, q.date_from as dateFrom, q.date_to as dateTo, q.comment, q.status
      FROM requests q JOIN users u ON u.id = q.user_id ORDER BY q.id DESC`).all()
    : db.prepare(`SELECT q.id, u.name AS employee, q.type, q.date_from as dateFrom, q.date_to as dateTo, q.comment, q.status
      FROM requests q JOIN users u ON u.id = q.user_id WHERE q.user_id = ? ORDER BY q.id DESC`).all(req.user.id);
  res.json(rows);
});

app.post('/api/requests', authRequired, (req, res) => {
  const { type, dateFrom, dateTo, comment = '' } = req.body;
  if (!type || !dateFrom || !dateTo) return res.status(400).json({ error: 'Заполните все обязательные поля заявки' });
  if (dateTo < dateFrom) return res.status(400).json({ error: 'Дата окончания меньше даты начала' });

  const info = db.prepare('INSERT INTO requests (user_id, type, date_from, date_to, comment) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, type, dateFrom, dateTo, comment);
  const row = db.prepare(`SELECT q.id, u.name AS employee, q.type, q.date_from as dateFrom, q.date_to as dateTo, q.comment, q.status
    FROM requests q JOIN users u ON u.id = q.user_id WHERE q.id = ?`).get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.patch('/api/requests/:id/status', authRequired, (req, res) => {
  if (req.user.role === 'Сотрудник') return res.status(403).json({ error: 'Недостаточно прав' });
  const { status } = req.body;
  if (!['На согласовании', 'Одобрено', 'Отклонено'].includes(status)) return res.status(400).json({ error: 'Неверный статус' });

  const info = db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(status, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Заявка не найдена' });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API started on http://localhost:${PORT}`);
});

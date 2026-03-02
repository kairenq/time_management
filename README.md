# Time Management — система учета рабочего времени

Обновлённое приложение: React + Express + SQLite.

## Что добавлено

- регистрация и авторизация пользователей (JWT);
- хранение данных в SQLite (`time_management.db`);
- роли и ограничения доступа (сотрудник / руководитель / администратор);
- API для отметок посещаемости и заявок;
- валидация полей и понятные сообщения об ошибках.

## Быстрый старт

```bash
npm install
npm run server
```

Во втором терминале:

```bash
npm run dev
```

Frontend: `http://localhost:5173`  
Backend API: `http://localhost:3001`

## Тестовый администратор

- `admin` / `admin123`

## Сборка

```bash
npm run build
```

## Desktop (Electron)

```bash
npm run dist:win
```

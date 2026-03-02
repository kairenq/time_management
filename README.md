# Time Management — React приложение учета рабочего времени

SPA-прототип системы «Учёт рабочего времени» для демонстрации требований из курсовых материалов.

## Реализовано

- авторизация и роли: администратор, руководитель, сотрудник;
- фиксация прихода/ухода, контроль логики времени;
- журнал явок/неявок;
- график смен/мероприятий;
- заявки на отпуск, больничный, отгул, командировку;
- согласование заявок (для администратора/руководителя);
- табель и аналитика с фильтром по месяцу.

## Запуск (веб)

```bash
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## Запуск в Electron (dev)

```bash
npm run dev
npm run electron:dev
```

## Сборка EXE

Локально (на Windows):

```bash
npm run dist:win
```

Готовый установщик будет в папке `release/`.

## GitHub Actions

Добавлен workflow `.github/workflows/build-windows-exe.yml`, который:

1. ставит зависимости через `npm ci`;
2. запускает `npm run dist:win`;
3. публикует `.exe` как artifact (`time-management-windows-exe`).

Можно запускать вручную через **Actions → Build Windows EXE → Run workflow**.

## Демо-учетные записи

- `admin` / `admin123`
- `head` / `head123`
- `artist` / `artist123`

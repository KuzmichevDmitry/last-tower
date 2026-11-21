# Last Tower на GitHub Pages

GitHub Pages — бесплатный статический хостинг с HTTPS. После первой настройки игра на телефоне будет открываться по постоянной ссылке, а новая версия будет появляться после обычного `git push` — пересылать HTML не нужно.

## Что понадобится

- аккаунт GitHub;
- установленный Git for Windows (на этом компьютере уже есть);
- публичный репозиторий (у бесплатного аккаунта GitHub Pages для приватного репозитория может быть недоступен).

## Шаг 1. Создай репозиторий

1. Открой <https://github.com/new>.
2. Название, например: `last-tower`.
3. Выбери **Public**.
4. **Не добавляй** README, `.gitignore` и лицензию — репозиторий должен быть пустым.
5. Нажми **Create repository**.

## Шаг 2. Отправь игру

Самый простой способ — дважды щёлкнуть **`publish-github.bat`**. Скрипт спросит URL репозитория, имя и email для коммитов.

Либо запусти в PowerShell:

```powershell
cd "C:\Users\Dmitry Kuzmichev\Desktop\Last Tower"
powershell -NoProfile -ExecutionPolicy Bypass -File .\publish-github.ps1 `
  -RepoUrl "https://github.com/ТВОЙ-ЛОГИН/last-tower.git"
```

При первом `git push` Git может открыть окно входа GitHub. Введи свой аккаунт там. Пароль от GitHub в файлы не записывается.

Если хочешь заранее проверить, какие файлы попадут в репозиторий:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\publish-github.ps1 `
  -RepoUrl "https://github.com/ТВОЙ-ЛОГИН/last-tower.git" -DryRun
```

## Шаг 3. Включи Pages

В репозитории:

1. **Settings** → **Pages**.
2. **Build and deployment** → **Source**: **Deploy from a branch**.
3. **Branch**: `main`, **Folder**: `/ (root)`.
4. **Save**.

Первый запуск занимает 1–2 минуты. Адрес будет такой:

```text
https://ТВОЙ-ЛОГИН.github.io/last-tower/
```

## Шаг 4. Телефон

1. Открой эту ссылку в Chrome или Safari.
2. Android/Chrome: меню → **Установить приложение** или **Добавить на главный экран**.
3. iPhone/Safari: **Поделиться** → **На экран «Домой»**.

После установки игра открывается без адресной строки в портретном режиме.

## Как обновлять игру

После любых изменений на компьютере:

1. Запусти **`publish-github.bat`** ещё раз — он сделает коммит и push.
2. Подожди 1–2 минуты, пока GitHub Pages пересоберёт сайт.
3. На телефоне закрой вкладку и открой заново или обнови страницу.

Service worker кэширует игру. Если видишь старую версию, закрой вкладку полностью и открой ссылку снова. При крупных обновлениях можно поднять версию кэша в `sw.js`.

## Что публикуется

В репозиторий попадают только файлы сайта:

- `index.html`, `css/`, `js/`, `assets/`;
- `manifest.webmanifest`, `sw.js`, `.nojekyll`;
- документация `README.md`, `DEMO.md`, `ENEMIES.md`, `GITHUB-PAGES.md` и `screenshots/`.

Временные папки `.tmp-*`, Chrome-профили, логи и тестовые скрипты исключены через `.gitignore`.

## Облачные аккаунты

Supabase продолжит работать с адреса GitHub Pages: вход и синхронизация идут по HTTPS. В коде используется только публичный publishable-ключ. Ключ `service_role` в репозиторий не попадает.

## Если не работает

- **404 после включения Pages.** Проверь, что выбрана ветка `main` и папка `/ (root)`, и подожди пару минут.
- **Ошибка `No such remote 'origin'`.** Она возникала в первой версии скрипта, пока remote ещё не был добавлен. Обновлённый `publish-github.ps1` сначала проверяет remote и сам добавляет `origin`. Если ошибка осталась, выполни вручную:
  ```powershell
  git remote add origin https://github.com/ТВОЙ-ЛОГИН/last-tower.git
  git push -u origin main
  ```
- **Репозиторий не найден при push.** Проверь URL и что репозиторий создан пустым.
- **Ошибка доступа при push.** Войди через Git Credential Manager или настрой SSH-ключ GitHub.
- **Старая версия на телефоне.** Закрой вкладку, очисти данные сайта или подожди обновление service worker.
- **Не устанавливается как приложение.** Нужен HTTPS (GitHub Pages его даёт) и открытие именно по ссылке Pages, а не через `file://`.

## Альтернатива без Git

Если не хочется разбираться с Git, открой <https://app.netlify.com/drop> и перетащи туда папку игры. Netlify выдаст HTTPS-ссылку; для обновления достаточно перетащить новую папку. GitHub Pages удобнее для регулярных обновлений через `publish-github.bat`.

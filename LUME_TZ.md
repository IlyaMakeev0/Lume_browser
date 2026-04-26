# Техническое задание: Lume Browser (Core Project)

## 1. Общее описание
**Lume** — высокопроизводительный кроссплатформенный браузер с упором на эстетику (вайб), безопасность и скорость.
- **Главная фишка:** Гибридный дизайн (Arc + Chrome), собственный быстрый сетевой стек на Rust и поддержка расширений Chromium.
- **Платформы:** Windows, macOS, iOS, Android.

## 2. Технологический стек (The Vibe-Stack)
- **Ядро (Backend):** Rust (Tokio, Quinn для HTTP/3, Rusqlite для БД).
- **Оболочка:** Tauri 2.0 (Mobile & Desktop support).
- **Интерфейс:** Next.js + Tailwind CSS + Framer Motion.
- **JS Runtime (для расширений):** `deno_core` или `v8` (через Rust-биндинги).
- **Графика:** WGPU (для будущего собственного рендерера).

## 3. Функциональные требования

### 3.1. Интерфейс (Aura UI)
- **Вертикальный Sidebar:** Скрываемая панель слева. Вкладки группируются по "Spaces".
- **Lume Command Bar (Cmd/Ctrl + T):** Окно в центре экрана. Поиск, ввод URL и быстрые команды.
- **Blur & Transparency:** Использование эффектов матового стекла (Glassmorphism) на всех платформах.
- **Индикатор ресурсов:** Маленький виджет, показывающий нагрузку на Rust-движок в реальном времени.

### 3.2. Сетевой уровень и Движок
- **Lume Network Layer:** Собственная реализация запросов на Rust. Обход системных ограничений для ускорения загрузки на 30-40%.
- **Extension Bridge:** Слой совместимости, который позволяет устанавливать расширения из Chrome Web Store (реализация API chrome.*).
- **AdBlock Native:** Встроенный блокировщик рекламы на уровне сетевых потоков (как в Brave, но на Rust-библиотеках типа `adblock`).

## 4. Архитектура проекта

### Модули Rust (src-tauri):
- `engine/`: Парсинг HTML/CSS (начальная стадия).
- `network/`: HTTP-клиент, управление прокси, защита от трекеров.
- `extensions/`: Менеджер расширений, песочница для JS-скриптов.
- `storage/`: Шифрованная база данных SQLite для истории и паролей.

## 5. План разработки (Roadmap)

### Этап 1: "Shell & Navigation" (MVP)
- Инициализация Tauri 2.0.
- Создание Frameless окна с кастомным SideBar.
- Реализация Command Bar для перехода по URL.
- Подключение системного WebView для отображения сайтов.

### Этап 2: "Rust Network Layer"
- Перехват сетевых запросов WebView и обработка их через Rust-модуль `network`.
- Реализация кэширования данных на диске.

### Этап 3: "Extensions Support"
- Запуск фонового процесса для расширений.
- Реализация `chrome.runtime` и `chrome.tabs` API.
- Тестирование на популярных расширениях (uBlock, Dark Reader).

### Этап 4: "Native Rendering"
- Постепенная замена системного рендеринга на свой для простых страниц (чтение статей).

---

## 6. Промпт для инициализации проекта (для Cursor/Claude)

> "Act as a Senior Software Architect. Initialize a Tauri 2.0 project named 'Lume'. 
> Backend: Rust. Frontend: Next.js with Tailwind CSS. 
> Features to set up: 
> 1. Custom titlebar removal for macOS/Windows. 
> 2. Implement a basic SideBar in Next.js. 
> 3. Create a Rust module `tabs_manager.rs` to handle tab states. 
> 4. Add a placeholder for a custom network fetcher using the 'reqwest' or 'quinn' crate."
# Connections Module - Product Requirements Document

## Оригинальное задание
Развернуть проект Connections Module с GitHub (https://github.com/svetlanaslinko057/Conections-1) в изолированном режиме для дальнейшей доработки. Затем реализовать Phase 2.3 - Telegram Alerts Delivery.

## Описание продукта
**Connections Module** — изолированный модуль платформы для формирования справедливого рейтинга инфлюенсеров в социальных сетях.

### Ключевая проблема
Традиционные метрики (followers, likes) легко накручиваются и не отражают реальной ценности инфлюенсера.

### Решение
- **Influence Scoring** — Quality-adjusted score на основе реальных взаимодействий
- **Trend Analysis** — Velocity + Acceleration изменений
- **Early Signal Detection** — Детекция breakout и rising сигналов
- **Risk Detection** — Оценка накрутки и манипуляций
- **Alerts Engine** — Оповещения о важных событиях
- **Telegram Delivery** — Доставка алертов в Telegram (Phase 2.3)

## Архитектура

### Технологический стек
| Компонент | Технология |
|-----------|------------|
| Backend Runtime | Node.js 20+ (Fastify + TypeScript) |
| Proxy Layer | Python FastAPI |
| Frontend | React 18 + Tailwind CSS |
| Database | MongoDB |
| Notifications | Telegram Bot API |

### Порты
- **8001** — FastAPI Proxy (внешний endpoint)
- **8003** — Node.js Fastify (internal)
- **3000** — React Frontend

### Ключевые файлы
- `/app/backend/src/server-minimal.ts` — изолированный entry point
- `/app/backend/src/modules/connections/notifications/` — Telegram Delivery (Phase 2.3)
- `/app/frontend/src/pages/admin/AdminConnectionsPage.jsx` — Admin UI с табом Telegram

## Что реализовано

### Phase 1 - Развертывание (Feb 6, 2026)
- [x] Клонирование репозитория с GitHub
- [x] Настройка environment variables
- [x] Запуск MongoDB, Backend, Frontend
- [x] Connections Module в mock режиме
- [x] Public API endpoints работают
- [x] Admin API с авторизацией работает
- [x] Early Signal Radar отображает данные
- [x] Alerts Engine генерирует алерты

### Phase 2.3 - Telegram Delivery (Feb 6, 2026)
- [x] Backend: notifications слой с dispatcher, settings store, delivery store
- [x] Backend: Telegram transport для отправки сообщений
- [x] Backend: Admin routes для управления Telegram
- [x] Frontend: Таб "Telegram" в Admin Connections
- [x] Frontend: UI для настройки delivery settings
- [x] Frontend: Типы алертов с cooldown настройками
- [x] Frontend: Кнопки Test Message и Dispatch

## API Endpoints

### Public API
- `GET /api/health` — Health check
- `GET /api/connections/health` — Module health
- `GET /api/connections/accounts` — List accounts
- `POST /api/connections/score` — Calculate score
- `GET /api/connections/score/mock` — Mock score
- `POST /api/connections/trends` — Trend analysis
- `POST /api/connections/early-signal` — Early signal detection

### Admin API (requires auth)
- `POST /api/admin/auth/login` — Admin login
- `GET /api/admin/connections/overview` — Module overview
- `POST /api/admin/connections/toggle` — Enable/disable module
- `POST /api/admin/connections/source` — Change data source
- `POST /api/admin/connections/alerts/run` — Run alerts batch

### Telegram Admin API (Phase 2.3)
- `GET /api/admin/connections/telegram/settings` — Get settings
- `PATCH /api/admin/connections/telegram/settings` — Update settings
- `POST /api/admin/connections/telegram/test` — Send test message
- `POST /api/admin/connections/telegram/dispatch` — Dispatch pending alerts
- `GET /api/admin/connections/telegram/history` — Delivery history
- `GET /api/admin/connections/telegram/stats` — Delivery stats

## Telegram Bot
```
Bot: @t_fomo_bot
Token: 8262803410:AAEO_SSg4VYEr0wb6rZfkPZm34qB-oKaoIk
```

## Типы алертов
- **EARLY_BREAKOUT** — Ранний рост влияния (cooldown: 24h)
- **STRONG_ACCELERATION** — Резкое ускорение (cooldown: 12h)
- **TREND_REVERSAL** — Изменение тренда (cooldown: 12h)

## Credentials
```
Admin: username=admin, password=admin12345
```

## Режимы работы
- **Mock** — тестовые данные (текущий режим)
- **Sandbox** — ограниченные реальные данные
- **Twitter Live** — реальные данные (требует API keys)

## Следующие шаги (Backlog)

### Phase 2.4 - Graph (Twitter Connections)
- [ ] Переиспользование существующего graph UI
- [ ] Network visualization для Twitter аккаунтов
- [ ] Edge weights по overlap/jaccard
- [ ] Filters и side panel

### Phase 2.5 - Gap Analysis
- [ ] Сравнение со старым проектом
- [ ] Добивка функционала "как там → как тут"
- [ ] Must-have vs nice-to-have приоритезация

### Phase 3 - Twitter Integration
- [ ] Подключение Twitter API
- [ ] Реальные данные вместо mock
- [ ] Alert Delivery в production режиме

# Connections Module - Product Requirements Document

## Оригинальное задание
Развернуть проект Connections Module с GitHub (https://github.com/svetlanaslinko057/Conections-1) в изолированном режиме для дальнейшей доработки.

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

## Архитектура

### Технологический стек
| Компонент | Технология |
|-----------|------------|
| Backend Runtime | Node.js 20+ (Fastify + TypeScript) |
| Proxy Layer | Python FastAPI |
| Frontend | React 18 + Tailwind CSS |
| Database | MongoDB |

### Порты
- **8001** — FastAPI Proxy (внешний endpoint)
- **8003** — Node.js Fastify (internal)
- **3000** — React Frontend

### Ключевые файлы
- `/app/backend/src/server-minimal.ts` — изолированный entry point
- `/app/backend/server.py` — FastAPI proxy
- `/app/backend/src/modules/connections/` — Connections Module
- `/app/frontend/src/pages/ConnectionsPage.jsx` — Main UI
- `/app/frontend/src/pages/ConnectionsEarlySignalPage.jsx` — Radar UI

## Что реализовано (Feb 6, 2026)
- [x] Клонирование репозитория с GitHub
- [x] Настройка environment variables
- [x] Запуск MongoDB, Backend, Frontend
- [x] Connections Module в mock режиме
- [x] Public API endpoints работают
- [x] Admin API с авторизацией работает
- [x] Early Signal Radar отображает данные
- [x] Alerts Engine генерирует алерты

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

## Credentials
```
Admin: username=admin, password=admin12345
```

## Режимы работы
- **Mock** — тестовые данные (текущий режим)
- **Sandbox** — ограниченные реальные данные
- **Twitter Live** — реальные данные (требует API keys)

## Следующие шаги (Backlog)
- [ ] P3: Twitter Integration (требует API keys)
- [ ] Alert Delivery (Telegram/Discord)
- [ ] Historical Data Storage
- [ ] ML-enhanced Scoring
- [ ] Network Graph Analysis

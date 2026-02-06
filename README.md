# 🔗 Connections Module

## Справедливый рейтинг инфлюенсеров

Изолированный модуль платформы для формирования **справедливого рейтинга инфлюенсеров** в социальных сетях (Twitter и др.).

---

## 📚 Документация

| Файл | Описание |
|------|----------|
| [docs/CONCEPT.md](docs/CONCEPT.md) | Концепция продукта — для чего, что делает, как работает |
| [docs/CONNECTIONS_MODULE.md](docs/CONNECTIONS_MODULE.md) | Полная техническая документация |
| [docs/QUICK_START.md](docs/QUICK_START.md) | Быстрый запуск изолированного модуля |
| [memory/PRD.md](memory/PRD.md) | Product Requirements Document |

---

## 🎯 Что делает модуль?

### Проблема
Традиционные метрики (followers, likes) легко накручиваются и не отражают реальной ценности инфлюенсера.

### Решение
**Connections Module** анализирует:

| Функция | Описание |
|---------|----------|
| **Influence Scoring** | Quality-adjusted score на основе реальных взаимодействий |
| **Trend Analysis** | Velocity + Acceleration изменений |
| **Early Signal** | Детекция breakout и rising сигналов |
| **Risk Detection** | Оценка накрутки и манипуляций |
| **Alerts Engine** | Оповещения о важных событиях |

---

## 🚀 Quick Start

### Минимальные требования
- Node.js 20+
- Python 3.11+
- MongoDB 6.0+

### НЕ требуется
- ❌ Twitter API keys (mock режим)
- ❌ ML/Neural сервисы
- ❌ Telegram Bot
- ❌ Redis

### Запуск за 5 минут

```bash
# 1. MongoDB
docker run -d -p 27017:27017 --name connections-mongo mongo:6.0

# 2. Backend
cd backend && yarn install && yarn build
node dist/server-minimal.js &

# 3. Frontend
cd frontend && yarn install && yarn start &

# 4. Проверка
curl http://localhost:8001/api/connections/health
```

### Web Interface
- **Connections**: http://localhost:3000/connections
- **Radar**: http://localhost:3000/connections/radar
- **Admin**: http://localhost:3000/admin/connections

### Admin credentials
```
Username: admin
Password: admin12345
```

---

## 🏗 Архитектура

```
/app/
├── backend/
│   └── src/
│       ├── server-minimal.ts       # Entry point (изолированный)
│       ├── app-minimal.ts          # App config
│       └── modules/
│           └── connections/        # 🔗 Connections Module
│               ├── api/routes.ts   # Public API
│               ├── core/           # Scoring, Trends, Alerts
│               └── admin/          # Admin routes
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── ConnectionsPage.jsx
│       │   ├── ConnectionsEarlySignalPage.jsx
│       │   └── admin/AdminConnectionsPage.jsx
│       └── components/connections/
│
└── docs/                           # 📚 Документация
    ├── CONCEPT.md
    ├── CONNECTIONS_MODULE.md
    └── QUICK_START.md
```

---

## 🔌 API Endpoints

### Public API
```
GET  /api/connections/health
GET  /api/connections/accounts
POST /api/connections/score
POST /api/connections/compare
POST /api/connections/trends
POST /api/connections/early-signal
```

### Admin API (requires auth)
```
GET  /api/admin/connections/overview
POST /api/admin/connections/toggle
POST /api/admin/connections/source
GET  /api/admin/connections/config
POST /api/admin/connections/alerts/run
GET  /api/admin/connections/alerts/preview
```

---

## 📊 Ключевые метрики

### Influence Score
- **Base**: Качество аудитории, реальные взаимодействия
- **Adjusted**: Base × Trend Multiplier (velocity + acceleration)

### Early Signal
- **breakout**: Сильный сигнал прорыва
- **rising**: Умеренный рост
- **none**: Без сигнала

### Risk Level
- **low**: Органический рост
- **medium**: Подозрительные паттерны
- **high**: Накрутка/боты

---

## 🔔 Alerts Engine

### Типы событий
| Тип | Cooldown | Описание |
|-----|----------|----------|
| EARLY_BREAKOUT | 6h | Прорыв detected |
| STRONG_ACCELERATION | 3h | Резкое ускорение |
| TREND_REVERSAL | 4h | Разворот тренда |

### Preview Mode
Текущая версия работает в **preview-only** режиме — алерты генерируются, но НЕ отправляются наружу.

---

## 🛠 Конфигурация

### Environment Variables

**Backend** (`backend/.env`):
```env
MONGO_URL=mongodb://localhost:27017
MONGODB_URI=mongodb://localhost:27017/connections_db
DB_NAME=connections_db
NODE_ENV=development
PORT=8003
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 📋 Статус проекта

### ✅ Завершено
- [x] P0: Admin fix (no loading hang)
- [x] P1: UI Polish (Admin + Radar)
- [x] P2: Alerts Engine + Readiness Check
- [x] Documentation

### 🔜 Следующие шаги
- [ ] P3: Twitter Integration
- [ ] Alert Delivery (Telegram/Discord)
- [ ] ML-enhanced Scoring

---

## 📄 Лицензия

Proprietary — Emergent Platform

---

*Connections Module v1.0 — Fair Influence Rating System*

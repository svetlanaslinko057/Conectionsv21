# 🔗 CONNECTIONS MODULE — Полная документация

## Оглавление
1. [Концепция и назначение](#1-концепция-и-назначение)
2. [Архитектура модуля](#2-архитектура-модуля)
3. [Backend API](#3-backend-api)
4. [Frontend компоненты](#4-frontend-компоненты)
5. [База данных](#5-база-данных)
6. [Alerts Engine](#6-alerts-engine)
7. [Admin Control Plane](#7-admin-control-plane)
8. [Quick Start — Быстрый запуск](#8-quick-start--быстрый-запуск)
9. [Конфигурация](#9-конфигурация)
10. [Troubleshooting](#10-troubleshooting)
11. [Telegram Notifications (Phase 2.3)](#11-telegram-notifications-phase-23)

---

# 1. Концепция и назначение

## 1.1 Что такое Connections Module?

**Connections Module** — это изолированный модуль платформы, отвечающий за **формирование справедливого рейтинга инфлюенсеров** в социальных сетях (в первую очередь Twitter, в перспективе — другие платформы).

### Ключевая идея

Традиционные метрики влияния (followers, likes, retweets) легко накручиваются и не отражают реальной ценности инфлюенсера. Connections Module решает эту проблему через:

1. **Анализ связей аудитории** — кто реально взаимодействует с контентом
2. **Trend-adjusted scoring** — учёт динамики изменения метрик
3. **Early Signal detection** — раннее обнаружение "восходящих звёзд"
4. **Risk assessment** — оценка рисков (накрутка, боты, манипуляции)

### Для кого это нужно?

- **Трейдеры/инвесторы** — находить инфлюенсеров ДО того, как они станут популярными
- **Маркетологи** — выбирать инфлюенсеров с реальной, а не накрученной аудиторией
- **Аналитики** — понимать истинную динамику влияния в криптосообществе

## 1.2 Что делает модуль?

### Основные функции:

| Функция | Описание |
|---------|----------|
| **Influence Scoring** | Вычисление базового и скорректированного influence score |
| **Trend Analysis** | Анализ velocity (скорость) и acceleration (ускорение) изменений |
| **Early Signal Detection** | Детекция breakout (прорыв) и rising (рост) сигналов |
| **Audience Overlap** | Сравнение пересечения аудиторий двух инфлюенсеров |
| **Risk Detection** | Определение уровня риска (low/medium/high) |
| **Alerts Engine** | Генерация оповещений о важных событиях |

### Как это работает?

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Data Source    │────▶│  Scoring Engine  │────▶│  Early Signal   │
│  (Mock/Twitter) │     │                  │     │  Detection      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Trend Adjust    │     │  Alerts Engine  │
                        │  (velocity/accel)│     │  (preview-only) │
                        └──────────────────┘     └─────────────────┘
```

## 1.3 Ключевые метрики

### Base Influence Score
Базовая оценка влияния на основе:
- Количество подписчиков
- Engagement rate (лайки, ретвиты, ответы)
- Качество аудитории

### Trend-Adjusted Score
Корректировка базового score с учётом:
- **Velocity** — скорость изменения метрик
- **Acceleration** — ускорение (растёт/падает velocity)
- **Trend state** — состояние тренда (growing, cooling, stable, volatile)

### Early Signal Score
Индикатор потенциального "прорыва":
- **breakout** — сильный сигнал роста
- **rising** — умеренный сигнал роста
- **none** — без сигнала

---

# 2. Архитектура модуля

## 2.1 Структура файлов

```
/app/
├── backend/
│   └── src/
│       ├── modules/
│       │   └── connections/
│       │       ├── index.ts                    # Entry point
│       │       ├── api/
│       │       │   └── routes.ts               # Public API routes
│       │       ├── core/
│       │       │   ├── scoring/
│       │       │   │   ├── connections-score.ts
│       │       │   │   ├── connections-trend-config.ts
│       │       │   │   ├── early-signal.ts
│       │       │   │   ├── early-signal-config.ts
│       │       │   │   └── threshold-tuning.ts
│       │       │   └── alerts/
│       │       │       ├── connections-alerts-engine.ts
│       │       │       └── index.ts
│       │       ├── admin/
│       │       │   └── connections-admin.ts
│       │       └── storage/
│       │           └── author-profile.store.ts
│       └── core/
│           └── admin/
│               └── admin.connections.routes.ts  # Admin API
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── ConnectionsPage.jsx              # Main page
        │   ├── ConnectionsEarlySignalPage.jsx   # Radar page
        │   ├── ConnectionsDetailPage.jsx        # Detail page
        │   └── admin/
        │       └── AdminConnectionsPage.jsx     # Admin control plane
        ├── components/
        │   └── connections/
        │       └── CompareModal.jsx             # Compare modal
        └── config/
            └── adminNav.registry.js             # Navigation config
```

## 2.2 Технологический стек

| Компонент | Технология |
|-----------|------------|
| **Backend Runtime** | Node.js 20+ |
| **Backend Framework** | Fastify (TypeScript) |
| **Proxy Layer** | FastAPI (Python) |
| **Frontend** | React 18 + Tailwind CSS |
| **Database** | MongoDB |
| **State Management** | React Context + useState |

## 2.3 Порты и сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| FastAPI Proxy | 8001 | Внешний API endpoint |
| Fastify Backend | 8003 | Node.js backend (internal) |
| React Frontend | 3000 | Web interface |
| MongoDB | 27017 | Database |

---

# 3. Backend API

## 3.1 Public Connections API

Base URL: `/api/connections`

### Health Check
```http
GET /api/connections/health
```
Response:
```json
{
  "ok": true,
  "module": "connections",
  "status": "healthy",
  "features": {
    "scoring": true,
    "trend_adjust": true,
    "early_signal": true,
    "compare": true,
    "influence_score": true,
    "risk_detection": true
  },
  "storage": "mongodb"
}
```

### Get Accounts List
```http
GET /api/connections/accounts?limit=50&offset=0&profile=retail&risk=low
```
Query Parameters:
- `limit` — количество записей (default: 50)
- `offset` — смещение для пагинации
- `profile` — фильтр по профилю (retail, influencer, whale)
- `risk` — фильтр по риску (low, medium, high)

### Get Account Detail
```http
GET /api/connections/accounts/:author_id
```

### Score Calculation
```http
POST /api/connections/score
Content-Type: application/json

{
  "author_id": "123456789",
  "metrics": {
    "followers_count": 50000,
    "following_count": 500,
    "tweet_count": 2000
  },
  "engagement": {
    "likes": 1200,
    "retweets": 300,
    "replies": 150
  }
}
```

### Mock Score (для тестирования)
```http
GET /api/connections/score/mock
```

### Compare Two Accounts
```http
POST /api/connections/compare
Content-Type: application/json

{
  "left": "crypto_whale",
  "right": "alpha_hunter"
}
```

### Trends Analysis
```http
POST /api/connections/trends
Content-Type: application/json

{
  "author_id": "123456789"
}
```

### Mock Trends
```http
GET /api/connections/trends/mock
```

### Early Signal Detection
```http
POST /api/connections/early-signal
Content-Type: application/json

{
  "author_id": "123456789",
  "influence_base": 500,
  "influence_adjusted": 650,
  "velocity_norm": 0.25,
  "acceleration_norm": 0.4,
  "audience_size": 50000,
  "profile": "retail",
  "risk_level": "low"
}
```

### Mock Early Signal
```http
GET /api/connections/early-signal/mock
```

### Score Explanation
```http
POST /api/connections/explain
Content-Type: application/json

{
  "author_id": "123456789"
}
```

### Sensitivity Analysis
```http
POST /api/connections/sensitivity
Content-Type: application/json

{
  "base_score": 500,
  "velocity_norm": 0.2,
  "acceleration_norm": 0.3
}
```

---

## 3.2 Admin Connections API

Base URL: `/api/admin/connections`
**Требуется авторизация:** `Authorization: Bearer <token>`

### Overview
```http
GET /api/admin/connections/overview
```
Response:
```json
{
  "ok": true,
  "data": {
    "enabled": true,
    "source_mode": "mock",
    "last_run": "2026-02-06T09:22:42.000Z",
    "stats": {
      "accounts_24h": 112,
      "early_signals": 14,
      "breakouts": 2,
      "alerts_generated": 4,
      "alerts_sent": 0
    },
    "health": {
      "status": "healthy",
      "uptime_hours": 72
    }
  }
}
```

### Toggle Module
```http
POST /api/admin/connections/toggle
Content-Type: application/json

{
  "enabled": true
}
```

### Change Data Source
```http
POST /api/admin/connections/source
Content-Type: application/json

{
  "mode": "mock"  // "mock" | "sandbox" | "twitter_live"
}
```

### Get Configuration
```http
GET /api/admin/connections/config
```

### Tuning Status
```http
GET /api/admin/connections/tuning/status
```

### Run Tuning Analysis
```http
POST /api/admin/connections/tuning/run
Content-Type: application/json

{
  "dataset_size": 25
}
```

### Alerts Preview
```http
GET /api/admin/connections/alerts/preview?type=EARLY_BREAKOUT&status=preview&limit=50
```

### Run Alerts Batch
```http
POST /api/admin/connections/alerts/run
Content-Type: application/json

{}
```

### Update Alerts Config
```http
POST /api/admin/connections/alerts/config
Content-Type: application/json

{
  "enabled": true,
  "types": {
    "EARLY_BREAKOUT": {
      "enabled": true,
      "severity_min": 0.6,
      "cooldown_minutes": 360
    }
  }
}
```

### Send Alert (preview-only)
```http
POST /api/admin/connections/alerts/send
Content-Type: application/json

{
  "alert_id": "alert_123456_abc123"
}
```

### Suppress Alert
```http
POST /api/admin/connections/alerts/suppress
Content-Type: application/json

{
  "alert_id": "alert_123456_abc123"
}
```

---

# 4. Frontend компоненты

## 4.1 Страницы

### `/connections` — ConnectionsPage
Основная страница со списком аккаунтов:
- Таблица с influence score, trend, early signal
- Фильтры по профилю и риску
- Сортировка по метрикам
- Переход к детальной странице

### `/connections/radar` — ConnectionsEarlySignalPage
Radar View для Early Signal детекции:
- Scatter plot с bubbles (influence vs acceleration)
- Alpha Zone подсветка
- Table view альтернатива
- Compare mode для выбора 2 аккаунтов

### `/connections/detail/:id` — ConnectionsDetailPage
Детальная страница аккаунта:
- Полная информация о scoring
- History графики
- Compare button

### `/admin/connections` — AdminConnectionsPage
Admin Control Plane:
- **Overview** — статус модуля, активность 24h
- **Config** — конфигурация параметров
- **Stability** — стабильность модели
- **Alerts** — Alerts Engine management

## 4.2 URL Query параметры

Admin page поддерживает прямую навигацию к табам:
- `/admin/connections` → Overview
- `/admin/connections?tab=config` → Configuration
- `/admin/connections?tab=stability` → Stability
- `/admin/connections?tab=alerts` → Alerts Engine

---

# 5. База данных

## 5.1 Collections

### `connection_profiles`
```javascript
{
  _id: ObjectId,
  author_id: String,          // Twitter ID
  username: String,           // @handle
  profile: String,            // "retail" | "influencer" | "whale"
  risk_level: String,         // "low" | "medium" | "high"
  
  influence: {
    base: Number,
    adjusted: Number,
    percentile: Number
  },
  
  trend: {
    velocity_norm: Number,
    acceleration_norm: Number,
    state: String,            // "growing" | "cooling" | "stable" | "volatile"
  },
  
  early_signal: {
    score: Number,
    badge: String,            // "breakout" | "rising" | "none"
    confidence: Number
  },
  
  audience: {
    total: Number,
    engaged_user_ids: [String]
  },
  
  metrics_history: [{
    timestamp: Date,
    influence_base: Number,
    velocity: Number,
    acceleration: Number
  }],
  
  createdAt: Date,
  updatedAt: Date
}
```

### `connection_alerts`
```javascript
{
  _id: ObjectId,
  id: String,                 // "alert_123456_abc123"
  timestamp: Date,
  type: String,               // "EARLY_BREAKOUT" | "STRONG_ACCELERATION" | "TREND_REVERSAL"
  
  account: {
    author_id: String,
    username: String,
    profile: String
  },
  
  severity: Number,           // 0.0 - 1.0
  status: String,             // "preview" | "sent" | "suppressed"
  reason: String,
  explain: String,
  
  metrics_snapshot: {
    influence_base: Number,
    influence_adjusted: Number,
    velocity_norm: Number,
    acceleration_norm: Number,
    early_signal_score: Number,
    trend_state: String,
    risk_level: String
  }
}
```

## 5.2 Indexes

```javascript
// connection_profiles
db.connection_profiles.createIndex({ author_id: 1 }, { unique: true });
db.connection_profiles.createIndex({ username: 1 });
db.connection_profiles.createIndex({ profile: 1, risk_level: 1 });
db.connection_profiles.createIndex({ "early_signal.badge": 1 });
db.connection_profiles.createIndex({ "influence.adjusted": -1 });

// connection_alerts
db.connection_alerts.createIndex({ timestamp: -1 });
db.connection_alerts.createIndex({ type: 1, status: 1 });
db.connection_alerts.createIndex({ "account.author_id": 1 });
```

---

# 6. Alerts Engine

## 6.1 Типы событий

| Тип | Описание | Условия |
|-----|----------|---------|
| **EARLY_BREAKOUT** | Прорыв detected | badge=breakout, confidence>0.5, risk≠high |
| **STRONG_ACCELERATION** | Сильное ускорение | acceleration>0.4, velocity>0.1 |
| **TREND_REVERSAL** | Разворот тренда | state change (growing→cooling, etc.) |

## 6.2 Cooldown и дедупликация

- **EARLY_BREAKOUT**: 6 часов между алертами на один аккаунт
- **STRONG_ACCELERATION**: 3 часа
- **TREND_REVERSAL**: 4 часа

## 6.3 Preview-only режим

В текущей версии алерты генерируются в статусе `preview`.

**Для реальной доставки в Telegram:**
1. Включить Telegram Delivery в Admin → Connections → Telegram
2. Отключить Preview Only
3. Пользователи должны нажать `/start` в боте

Подробнее: [11. Telegram Notifications](#11-telegram-notifications-phase-23)

---

# 7. Admin Control Plane

## 7.1 Overview Tab

Показывает:
- **Module Status**: ENABLED/DISABLED
- **Health**: HEALTHY/DEGRADED/ERROR
- **Source Mode**: Mock/Sandbox/Twitter Live
- **Activity 24h**: Counters

## 7.2 Config Tab

- Read-only параметры (Trend, Early Signal)
- Editable параметры (Alerts thresholds)
- Version history
- Apply → Confirm → Success flow

## 7.3 Stability Tab

- **Stability Score**: 0-100%
- **Status**: OK (>90%), Warning (70-90%), Danger (<70%)
- **Parameter Sensitivity**: safe ranges, optimal values
- **Recommendations**

## 7.4 Alerts Tab

- **Run Alerts Batch**: кнопка запуска детекции
- **Alert Types**: ON/OFF toggles с cooldown info
- **Recent Alerts**: таблица с Send/Suppress actions
- **Filters**: по типу, hide suppressed

---

# 8. Quick Start — Быстрый запуск

## 8.1 Минимальные требования

Для изолированного запуска **только Connections Module** нужно:

| Компонент | Версия | Обязательно |
|-----------|--------|-------------|
| Node.js | 20+ | ✅ |
| Python | 3.11+ | ✅ |
| MongoDB | 6.0+ | ✅ |
| npm/yarn | latest | ✅ |

**НЕ требуется:**
- ❌ Twitter API keys (mock режим)
- ❌ Neural/ML сервисы
- ❌ Telegram Bot
- ❌ Redis
- ❌ Другие внешние сервисы

## 8.2 Environment Variables

### Backend (`/app/backend/.env`)
```env
# Database
MONGO_URL=mongodb://localhost:27017
MONGODB_URI=mongodb://localhost:27017/connections_db
DB_NAME=connections_db

# Server
NODE_ENV=development
PORT=8003
LOG_LEVEL=info

# CORS
CORS_ORIGINS=*
```

### Frontend (`/app/frontend/.env`)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 8.3 Шаги установки

### 1. Клонирование репозитория
```bash
git clone https://github.com/your-repo/connections-module.git
cd connections-module
```

### 2. Установка зависимостей Backend
```bash
cd backend
yarn install
```

### 3. Установка зависимостей Frontend
```bash
cd ../frontend
yarn install
```

### 4. Запуск MongoDB
```bash
# Docker
docker run -d -p 27017:27017 --name connections-mongo mongo:6.0

# Или локально
mongod --dbpath /data/db
```

### 5. Сборка Backend
```bash
cd backend
yarn build
```

### 6. Запуск сервисов

**Вариант A: Через supervisor (рекомендуется)**
```bash
sudo supervisorctl start backend frontend
```

**Вариант B: Вручную**

Terminal 1 — Backend (Fastify):
```bash
cd backend
node dist/server-minimal.js
```

Terminal 2 — Backend (FastAPI Proxy):
```bash
cd backend
python server.py
```

Terminal 3 — Frontend:
```bash
cd frontend
yarn start
```

### 7. Проверка работоспособности

```bash
# Health check
curl http://localhost:8001/api/health
# Expected: {"ok":true,"service":"fomo-backend","mode":"minimal"}

# Connections health
curl http://localhost:8001/api/connections/health
# Expected: {"ok":true,"module":"connections","status":"healthy",...}

# Mock score
curl http://localhost:8001/api/connections/score/mock
# Expected: Full scoring response
```

### 8. Доступ к UI

- **Connections Page**: http://localhost:3000/connections
- **Early Signal Radar**: http://localhost:3000/connections/radar
- **Admin Login**: http://localhost:3000/admin/login
- **Admin Connections**: http://localhost:3000/admin/connections

### 9. Admin credentials
```
Username: admin
Password: admin12345
```

## 8.4 Seed тестовых данных

```bash
# Add test accounts
curl -X POST http://localhost:8001/api/connections/test/add-audience \
  -H "Content-Type: application/json" \
  -d '{
    "author_id": "test_001",
    "handle": "crypto_whale",
    "engaged_user_ids": ["user1", "user2", "user3", "user4", "user5"]
  }'

# Run alerts batch (requires admin auth)
API_URL=http://localhost:8001
TOKEN=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin12345"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")

curl -X POST "$API_URL/api/admin/connections/alerts/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 8.5 Изолированный режим (без остальной платформы)

Модуль Connections использует `server-minimal.ts` который:
- ✅ Загружает ТОЛЬКО Connections module
- ✅ Не требует Twitter API
- ✅ Не требует ML/Neural сервисы
- ✅ Работает полностью на mock данных

Для переключения между режимами используйте Admin → Connections → Change Data Source:
- **Mock** — тестовые данные (default)
- **Sandbox** — ограниченные реальные данные
- **Twitter Live** — полные реальные данные (требует API keys)

---

# 9. Конфигурация

## 9.1 Scoring Config

Файл: `backend/src/modules/connections/core/scoring/connections-trend-config.ts`

```typescript
export const ConnectionsTrendConfig = {
  // Velocity boundaries
  velocity: {
    min: -1.0,
    max: 1.0,
    neutral_zone: [-0.05, 0.05]
  },
  
  // Acceleration boundaries
  acceleration: {
    min: -1.0,
    max: 1.0,
    significant_threshold: 0.1
  },
  
  // Trend adjustment weights
  weights: {
    velocity: 0.3,
    acceleration: 0.2,
    consistency: 0.1
  },
  
  // Score bounds
  bounds: {
    min_multiplier: 0.7,
    max_multiplier: 1.5
  }
};
```

## 9.2 Early Signal Config

Файл: `backend/src/modules/connections/core/scoring/early-signal-config.ts`

```typescript
export const EarlySignalConfig = {
  // Breakout thresholds
  breakout: {
    min_acceleration: 0.3,
    min_velocity: 0.15,
    min_confidence: 0.5,
    excluded_profiles: ['whale'],
    excluded_risks: ['high']
  },
  
  // Rising thresholds
  rising: {
    min_acceleration: 0.15,
    min_velocity: 0.08,
    min_confidence: 0.3
  },
  
  // Score calculation
  score_weights: {
    acceleration: 0.4,
    velocity: 0.3,
    influence_delta: 0.2,
    consistency: 0.1
  }
};
```

## 9.3 Alerts Engine Config

Файл: `backend/src/modules/connections/core/alerts/connections-alerts-engine.ts`

```typescript
const engineConfig = {
  enabled: true,
  conditions: {
    EARLY_BREAKOUT: {
      enabled: true,
      severity_min: 0.6,
      cooldown_minutes: 360  // 6 hours
    },
    STRONG_ACCELERATION: {
      enabled: true,
      severity_min: 0.5,
      cooldown_minutes: 180  // 3 hours
    },
    TREND_REVERSAL: {
      enabled: true,
      severity_min: 0.7,
      cooldown_minutes: 240  // 4 hours
    }
  },
  global_cooldown_minutes: 30,
  max_alerts_per_run: 20
};
```

---

# 10. Troubleshooting

## 10.1 Backend не запускается

**Проверить логи:**
```bash
tail -n 100 /var/log/supervisor/backend.err.log
```

**Частые причины:**
- MongoDB не запущен → `docker start connections-mongo`
- Порт занят → `lsof -i :8003`
- Ошибки TypeScript → `cd backend && yarn build`

## 10.2 Frontend показывает ошибки

**Проверить консоль браузера** (F12 → Console)

**Частые причины:**
- Backend недоступен → проверить `curl http://localhost:8001/api/health`
- CORS ошибки → проверить `CORS_ORIGINS` в backend/.env
- Неправильный `REACT_APP_BACKEND_URL`

## 10.3 Alerts не генерируются

**Проверить:**
1. Alerts Engine включен в Admin → Alerts
2. Alert types включены (ON)
3. Cooldown не заблокировал (проверить timestamps)
4. Данные соответствуют условиям детекции

**Тест:**
```bash
# Проверить конфиг
curl http://localhost:8001/api/admin/connections/alerts/preview \
  -H "Authorization: Bearer $TOKEN"
```

## 10.4 Admin не грузится

**Проверить авторизацию:**
```bash
curl -X POST http://localhost:8001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin12345"}'
```

**Проверить token в localStorage** (F12 → Application → Local Storage)

---

# Контакты и поддержка

- **PRD Document**: `/app/memory/PRD.md`
- **Test Reports**: `/app/test_reports/`
- **Admin Nav Config**: `/app/frontend/src/config/adminNav.registry.js`

---

# 11. Telegram Notifications (Phase 2.3)

## 11.1 Концепция

Telegram интеграция для доставки алертов реализована по принципу:

> **Платформа управляет ботом** — все настройки на сайте, бот только принимает сообщения.

### Ключевые принципы:

| Принцип | Описание |
|---------|----------|
| **Один бот** | Используется существующий бот `@t_fomo_bot` |
| **Платформа = мозг** | Все решения (что/кому/когда) принимает платформа |
| **Бот = receiver** | Бот только отправляет сообщения, никакой бизнес-логики |
| **Настройки на сайте** | Пользователь управляет алертами через Admin UI или веб |
| **Mute в боте** | Единственное, что можно в боте — выключить алерты командой |

## 11.2 Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         PLATFORM (Brain)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐   │
│  │   Alerts    │───▶│ Dispatcher  │───▶│ Telegram         │   │
│  │   Engine    │    │ (policy +   │    │ Transport        │   │
│  │             │    │  cooldown)  │    │                  │   │
│  └─────────────┘    └─────────────┘    └────────┬─────────┘   │
│                            │                     │             │
│                            ▼                     │             │
│                     ┌─────────────┐              │             │
│                     │  Settings   │              │             │
│                     │  Store      │              │             │
│                     │  (MongoDB)  │              │             │
│                     └─────────────┘              │             │
└─────────────────────────────────────────────────┼─────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────┐
                                    │   Telegram Bot API      │
                                    │   @t_fomo_bot           │
                                    └─────────────────────────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────────┐
                     │                            │                            │
                     ▼                            ▼                            ▼
              ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
              │  User 1     │             │  User 2     │             │  Admin      │
              │  (chatId)   │             │  (chatId)   │             │  Channel    │
              └─────────────┘             └─────────────┘             └─────────────┘
```

## 11.3 Структура файлов

```
backend/src/
├── modules/connections/notifications/
│   ├── index.ts                    # Export all
│   ├── types.ts                    # TypeScript types
│   ├── templates.ts                # Message templates
│   ├── telegram.transport.ts       # Telegram API wrapper
│   ├── settings.store.ts           # MongoDB settings
│   ├── delivery.store.ts           # Delivery history
│   ├── dispatcher.service.ts       # Core logic
│   └── admin.routes.ts             # Admin API
│
├── telegram-polling.worker.ts      # Bot commands handler
│
└── core/notifications/
    └── telegram.service.ts         # Shared telegram service
                                    # + TelegramConnectionModel
```

## 11.4 Модель данных

### TelegramConnectionModel

```typescript
interface ITelegramConnection {
  userId: string;
  chatId: string;               // Telegram chat ID
  username?: string;
  firstName?: string;
  isActive: boolean;
  connectedAt: Date;
  
  // Twitter/Parser alerts (existing)
  eventPreferences: {
    sessionOk: boolean;         // Session status alerts
    sessionStale: boolean;
    sessionInvalid: boolean;
    parseCompleted: boolean;
    parseAborted: boolean;
    cooldown: boolean;
    highRisk: boolean;
  };
  
  // Connections alerts (Phase 2.3)
  connectionsPreferences: {
    enabled: boolean;           // Global on/off
    earlyBreakout: boolean;     // Future: per-type control
    strongAcceleration: boolean;
    trendReversal: boolean;
  };
}
```

### ConnectionsTelegramSettings (Admin)

```typescript
interface TelegramDeliverySettings {
  enabled: boolean;             // Global delivery on/off
  preview_only: boolean;        // Log but don't send
  chat_id: string;              // Optional admin channel
  
  cooldown_hours: {
    EARLY_BREAKOUT: 24,
    STRONG_ACCELERATION: 12,
    TREND_REVERSAL: 12,
    TEST: 0
  };
  
  type_enabled: {
    EARLY_BREAKOUT: true,
    STRONG_ACCELERATION: true,
    TREND_REVERSAL: true,
    TEST: true
  };
}
```

## 11.5 Telegram Bot Commands

### Общие команды

| Команда | Описание |
|---------|----------|
| `/start` | Подписка на алерты + welcome message |
| `/alerts` | **Единое меню** управления всеми алертами |
| `/status` | Статус подключения |
| `/help` | Справка по командам |
| `/disconnect` | Отключить ВСЕ алерты |

### Connections алерты

| Команда | Описание |
|---------|----------|
| `/connections` | Статус Connections алертов |
| `/connections on` | Включить Connections алерты |
| `/connections off` | Выключить Connections алерты |

### Twitter/Parser алерты

| Команда | Описание |
|---------|----------|
| `/twitter` | Статус Twitter алертов |
| `/twitter on` | Включить Twitter алерты |
| `/twitter off` | Выключить Twitter алерты |

### Пример `/alerts` output

```
⚙️ Alert Settings

📊 Connections (Influencer)
Status: 🟢 ON
• Early Breakout, Acceleration, Reversal
→ /connections on|off

🐦 Twitter / Parser
Status: 🟢 ON
• Session alerts: ✅
• Parse alerts: ✅
→ /twitter on|off

Quick actions:
/connections off - Mute influencer alerts
/twitter off - Mute twitter alerts
/disconnect - Stop ALL alerts
```

## 11.6 Типы сообщений

### 🚀 EARLY_BREAKOUT

```
🚀 EARLY BREAKOUT

@username

Аккаунт показывает ранний рост влияния, который рынок ещё не заметил.

• Influence: 750
• Acceleration: +45%
• Profile: Influencer
• Risk: Low

Сигнал основан на устойчивом росте и положительной динамике.

🔗 View details:
https://site.com/connections/account_id
```

### 📈 STRONG_ACCELERATION

```
📈 STRONG ACCELERATION

@username

Резкое ускорение роста влияния за короткий период.

• Influence: 620
• Velocity: +15/day
• Acceleration: +38%
• Trend: GROWING

Динамика усиливается, возможен переход в breakout.

🔗 View trend:
https://site.com/connections/account_id
```

### 🔄 TREND_REVERSAL

```
🔄 TREND CHANGE

@username

Изменение тренда влияния.

• Previous: GROWING
• Current: COOLING
• Influence: 580

Динамика аккаунта изменилась — рекомендуется переоценка.

🔗 View analysis:
https://site.com/connections/account_id
```

### 🧪 TEST

```
🧪 TEST ALERT

This is a test notification from Connections module.

If you see this message — Telegram delivery is configured correctly.
No real signals were used.
```

## 11.7 Admin API

### Settings

```bash
# Get settings
GET /api/admin/connections/telegram/settings

# Update settings
PATCH /api/admin/connections/telegram/settings
{
  "enabled": true,
  "preview_only": false,
  "chat_id": "-1001234567890"
}
```

### Actions

```bash
# Send test message to all subscribers
POST /api/admin/connections/telegram/test

# Dispatch pending alerts
POST /api/admin/connections/telegram/dispatch
{
  "dryRun": false,
  "limit": 50
}
```

### Analytics

```bash
# Get delivery history
GET /api/admin/connections/telegram/history?limit=50

# Get stats (last 24h)
GET /api/admin/connections/telegram/stats?hours=24
```

## 11.8 Логика доставки (Dispatcher)

### Flow

```
1. Admin включает Telegram Delivery (enabled=true, preview_only=false)
       ↓
2. Alerts Engine создаёт alert со статусом PREVIEW
       ↓
3. Dispatcher проверяет policy:
   - Global enabled? → если нет → skip
   - Type enabled? → если нет → skip
   - Cooldown пройден? → если нет → skip
       ↓
4. Dispatcher получает всех подписчиков:
   - isActive=true
   - connectionsPreferences.enabled ≠ false
       ↓
5. Отправка всем подписчикам + admin channel (если задан)
       ↓
6. Запись в delivery history
```

### Cooldown

| Тип алерта | Cooldown |
|------------|----------|
| EARLY_BREAKOUT | 24 часа |
| STRONG_ACCELERATION | 12 часов |
| TREND_REVERSAL | 12 часов |
| TEST | 0 (без cooldown) |

Cooldown применяется **per account** — один и тот же аккаунт не может генерировать алерты чаще cooldown.

## 11.9 Admin UI

Таб **Telegram** в `/admin/connections`:

- **Global toggles**: Telegram Delivery ON/OFF, Preview Only
- **Chat ID**: Опциональный admin канал
- **Alert types**: Включение/выключение по типам + cooldown
- **Actions**: Send Test Message, Dispatch Pending
- **Stats**: Total/Sent/Skipped/Failed за 24h
- **History**: Таблица последних доставок

## 11.10 Environment Variables

```bash
# backend/.env

# Telegram Bot Token (existing bot)
TELEGRAM_BOT_TOKEN=8262803410:AAEO_SSg4VYEr0wb6rZfkPZm34qB-oKaoIk

# Public URL for links in messages
PUBLIC_BASE_URL=https://svetlana-connect.preview.emergentagent.com
```

## 11.11 Будущие улучшения

### Phase 2.3+ (запланировано)

- [ ] **Web UI для подписки** — колокольчики на странице Connections
- [ ] **Per-type подписка** — пользователь выбирает типы алертов на вебе
- [ ] **Inline buttons** — кнопки в Telegram для быстрых действий
- [ ] **User-specific cooldown** — разный cooldown для разных пользователей

### НЕ планируется

- ❌ Настройки внутри бота (команды `/settings`, `/mute types`)
- ❌ Сложная логика в боте
- ❌ Отдельный бот для Connections

---

*Документация Phase 2.3 создана: 2026-02-06*
*Версия: 1.0.0*
*Автор: Emergent AI Assistant*

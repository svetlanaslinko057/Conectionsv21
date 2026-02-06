# Connections Module - PRD

## Original Problem Statement
Развернуть изолированный модуль "Connections" для формирования справедливого рейтинга инфлюенсеров в Twitter. Модуль должен быть изолирован и не влиять на другие сущности системы.

## Architecture
- **Backend**: FastAPI proxy (8001) → Node.js/Fastify (8003)
- **Frontend**: React + Tailwind CSS
- **Database**: MongoDB
- **Modules**: Connections (enabled), Twitter/Sentiment/Neural (disabled - не используем ресурсы)

## User Personas
1. **Admin** - управление модулем Connections через Control Plane
2. **Analyst** - просмотр и анализ influence score инфлюенсеров
3. **Trader** - мониторинг Early Signals для раннего обнаружения breakout аккаунтов

## Core Requirements (Static)
- Influence scoring для Twitter аккаунтов
- Risk detection (low/medium/high)
- Audience overlap comparison
- Early Signal detection (breakout, rising)
- Trend-adjusted scoring (velocity, acceleration)
- Admin Control Plane (enable/disable, config, stability, alerts)

## What's Been Implemented

### 2026-02-06 - Initial Deployment
- ✅ Deployed Connections module from GitHub
- ✅ Backend: FastAPI proxy + Node.js/Fastify
- ✅ Frontend: React with Connections pages
- ✅ MongoDB integration
- ✅ Test data seeding

### 2026-02-06 - P0 Fixes (DONE)
- ✅ **P0.1**: Fixed `/admin/connections` Loading hang
  - AdminAuthContext now exports `token`
  - Proper auth check before API calls
- ✅ **P0.2**: Fail-safe for Admin
  - TabErrorBoundary for each tab
  - Authentication Required screen (not hang)
  - Error messages instead of infinite loading

## Working Endpoints

### Public Connections API
- `GET /api/connections/health`
- `GET /api/connections/stats`
- `GET /api/connections/accounts`
- `GET /api/connections/accounts/:author_id`
- `POST /api/connections/compare`
- `POST /api/connections/score`
- `POST /api/connections/score/batch`
- `GET /api/connections/score/mock`
- `GET /api/connections/config`
- `POST /api/connections/sensitivity`
- `POST /api/connections/explain`
- `POST /api/connections/trends`
- `GET /api/connections/trends/mock`
- `POST /api/connections/early-signal`
- `GET /api/connections/early-signal/mock`

### Admin Connections API (requires auth)
- `GET /api/admin/connections/overview`
- `POST /api/admin/connections/toggle`
- `POST /api/admin/connections/source`
- `GET /api/admin/connections/config`
- `GET /api/admin/connections/tuning/status`
- `POST /api/admin/connections/tuning/run`
- `GET /api/admin/connections/alerts/preview`
- `POST /api/admin/connections/alerts/config`

## Prioritized Backlog

### P1 - CORE COMPLETION (Next)
- [ ] P1.1: Polish Admin Connections UI
- [ ] P1.2: Radar/Compare UX fixes

### P2 - SYSTEM READINESS
- [ ] P2.1: Alerts Engine (preview-only, no send)
- [ ] P2.2: Final Readiness Check (smoke tests)

### Backlog (NOT in current scope)
- Twitter live ingestion
- ML/Neural integration
- Graph/Network purity
- New scoring formulas

## Admin Credentials
- Username: `admin`
- Password: `admin12345`

## URLs
- Connections Page: `/connections`
- Early Signal Radar: `/connections/radar`
- Admin Connections: `/admin/connections`
- Admin Login: `/admin/login`

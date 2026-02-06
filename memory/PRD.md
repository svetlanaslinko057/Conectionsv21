# Connections Module - PRD

## Documentation

- **Full Documentation**: `/app/docs/CONNECTIONS_MODULE.md`
- **Quick Start Guide**: `/app/docs/QUICK_START.md`
- **Product Concept**: `/app/docs/CONCEPT.md`

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
- ✅ **P0.2**: Fail-safe for Admin - TabErrorBoundary, Authentication Required screen

### 2026-02-06 - P1.1 Polish Admin Connections UI (DONE)
- ✅ **Overview**: 3 logical blocks (Status, Activity 24h, Warnings)
- ✅ **Config**: Collapsible sections, read-only/editable distinction
- ✅ **Stability**: Big percentage score, Parameter Sensitivity
- ✅ **Alerts**: Summary cards, table view with filters

### 2026-02-06 - P1.2 Radar / Compare UX (DONE)
- ✅ **Radar View**: Hover tooltips, selected state with outline
- ✅ **Compare Mode**: Explicit mode with banner
- ✅ **Compare Modal**: Symmetric A vs B layout
- ✅ **Session Persistence**: Token saved to localStorage

### 2026-02-06 - P2.1 Alerts Engine (DONE)
- ✅ **Alert Engine**: Batch processing of accounts
- ✅ **Event Types**: EARLY_BREAKOUT, STRONG_ACCELERATION, TREND_REVERSAL
- ✅ **Conditions**:
  - EARLY_BREAKOUT: badge=breakout, confidence>0.5, risk≠high
  - STRONG_ACCELERATION: accel>0.4, velocity>0.1
  - TREND_REVERSAL: state change (growing→cooling, etc.)
- ✅ **Cooldown**: Per-account, per-type (6h, 3h, 4h)
- ✅ **Admin UI**: Run Batch button, alerts preview table
- ✅ **Preview-only**: No actual delivery (dry run)

### 2026-02-06 - P2.2 Final Readiness Check (DONE)
- ✅ **Backend**: 100% functional
  - Health checks: /api/health, /api/connections/health
  - Scoring API: Stable results
  - Trends API: Correct states
  - Early Signal API: Badge detection works
- ✅ **Admin Control Plane**: Fully operational
  - Overview loads < 2 sec
  - Config shows read-only params
  - Stability score ≥ 0.9 (100%)
  - Alerts batch generates events
  - Cooldown deduplication works
- ✅ **Frontend**: 90% functional
  - /connections: Account list works
  - /connections/radar: Early Signal Radar works
  - Compare mode functional
  - Filter/Table view toggles work

## READY FOR TWITTER: YES ✅

System is stable and ready for Twitter integration:
- Mathematical models are predictable
- Alerts don't flood (cooldown works)
- Admin can control everything
- UI is responsive and intuitive

## Working Endpoints

### Public Connections API
- `GET /api/connections/health`
- `GET /api/connections/stats`
- `GET /api/connections/accounts`
- `POST /api/connections/compare`
- `POST /api/connections/score`
- `GET /api/connections/score/mock`
- `GET /api/connections/trends/mock`
- `GET /api/connections/early-signal/mock`

### Admin Connections API
- `GET /api/admin/connections/overview`
- `POST /api/admin/connections/toggle`
- `POST /api/admin/connections/source`
- `GET /api/admin/connections/config`
- `GET /api/admin/connections/tuning/status`
- `POST /api/admin/connections/tuning/run`
- `GET /api/admin/connections/alerts/preview`
- `POST /api/admin/connections/alerts/run` (P2.1)
- `POST /api/admin/connections/alerts/config`
- `POST /api/admin/connections/alerts/send`
- `POST /api/admin/connections/alerts/suppress`

## Next Phase: P3 - Twitter Integration

When ready to proceed:
- Ingest: Real Twitter data
- Load: Rate limiting, cost control
- Quality: Data validation
- Alert Delivery: Telegram/Discord integration

## Admin Credentials
- Username: `admin`
- Password: `admin12345`

## URLs
- Connections Page: `/connections`
- Early Signal Radar: `/connections/radar`
- Admin Connections: `/admin/connections`
- Admin Login: `/admin/login`

/**
 * Info Tooltip Component
 * 
 * Reusable tooltip for explaining admin controls
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { HelpCircle } from 'lucide-react';

export function InfoTooltip({ text, className = '' }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={`text-slate-400 hover:text-slate-600 ${className}`}>
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-slate-900 text-white border-slate-700">
          <p className="text-sm">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Predefined tooltips for admin sections
export const ADMIN_TOOLTIPS = {
  // System Health
  backend: 'Node.js API server status. Handles all API requests and business logic.',
  mlService: 'Python ML service status. Provides predictions and model inference.',
  priceService: 'Market data provider status. Fetches token prices from CoinGecko/Binance.',
  providerPool: 'Pool of market data providers. Multiple providers ensure redundancy.',
  
  // Runtime Config
  decisionMode: 'How the system makes trading decisions. RULES_ONLY = pure algorithmic, ADVISORY = ML suggests, INFLUENCE = ML adjusts confidence.',
  killSwitch: 'Emergency stop. When ACTIVATED, disables all automated trading immediately.',
  mlInfluence: 'How much ML can adjust confidence scores (0-100%). Higher = more ML impact.',
  driftThreshold: 'Maximum allowed deviation from expected model behavior. Triggers alerts when exceeded.',
  
  // Networks
  networkEnabled: 'Enable/disable data collection for this blockchain network.',
  networkPriority: 'Processing priority. Lower number = processed first.',
  networkLastSync: 'Last time data was synced from this network.',
  
  // Pipeline Timestamps
  lastFeatureBuild: 'Last time ML features were computed from raw data.',
  lastLabeling: 'Last time signals were labeled with price outcomes.',
  lastDatasetBuild: 'Last time training dataset was updated.',
  lastMLInference: 'Last time ML model made predictions.',
  
  // Settings - System
  featureFlags: 'Feature toggles. Enable/disable specific platform features.',
  
  // Settings - ML
  mlEnabled: 'Master switch for all ML functionality. OFF = pure rules-based system.',
  fallbackMode: 'What happens when ML fails. RULES = use algorithmic rules, CACHED = use last prediction, DISABLE = skip ML.',
  marketModel: 'ML model for predicting market direction (BUY/SELL/NEUTRAL).',
  actorModel: 'ML model for classifying wallet behavior (SMART/NOISY).',
  confidenceThreshold: 'Minimum confidence required for ML prediction to be used.',
  ensembleWeights: 'How much each signal source contributes to final decision. Must sum to 1.0.',
  
  // Settings - Market
  providers: 'External API sources for market data (prices, volumes, etc.).',
  cacheL1Ttl: 'How long to cache prices in memory (fast but uses RAM).',
  cacheL2Ttl: 'How long to cache prices on disk (slower but persistent).',
  defaultProvider: 'Primary provider used when multiple are available.',
  
  // Backtesting
  backtestAccuracy: 'Percentage of correct predictions. Higher is better.',
  confusionMatrix: 'Shows where model makes mistakes. Diagonal = correct, off-diagonal = errors.',
  precisionBuy: 'When model predicts BUY, how often is it correct?',
  precisionSell: 'When model predicts SELL, how often is it correct?',
  samples: 'Total number of predictions evaluated.',
  
  // Data Pipelines
  pipelineStatus: 'Current state of this processing stage.',
  pipelineLatency: 'Time taken to complete last run.',
  pipelineRows: 'Number of records processed.',
  
  // Telegram Notifications (Phase 2.3)
  telegramEnabled: 'Глобальное включение/выключение доставки алертов в Telegram. Когда OFF — никакие алерты не отправляются.',
  telegramPreviewOnly: 'Режим предпросмотра. Алерты логируются, но НЕ отправляются в Telegram. Используйте для тестирования.',
  telegramChatId: 'ID канала/группы для админских алертов. Опционально — основная доставка идёт в личные чаты подписчиков.',
  telegramEarlyBreakout: 'Алерты о раннем росте влияния. Сигнал, что аккаунт показывает рост, который рынок ещё не заметил.',
  telegramStrongAcceleration: 'Алерты о резком ускорении. Динамика аккаунта усиливается, возможен переход в breakout.',
  telegramTrendReversal: 'Алерты об изменении тренда. Направление динамики аккаунта изменилось.',
  telegramCooldown: 'Минимальный интервал между алертами одного типа для одного аккаунта. Защита от спама.',
  telegramTestMessage: 'Отправить тестовое сообщение всем активным подписчикам для проверки настройки.',
  telegramDispatch: 'Принудительно отправить накопленные алерты. Обычно происходит автоматически.',
  telegramStats: 'Статистика доставки за последние 24 часа: отправлено, пропущено, ошибки.',
  telegramHistory: 'История отправленных алертов с деталями: тип, аккаунт, время, статус.',
  telegramSubscribers: 'Пользователи получают алерты после /start в боте. Mute: /connections off. Все настройки — на платформе.',
};

export default InfoTooltip;

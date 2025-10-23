# Core System Files - Essential for Operation

## 🎯 **Critical System Files (Must Fix)**

### **1. Core System Architecture**
- `gamma-services/core/EventBus.ts` - Central event system
- `gamma-services/config/ConfigInitializer.ts` - System initialization
- `gamma-services/config/ConfigManager.ts` - Configuration management
- `gamma-services/logging/Logger.ts` - Logging system
- `gamma-services/logging/AuditLogger.ts` - Audit logging

### **2. Trading System Core**
- `gamma-services/paper/PaperTradingEngine.ts` - Main trading engine
- `gamma-services/orchestrators/MultiTickerOrchestrator.ts` - Main orchestrator
- `gamma-services/orchestrators/RealtimeOrchestrator.ts` - Real-time orchestrator
- `gamma-services/gamma-adaptive/GammaAdaptiveSystem.ts` - Core adaptive system

### **3. Data & Analytics**
- `gamma-services/analytics/LearningInsightsEngine.ts` - Learning system
- `gamma-services/analytics/PerformanceAnalyticsEngine.ts` - Performance analytics
- `gamma-services/data/OptionsChainService.ts` - Data service
- `gamma-services/monitoring/PerformanceMonitor.ts` - Performance monitoring

### **4. Risk & Position Management**
- `gamma-services/paper/PositionManager.ts` - Position management
- `gamma-services/paper/RiskManager.ts` - Risk management
- `gamma-services/risk/PortfolioRiskManager.ts` - Portfolio risk
- `gamma-services/risk/DrawdownLossProtection.ts` - Drawdown protection

### **5. Integration & Alerts**
- `gamma-services/alerts/AlertSystem.ts` - Alert system
- `gamma-services/integrations/RegimeCompassIntegration.ts` - External integration
- `gamma-services/caching/CacheManager.ts` - Caching system

## 🚫 **Non-Essential Files (Skip for Now)**

### **Test Files**
- `gamma-services/tests/` - All test files
- `gamma-services/core/EventBusTestUtils.ts` - Test utilities
- `gamma-services/analytics/__tests__/` - Test files

### **Documentation & Examples**
- `gamma-services/docs/` - Documentation
- `gamma-services/examples/` - Example files
- `gamma-services/README.md` - Documentation

### **Utility Files**
- `gamma-services/config/ParameterCustomizationAPI.ts` - API utilities
- `gamma-services/config/EnvironmentValidator.ts` - Environment validation
- `gamma-services/data/examples/` - Example data files

## 🎯 **Priority Order for Fixing**

1. **EventBus.ts** - Central event system (CRITICAL)
2. **ConfigInitializer.ts** - System startup (CRITICAL)
3. **PaperTradingEngine.ts** - Main trading engine (CRITICAL)
4. **MultiTickerOrchestrator.ts** - Main orchestrator (CRITICAL)
5. **LearningInsightsEngine.ts** - Learning system (HIGH)
6. **PerformanceAnalyticsEngine.ts** - Analytics (HIGH)
7. **AlertSystem.ts** - Alert system (HIGH)
8. **CacheManager.ts** - Caching (MEDIUM)

## 📋 **Current Status**

✅ **Fixed Core Files:**
- LearningInsightsEngine.ts - Event type mismatches
- PerformanceAnalyticsEngine.ts - Import and type issues
- AlertSystem.ts - Import path and instance export
- ConfigInitializer.ts - LogContext errors
- ConfigManager.ts - LogContext errors

🔄 **In Progress:**
- EventBus.ts - Duplicate function implementations

⏳ **Pending:**
- PaperTradingEngine.ts
- MultiTickerOrchestrator.ts
- RealtimeOrchestrator.ts
- GammaAdaptiveSystem.ts

## 🚀 **Next Steps**

1. **Skip test files and utilities** - Focus only on core system files
2. **Fix EventBus.ts** - Resolve duplicate function implementations
3. **Fix core trading engines** - PaperTradingEngine, Orchestrators
4. **Verify system can start** - Test core system initialization
5. **Skip non-essential files** - Leave test/utility files for later


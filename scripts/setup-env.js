#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Trading Orchestration System environment...');

const envContent = `# Trading Orchestration System Environment Variables
# Generated with dummy keys for development

# Data Source API Keys (DUMMY KEYS - Replace with real keys for production)
POLYGON_API_KEY=polygon_dummy_key_12345
TRADIER_API_KEY=tradier_dummy_key_67890
TWELVEDATA_API_KEY=twelvedata_dummy_key_abcdef
FINNHUB_API_KEY=finnhub_dummy_key_ghijkl

# Database Configuration
DATABASE_URL=postgresql://localhost:5432/regimecompass
DB_HOST=localhost
DB_PORT=5432
DB_NAME=regimecompass
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# System Configuration
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Trading System Configuration
TRADING_SYSTEM_ENABLED=true
MAX_CONCURRENT_SIGNALS=10
SIGNAL_CONFIDENCE_THRESHOLD=0.75
UPDATE_FREQUENCY=30000

# Alert Configuration
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Security
JWT_SECRET=your_jwt_secret_key_here_${Math.random().toString(36).substring(2, 15)}
ENCRYPTION_KEY=your_encryption_key_here_${Math.random().toString(36).substring(2, 15)}

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
METRICS_PORT=9090
`;

const envPath = path.join(process.cwd(), '.env.local');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment file created at .env.local');
  console.log('📝 Note: Using dummy API keys for development');
  console.log('🔑 To use real data, replace the dummy keys with actual API keys:');
  console.log('   - POLYGON_API_KEY: Get from https://polygon.io/');
  console.log('   - TRADIER_API_KEY: Get from https://tradier.com/');
  console.log('   - TWELVEDATA_API_KEY: Get from https://twelvedata.com/');
  console.log('   - FINNHUB_API_KEY: Get from https://finnhub.io/');
  console.log('');
  console.log('🚀 You can now run: npm run dev');
} catch (error) {
  console.error('❌ Error creating environment file:', error.message);
  process.exit(1);
}


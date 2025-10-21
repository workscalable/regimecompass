# Regime Compass - Gamma Adaptive Trading System

A comprehensive trading system with advanced signal processing, smart options trading, and real-time performance analytics.

## 🚀 Features

### Core Trading System
- **Multi-Ticker Orchestration**: Simultaneous monitoring of 10+ tickers with intelligent state management
- **Advanced Signal Processing**: Multi-factor confidence scoring with trend, momentum, volume, and technical analysis
- **Smart Options Trading**: Automated strike and expiration selection with Greeks-aware recommendations
- **Paper Trading Engine**: Realistic execution simulation with comprehensive performance tracking

### Performance & Analytics
- **Real-Time Analytics**: Live performance metrics with machine learning feedback loops
- **Risk Management**: Portfolio-level controls with dynamic position sizing and drawdown protection
- **Algorithm Learning**: Continuous improvement through confidence calibration and signal optimization
- **Performance Monitoring**: Sub-200ms tick-to-decision processing with comprehensive metrics

### Infrastructure
- **Next.js Dashboard**: Real-time monitoring interface with multi-ticker visualization
- **Scalable Architecture**: Horizontal scaling with load balancing and auto-scaling capabilities
- **Security**: JWT authentication, data encryption, and comprehensive security monitoring
- **Production Ready**: Docker containerization with zero-downtime deployments

## 📊 System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Gamma Services │    │   Data Pipeline │
│   Dashboard     │◄──►│   (Core Engine)  │◄──►│   (Multi-Source)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Interface│    │   Trading Logic  │    │   Market Data   │
│   - Monitoring  │    │   - Signals      │    │   - Polygon.io  │
│   - Analytics   │    │   - Options      │    │   - Tradier     │
│   - Controls    │    │   - Risk Mgmt    │    │   - CBOE        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, TypeScript, Express
- **Database**: PostgreSQL with Redis caching
- **Testing**: Jest with comprehensive UAT suite
- **Deployment**: Docker, Fly.io
- **Monitoring**: Custom performance analytics with real-time metrics

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm 8+
- PostgreSQL (for production)
- Redis (optional, for caching)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/workscalable/regimecompass.git
cd regimecompass

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev

# Open http://localhost:3000
```

### UAT (User Acceptance Tests)

```bash
# Navigate to gamma services
cd gamma-services

# Install UAT dependencies
npm install

# Verify UAT setup
npm run uat:verify

# Run all UAT tests
npm run uat:verbose

# Run specific workflow
npm run uat:workflow=UAT-1
```

## 🧪 Testing

The system includes comprehensive testing at multiple levels:

### Test Categories
- **Unit Tests**: Component-level testing
- **Integration Tests**: System integration validation
- **UAT Tests**: End-to-end user workflow testing
- **Performance Tests**: Latency and throughput validation

### Running Tests

```bash
# All tests
npm test

# UAT tests (gamma-services)
cd gamma-services
npm run uat

# Specific test categories
npm run test:integration
npm run test:performance
npm run uat:workflow=UAT-2
```

### UAT Workflows
1. **UAT-1**: Multi-Ticker Trading Workflow
2. **UAT-2**: Risk Management and Portfolio Controls
3. **UAT-3**: Real-Time Dashboard and Monitoring
4. **UAT-4**: Algorithm Learning and Adaptation
5. **UAT-5**: System Performance and Scalability

## 🚀 Deployment

### Fly.io Deployment

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login

# Deploy the application
fly deploy

# Set environment variables
fly secrets set DATABASE_URL="your-database-url"
fly secrets set POLYGON_API_KEY="your-polygon-key"
fly secrets set TRADIER_API_KEY="your-tradier-key"
```

### Docker Deployment

```bash
# Build the image
docker build -t regimecompass .

# Run locally
docker run -p 3000:3000 regimecompass

# Or use docker-compose
docker-compose up
```

## 📈 Performance Metrics

The system is designed to meet strict performance requirements:

- **Signal Processing**: <200ms tick-to-decision latency
- **Database Operations**: <100ms response times
- **Concurrent Processing**: 10+ simultaneous tickers
- **Real-time Updates**: <100ms dashboard update latency
- **System Availability**: 99.9% uptime target

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/regimecompass
REDIS_URL=redis://localhost:6379

# API Keys
POLYGON_API_KEY=your_polygon_api_key
TRADIER_API_KEY=your_tradier_api_key
TWELVEDATA_API_KEY=your_twelvedata_api_key

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Performance
MAX_CONCURRENT_TICKERS=10
SIGNAL_PROCESSING_TIMEOUT=200
DATABASE_POOL_SIZE=20
```

### System Configuration

The system uses `gamma-adaptive-config.json` for runtime configuration:

```json
{
  "orchestrator": {
    "maxConcurrentTrades": 3,
    "monitoringInterval": 1000
  },
  "signalProcessing": {
    "confidenceThreshold": 0.6,
    "factorWeights": {
      "trend": 0.25,
      "momentum": 0.20,
      "volume": 0.20,
      "ribbon": 0.15,
      "fibonacci": 0.10,
      "gamma": 0.10
    }
  },
  "riskManagement": {
    "maxPortfolioHeat": 0.20,
    "maxDrawdown": 0.05,
    "positionSizeLimit": 0.02
  }
}
```

## 📚 Documentation

- **[UAT Documentation](gamma-services/tests/uat/README.md)**: Comprehensive testing guide
- **[Installation Guide](gamma-services/INSTALL-UAT.md)**: Step-by-step setup instructions
- **[API Documentation](docs/api.md)**: REST API reference
- **[Architecture Guide](docs/architecture.md)**: System design and components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

```bash
# Set up development environment
npm run dev

# Run tests before committing
npm run test
cd gamma-services && npm run uat

# Lint and format code
npm run lint
npm run format
```

## 📊 System Requirements

### Minimum Requirements
- **CPU**: 2 cores, 2.4GHz
- **Memory**: 4GB RAM
- **Storage**: 10GB available space
- **Network**: Stable internet connection for market data

### Recommended Requirements
- **CPU**: 4+ cores, 3.0GHz+
- **Memory**: 8GB+ RAM
- **Storage**: 50GB+ SSD
- **Network**: Low-latency connection (<50ms to data sources)

## 🔒 Security

- **Authentication**: JWT-based with role-based access control
- **Data Encryption**: AES-256 encryption at rest and TLS in transit
- **API Security**: Rate limiting, input validation, and CORS protection
- **Monitoring**: Real-time security threat detection and alerting

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/workscalable/regimecompass/issues)
- **Documentation**: [Wiki](https://github.com/workscalable/regimecompass/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/workscalable/regimecompass/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Market data provided by Polygon.io, Tradier, and CBOE
- Built with Next.js, TypeScript, and modern web technologies
- Comprehensive testing framework with Jest and custom UAT suite

---

**⚠️ Disclaimer**: This software is for educational and research purposes. Trading involves risk and past performance does not guarantee future results. Always consult with financial professionals before making investment decisions.
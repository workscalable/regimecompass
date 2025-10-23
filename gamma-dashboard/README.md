# Gamma Adaptive System Dashboard

A comprehensive Next.js dashboard for monitoring multi-ticker trading system with real-time state visualization.

## Features

### 🎯 Multi-Ticker State Dashboard
- **Ready-Set-Go Status**: Real-time state visualization for all monitored tickers
- **Confidence Heatmap**: Color-coded confidence indicators across all tickers
- **State Transition History**: Track state changes with timestamps and reasons
- **Performance Metrics**: Real-time price, volume, and signal data

### 📊 Real-Time Monitoring
- **WebSocket Integration**: Live data streaming with automatic reconnection
- **Connection Status**: Visual connection health indicators
- **Auto-refresh**: Configurable automatic data updates
- **Error Handling**: Graceful error recovery and user notifications

### 🔧 System Controls
- **Ticker Management**: Add/remove tickers from monitoring
- **Connection Controls**: Manual connect/disconnect capabilities
- **Settings Panel**: System configuration and preferences
- **Performance Analytics**: System health and performance metrics

## Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Set up environment variables**:
   ```bash
   # Create .env.local file
   NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open the dashboard**:
   Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Architecture

### Components Structure
```
components/
├── TickerStateDashboard.tsx    # Main dashboard component
├── ui/                         # Reusable UI components
│   ├── card.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── progress.tsx
│   └── tabs.tsx
└── ...
```

### Hooks
```
hooks/
└── useRealTimeData.ts          # WebSocket data management
```

### Pages
```
pages/
└── dashboard.tsx               # Main dashboard page
```

## Dashboard Views

### 1. Overview Tab
- System-wide statistics and metrics
- Top performers by confidence
- Alert summaries
- Connection status

### 2. Tickers Tab
- **Grid View**: Card-based ticker display
- **List View**: Compact tabular format
- **Heatmap View**: Confidence-based color visualization
- Detailed ticker information panels

### 3. Performance Tab
- Performance analytics (to be implemented)
- Historical data visualization
- Trading metrics and statistics

### 4. System Tab
- Connection management
- Ticker subscription controls
- System configuration options

## Real-Time Data Integration

### WebSocket Connection
The dashboard connects to a WebSocket server for real-time data:

```typescript
// Production WebSocket URL
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

// Message types supported:
- ticker_update: Real-time ticker data updates
- state_transition: State change notifications
- alert: System alerts and warnings
- ping/pong: Connection heartbeat
```

### Mock Data Mode
For development and testing, the dashboard includes a mock data generator:

```typescript
// Automatically enabled in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
const realTimeData = isDevelopment ? useMockRealTimeData() : useRealTimeData();
```

## Ticker State System

### States
- **READY**: Initial state, monitoring for signals
- **SET**: Conditions met, preparing for action
- **GO**: Active signal, ready for execution
- **HOLD**: Maintaining position
- **EXIT**: Closing position

### Confidence Scoring
- Range: 0.0 to 1.0 (0% to 100%)
- Color coding:
  - 🟢 Green: 80%+ (High confidence)
  - 🟡 Yellow: 60-79% (Medium confidence)
  - 🟠 Orange: 40-59% (Low confidence)
  - 🔴 Red: <40% (Very low confidence)

### Signal Components
- **Trend**: Market trend analysis
- **Momentum**: Price momentum indicators
- **Volume**: Volume profile analysis
- **Ribbon**: Moving average alignment
- **Fibonacci**: Fibonacci level analysis
- **Gamma**: Options gamma exposure

## Customization

### Styling
The dashboard uses Tailwind CSS with a custom design system:
- Modify `tailwind.config.js` for theme customization
- Update `styles/globals.css` for global styles
- Component-specific styles in individual files

### Configuration
- WebSocket URL: `NEXT_PUBLIC_WS_URL`
- Refresh intervals: Configurable in component props
- Ticker lists: Managed through system controls

## Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Adding New Features
1. Create components in `components/` directory
2. Add hooks in `hooks/` directory
3. Update types in component files
4. Add tests for new functionality

## Production Deployment

### Build Process
```bash
npm run build
npm run start
```

### Environment Variables
```bash
NEXT_PUBLIC_WS_URL=wss://your-websocket-server.com/ws
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check WebSocket server is running
   - Verify NEXT_PUBLIC_WS_URL is correct
   - Check firewall/proxy settings

2. **No Data Displayed**
   - Ensure tickers are subscribed
   - Check browser console for errors
   - Verify WebSocket messages are being received

3. **Performance Issues**
   - Reduce update frequency
   - Limit number of monitored tickers
   - Check browser memory usage

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'gamma-dashboard:*');
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the Gamma Adaptive System and follows the same licensing terms.
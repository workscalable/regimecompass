# Gamma Security Monitoring System

A comprehensive security monitoring and protection system for the Gamma Adaptive Trading System, providing real-time threat detection, intrusion prevention, and compliance monitoring.

## Features

### 🛡️ Core Security Components

- **Security Monitor**: Central security event management and threat analysis
- **Rate Limiting**: Configurable request rate limiting with multiple strategies
- **DDoS Protection**: Real-time DDoS attack detection and mitigation
- **Intrusion Detection**: Behavioral analysis and anomaly detection
- **Audit Logging**: Comprehensive audit trail for compliance

### 🔍 Threat Detection

- **Pattern Matching**: SQL injection, XSS, path traversal detection
- **Behavioral Analysis**: User activity anomaly detection
- **Geolocation Analysis**: Impossible travel and suspicious location detection
- **Real-time Monitoring**: Continuous threat assessment and response

### 📊 Compliance & Reporting

- **Audit Trails**: Complete activity logging for compliance
- **Security Reports**: Automated security reporting and analytics
- **Alert Management**: Configurable alerting and escalation
- **Metrics Dashboard**: Real-time security metrics and status

## Quick Start

### Installation

```bash
npm install
```

### Basic Usage

```typescript
import { securityService } from './gamma-services/security';

// Initialize security service
await securityService.initialize();

// Use in Express application
app.use(securityService.getRateLimitMiddleware());
app.use(securityService.getDDoSProtectionMiddleware());
```

### Configuration

```typescript
import { getSecurityConfig, securityPresets } from './gamma-services/security';

// Use default configuration
const config = getSecurityConfig();

// Use preset configuration
const financialConfig = securityPresets.financial;

// Custom configuration
const customConfig = {
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000
  },
  ddosProtection: {
    enabled: true,
    threshold: 100,
    blockDuration: 15 * 60 * 1000
  }
};
```

## Components

### SecurityMonitor

Central security monitoring and event management system.

```typescript
import { SecurityMonitor } from './gamma-services/security';

const monitor = new SecurityMonitor(config.security);
await monitor.initialize();

// Analyze threats
const analysis = await monitor.analyzeThreat(requestData, context);

// Block entities
const blockId = await monitor.blockEntity('IP', '192.168.1.1', 'Suspicious activity');

// Get security metrics
const metrics = monitor.getSecurityMetrics();
```

### RateLimiter

Configurable request rate limiting with multiple strategies.

```typescript
import { RateLimiter, RateLimitPresets } from './gamma-services/security';

// Create rate limiter
const limiter = new RateLimiter(RateLimitPresets.api);

// Use as middleware
app.use(limiter.middleware());

// Create endpoint-specific limiter
const authLimiter = RateLimiter.createStrictLimiter();
app.use('/api/auth', authLimiter.middleware());
```

### DDoSProtection

Real-time DDoS attack detection and mitigation.

```typescript
import { DDoSProtection, DDoSPresets } from './gamma-services/security';

const ddos = new DDoSProtection(DDoSPresets.moderate);

// Use as middleware
app.use(ddos.middleware());

// Check IP status
const status = await ddos.checkIPStatus('192.168.1.1');

// Manual blocking
await ddos.manuallyBlockIP('192.168.1.1', 'Manual block', 3600000);
```

### IntrusionDetection

Behavioral analysis and intrusion detection system.

```typescript
import { IntrusionDetection } from './gamma-services/security';

const ids = new IntrusionDetection(config.intrusionDetection);
await ids.initialize();

// Analyze login attempt
const loginAnalysis = await ids.analyzeLoginAttempt(
  'user123',
  '192.168.1.1',
  'Mozilla/5.0...',
  false,
  'Invalid password'
);

// Analyze user activity
const activityAnalysis = await ids.analyzeUserActivity(
  'user123',
  'GET',
  '/api/sensitive-data',
  '192.168.1.1',
  'Mozilla/5.0...',
  150
);
```

## Configuration Options

### Security Monitor Configuration

```typescript
interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  ddosProtection: {
    enabled: boolean;
    threshold: number;
    windowMs: number;
    blockDuration: number;
    whitelist: string[];
  };
  intrusionDetection: {
    enabled: boolean;
    failedLoginThreshold: number;
    suspiciousActivityThreshold: number;
    timeWindow: number;
    autoBlock: boolean;
    blockDuration: number;
  };
  threatMonitoring: {
    enabled: boolean;
    patterns: ThreatPattern[];
    realTimeAnalysis: boolean;
    alertThresholds: AlertThreshold[];
  };
  incidentResponse: {
    enabled: boolean;
    autoResponse: boolean;
    escalationRules: EscalationRule[];
    notificationChannels: NotificationChannel[];
  };
}
```

### Environment-Specific Configurations

The system supports different configurations for different environments:

- **Development**: Relaxed security for development ease
- **Staging**: Moderate security for testing
- **Production**: Full security for production deployment

```typescript
// Automatically selects based on NODE_ENV
const config = getSecurityConfig();

// Or explicitly select environment
const prodConfig = securityConfigs.production;
```

### Security Presets

Pre-configured security settings for different use cases:

- **Financial**: High security for financial applications
- **Standard**: Balanced security for general applications
- **Relaxed**: Lower security for development/testing

```typescript
import { securityPresets } from './gamma-services/security';

const financialConfig = securityPresets.financial;
const standardConfig = securityPresets.standard;
const relaxedConfig = securityPresets.relaxed;
```

## API Reference

### SecurityService

Main security service that orchestrates all security components.

#### Methods

- `initialize()`: Initialize the security service
- `getRateLimitMiddleware()`: Get rate limiting middleware
- `getDDoSProtectionMiddleware()`: Get DDoS protection middleware
- `analyzeRequest(data, context)`: Analyze request for threats
- `analyzeLoginAttempt(userId, ip, userAgent, success, failureReason)`: Analyze login attempt
- `analyzeUserActivity(userId, action, endpoint, ip, userAgent, duration, dataAccessed)`: Analyze user activity
- `isBlocked(type, value)`: Check if entity is blocked
- `blockEntity(type, value, reason, duration)`: Block an entity
- `unblockEntity(blockId, reason)`: Unblock an entity
- `getSecurityStatus()`: Get current security status
- `getActiveThreats()`: Get active security threats
- `getSecurityAlerts()`: Get security alerts
- `acknowledgeAlert(alertId, acknowledgedBy)`: Acknowledge an alert
- `generateSecurityReport(startDate, endDate)`: Generate security report
- `shutdown()`: Shutdown the security service

#### Events

- `initialized`: Security service initialized
- `securityEvent`: Security event detected
- `entityBlocked`: Entity blocked
- `intrusionDetected`: Intrusion attempt detected
- `alert`: Security alert generated
- `healthCheck`: Health check performed
- `shutdown`: Security service shutdown

### Security Middleware

Utility middleware functions for common security operations.

```typescript
import { SecurityMiddleware } from './gamma-services/security';

// Security headers
app.use(SecurityMiddleware.securityHeaders());

// Secure CORS
app.use(SecurityMiddleware.secureCORS(['https://yourdomain.com']));

// Request sanitization
app.use(SecurityMiddleware.sanitizeRequest());
```

### Security Utils

Utility functions for security operations.

```typescript
import { SecurityUtils } from './gamma-services/security';

// Generate secure token
const token = SecurityUtils.generateSecureToken(32);

// Hash sensitive data
const hash = SecurityUtils.hashSensitiveData('sensitive-data');

// Validate IP address
const isValid = SecurityUtils.isValidIP('192.168.1.1');

// Check password strength
const strength = SecurityUtils.checkPasswordStrength('mypassword');

// Generate CSRF token
const csrfToken = SecurityUtils.generateCSRFToken();
```

## Monitoring and Alerting

### Security Metrics

The system provides comprehensive security metrics:

```typescript
const metrics = securityService.getSecurityStatus();

console.log(metrics);
// {
//   status: 'RUNNING',
//   components: {
//     securityMonitor: 'RUNNING',
//     rateLimiter: 'RUNNING',
//     ddosProtection: 'RUNNING',
//     intrusionDetection: 'RUNNING'
//   },
//   metrics: {
//     totalSecurityEvents: 150,
//     activeThreats: 3,
//     blockedIPs: 5,
//     blockedUsers: 2,
//     rateLimitViolations: 25,
//     intrusionAttempts: 8
//   },
//   lastHealthCheck: '2024-01-15T10:30:00Z',
//   uptime: 3600000
// }
```

### Security Alerts

Security alerts are generated for various events:

```typescript
const alerts = securityService.getSecurityAlerts();

// Acknowledge an alert
await securityService.acknowledgeAlert(alertId, 'admin@company.com');
```

### Security Reports

Generate comprehensive security reports:

```typescript
const report = await securityService.generateSecurityReport(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

console.log(report);
// {
//   period: { start: '2024-01-01', end: '2024-01-31' },
//   summary: {
//     totalEvents: 1250,
//     threatsByType: { 'SQL_INJECTION': 15, 'XSS_ATTEMPT': 8 },
//     threatsBySeverity: { 'HIGH': 23, 'MEDIUM': 45, 'LOW': 67 },
//     blockedEntities: 12,
//     falsePositives: 3
//   },
//   trends: {
//     dailyThreats: [...],
//     topThreats: [...],
//     topBlockedIPs: [...]
//   },
//   recommendations: [...]
// }
```

## Integration Examples

### Express.js Integration

See `examples/express-integration.ts` for a complete example of integrating the security system with an Express.js application.

### Custom Threat Patterns

Define custom threat patterns for your specific use case:

```typescript
const customPattern: ThreatPattern = {
  id: 'custom-threat',
  name: 'Custom Threat Pattern',
  description: 'Detects custom threat patterns',
  pattern: /malicious-pattern/i,
  severity: 'HIGH',
  category: 'SYSTEM',
  enabled: true,
  actions: ['LOG', 'ALERT', 'BLOCK_IP']
};

// Add to configuration
config.security.threatMonitoring.patterns.push(customPattern);
```

### Custom Intrusion Patterns

Define custom intrusion detection patterns:

```typescript
const customIntrusionPattern: IntrusionPattern = {
  id: 'rapid-data-access',
  name: 'Rapid Data Access',
  description: 'Detects rapid access to sensitive data',
  category: 'DATA_ACCESS',
  severity: 'HIGH',
  enabled: true,
  conditions: [
    { field: 'activity.endpoint', operator: 'CONTAINS', value: '/sensitive', weight: 40 },
    { field: 'profile.recentActivities', operator: 'GREATER_THAN', value: 20, weight: 30 }
  ],
  actions: ['LOG', 'ALERT', 'REQUIRE_2FA']
};

// Add to configuration
config.intrusionDetection.patterns.push(customIntrusionPattern);
```

## Best Practices

### 1. Configuration Management

- Use environment-specific configurations
- Validate configurations before deployment
- Regularly review and update security settings

### 2. Monitoring and Alerting

- Set up proper alerting channels
- Monitor security metrics regularly
- Investigate and respond to alerts promptly

### 3. Incident Response

- Have an incident response plan
- Document security incidents
- Learn from security events and improve

### 4. Regular Updates

- Keep threat patterns updated
- Review and update security policies
- Monitor for new security vulnerabilities

### 5. Testing

- Test security configurations in staging
- Perform regular security assessments
- Validate alert and response mechanisms

## Troubleshooting

### Common Issues

1. **High False Positive Rate**
   - Adjust threat pattern sensitivity
   - Review and update whitelist
   - Fine-tune detection thresholds

2. **Performance Impact**
   - Optimize threat pattern complexity
   - Adjust monitoring intervals
   - Use caching for frequent checks

3. **Configuration Errors**
   - Validate configuration before deployment
   - Check environment variables
   - Review log files for errors

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
process.env.DEBUG = 'security:*';
```

### Health Checks

Monitor component health:

```typescript
const status = securityService.getSecurityStatus();
if (status.status !== 'RUNNING') {
  console.error('Security service not running properly:', status);
}
```

## Contributing

1. Follow TypeScript best practices
2. Add comprehensive tests for new features
3. Update documentation for changes
4. Follow security coding guidelines

## License

This security monitoring system is part of the Gamma Adaptive Trading System and follows the same licensing terms.

## Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Contact the development team
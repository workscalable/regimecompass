import express from 'express';
import { 
  securityService, 
  SecurityMiddleware, 
  RateLimitPresets, 
  DDoSPresets 
} from '../index';

/**
 * Example Express application with integrated security monitoring
 */
export async function createSecureExpressApp(): Promise<express.Application> {
  const app = express();

  // Initialize security service
  await securityService.initialize();

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Security headers
  app.use(SecurityMiddleware.securityHeaders());

  // CORS with security considerations
  app.use(SecurityMiddleware.secureCORS(['http://localhost:3000', 'https://yourdomain.com']));

  // Request sanitization
  app.use(SecurityMiddleware.sanitizeRequest());

  // Request timing for rate limiting
  app.use((req, res, next) => {
    (req as any).startTime = Date.now();
    next();
  });

  // DDoS protection (apply globally)
  app.use(securityService.getDDoSProtectionMiddleware());

  // Rate limiting (apply globally with moderate settings)
  app.use(securityService.getRateLimitMiddleware());

  // Security monitoring middleware
  app.use(async (req, res, next) => {
    try {
      // Analyze request for threats
      const requestData = JSON.stringify({
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query
      });

      const analysis = await securityService.analyzeRequest(requestData, {
        ip: req.ip,
        userId: (req as any).user?.id,
        endpoint: req.path,
        userAgent: req.get('User-Agent')
      });

      if (analysis.blocked) {
        return res.status(403).json({
          error: 'Request blocked by security system',
          message: 'Your request has been identified as potentially malicious',
          riskScore: analysis.riskScore
        });
      }

      // Add security context to request
      (req as any).securityContext = {
        riskScore: analysis.riskScore,
        threatDetected: analysis.threatDetected,
        actions: analysis.actions
      };

      next();
    } catch (error) {
      console.error('Security analysis error:', error);
      next(); // Continue on error to avoid breaking the application
    }
  });

  // Authentication middleware example
  app.use('/api/auth', async (req, res, next) => {
    if (req.method === 'POST' && req.path === '/login') {
      // This would be called after authentication attempt
      const { username, success, failureReason } = req.body;
      
      if (username) {
        const analysis = await securityService.analyzeLoginAttempt(
          username,
          req.ip,
          req.get('User-Agent') || '',
          success,
          failureReason
        );

        if (analysis.blocked) {
          return res.status(429).json({
            error: 'Account temporarily blocked',
            message: 'Too many failed login attempts',
            riskScore: analysis.riskScore,
            recommendations: analysis.recommendations
          });
        }

        // Add login analysis to request context
        (req as any).loginAnalysis = analysis;
      }
    }
    next();
  });

  // User activity monitoring middleware
  app.use('/api', async (req, res, next) => {
    const userId = (req as any).user?.id;
    
    if (userId) {
      try {
        const startTime = Date.now();
        
        // Hook into response to measure duration
        const originalSend = res.send;
        res.send = function(body) {
          const duration = Date.now() - startTime;
          
          // Analyze user activity
          securityService.analyzeUserActivity(
            userId,
            req.method,
            req.path,
            req.ip,
            req.get('User-Agent') || '',
            duration,
            req.body ? Object.keys(req.body) : undefined
          ).catch(error => {
            console.error('User activity analysis error:', error);
          });
          
          return originalSend.call(this, body);
        };
      } catch (error) {
        console.error('Activity monitoring error:', error);
      }
    }
    
    next();
  });

  // Routes
  app.get('/api/health', (req, res) => {
    const securityStatus = securityService.getSecurityStatus();
    res.json({
      status: 'healthy',
      security: {
        status: securityStatus.status,
        components: securityStatus.components,
        uptime: securityStatus.uptime
      }
    });
  });

  app.get('/api/security/status', (req, res) => {
    const status = securityService.getSecurityStatus();
    res.json(status);
  });

  app.get('/api/security/threats', (req, res) => {
    const threats = securityService.getActiveThreats();
    res.json(threats);
  });

  app.get('/api/security/alerts', (req, res) => {
    const alerts = securityService.getSecurityAlerts();
    res.json(alerts);
  });

  app.post('/api/security/alerts/:id/acknowledge', async (req, res) => {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;
    
    const success = await securityService.acknowledgeAlert(id, acknowledgedBy);
    
    if (success) {
      res.json({ success: true, message: 'Alert acknowledged' });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  });

  app.post('/api/security/block', async (req, res) => {
    const { type, value, reason, duration } = req.body;
    
    try {
      const blockId = await securityService.blockEntity(type, value, reason, duration);
      res.json({ success: true, blockId });
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to block entity', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete('/api/security/block/:id', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    try {
      const success = await securityService.unblockEntity(id, reason);
      if (success) {
        res.json({ success: true, message: 'Entity unblocked' });
      } else {
        res.status(404).json({ error: 'Block not found' });
      }
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to unblock entity', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/security/report', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    try {
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const report = await securityService.generateSecurityReport(start, end);
      res.json(report);
    } catch (error) {
      res.status(400).json({ 
        error: 'Failed to generate report', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Error handling middleware
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Application error:', error);
    
    // Log security-related errors
    if (error.message.includes('security') || error.message.includes('blocked')) {
      securityService.analyzeRequest(error.stack || error.message, {
        ip: req.ip,
        endpoint: req.path,
        userAgent: req.get('User-Agent')
      }).catch(console.error);
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: 'The requested resource was not found'
    });
  });

  return app;
}

/**
 * Example of how to start the secure Express server
 */
export async function startSecureServer(port: number = 3000): Promise<void> {
  try {
    const app = await createSecureExpressApp();
    
    const server = app.listen(port, () => {
      console.log(`🚀 Secure server running on port ${port}`);
      console.log(`🛡️ Security monitoring active`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🔄 Shutting down server...');
      
      server.close(async () => {
        await securityService.shutdown();
        console.log('✅ Server shutdown complete');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('🔄 Shutting down server...');
      
      server.close(async () => {
        await securityService.shutdown();
        console.log('✅ Server shutdown complete');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start secure server:', error);
    process.exit(1);
  }
}

// Example usage
if (require.main === module) {
  startSecureServer(3000);
}
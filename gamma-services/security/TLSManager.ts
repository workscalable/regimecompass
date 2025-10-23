import * as https from 'https';
import * as http from 'http';
import * as tls from 'tls';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface TLSConfig {
  certificates: {
    cert: string;           // Certificate file path or content
    key: string;            // Private key file path or content
    ca?: string[];          // CA certificates
    passphrase?: string;    // Private key passphrase
  };
  security: {
    minVersion: string;     // Minimum TLS version
    maxVersion?: string;    // Maximum TLS version
    ciphers: string[];      // Allowed cipher suites
    honorCipherOrder: boolean;
    dhparam?: string;       // DH parameters file
  };
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  ocsp: {
    enabled: boolean;
    stapling: boolean;
  };
  clientAuth: {
    enabled: boolean;
    required: boolean;
    ca?: string[];
  };
  monitoring: {
    enabled: boolean;
    logConnections: boolean;
    alertOnWeakCiphers: boolean;
  };
}

export interface TLSMetrics {
  connections: {
    total: number;
    active: number;
    successful: number;
    failed: number;
  };
  certificates: {
    expiryDate: Date;
    daysUntilExpiry: number;
    isValid: boolean;
    issuer: string;
    subject: string;
  };
  security: {
    tlsVersions: Record<string, number>;
    cipherSuites: Record<string, number>;
    weakConnections: number;
  };
  performance: {
    averageHandshakeTime: number;
    totalHandshakeTime: number;
    handshakeCount: number;
  };
}

export interface TLSConnection {
  id: string;
  remoteAddress: string;
  remotePort: number;
  tlsVersion: string;
  cipher: string;
  authorized: boolean;
  authorizationError?: string;
  peerCertificate?: any;
  connectedAt: Date;
  handshakeTime: number;
}

export class TLSManager extends EventEmitter {
  private config: TLSConfig;
  private certificates: {
    cert: Buffer;
    key: Buffer;
    ca?: Buffer[];
  } | null = null;
  private connections: Map<string, TLSConnection> = new Map();
  private metrics: TLSMetrics;
  private monitoringTimer?: NodeJS.Timeout;

  constructor(config: TLSConfig) {
    super();
    this.config = config;
    this.metrics = {
      connections: { total: 0, active: 0, successful: 0, failed: 0 },
      certificates: {
        expiryDate: new Date(),
        daysUntilExpiry: 0,
        isValid: false,
        issuer: '',
        subject: ''
      },
      security: { tlsVersions: {}, cipherSuites: {}, weakConnections: 0 },
      performance: { averageHandshakeTime: 0, totalHandshakeTime: 0, handshakeCount: 0 }
    };
  }

  public async initialize(): Promise<void> {
    console.log('🔒 Initializing TLS Manager...');
    
    try {
      // Load certificates
      await this.loadCertificates();
      
      // Validate certificates
      await this.validateCertificates();
      
      // Set up monitoring
      if (this.config.monitoring.enabled) {
        this.setupMonitoring();
      }
      
      console.log('✅ TLS Manager initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize TLS Manager:', error);
      throw error;
    }
  }

  public createSecureServer(requestHandler?: (req: http.IncomingMessage, res: http.ServerResponse) => void): https.Server {
    if (!this.certificates) {
      throw new Error('Certificates not loaded');
    }

    const options: https.ServerOptions = {
      cert: this.certificates.cert,
      key: this.certificates.key,
      ca: this.certificates.ca,
      passphrase: this.config.certificates.passphrase,
      
      // Security settings
      secureProtocol: 'TLS_method',
      minVersion: this.config.security.minVersion as any,
      maxVersion: this.config.security.maxVersion as any,
      ciphers: this.config.security.ciphers.join(':'),
      honorCipherOrder: this.config.security.honorCipherOrder,
      
      // Client authentication
      requestCert: this.config.clientAuth.enabled,
      rejectUnauthorized: this.config.clientAuth.required,
      
      // OCSP stapling
      ...(this.config.ocsp.enabled && { 
        enableTrace: true 
      })
    };

    // Add DH parameters if provided
    if (this.config.security.dhparam) {
      try {
        options.dhparam = await fs.readFile(this.config.security.dhparam);
      } catch (error) {
        console.warn('⚠️  Failed to load DH parameters:', error);
      }
    }

    const server = https.createServer(options, requestHandler);
    
    // Set up connection monitoring
    this.setupServerMonitoring(server);
    
    return server;
  }

  public createSecureContext(options?: tls.SecureContextOptions): tls.SecureContext {
    if (!this.certificates) {
      throw new Error('Certificates not loaded');
    }

    const contextOptions: tls.SecureContextOptions = {
      cert: this.certificates.cert,
      key: this.certificates.key,
      ca: this.certificates.ca,
      passphrase: this.config.certificates.passphrase,
      ciphers: this.config.security.ciphers.join(':'),
      honorCipherOrder: this.config.security.honorCipherOrder,
      minVersion: this.config.security.minVersion as any,
      maxVersion: this.config.security.maxVersion as any,
      ...options
    };

    return tls.createSecureContext(contextOptions);
  }

  public async makeSecureRequest(
    url: string, 
    options: https.RequestOptions = {}
  ): Promise<{ response: http.IncomingMessage; data: string }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const requestOptions: https.RequestOptions = {
        ...options,
        // Use secure defaults
        secureProtocol: 'TLS_method',
        minVersion: this.config.security.minVersion as any,
        maxVersion: this.config.security.maxVersion as any,
        ciphers: this.config.security.ciphers.join(':'),
        rejectUnauthorized: true,
        checkServerIdentity: tls.checkServerIdentity
      };

      const req = https.request(url, requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const duration = Date.now() - startTime;
          
          // Log secure connection details
          if (this.config.monitoring.logConnections) {
            this.logSecureConnection(req.socket as tls.TLSSocket, duration);
          }
          
          resolve({ response: res, data });
        });
      });

      req.on('error', (error) => {
        this.metrics.connections.failed++;
        this.emit('connectionError', { error, url });
        reject(error);
      });

      req.end();
    });
  }

  public getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // HSTS header
    if (this.config.hsts.enabled) {
      let hstsValue = `max-age=${this.config.hsts.maxAge}`;
      if (this.config.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (this.config.hsts.preload) {
        hstsValue += '; preload';
      }
      headers['Strict-Transport-Security'] = hstsValue;
    }

    // Additional security headers for HTTPS
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'DENY';
    headers['X-XSS-Protection'] = '1; mode=block';
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    
    return headers;
  }

  public getMetrics(): TLSMetrics {
    return { ...this.metrics };
  }

  public getActiveConnections(): TLSConnection[] {
    return Array.from(this.connections.values());
  }

  public async validateCertificateChain(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = { isValid: true, errors: [], warnings: [] };
    
    if (!this.certificates) {
      result.isValid = false;
      result.errors.push('No certificates loaded');
      return result;
    }

    try {
      // Parse certificate
      const cert = crypto.X509Certificate ? 
        new crypto.X509Certificate(this.certificates.cert) :
        this.parseCertificate(this.certificates.cert);

      // Check expiry
      const now = new Date();
      const expiryDate = new Date(cert.validTo || cert.notAfter);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        result.isValid = false;
        result.errors.push('Certificate has expired');
      } else if (daysUntilExpiry < 30) {
        result.warnings.push(`Certificate expires in ${daysUntilExpiry} days`);
      }

      // Update metrics
      this.metrics.certificates = {
        expiryDate,
        daysUntilExpiry,
        isValid: result.isValid,
        issuer: cert.issuer || 'Unknown',
        subject: cert.subject || 'Unknown'
      };

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Certificate validation error: ${(error as Error).message}`);
    }

    return result;
  }

  public async rotateCertificates(newCertPath: string, newKeyPath: string): Promise<void> {
    console.log('🔄 Rotating TLS certificates...');
    
    try {
      // Load new certificates
      const newCert = await fs.readFile(newCertPath);
      const newKey = await fs.readFile(newKeyPath);
      
      // Validate new certificates
      const tempCerts = { cert: newCert, key: newKey };
      await this.validateNewCertificates(tempCerts);
      
      // Update certificates
      this.certificates = {
        cert: newCert,
        key: newKey,
        ca: this.certificates?.ca
      };
      
      // Validate the new certificate chain
      await this.validateCertificateChain();
      
      console.log('✅ TLS certificates rotated successfully');
      this.emit('certificatesRotated', { certPath: newCertPath, keyPath: newKeyPath });
      
    } catch (error) {
      console.error('❌ Certificate rotation failed:', error);
      this.emit('certificateRotationError', { error });
      throw error;
    }
  }

  private async loadCertificates(): Promise<void> {
    try {
      // Load certificate and key
      const cert = await this.loadCertificateFile(this.config.certificates.cert);
      const key = await this.loadCertificateFile(this.config.certificates.key);
      
      // Load CA certificates if provided
      let ca: Buffer[] | undefined;
      if (this.config.certificates.ca) {
        ca = await Promise.all(
          this.config.certificates.ca.map(caPath => this.loadCertificateFile(caPath))
        );
      }
      
      this.certificates = { cert, key, ca };
      
      console.log('📜 TLS certificates loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load certificates:', error);
      throw error;
    }
  }

  private async loadCertificateFile(pathOrContent: string): Promise<Buffer> {
    // Check if it's a file path or direct content
    if (pathOrContent.includes('-----BEGIN')) {
      // Direct certificate content
      return Buffer.from(pathOrContent);
    } else {
      // File path
      return await fs.readFile(pathOrContent);
    }
  }

  private async validateCertificates(): Promise<void> {
    const validation = await this.validateCertificateChain();
    
    if (!validation.isValid) {
      throw new Error(`Certificate validation failed: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️  Certificate warnings:', validation.warnings.join(', '));
    }
  }

  private async validateNewCertificates(certs: { cert: Buffer; key: Buffer }): Promise<void> {
    // Test that the private key matches the certificate
    try {
      const testContext = tls.createSecureContext({
        cert: certs.cert,
        key: certs.key,
        passphrase: this.config.certificates.passphrase
      });
      
      // If we get here, the key and cert are compatible
      console.log('✅ New certificates validated');
      
    } catch (error) {
      throw new Error(`New certificate validation failed: ${(error as Error).message}`);
    }
  }

  private setupServerMonitoring(server: https.Server): void {
    server.on('secureConnection', (tlsSocket: tls.TLSSocket) => {
      const startTime = Date.now();
      
      tlsSocket.on('secure', () => {
        const handshakeTime = Date.now() - startTime;
        this.handleSecureConnection(tlsSocket, handshakeTime);
      });
      
      tlsSocket.on('error', (error) => {
        this.handleConnectionError(tlsSocket, error);
      });
      
      tlsSocket.on('close', () => {
        this.handleConnectionClose(tlsSocket);
      });
    });

    server.on('clientError', (error, socket) => {
      this.metrics.connections.failed++;
      this.emit('clientError', { error, socket });
    });
  }

  private handleSecureConnection(tlsSocket: tls.TLSSocket, handshakeTime: number): void {
    const connectionId = crypto.randomUUID();
    const cipher = tlsSocket.getCipher();
    const peerCert = tlsSocket.getPeerCertificate();
    
    const connection: TLSConnection = {
      id: connectionId,
      remoteAddress: tlsSocket.remoteAddress || 'unknown',
      remotePort: tlsSocket.remotePort || 0,
      tlsVersion: tlsSocket.getProtocol() || 'unknown',
      cipher: cipher ? `${cipher.name}-${cipher.version}` : 'unknown',
      authorized: tlsSocket.authorized,
      authorizationError: tlsSocket.authorizationError?.message,
      peerCertificate: peerCert,
      connectedAt: new Date(),
      handshakeTime
    };

    this.connections.set(connectionId, connection);
    
    // Update metrics
    this.metrics.connections.total++;
    this.metrics.connections.active++;
    this.metrics.connections.successful++;
    
    // Update performance metrics
    this.metrics.performance.handshakeCount++;
    this.metrics.performance.totalHandshakeTime += handshakeTime;
    this.metrics.performance.averageHandshakeTime = 
      this.metrics.performance.totalHandshakeTime / this.metrics.performance.handshakeCount;
    
    // Update security metrics
    const tlsVersion = connection.tlsVersion;
    this.metrics.security.tlsVersions[tlsVersion] = 
      (this.metrics.security.tlsVersions[tlsVersion] || 0) + 1;
    
    const cipherSuite = connection.cipher;
    this.metrics.security.cipherSuites[cipherSuite] = 
      (this.metrics.security.cipherSuites[cipherSuite] || 0) + 1;
    
    // Check for weak connections
    if (this.isWeakConnection(connection)) {
      this.metrics.security.weakConnections++;
      
      if (this.config.monitoring.alertOnWeakCiphers) {
        this.emit('weakConnection', connection);
      }
    }
    
    if (this.config.monitoring.logConnections) {
      console.log(`🔒 Secure connection established: ${connectionId} (${tlsVersion}, ${cipherSuite})`);
    }
    
    this.emit('secureConnection', connection);
  }

  private handleConnectionError(tlsSocket: tls.TLSSocket, error: Error): void {
    this.metrics.connections.failed++;
    
    console.error('❌ TLS connection error:', error.message);
    this.emit('connectionError', { socket: tlsSocket, error });
  }

  private handleConnectionClose(tlsSocket: tls.TLSSocket): void {
    // Find and remove the connection
    for (const [id, connection] of this.connections) {
      if (connection.remoteAddress === tlsSocket.remoteAddress && 
          connection.remotePort === tlsSocket.remotePort) {
        this.connections.delete(id);
        this.metrics.connections.active--;
        
        if (this.config.monitoring.logConnections) {
          console.log(`🔓 Connection closed: ${id}`);
        }
        
        this.emit('connectionClosed', connection);
        break;
      }
    }
  }

  private logSecureConnection(tlsSocket: tls.TLSSocket, duration: number): void {
    const cipher = tlsSocket.getCipher();
    const protocol = tlsSocket.getProtocol();
    
    console.log(`🔒 Secure request completed: ${protocol}, ${cipher?.name}, ${duration}ms`);
  }

  private isWeakConnection(connection: TLSConnection): boolean {
    // Define weak TLS versions
    const weakVersions = ['TLSv1', 'TLSv1.1', 'SSLv3', 'SSLv2'];
    
    // Define weak cipher suites (simplified check)
    const weakCiphers = ['RC4', 'DES', 'MD5', 'NULL'];
    
    // Check TLS version
    if (weakVersions.some(weak => connection.tlsVersion.includes(weak))) {
      return true;
    }
    
    // Check cipher suite
    if (weakCiphers.some(weak => connection.cipher.includes(weak))) {
      return true;
    }
    
    return false;
  }

  private setupMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      // Check certificate expiry
      await this.validateCertificateChain();
      
      // Clean up old connections
      this.cleanupOldConnections();
      
      // Emit metrics
      this.emit('metricsUpdate', this.metrics);
      
    }, 60000); // Every minute
  }

  private cleanupOldConnections(): void {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    
    for (const [id, connection] of this.connections) {
      if (connection.connectedAt < cutoff) {
        this.connections.delete(id);
        this.metrics.connections.active--;
      }
    }
  }

  private parseCertificate(certBuffer: Buffer): any {
    // Fallback certificate parsing for older Node.js versions
    // This is a simplified implementation
    const certString = certBuffer.toString();
    
    // Extract basic information using regex (simplified)
    const subjectMatch = certString.match(/Subject:.*?CN=([^,\n]+)/);
    const issuerMatch = certString.match(/Issuer:.*?CN=([^,\n]+)/);
    const notAfterMatch = certString.match(/Not After\s*:\s*(.+)/);
    
    return {
      subject: subjectMatch ? subjectMatch[1] : 'Unknown',
      issuer: issuerMatch ? issuerMatch[1] : 'Unknown',
      notAfter: notAfterMatch ? notAfterMatch[1] : new Date().toISOString()
    };
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down TLS Manager...');
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    // Close all active connections
    for (const [id, connection] of this.connections) {
      this.connections.delete(id);
    }
    
    console.log('✅ TLS Manager shut down');
  }
}

// Default TLS configuration
export const createDefaultTLSConfig = (): TLSConfig => ({
  certificates: {
    cert: process.env.TLS_CERT_PATH || './certs/server.crt',
    key: process.env.TLS_KEY_PATH || './certs/server.key',
    ca: process.env.TLS_CA_PATH ? [process.env.TLS_CA_PATH] : undefined,
    passphrase: process.env.TLS_KEY_PASSPHRASE
  },
  security: {
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'DHE-RSA-AES128-GCM-SHA256',
      'DHE-RSA-AES256-GCM-SHA384',
      'DHE-RSA-AES128-SHA256',
      'DHE-RSA-AES256-SHA256'
    ],
    honorCipherOrder: true,
    dhparam: process.env.TLS_DH_PARAM_PATH
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  ocsp: {
    enabled: true,
    stapling: true
  },
  clientAuth: {
    enabled: false,
    required: false
  },
  monitoring: {
    enabled: true,
    logConnections: process.env.NODE_ENV !== 'production',
    alertOnWeakCiphers: true
  }
});
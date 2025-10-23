#!/usr/bin/env node

/**
 * RegimeCompass Security Setup Script
 * This script sets up security measures for production deployment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

class SecuritySetup {
  constructor() {
    this.envFile = '.env';
    this.envExampleFile = 'env.example';
  }

  async setup() {
    console.log('🔒 Setting up RegimeCompass security...');
    
    try {
      // Generate secure keys
      await this.generateSecureKeys();
      
      // Validate security configuration
      await this.validateSecurityConfig();
      
      // Create security documentation
      await this.createSecurityDocumentation();
      
      console.log('✅ Security setup completed successfully!');
      console.log('📋 Please review the security documentation and update your .env file');
    } catch (error) {
      console.error('❌ Security setup failed:', error);
      process.exit(1);
    }
  }

  async generateSecureKeys() {
    console.log('🔑 Generating secure keys...');
    
    const keys = {
      JWT_SECRET: this.generateSecureKey(64),
      ENCRYPTION_KEY: this.generateSecureKey(32),
      SESSION_SECRET: this.generateSecureKey(32),
      COOKIE_SECRET: this.generateSecureKey(32),
      API_KEY: this.generateApiKey()
    };

    // Update .env file if it exists
    if (fs.existsSync(this.envFile)) {
      await this.updateEnvFile(keys);
    } else {
      await this.createEnvFile(keys);
    }

    console.log('✅ Secure keys generated');
  }

  async validateSecurityConfig() {
    console.log('🔍 Validating security configuration...');
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];

    const missingVars = [];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Check for weak keys
    if (process.env.JWT_SECRET === 'your-jwt-secret-key') {
      console.warn('⚠️ JWT_SECRET is using default value - please change it');
    }

    if (process.env.ENCRYPTION_KEY === 'your-encryption-key') {
      console.warn('⚠️ ENCRYPTION_KEY is using default value - please change it');
    }

    console.log('✅ Security configuration validated');
  }

  async createSecurityDocumentation() {
    console.log('📄 Creating security documentation...');
    
    const securityDoc = `# RegimeCompass Security Configuration

## Overview
This document outlines the security measures implemented in RegimeCompass.

## Environment Variables

### Required Security Variables
- \`JWT_SECRET\`: Secret key for JWT token signing
- \`ENCRYPTION_KEY\`: Key for encrypting sensitive data
- \`SESSION_SECRET\`: Secret for session management
- \`COOKIE_SECRET\`: Secret for cookie signing
- \`API_KEY\`: API key for external services

### Database Security
- \`SUPABASE_URL\`: Supabase project URL
- \`SUPABASE_ANON_KEY\`: Supabase anonymous key
- \`SUPABASE_SERVICE_ROLE_KEY\`: Supabase service role key

### Rate Limiting
- \`RATE_LIMIT_WINDOW_MS\`: Rate limit window in milliseconds
- \`RATE_LIMIT_MAX\`: Maximum requests per window
- \`API_RATE_LIMIT_MAX\`: API rate limit
- \`AUTH_RATE_LIMIT_MAX\`: Authentication rate limit
- \`TRADING_RATE_LIMIT_MAX\`: Trading rate limit

## Security Features

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Session management
- Token refresh mechanism

### Authorization
- Role-based access control
- Resource-level permissions
- API key validation
- Account ownership validation

### Data Protection
- Encryption at rest and in transit
- Sensitive data encryption
- Secure key management
- Data sanitization

### Audit Logging
- Security event logging
- User action tracking
- API access monitoring
- Suspicious activity detection

### Rate Limiting
- API rate limiting
- Authentication rate limiting
- Trading rate limiting
- IP-based blocking

### Security Headers
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

## Production Security Checklist

### Environment Setup
- [ ] All environment variables are set
- [ ] Secrets are generated and secure
- [ ] Database credentials are configured
- [ ] SSL/TLS is enabled

### Authentication
- [ ] JWT secrets are secure
- [ ] Password policies are enforced
- [ ] Session management is configured
- [ ] Token expiration is set

### Data Protection
- [ ] Encryption keys are secure
- [ ] Sensitive data is encrypted
- [ ] Database connections use SSL
- [ ] API keys are protected

### Monitoring
- [ ] Security logging is enabled
- [ ] Audit trails are configured
- [ ] Monitoring alerts are set up
- [ ] Log retention is configured

### Network Security
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Firewall rules are set
- [ ] DDoS protection is active

## Security Best Practices

### Development
1. Never commit secrets to version control
2. Use environment variables for configuration
3. Implement proper input validation
4. Use secure coding practices

### Production
1. Regular security audits
2. Monitor for suspicious activity
3. Keep dependencies updated
4. Implement proper backup strategies

### Monitoring
1. Set up security alerts
2. Monitor failed login attempts
3. Track API usage patterns
4. Review audit logs regularly

## Incident Response

### Security Incident Procedure
1. Identify the incident
2. Contain the threat
3. Assess the damage
4. Notify stakeholders
5. Document the incident
6. Implement fixes
7. Review and improve

### Contact Information
- Security Team: security@regimecompass.com
- Incident Response: incident@regimecompass.com
- Emergency: +1-XXX-XXX-XXXX

## Compliance

### Data Protection
- GDPR compliance for EU users
- CCPA compliance for California users
- Data retention policies
- Right to be forgotten

### Financial Regulations
- SEC compliance for trading data
- Audit trail requirements
- Risk management reporting
- Regulatory notifications

## Security Updates

### Regular Updates
- Security patches
- Dependency updates
- Configuration reviews
- Penetration testing

### Monitoring
- Security metrics
- Threat intelligence
- Vulnerability assessments
- Compliance audits
`;

    fs.writeFileSync('SECURITY.md', securityDoc);
    console.log('✅ Security documentation created');
  }

  generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateApiKey() {
    const randomPart = crypto.randomBytes(24).toString('hex');
    return `rc_${randomPart}`;
  }

  async updateEnvFile(keys) {
    let envContent = fs.readFileSync(this.envFile, 'utf8');
    
    for (const [key, value] of Object.entries(keys)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }
    
    fs.writeFileSync(this.envFile, envContent);
  }

  async createEnvFile(keys) {
    const envContent = Object.entries(keys)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(this.envFile, envContent);
  }
}

// Run the setup
if (require.main === module) {
  const setup = new SecuritySetup();
  setup.setup();
}

module.exports = SecuritySetup;

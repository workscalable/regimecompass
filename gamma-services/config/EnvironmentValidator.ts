/**
 * Environment Variable Validation Utility
 * Validates required environment variables and provides helpful error messages
 */

import { logger } from '../logging/Logger';

export interface EnvironmentVariable {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';
  description: string;
  defaultValue?: string;
  validValues?: string[];
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  invalid: string[];
  summary: {
    total: number;
    required: number;
    provided: number;
    valid: number;
  };
}

export class EnvironmentValidator {
  private variables: EnvironmentVariable[] = [];

  constructor() {
    this.initializeVariables();
  }

  /**
   * Initialize environment variable definitions
   */
  private initializeVariables(): void {
    this.variables = [
      // Database Configuration
      {
        name: 'DB_HOST',
        required: true,
        type: 'string',
        description: 'Database host address',
        minLength: 1
      },
      {
        name: 'DB_PORT',
        required: false,
        type: 'number',
        description: 'Database port number',
        defaultValue: '5432',
        min: 1,
        max: 65535
      },
      {
        name: 'DB_NAME',
        required: true,
        type: 'string',
        description: 'Database name',
        minLength: 1,
        maxLength: 63
      },
      {
        name: 'DB_USER',
        required: true,
        type: 'string',
        description: 'Database username',
        minLength: 1
      },
      {
        name: 'DB_PASSWORD',
        required: true,
        type: 'string',
        description: 'Database password',
        minLength: 1
      },
      {
        name: 'DB_SSL',
        required: false,
        type: 'boolean',
        description: 'Enable SSL for database connection',
        defaultValue: 'false',
        validValues: ['true', 'false']
      },

      // API Configuration
      {
        name: 'POLYGON_API_KEY',
        required: true,
        type: 'string',
        description: 'Polygon.io API key',
        minLength: 10,
        pattern: /^[A-Za-z0-9_]+$/
      },
      {
        name: 'TRADIER_API_KEY',
        required: true,
        type: 'string',
        description: 'Tradier API key',
        minLength: 10,
        pattern: /^[A-Za-z0-9_]+$/
      },

      // Application Configuration
      {
        name: 'NODE_ENV',
        required: false,
        type: 'string',
        description: 'Application environment',
        defaultValue: 'development',
        validValues: ['development', 'staging', 'production']
      },
      {
        name: 'PORT',
        required: false,
        type: 'number',
        description: 'Application port',
        defaultValue: '3000',
        min: 1,
        max: 65535
      },
      {
        name: 'LOG_LEVEL',
        required: false,
        type: 'string',
        description: 'Logging level',
        defaultValue: 'INFO',
        validValues: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']
      },

      // Trading Configuration
      {
        name: 'DEFAULT_ACCOUNT_BALANCE',
        required: false,
        type: 'number',
        description: 'Default paper trading account balance',
        defaultValue: '100000',
        min: 1000
      },
      {
        name: 'MAX_RISK_PER_TRADE',
        required: false,
        type: 'number',
        description: 'Maximum risk per trade (as decimal)',
        defaultValue: '0.02',
        min: 0.001,
        max: 1.0
      },

      // Email Configuration
      {
        name: 'SMTP_HOST',
        required: false,
        type: 'string',
        description: 'SMTP server host for email alerts'
      },
      {
        name: 'SMTP_PORT',
        required: false,
        type: 'number',
        description: 'SMTP server port',
        defaultValue: '587',
        min: 1,
        max: 65535
      },
      {
        name: 'SMTP_USER',
        required: false,
        type: 'string',
        description: 'SMTP username'
      },
      {
        name: 'SMTP_PASS',
        required: false,
        type: 'string',
        description: 'SMTP password'
      },
      {
        name: 'ALERT_EMAIL_1',
        required: false,
        type: 'email',
        description: 'Primary alert email recipient'
      },
      {
        name: 'ALERT_EMAIL_2',
        required: false,
        type: 'email',
        description: 'Secondary alert email recipient'
      },

      // Slack Configuration
      {
        name: 'SLACK_WEBHOOK_URL',
        required: false,
        type: 'url',
        description: 'Slack webhook URL for alerts'
      },

      // Webhook Configuration
      {
        name: 'ALERT_WEBHOOK_URL',
        required: false,
        type: 'url',
        description: 'Custom webhook URL for alerts'
      },
      {
        name: 'ALERT_WEBHOOK_TOKEN',
        required: false,
        type: 'string',
        description: 'Authentication token for alert webhook'
      },

      // Logging Configuration
      {
        name: 'LOG_ENDPOINT',
        required: false,
        type: 'url',
        description: 'Remote logging endpoint'
      },
      {
        name: 'LOG_API_KEY',
        required: false,
        type: 'string',
        description: 'API key for remote logging service'
      },

      // Security Configuration
      {
        name: 'JWT_SECRET',
        required: false,
        type: 'string',
        description: 'JWT signing secret',
        minLength: 32
      },
      {
        name: 'ENCRYPTION_KEY',
        required: false,
        type: 'string',
        description: 'Data encryption key',
        minLength: 32
      }
    ];
  }

  /**
   * Validate all environment variables
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missing: string[] = [];
    const invalid: string[] = [];

    let provided = 0;
    let valid = 0;
    const required = this.variables.filter(v => v.required).length;

    for (const variable of this.variables) {
      const value = process.env[variable.name];
      
      if (value !== undefined) {
        provided++;
      }

      // Check if required variable is missing
      if (variable.required && !value) {
        missing.push(variable.name);
        errors.push(`Missing required environment variable: ${variable.name} - ${variable.description}`);
        continue;
      }

      // Skip validation for optional missing variables
      if (!value) {
        if (variable.defaultValue) {
          warnings.push(`Using default value for ${variable.name}: ${variable.defaultValue}`);
        }
        continue;
      }

      // Validate the value
      const validationError = this.validateValue(variable, value);
      if (validationError) {
        invalid.push(variable.name);
        errors.push(`Invalid value for ${variable.name}: ${validationError}`);
      } else {
        valid++;
      }
    }

    // Check for conditional requirements
    this.validateConditionalRequirements(errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missing,
      invalid,
      summary: {
        total: this.variables.length,
        required,
        provided,
        valid
      }
    };
  }

  /**
   * Validate a single environment variable value
   */
  private validateValue(variable: EnvironmentVariable, value: string): string | null {
    // Type validation
    switch (variable.type) {
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          return `Expected number, got: ${value}`;
        }
        if (variable.min !== undefined && num < variable.min) {
          return `Value ${num} is below minimum ${variable.min}`;
        }
        if (variable.max !== undefined && num > variable.max) {
          return `Value ${num} is above maximum ${variable.max}`;
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          return `Expected boolean (true/false), got: ${value}`;
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return `Invalid URL format: ${value}`;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `Invalid email format: ${value}`;
        }
        break;

      case 'json':
        try {
          JSON.parse(value);
        } catch {
          return `Invalid JSON format: ${value}`;
        }
        break;
    }

    // Length validation
    if (variable.minLength !== undefined && value.length < variable.minLength) {
      return `Value too short (minimum ${variable.minLength} characters)`;
    }
    if (variable.maxLength !== undefined && value.length > variable.maxLength) {
      return `Value too long (maximum ${variable.maxLength} characters)`;
    }

    // Pattern validation
    if (variable.pattern && !variable.pattern.test(value)) {
      return `Value does not match required pattern`;
    }

    // Valid values validation
    if (variable.validValues && !variable.validValues.includes(value)) {
      return `Invalid value. Must be one of: ${variable.validValues.join(', ')}`;
    }

    return null;
  }

  /**
   * Validate conditional requirements
   */
  private validateConditionalRequirements(errors: string[], warnings: string[]): void {
    // Email configuration dependencies
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && (!smtpUser || !smtpPass)) {
      errors.push('SMTP_USER and SMTP_PASS are required when SMTP_HOST is provided');
    }

    // Webhook authentication
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    const webhookToken = process.env.ALERT_WEBHOOK_TOKEN;

    if (webhookUrl && !webhookToken) {
      warnings.push('ALERT_WEBHOOK_TOKEN is recommended when ALERT_WEBHOOK_URL is provided');
    }

    // Remote logging dependencies
    const logEndpoint = process.env.LOG_ENDPOINT;
    const logApiKey = process.env.LOG_API_KEY;

    if (logEndpoint && !logApiKey) {
      errors.push('LOG_API_KEY is required when LOG_ENDPOINT is provided');
    }

    // Production environment checks
    if (process.env.NODE_ENV === 'production') {
      const productionRequired = [
        'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'POLYGON_API_KEY', 'TRADIER_API_KEY'
      ];

      for (const varName of productionRequired) {
        if (!process.env[varName]) {
          errors.push(`${varName} is required in production environment`);
        }
      }

      // Security recommendations for production
      if (!process.env.JWT_SECRET) {
        warnings.push('JWT_SECRET is recommended for production environment');
      }
      if (!process.env.ENCRYPTION_KEY) {
        warnings.push('ENCRYPTION_KEY is recommended for production environment');
      }
    }
  }

  /**
   * Get environment variable documentation
   */
  getDocumentation(): string {
    let doc = '# Environment Variables\n\n';
    doc += 'This document describes all environment variables used by the Paper Trading System.\n\n';

    const categories = {
      'Database': this.variables.filter(v => v.name.startsWith('DB_')),
      'APIs': this.variables.filter(v => v.name.includes('API_KEY')),
      'Application': this.variables.filter(v => ['NODE_ENV', 'PORT', 'LOG_LEVEL'].includes(v.name)),
      'Trading': this.variables.filter(v => v.name.startsWith('DEFAULT_') || v.name.startsWith('MAX_')),
      'Email': this.variables.filter(v => v.name.startsWith('SMTP_') || v.name.startsWith('ALERT_EMAIL')),
      'Slack': this.variables.filter(v => v.name.includes('SLACK')),
      'Webhooks': this.variables.filter(v => v.name.includes('WEBHOOK')),
      'Logging': this.variables.filter(v => v.name.startsWith('LOG_')),
      'Security': this.variables.filter(v => v.name.includes('SECRET') || v.name.includes('ENCRYPTION'))
    };

    for (const [category, vars] of Object.entries(categories)) {
      if (vars.length === 0) continue;

      doc += `## ${category}\n\n`;
      
      for (const variable of vars) {
        doc += `### ${variable.name}\n`;
        doc += `- **Description**: ${variable.description}\n`;
        doc += `- **Required**: ${variable.required ? 'Yes' : 'No'}\n`;
        doc += `- **Type**: ${variable.type}\n`;
        
        if (variable.defaultValue) {
          doc += `- **Default**: ${variable.defaultValue}\n`;
        }
        
        if (variable.validValues) {
          doc += `- **Valid Values**: ${variable.validValues.join(', ')}\n`;
        }
        
        if (variable.minLength || variable.maxLength) {
          doc += `- **Length**: ${variable.minLength || 0} - ${variable.maxLength || 'unlimited'} characters\n`;
        }
        
        if (variable.min !== undefined || variable.max !== undefined) {
          doc += `- **Range**: ${variable.min || 'unlimited'} - ${variable.max || 'unlimited'}\n`;
        }
        
        doc += '\n';
      }
    }

    doc += '## Example .env File\n\n';
    doc += '```bash\n';
    
    for (const variable of this.variables.filter(v => v.required)) {
      doc += `${variable.name}=${variable.defaultValue || 'your_value_here'}\n`;
    }
    
    doc += '\n# Optional variables\n';
    
    for (const variable of this.variables.filter(v => !v.required && v.defaultValue)) {
      doc += `# ${variable.name}=${variable.defaultValue}\n`;
    }
    
    doc += '```\n';

    return doc;
  }

  /**
   * Generate .env template file
   */
  generateEnvTemplate(): string {
    let template = '# Paper Trading System Environment Variables\n';
    template += '# Copy this file to .env and fill in your values\n\n';

    const categories = {
      'Database Configuration': this.variables.filter(v => v.name.startsWith('DB_')),
      'API Keys': this.variables.filter(v => v.name.includes('API_KEY')),
      'Application Settings': this.variables.filter(v => ['NODE_ENV', 'PORT', 'LOG_LEVEL'].includes(v.name)),
      'Trading Configuration': this.variables.filter(v => v.name.startsWith('DEFAULT_') || v.name.startsWith('MAX_')),
      'Email Configuration': this.variables.filter(v => v.name.startsWith('SMTP_') || v.name.startsWith('ALERT_EMAIL')),
      'Slack Integration': this.variables.filter(v => v.name.includes('SLACK')),
      'Webhook Configuration': this.variables.filter(v => v.name.includes('WEBHOOK')),
      'Logging Configuration': this.variables.filter(v => v.name.startsWith('LOG_')),
      'Security Configuration': this.variables.filter(v => v.name.includes('SECRET') || v.name.includes('ENCRYPTION'))
    };

    for (const [category, vars] of Object.entries(categories)) {
      if (vars.length === 0) continue;

      template += `\n# ${category}\n`;
      
      for (const variable of vars) {
        template += `# ${variable.description}\n`;
        
        if (variable.required) {
          template += `${variable.name}=${variable.defaultValue || ''}\n`;
        } else {
          template += `# ${variable.name}=${variable.defaultValue || ''}\n`;
        }
        
        template += '\n';
      }
    }

    return template;
  }

  /**
   * Validate and log results
   */
  async validateAndLog(): Promise<ValidationResult> {
    const result = this.validate();

    if (result.valid) {
      await logger.info('SYSTEM', 'Environment validation passed', {
        metadata: {
          provided: result.summary.provided,
          valid: result.summary.valid,
          warnings: result.warnings.length
        }
      });
    } else {
      await logger.error('SYSTEM', 'Environment validation failed', {
        metadata: {
          errors: result.errors.length,
          missing: result.missing.length,
          invalid: result.invalid.length
        }
      });
    }

    // Log warnings
    for (const warning of result.warnings) {
      await logger.warn('SYSTEM', `Environment warning: ${warning}`);
    }

    // Log errors
    for (const error of result.errors) {
      await logger.error('SYSTEM', `Environment error: ${error}`);
    }

    return result;
  }

  /**
   * Get variable definition by name
   */
  getVariable(name: string): EnvironmentVariable | undefined {
    return this.variables.find(v => v.name === name);
  }

  /**
   * Get all variable definitions
   */
  getAllVariables(): EnvironmentVariable[] {
    return [...this.variables];
  }

  /**
   * Check if all required variables are present
   */
  hasRequiredVariables(): boolean {
    const required = this.variables.filter(v => v.required);
    return required.every(v => process.env[v.name]);
  }
}

// Export singleton instance
export const environmentValidator = new EnvironmentValidator();
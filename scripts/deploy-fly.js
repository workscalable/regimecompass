#!/usr/bin/env node

/**
 * Fly.io Deployment Script for RegimeCompass
 * This script handles the Fly.io deployment process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class FlyDeployment {
  constructor() {
    this.appName = 'regimecompass';
    this.region = 'ord';
  }

  async deploy() {
    console.log('🚀 Starting Fly.io deployment for RegimeCompass...');
    
    try {
      // Check if fly CLI is installed
      await this.checkFlyCLI();
      
      // Check if app exists
      const appExists = await this.checkAppExists();
      
      if (!appExists) {
        console.log('📱 Creating new Fly.io app...');
        await this.createApp();
      } else {
        console.log('✅ App already exists, proceeding with deployment...');
      }
      
      // Deploy the application
      console.log('🚀 Deploying application...');
      await this.deployApp();
      
      console.log('✅ Deployment completed successfully!');
      console.log(`🌐 Your app is available at: https://${this.appName}.fly.dev`);
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }

  async checkFlyCLI() {
    try {
      execSync('fly version', { stdio: 'pipe' });
      console.log('✅ Fly CLI is installed');
    } catch (error) {
      throw new Error('Fly CLI is not installed. Please install it from https://fly.io/docs/hands-on/install-flyctl/');
    }
  }

  async checkAppExists() {
    try {
      execSync(`fly apps list --json`, { stdio: 'pipe' });
      const output = execSync(`fly apps list --json`, { encoding: 'utf8' });
      const apps = JSON.parse(output);
      return apps.some(app => app.Name === this.appName);
    } catch (error) {
      return false;
    }
  }

  async createApp() {
    try {
      execSync(`fly apps create ${this.appName} --region ${this.region}`, { stdio: 'inherit' });
      console.log('✅ App created successfully');
    } catch (error) {
      throw new Error(`Failed to create app: ${error.message}`);
    }
  }

  async deployApp() {
    try {
      execSync('fly deploy', { stdio: 'inherit' });
      console.log('✅ App deployed successfully');
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  async setSecrets() {
    console.log('🔐 Setting up secrets...');
    
    const secrets = {
      'NODE_ENV': 'production',
      'PORT': '3000'
    };
    
    for (const [key, value] of Object.entries(secrets)) {
      try {
        execSync(`fly secrets set ${key}="${value}"`, { stdio: 'pipe' });
        console.log(`✅ Set ${key}`);
      } catch (error) {
        console.warn(`⚠️ Failed to set ${key}: ${error.message}`);
      }
    }
  }

  async checkStatus() {
    try {
      console.log('📊 Checking app status...');
      execSync('fly status', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Could not check status:', error.message);
    }
  }

  async viewLogs() {
    try {
      console.log('📋 Viewing recent logs...');
      execSync('fly logs --since 5m', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Could not view logs:', error.message);
    }
  }
}

// CLI interface
if (require.main === module) {
  const deployment = new FlyDeployment();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      deployment.deploy();
      break;
      
    case 'secrets':
      deployment.setSecrets();
      break;
      
    case 'status':
      deployment.checkStatus();
      break;
      
    case 'logs':
      deployment.viewLogs();
      break;
      
    default:
      console.log('Usage: node scripts/deploy-fly.js [deploy|secrets|status|logs]');
      console.log('  deploy  - Deploy the application to Fly.io');
      console.log('  secrets - Set up environment secrets');
      console.log('  status  - Check application status');
      console.log('  logs    - View application logs');
      break;
  }
}

module.exports = FlyDeployment;

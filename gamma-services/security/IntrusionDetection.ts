import { EventEmitter } from 'events';
import { SecurityMonitor, SecurityEvent } from './SecurityMonitor';
import { auditLogger } from '../logging/AuditLogger';

export interface IntrusionConfig {
  enabled: boolean;
  failedLoginThreshold: number;
  suspiciousActivityThreshold: number;
  timeWindow: number;
  autoBlock: boolean;
  blockDuration: number;
  patterns: IntrusionPattern[];
  behaviorAnalysis: {
    enabled: boolean;
    baselineWindow: number;
    anomalyThreshold: number;
    trackingMetrics: string[];
  };
  geolocationAnalysis: {
    enabled: boolean;
    impossibleTravelThreshold: number; // km/h
    suspiciousCountries: string[];
  };
}

export interface IntrusionPattern {
  id: string;
  name: string;
  description: string;
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'BEHAVIORAL' | 'NETWORK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  conditions: PatternCondition[];
  actions: string[];
}

export interface PatternCondition {
  field: string;
  operator: 'EQUALS' | 'CONTAINS' | 'REGEX' | 'GREATER_THAN' | 'LESS_THAN' | 'IN_RANGE';
  value: any;
  weight: number;
}

export interface UserBehaviorProfile {
  userId: string;
  baseline: {
    loginTimes: number[];
    locations: string[];
    userAgents: string[];
    endpoints: string[];
    requestFrequency: number;
    sessionDuration: number;
  };
  recent: {
    loginAttempts: LoginAttempt[];
    activities: UserActivity[];
    anomalies: BehaviorAnomaly[];
  };
  riskScore: number;
  lastUpdated: Date;
}

export interface LoginAttempt {
  timestamp: Date;
  ip: string;
  userAgent: string;
  location?: GeoLocation;
  success: boolean;
  failureReason?: string;
}

export interface UserActivity {
  timestamp: Date;
  action: string;
  endpoint: string;
  ip: string;
  userAgent: string;
  duration: number;
  dataAccessed?: string[];
}

export interface BehaviorAnomaly {
  id: string;
  timestamp: Date;
  type: 'TIME_ANOMALY' | 'LOCATION_ANOMALY' | 'FREQUENCY_ANOMALY' | 'PATTERN_ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: any;
  riskScore: number;
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface IntrusionEvent {
  id: string;
  timestamp: Date;
  type: 'FAILED_LOGIN_SERIES' | 'SUSPICIOUS_BEHAVIOR' | 'PATTERN_MATCH' | 'ANOMALY_DETECTED';
  userId?: string;
  ip: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: any;
  riskScore: number;
  actions: string[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
}

export class IntrusionDetection extends EventEmitter {
  private config: IntrusionConfig;
  private securityMonitor?: SecurityMonitor;
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private intrusionEvents: Map<string, IntrusionEvent> = new Map();
  private patterns: Map<string, IntrusionPattern> = new Map();
  private analysisTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: IntrusionConfig, securityMonitor?: SecurityMonitor) {
    super();
    this.config = config;
    this.securityMonitor = securityMonitor;
    
    this.initializePatterns();
    
    if (config.enabled) {
      this.startAnalysis();
      this.startCleanup();
    }
  }

  public async initialize(): Promise<void> {
    console.log('🔍 Initializing Intrusion Detection...');
    
    try {
      // Load patterns
      this.loadPatterns();
      
      // Initialize behavior analysis
      if (this.config.behaviorAnalysis.enabled) {
        await this.initializeBehaviorAnalysis();
      }
      
      console.log('✅ Intrusion Detection initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Intrusion Detection:', error);
      throw error;
    }
  }

  public async analyzeLoginAttempt(
    userId: string,
    ip: string,
    userAgent: string,
    success: boolean,
    failureReason?: string,
    location?: GeoLocation
  ): Promise<IntrusionAnalysisResult> {
    const loginAttempt: LoginAttempt = {
      timestamp: new Date(),
      ip,
      userAgent,
      location,
      success,
      failureReason
    };

    // Get or create user profile
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createUserProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    // Add login attempt to profile
    profile.recent.loginAttempts.push(loginAttempt);
    
    // Keep only recent attempts (within time window)
    const cutoff = new Date(Date.now() - this.config.timeWindow);
    profile.recent.loginAttempts = profile.recent.loginAttempts
      .filter(attempt => attempt.timestamp >= cutoff);

    let riskScore = 0;
    const anomalies: BehaviorAnomaly[] = [];
    const threats: string[] = [];

    // Analyze failed login attempts
    if (!success) {
      const recentFailures = profile.recent.loginAttempts
        .filter(attempt => !attempt.success && attempt.timestamp >= cutoff);
      
      if (recentFailures.length >= this.config.failedLoginThreshold) {
        riskScore += 60;
        threats.push('EXCESSIVE_FAILED_LOGINS');
        
        await this.createIntrusionEvent(
          'FAILED_LOGIN_SERIES',
          userId,
          ip,
          'HIGH',
          `${recentFailures.length} failed login attempts in ${this.config.timeWindow / 1000} seconds`,
          { failedAttempts: recentFailures.length, threshold: this.config.failedLoginThreshold },
          80
        );
      }
    }

    // Analyze geolocation anomalies
    if (this.config.geolocationAnalysis.enabled && location) {
      const locationAnomaly = await this.analyzeLocationAnomaly(profile, location);
      if (locationAnomaly) {
        anomalies.push(locationAnomaly);
        riskScore += locationAnomaly.riskScore;
        threats.push('LOCATION_ANOMALY');
      }
    }

    // Analyze time-based anomalies
    const timeAnomaly = this.analyzeTimeAnomaly(profile, loginAttempt.timestamp);
    if (timeAnomaly) {
      anomalies.push(timeAnomaly);
      riskScore += timeAnomaly.riskScore;
      threats.push('TIME_ANOMALY');
    }

    // Analyze user agent anomalies
    const userAgentAnomaly = this.analyzeUserAgentAnomaly(profile, userAgent);
    if (userAgentAnomaly) {
      anomalies.push(userAgentAnomaly);
      riskScore += userAgentAnomaly.riskScore;
      threats.push('USER_AGENT_ANOMALY');
    }

    // Update profile
    profile.recent.anomalies.push(...anomalies);
    profile.riskScore = Math.min(100, riskScore);
    profile.lastUpdated = new Date();

    // Log login attempt
    await auditLogger.logEvent(
      success ? 'USER_LOGIN' : 'USER_LOGIN',
      'authentication',
      'login_attempt',
      {
        userId,
        success,
        failureReason,
        ip,
        userAgent,
        location,
        riskScore,
        threats
      },
      success ? 'SUCCESS' : 'FAILURE',
      {
        userId,
        component: 'IntrusionDetection',
        metadata: { ipAddress: ip, userAgent }
      },
      failureReason
    );

    return {
      riskScore,
      threats,
      anomalies,
      blocked: riskScore >= 80 && this.config.autoBlock,
      recommendations: this.generateRecommendations(riskScore, threats)
    };
  }

  public async analyzeUserActivity(
    userId: string,
    action: string,
    endpoint: string,
    ip: string,
    userAgent: string,
    duration: number,
    dataAccessed?: string[]
  ): Promise<IntrusionAnalysisResult> {
    const activity: UserActivity = {
      timestamp: new Date(),
      action,
      endpoint,
      ip,
      userAgent,
      duration,
      dataAccessed
    };

    // Get user profile
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createUserProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    // Add activity to profile
    profile.recent.activities.push(activity);
    
    // Keep only recent activities
    const cutoff = new Date(Date.now() - this.config.timeWindow);
    profile.recent.activities = profile.recent.activities
      .filter(act => act.timestamp >= cutoff);

    let riskScore = 0;
    const anomalies: BehaviorAnomaly[] = [];
    const threats: string[] = [];

    // Analyze activity frequency
    const recentActivities = profile.recent.activities
      .filter(act => act.timestamp >= cutoff);
    
    if (recentActivities.length >= this.config.suspiciousActivityThreshold) {
      riskScore += 40;
      threats.push('HIGH_ACTIVITY_FREQUENCY');
      
      await this.createIntrusionEvent(
        'SUSPICIOUS_BEHAVIOR',
        userId,
        ip,
        'MEDIUM',
        `${recentActivities.length} activities in ${this.config.timeWindow / 1000} seconds`,
        { activityCount: recentActivities.length, threshold: this.config.suspiciousActivityThreshold },
        60
      );
    }

    // Analyze data access patterns
    if (dataAccessed && dataAccessed.length > 0) {
      const dataAccessAnomaly = this.analyzeDataAccessAnomaly(profile, dataAccessed);
      if (dataAccessAnomaly) {
        anomalies.push(dataAccessAnomaly);
        riskScore += dataAccessAnomaly.riskScore;
        threats.push('DATA_ACCESS_ANOMALY');
      }
    }

    // Check against intrusion patterns
    const patternMatches = await this.checkIntrusionPatterns(activity, profile);
    for (const match of patternMatches) {
      riskScore += match.riskScore;
      threats.push(match.patternId);
      
      await this.createIntrusionEvent(
        'PATTERN_MATCH',
        userId,
        ip,
        match.severity,
        `Pattern match: ${match.name}`,
        { pattern: match, activity },
        match.riskScore
      );
    }

    // Update profile
    profile.recent.anomalies.push(...anomalies);
    profile.riskScore = Math.min(100, Math.max(profile.riskScore, riskScore));
    profile.lastUpdated = new Date();

    return {
      riskScore,
      threats,
      anomalies,
      blocked: riskScore >= 80 && this.config.autoBlock,
      recommendations: this.generateRecommendations(riskScore, threats)
    };
  }

  private async analyzeLocationAnomaly(
    profile: UserBehaviorProfile,
    location: GeoLocation
  ): Promise<BehaviorAnomaly | null> {
    // Check for impossible travel
    const recentLogins = profile.recent.loginAttempts
      .filter(attempt => attempt.location && attempt.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (recentLogins.length > 0) {
      const lastLogin = recentLogins[0];
      if (lastLogin.location) {
        const distance = this.calculateDistance(lastLogin.location, location);
        const timeDiff = (Date.now() - lastLogin.timestamp.getTime()) / (1000 * 60 * 60); // hours
        const speed = distance / timeDiff; // km/h

        if (speed > this.config.geolocationAnalysis.impossibleTravelThreshold) {
          return {
            id: `location-${Date.now()}`,
            timestamp: new Date(),
            type: 'LOCATION_ANOMALY',
            severity: 'HIGH',
            description: `Impossible travel detected: ${distance.toFixed(0)}km in ${timeDiff.toFixed(1)} hours (${speed.toFixed(0)} km/h)`,
            evidence: { distance, timeDiff, speed, from: lastLogin.location, to: location },
            riskScore: 70
          };
        }
      }
    }

    // Check for suspicious countries
    if (this.config.geolocationAnalysis.suspiciousCountries.includes(location.country)) {
      return {
        id: `country-${Date.now()}`,
        timestamp: new Date(),
        type: 'LOCATION_ANOMALY',
        severity: 'MEDIUM',
        description: `Login from suspicious country: ${location.country}`,
        evidence: { location },
        riskScore: 40
      };
    }

    return null;
  }

  private analyzeTimeAnomaly(
    profile: UserBehaviorProfile,
    timestamp: Date
  ): BehaviorAnomaly | null {
    const hour = timestamp.getHours();
    const normalHours = profile.baseline.loginTimes;

    if (normalHours.length > 0) {
      const isNormalTime = normalHours.some(normalHour => 
        Math.abs(hour - normalHour) <= 2 || Math.abs(hour - normalHour) >= 22
      );

      if (!isNormalTime) {
        return {
          id: `time-${Date.now()}`,
          timestamp: new Date(),
          type: 'TIME_ANOMALY',
          severity: 'LOW',
          description: `Login at unusual time: ${hour}:00 (normal times: ${normalHours.join(', ')})`,
          evidence: { hour, normalHours },
          riskScore: 20
        };
      }
    }

    return null;
  }

  private analyzeUserAgentAnomaly(
    profile: UserBehaviorProfile,
    userAgent: string
  ): BehaviorAnomaly | null {
    const knownUserAgents = profile.baseline.userAgents;

    if (knownUserAgents.length > 0 && !knownUserAgents.includes(userAgent)) {
      return {
        id: `useragent-${Date.now()}`,
        timestamp: new Date(),
        type: 'PATTERN_ANOMALY',
        severity: 'LOW',
        description: `New user agent detected: ${userAgent.substring(0, 50)}...`,
        evidence: { userAgent, knownUserAgents },
        riskScore: 15
      };
    }

    return null;
  }

  private analyzeDataAccessAnomaly(
    profile: UserBehaviorProfile,
    dataAccessed: string[]
  ): BehaviorAnomaly | null {
    // Check for unusual data access patterns
    const sensitiveData = dataAccessed.filter(data => 
      data.includes('password') || 
      data.includes('token') || 
      data.includes('key') ||
      data.includes('secret')
    );

    if (sensitiveData.length > 0) {
      return {
        id: `dataaccess-${Date.now()}`,
        timestamp: new Date(),
        type: 'PATTERN_ANOMALY',
        severity: 'HIGH',
        description: `Access to sensitive data: ${sensitiveData.join(', ')}`,
        evidence: { sensitiveData, allData: dataAccessed },
        riskScore: 60
      };
    }

    return null;
  }

  private async checkIntrusionPatterns(
    activity: UserActivity,
    profile: UserBehaviorProfile
  ): Promise<Array<{ patternId: string; name: string; severity: string; riskScore: number }>> {
    const matches: Array<{ patternId: string; name: string; severity: string; riskScore: number }> = [];

    for (const pattern of this.patterns.values()) {
      if (!pattern.enabled) continue;

      let score = 0;
      let conditionsMet = 0;

      for (const condition of pattern.conditions) {
        if (this.evaluateCondition(condition, activity, profile)) {
          score += condition.weight;
          conditionsMet++;
        }
      }

      // Pattern matches if at least 70% of conditions are met
      if (conditionsMet / pattern.conditions.length >= 0.7) {
        matches.push({
          patternId: pattern.id,
          name: pattern.name,
          severity: pattern.severity,
          riskScore: this.calculatePatternRiskScore(pattern.severity, score)
        });
      }
    }

    return matches;
  }

  private evaluateCondition(
    condition: PatternCondition,
    activity: UserActivity,
    profile: UserBehaviorProfile
  ): boolean {
    const value = this.getFieldValue(condition.field, activity, profile);
    
    switch (condition.operator) {
      case 'EQUALS':
        return value === condition.value;
      case 'CONTAINS':
        return String(value).includes(String(condition.value));
      case 'REGEX':
        return new RegExp(condition.value).test(String(value));
      case 'GREATER_THAN':
        return Number(value) > Number(condition.value);
      case 'LESS_THAN':
        return Number(value) < Number(condition.value);
      case 'IN_RANGE':
        const [min, max] = condition.value;
        return Number(value) >= min && Number(value) <= max;
      default:
        return false;
    }
  }

  private getFieldValue(field: string, activity: UserActivity, profile: UserBehaviorProfile): any {
    switch (field) {
      case 'activity.action':
        return activity.action;
      case 'activity.endpoint':
        return activity.endpoint;
      case 'activity.duration':
        return activity.duration;
      case 'profile.riskScore':
        return profile.riskScore;
      case 'profile.recentActivities':
        return profile.recent.activities.length;
      default:
        return null;
    }
  }

  private calculatePatternRiskScore(severity: string, conditionScore: number): number {
    const baseScore = {
      'LOW': 20,
      'MEDIUM': 40,
      'HIGH': 60,
      'CRITICAL': 80
    }[severity] || 20;

    return Math.min(100, baseScore + conditionScore);
  }

  private async createIntrusionEvent(
    type: IntrusionEvent['type'],
    userId: string,
    ip: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    description: string,
    evidence: any,
    riskScore: number
  ): Promise<string> {
    const eventId = `intrusion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const event: IntrusionEvent = {
      id: eventId,
      timestamp: new Date(),
      type,
      userId,
      ip,
      severity,
      description,
      evidence,
      riskScore,
      actions: this.determineActions(severity, riskScore),
      status: 'OPEN'
    };

    this.intrusionEvents.set(eventId, event);

    // Notify security monitor
    if (this.securityMonitor) {
      await this.securityMonitor.detectIntrusionAttempt(
        userId,
        ip,
        type === 'FAILED_LOGIN_SERIES' ? 'FAILED_LOGIN' : 'SUSPICIOUS_ACTIVITY',
        evidence
      );
    }

    this.emit('intrusionDetected', event);

    return eventId;
  }

  private determineActions(severity: string, riskScore: number): string[] {
    const actions = ['LOG'];
    
    if (riskScore >= 40) actions.push('ALERT');
    if (riskScore >= 60) actions.push('REQUIRE_2FA');
    if (riskScore >= 80 && this.config.autoBlock) actions.push('BLOCK_USER');
    if (severity === 'CRITICAL') actions.push('ESCALATE');
    
    return actions;
  }

  private generateRecommendations(riskScore: number, threats: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskScore >= 80) {
      recommendations.push('Consider blocking user account temporarily');
      recommendations.push('Require additional authentication factors');
    }
    
    if (threats.includes('LOCATION_ANOMALY')) {
      recommendations.push('Verify user location through additional channels');
    }
    
    if (threats.includes('EXCESSIVE_FAILED_LOGINS')) {
      recommendations.push('Implement account lockout after failed attempts');
    }
    
    if (threats.includes('HIGH_ACTIVITY_FREQUENCY')) {
      recommendations.push('Monitor user activity closely for next 24 hours');
    }
    
    return recommendations;
  }

  private createUserProfile(userId: string): UserBehaviorProfile {
    return {
      userId,
      baseline: {
        loginTimes: [],
        locations: [],
        userAgents: [],
        endpoints: [],
        requestFrequency: 0,
        sessionDuration: 0
      },
      recent: {
        loginAttempts: [],
        activities: [],
        anomalies: []
      },
      riskScore: 0,
      lastUpdated: new Date()
    };
  }

  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(loc1.latitude)) * Math.cos(this.toRadians(loc2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private initializePatterns(): void {
    // Initialize default intrusion patterns
    const defaultPatterns: IntrusionPattern[] = [
      {
        id: 'rapid-api-calls',
        name: 'Rapid API Calls',
        description: 'Detects unusually rapid API calls from a user',
        category: 'BEHAVIORAL',
        severity: 'MEDIUM',
        enabled: true,
        conditions: [
          { field: 'profile.recentActivities', operator: 'GREATER_THAN', value: 50, weight: 30 },
          { field: 'activity.duration', operator: 'LESS_THAN', value: 100, weight: 20 }
        ],
        actions: ['LOG', 'ALERT', 'RATE_LIMIT']
      },
      {
        id: 'sensitive-data-access',
        name: 'Sensitive Data Access',
        description: 'Detects access to sensitive endpoints',
        category: 'DATA_ACCESS',
        severity: 'HIGH',
        enabled: true,
        conditions: [
          { field: 'activity.endpoint', operator: 'CONTAINS', value: '/admin', weight: 40 },
          { field: 'activity.endpoint', operator: 'CONTAINS', value: '/export', weight: 30 }
        ],
        actions: ['LOG', 'ALERT', 'REQUIRE_2FA']
      }
    ];

    defaultPatterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  private loadPatterns(): void {
    // Load additional patterns from configuration
    if (this.config.patterns) {
      this.config.patterns.forEach(pattern => {
        this.patterns.set(pattern.id, pattern);
      });
    }
  }

  private async initializeBehaviorAnalysis(): Promise<void> {
    console.log('🧠 Behavior analysis initialized');
  }

  private startAnalysis(): void {
    this.analysisTimer = setInterval(() => {
      this.performPeriodicAnalysis();
    }, 60 * 1000); // Run every minute
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Run every hour
  }

  private performPeriodicAnalysis(): void {
    // Analyze user profiles for anomalies
    for (const profile of this.userProfiles.values()) {
      this.updateUserBaseline(profile);
    }
  }

  private updateUserBaseline(profile: UserBehaviorProfile): void {
    // Update baseline based on recent activities
    const recentActivities = profile.recent.activities
      .filter(activity => activity.timestamp >= new Date(Date.now() - this.config.behaviorAnalysis.baselineWindow));

    if (recentActivities.length > 10) {
      // Update login times baseline
      const loginTimes = profile.recent.loginAttempts
        .filter(attempt => attempt.success)
        .map(attempt => attempt.timestamp.getHours());
      
      if (loginTimes.length > 0) {
        profile.baseline.loginTimes = [...new Set(loginTimes)];
      }

      // Update endpoints baseline
      const endpoints = recentActivities.map(activity => activity.endpoint);
      profile.baseline.endpoints = [...new Set(endpoints)];

      // Update user agents baseline
      const userAgents = profile.recent.loginAttempts.map(attempt => attempt.userAgent);
      profile.baseline.userAgents = [...new Set(userAgents)];
    }
  }

  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Clean up old user profile data
    for (const profile of this.userProfiles.values()) {
      profile.recent.loginAttempts = profile.recent.loginAttempts
        .filter(attempt => attempt.timestamp >= cutoff);
      
      profile.recent.activities = profile.recent.activities
        .filter(activity => activity.timestamp >= cutoff);
      
      profile.recent.anomalies = profile.recent.anomalies
        .filter(anomaly => anomaly.timestamp >= cutoff);
    }

    // Clean up old intrusion events
    for (const [id, event] of this.intrusionEvents.entries()) {
      if (event.timestamp < cutoff && event.status === 'RESOLVED') {
        this.intrusionEvents.delete(id);
      }
    }
  }

  public getUserProfile(userId: string): UserBehaviorProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  public getIntrusionEvents(): IntrusionEvent[] {
    return Array.from(this.intrusionEvents.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public async shutdown(): Promise<void> {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    console.log('🔍 Intrusion Detection shutdown complete');
  }
}

export interface IntrusionAnalysisResult {
  riskScore: number;
  threats: string[];
  anomalies: BehaviorAnomaly[];
  blocked: boolean;
  recommendations: string[];
}
import { EventEmitter } from 'events';

/**
 * Volume Profile Engine - Advanced volume analysis with institutional flow detection
 * Provides sophisticated volume pattern analysis and price-volume relationship insights
 */
export class VolumeProfileEngine extends EventEmitter {
    private readonly VOLUME_PROFILE_BINS = 50; // Number of price bins for volume profile
    private readonly INSTITUTIONAL_THRESHOLD = 2.0; // Volume threshold multiplier for institutional detection
    private readonly VOLUME_SPIKE_THRESHOLD = 3.0; // Volume spike detection threshold

    private readonly VOLUME_INDICATORS = {
        VWAP: { weight: 0.25 },
        OBV: { weight: 0.20 },
        ACCUMULATION_DISTRIBUTION: { weight: 0.20 },
        MONEY_FLOW_INDEX: { period: 14, weight: 0.15 },
        VOLUME_OSCILLATOR: { fastPeriod: 12, slowPeriod: 26, weight: 0.20 }
    };

    private readonly INSTITUTIONAL_PATTERNS = {
        ACCUMULATION: 'ACCUMULATION',
        DISTRIBUTION: 'DISTRIBUTION',
        MARKUP: 'MARKUP',
        MARKDOWN: 'MARKDOWN',
        NEUTRAL: 'NEUTRAL'
    };

    /**
     * Assess comprehensive volume profile for a ticker
     */
    public async assessVolumeProfile(ticker: string): Promise<VolumeProfileResult> {
        try {
            // Get price and volume data
            const priceVolumeData = await this.getPriceVolumeData(ticker, 100);

            // Calculate volume profile
            const volumeProfile = this.calculateVolumeProfile(priceVolumeData);

            // Analyze institutional flow patterns
            const institutionalFlow = this.analyzeInstitutionalFlow(priceVolumeData);

            // Calculate volume indicators
            const volumeIndicators = this.calculateVolumeIndicators(priceVolumeData);

            // Analyze volume-price relationships
            const volumePriceRelationship = this.analyzeVolumePriceRelationship(priceVolumeData);

            // Detect volume patterns and anomalies
            const volumePatterns = this.detectVolumePatterns(priceVolumeData);

            // Calculate composite volume score
            const compositeScore = this.calculateCompositeVolumeScore(
                volumeProfile, institutionalFlow, volumeIndicators, volumePriceRelationship
            );

            // Determine volume regime
            const volumeRegime = this.determineVolumeRegime(institutionalFlow, volumePatterns);

            // Calculate confidence based on volume consistency
            const confidence = this.calculateVolumeConfidence(volumeProfile, institutionalFlow, volumePatterns);

            const result: VolumeProfileResult = {
                ticker,
                compositeScore: Number(compositeScore.toFixed(3)),
                volumeProfile,
                institutionalFlow,
                volumeIndicators,
                volumePriceRelationship,
                volumePatterns,
                volumeRegime,
                confidence: Number(confidence.toFixed(3)),
                timestamp: new Date()
            };

            this.emit('volume:analyzed', result);
            return result;

        } catch (error) {
            console.error(`Error assessing volume profile for ${ticker}:`, error);
            return this.getDefaultVolumeResult(ticker);
        }
    }

    /**
     * Calculate volume profile with price level distribution
     */
    private calculateVolumeProfile(data: PriceVolumeBar[]): VolumeProfile {
        if (data.length === 0) {
            return {
                bins: [],
                pocPrice: 0,
                pocVolume: 0,
                valueAreaHigh: 0,
                valueAreaLow: 0,
                volumeDistribution: 'BALANCED'
            };
        }

        // Find price range
        const prices = data.map(bar => [bar.high, bar.low]).flat();
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        const binSize = priceRange / this.VOLUME_PROFILE_BINS;

        // Initialize bins
        const bins: VolumeBin[] = [];
        for (let i = 0; i < this.VOLUME_PROFILE_BINS; i++) {
            const binLow = minPrice + (i * binSize);
            const binHigh = binLow + binSize;
            bins.push({
                priceLevel: (binLow + binHigh) / 2,
                volume: 0,
                buyVolume: 0,
                sellVolume: 0,
                trades: 0
            });
        }

        // Distribute volume across bins
        for (const bar of data) {
            const barRange = bar.high - bar.low;
            const volumePerPrice = barRange > 0 ? bar.volume / barRange : bar.volume;

            // Estimate buy/sell volume based on price action
            const priceChange = bar.close - bar.open;
            const buyRatio = priceChange >= 0 ? 0.6 : 0.4; // Simplified buy/sell estimation
            const buyVolume = bar.volume * buyRatio;
            const sellVolume = bar.volume * (1 - buyRatio);

            // Distribute volume across price levels within the bar
            for (let price = bar.low; price <= bar.high; price += binSize / 10) {
                const binIndex = Math.floor((price - minPrice) / binSize);
                if (binIndex >= 0 && binIndex < bins.length) {
                    bins[binIndex].volume += volumePerPrice * (binSize / 10);
                    bins[binIndex].buyVolume += buyVolume * (binSize / 10) / barRange;
                    bins[binIndex].sellVolume += sellVolume * (binSize / 10) / barRange;
                    bins[binIndex].trades += 1;
                }
            }
        }

        // Find Point of Control (POC) - highest volume bin
        const pocBin = bins.reduce((max, bin) => bin.volume > max.volume ? bin : max, bins[0]);

        // Calculate Value Area (70% of total volume)
        const totalVolume = bins.reduce((sum, bin) => sum + bin.volume, 0);
        const valueAreaVolume = totalVolume * 0.7;

        // Sort bins by volume to find value area
        const sortedBins = [...bins].sort((a, b) => b.volume - a.volume);
        let accumulatedVolume = 0;
        const valueAreaBins: VolumeBin[] = [];

        for (const bin of sortedBins) {
            if (accumulatedVolume < valueAreaVolume) {
                valueAreaBins.push(bin);
                accumulatedVolume += bin.volume;
            } else {
                break;
            }
        }

        const valueAreaPrices = valueAreaBins.map(bin => bin.priceLevel).sort((a, b) => a - b);
        const valueAreaHigh = valueAreaPrices[valueAreaPrices.length - 1];
        const valueAreaLow = valueAreaPrices[0];

        // Determine volume distribution
        const upperHalfVolume = bins.slice(Math.floor(bins.length / 2)).reduce((sum, bin) => sum + bin.volume, 0);
        const lowerHalfVolume = bins.slice(0, Math.floor(bins.length / 2)).reduce((sum, bin) => sum + bin.volume, 0);

        let volumeDistribution: VolumeDistribution;
        if (upperHalfVolume > lowerHalfVolume * 1.2) {
            volumeDistribution = 'BULLISH_SKEW';
        } else if (lowerHalfVolume > upperHalfVolume * 1.2) {
            volumeDistribution = 'BEARISH_SKEW';
        } else {
            volumeDistribution = 'BALANCED';
        }

        return {
            bins,
            pocPrice: pocBin.priceLevel,
            pocVolume: pocBin.volume,
            valueAreaHigh,
            valueAreaLow,
            volumeDistribution
        };
    }

    /**
     * Analyze institutional flow patterns
     */
    private analyzeInstitutionalFlow(data: PriceVolumeBar[]): InstitutionalFlow {
        if (data.length < 20) {
            return {
                pattern: this.INSTITUTIONAL_PATTERNS.NEUTRAL,
                strength: 0.5,
                confidence: 0.3,
                volumeSpikes: [],
                darkPoolActivity: 0.5,
                institutionalBias: 'NEUTRAL'
            };
        }

        // Calculate average volume for baseline
        const avgVolume = data.reduce((sum, bar) => sum + bar.volume, 0) / data.length;

        // Detect volume spikes (institutional activity)
        const volumeSpikes: VolumeSpike[] = [];
        for (let i = 1; i < data.length; i++) {
            const bar = data[i];
            const prevBar = data[i - 1];

            if (bar.volume > avgVolume * this.VOLUME_SPIKE_THRESHOLD) {
                const priceImpact = Math.abs(bar.close - bar.open) / bar.open;
                const efficiency = priceImpact / (bar.volume / avgVolume);

                volumeSpikes.push({
                    timestamp: bar.timestamp,
                    volume: bar.volume,
                    priceLevel: (bar.high + bar.low) / 2,
                    priceImpact,
                    efficiency,
                    type: bar.close > bar.open ? 'BUYING' : 'SELLING'
                });
            }
        }

        // Analyze accumulation/distribution pattern
        let accumulationScore = 0;
        let distributionScore = 0;

        for (let i = 10; i < data.length; i++) {
            const recentBars = data.slice(i - 10, i);
            const avgPrice = recentBars.reduce((sum, bar) => sum + bar.close, 0) / recentBars.length;
            const avgVol = recentBars.reduce((sum, bar) => sum + bar.volume, 0) / recentBars.length;

            const currentBar = data[i];
            const pricePosition = currentBar.close > avgPrice ? 1 : -1;
            const volumeStrength = currentBar.volume / avgVol;

            if (pricePosition > 0 && volumeStrength > 1.2) {
                accumulationScore += volumeStrength;
            } else if (pricePosition < 0 && volumeStrength > 1.2) {
                distributionScore += volumeStrength;
            }
        }

        // Determine institutional pattern
        let pattern: string;
        let strength: number;

        if (accumulationScore > distributionScore * 1.5) {
            pattern = this.INSTITUTIONAL_PATTERNS.ACCUMULATION;
            strength = Math.min(1, accumulationScore / (data.length * 0.5));
        } else if (distributionScore > accumulationScore * 1.5) {
            pattern = this.INSTITUTIONAL_PATTERNS.DISTRIBUTION;
            strength = Math.min(1, distributionScore / (data.length * 0.5));
        } else {
            pattern = this.INSTITUTIONAL_PATTERNS.NEUTRAL;
            strength = 0.5;
        }

        // Estimate dark pool activity (simplified)
        const darkPoolActivity = this.estimateDarkPoolActivity(data, volumeSpikes);

        // Determine institutional bias
        const institutionalBias = accumulationScore > distributionScore ? 'BULLISH' :
            distributionScore > accumulationScore ? 'BEARISH' : 'NEUTRAL';

        // Calculate confidence based on pattern consistency
        const confidence = this.calculateInstitutionalConfidence(volumeSpikes, pattern, strength);

        return {
            pattern,
            strength: Number(strength.toFixed(3)),
            confidence: Number(confidence.toFixed(3)),
            volumeSpikes,
            darkPoolActivity: Number(darkPoolActivity.toFixed(3)),
            institutionalBias
        };
    }

    /**
     * Calculate volume indicators
     */
    private calculateVolumeIndicators(data: PriceVolumeBar[]): VolumeIndicators {
        return {
            vwap: this.calculateVWAP(data),
            obv: this.calculateOBV(data),
            accumulationDistribution: this.calculateAccumulationDistribution(data),
            moneyFlowIndex: this.calculateMoneyFlowIndex(data, this.VOLUME_INDICATORS.MONEY_FLOW_INDEX.period),
            volumeOscillator: this.calculateVolumeOscillator(data,
                this.VOLUME_INDICATORS.VOLUME_OSCILLATOR.fastPeriod,
                this.VOLUME_INDICATORS.VOLUME_OSCILLATOR.slowPeriod)
        };
    }

    /**
     * Analyze volume-price relationships
     */
    private analyzeVolumePriceRelationship(data: PriceVolumeBar[]): VolumePriceRelationship {
        if (data.length < 20) {
            return {
                correlation: 0,
                priceVolumeConfirmation: 'NEUTRAL',
                volumeEfficiency: 0.5,
                supportResistanceStrength: 0.5
            };
        }

        // Calculate price-volume correlation
        const priceChanges = [];
        const volumeChanges = [];

        for (let i = 1; i < data.length; i++) {
            const priceChange = (data[i].close - data[i - 1].close) / data[i - 1].close;
            const volumeChange = (data[i].volume - data[i - 1].volume) / data[i - 1].volume;

            priceChanges.push(priceChange);
            volumeChanges.push(volumeChange);
        }

        const correlation = this.calculateCorrelation(priceChanges, volumeChanges);

        // Analyze price-volume confirmation
        let confirmationScore = 0;
        for (let i = 1; i < data.length; i++) {
            const priceUp = data[i].close > data[i - 1].close;
            const volumeUp = data[i].volume > data[i - 1].volume;

            if ((priceUp && volumeUp) || (!priceUp && !volumeUp)) {
                confirmationScore += 1;
            }
        }

        const confirmationRatio = confirmationScore / (data.length - 1);
        let priceVolumeConfirmation: PriceVolumeConfirmation;

        if (confirmationRatio > 0.6) {
            priceVolumeConfirmation = 'STRONG_CONFIRMATION';
        } else if (confirmationRatio > 0.4) {
            priceVolumeConfirmation = 'MODERATE_CONFIRMATION';
        } else {
            priceVolumeConfirmation = 'DIVERGENCE';
        }

        // Calculate volume efficiency (price movement per unit of volume)
        const totalPriceMove = Math.abs(data[data.length - 1].close - data[0].close);
        const totalVolume = data.reduce((sum, bar) => sum + bar.volume, 0);
        const volumeEfficiency = totalVolume > 0 ? totalPriceMove / (totalVolume / data.length) : 0;

        // Assess support/resistance strength based on volume at key levels
        const supportResistanceStrength = this.calculateSupportResistanceStrength(data);

        return {
            correlation: Number(correlation.toFixed(3)),
            priceVolumeConfirmation,
            volumeEfficiency: Number(Math.min(1, volumeEfficiency * 1000).toFixed(3)), // Normalize
            supportResistanceStrength: Number(supportResistanceStrength.toFixed(3))
        };
    }

    /**
     * Detect volume patterns and anomalies
     */
    private detectVolumePatterns(data: PriceVolumeBar[]): VolumePattern[] {
        const patterns: VolumePattern[] = [];

        if (data.length < 10) return patterns;

        const avgVolume = data.reduce((sum, bar) => sum + bar.volume, 0) / data.length;

        // Detect climax patterns
        for (let i = 5; i < data.length - 5; i++) {
            const bar = data[i];
            const surroundingBars = data.slice(i - 5, i + 6);
            const maxVolume = Math.max(...surroundingBars.map(b => b.volume));

            if (bar.volume === maxVolume && bar.volume > avgVolume * 2) {
                const priceAction = bar.close > bar.open ? 'BULLISH' : 'BEARISH';
                const strength = Math.min(1, bar.volume / (avgVolume * 3));

                patterns.push({
                    type: priceAction === 'BULLISH' ? 'BUYING_CLIMAX' : 'SELLING_CLIMAX',
                    timestamp: bar.timestamp,
                    strength: Number(strength.toFixed(3)),
                    priceLevel: (bar.high + bar.low) / 2,
                    volume: bar.volume,
                    description: `${priceAction.toLowerCase()} climax with ${(strength * 100).toFixed(0)}% strength`
                });
            }
        }

        // Detect volume dry-up patterns
        for (let i = 10; i < data.length; i++) {
            const recentVolumes = data.slice(i - 10, i).map(bar => bar.volume);
            const recentAvg = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;

            if (recentAvg < avgVolume * 0.5) {
                patterns.push({
                    type: 'VOLUME_DRYUP',
                    timestamp: data[i].timestamp,
                    strength: Number((1 - (recentAvg / avgVolume)).toFixed(3)),
                    priceLevel: (data[i].high + data[i].low) / 2,
                    volume: recentAvg,
                    description: `Volume dry-up detected with ${((1 - (recentAvg / avgVolume)) * 100).toFixed(0)}% reduction`
                });
            }
        }

        return patterns;
    }

    /**
     * Calculate composite volume score
     */
    private calculateCompositeVolumeScore(
        profile: VolumeProfile,
        institutional: InstitutionalFlow,
        indicators: VolumeIndicators,
        relationship: VolumePriceRelationship
    ): number {
        // Base score from volume distribution
        let score = 0.5;

        // Adjust for volume distribution
        if (profile.volumeDistribution === 'BULLISH_SKEW') {
            score += 0.15;
        } else if (profile.volumeDistribution === 'BEARISH_SKEW') {
            score -= 0.15;
        }

        // Adjust for institutional flow
        if (institutional.pattern === this.INSTITUTIONAL_PATTERNS.ACCUMULATION) {
            score += institutional.strength * 0.2;
        } else if (institutional.pattern === this.INSTITUTIONAL_PATTERNS.DISTRIBUTION) {
            score -= institutional.strength * 0.2;
        }

        // Adjust for price-volume confirmation
        if (relationship.priceVolumeConfirmation === 'STRONG_CONFIRMATION') {
            score += 0.1;
        } else if (relationship.priceVolumeConfirmation === 'DIVERGENCE') {
            score -= 0.1;
        }

        // Adjust for volume efficiency
        score += (relationship.volumeEfficiency - 0.5) * 0.1;

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Determine volume regime
     */
    private determineVolumeRegime(institutional: InstitutionalFlow, patterns: VolumePattern[]): VolumeRegime {
        const hasClimaxPattern = patterns.some(p => p.type.includes('CLIMAX'));
        const hasDryUpPattern = patterns.some(p => p.type === 'VOLUME_DRYUP');

        if (institutional.pattern === this.INSTITUTIONAL_PATTERNS.ACCUMULATION && institutional.strength > 0.7) {
            return 'ACCUMULATION';
        } else if (institutional.pattern === this.INSTITUTIONAL_PATTERNS.DISTRIBUTION && institutional.strength > 0.7) {
            return 'DISTRIBUTION';
        } else if (hasClimaxPattern) {
            return 'CLIMAX';
        } else if (hasDryUpPattern) {
            return 'LOW_VOLUME';
        } else {
            return 'NORMAL';
        }
    }

    /**
     * Calculate volume confidence
     */
    private calculateVolumeConfidence(
        profile: VolumeProfile,
        institutional: InstitutionalFlow,
        patterns: VolumePattern[]
    ): number {
        let confidence = 0.5;

        // Boost confidence for clear institutional patterns
        if (institutional.strength > 0.7) {
            confidence += 0.2;
        }

        // Boost confidence for strong volume patterns
        const strongPatterns = patterns.filter(p => p.strength > 0.7);
        confidence += strongPatterns.length * 0.1;

        // Boost confidence for clear volume distribution
        if (profile.volumeDistribution !== 'BALANCED') {
            confidence += 0.1;
        }

        return Math.max(0.2, Math.min(1, confidence));
    }

    // Technical indicator calculations
    private calculateVWAP(data: PriceVolumeBar[]): number {
        let totalVolumePrice = 0;
        let totalVolume = 0;

        for (const bar of data) {
            const typicalPrice = (bar.high + bar.low + bar.close) / 3;
            totalVolumePrice += typicalPrice * bar.volume;
            totalVolume += bar.volume;
        }

        return totalVolume > 0 ? totalVolumePrice / totalVolume : 0;
    }

    private calculateOBV(data: PriceVolumeBar[]): number {
        let obv = 0;

        for (let i = 1; i < data.length; i++) {
            if (data[i].close > data[i - 1].close) {
                obv += data[i].volume;
            } else if (data[i].close < data[i - 1].close) {
                obv -= data[i].volume;
            }
        }

        return obv;
    }

    private calculateAccumulationDistribution(data: PriceVolumeBar[]): number {
        let ad = 0;

        for (const bar of data) {
            const clv = ((bar.close - bar.low) - (bar.high - bar.close)) / (bar.high - bar.low || 1);
            ad += clv * bar.volume;
        }

        return ad;
    }

    private calculateMoneyFlowIndex(data: PriceVolumeBar[], period: number): number {
        if (data.length < period + 1) return 50;

        let positiveFlow = 0;
        let negativeFlow = 0;

        for (let i = data.length - period; i < data.length; i++) {
            const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
            const prevTypicalPrice = (data[i - 1].high + data[i - 1].low + data[i - 1].close) / 3;
            const moneyFlow = typicalPrice * data[i].volume;

            if (typicalPrice > prevTypicalPrice) {
                positiveFlow += moneyFlow;
            } else {
                negativeFlow += moneyFlow;
            }
        }

        const moneyRatio = positiveFlow / (negativeFlow || 1);
        return 100 - (100 / (1 + moneyRatio));
    }

    private calculateVolumeOscillator(data: PriceVolumeBar[], fastPeriod: number, slowPeriod: number): number {
        if (data.length < slowPeriod) return 0;

        const fastMA = this.calculateVolumeMA(data, fastPeriod);
        const slowMA = this.calculateVolumeMA(data, slowPeriod);

        return slowMA > 0 ? ((fastMA - slowMA) / slowMA) * 100 : 0;
    }

    private calculateVolumeMA(data: PriceVolumeBar[], period: number): number {
        if (data.length < period) return 0;

        const recentVolumes = data.slice(-period).map(bar => bar.volume);
        return recentVolumes.reduce((sum, vol) => sum + vol, 0) / period;
    }

    private calculateCorrelation(x: number[], y: number[]): number {
        if (x.length !== y.length || x.length === 0) return 0;

        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const sumYY = y.reduce((sum, val) => sum + val * val, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

        return denominator !== 0 ? numerator / denominator : 0;
    }

    private calculateSupportResistanceStrength(data: PriceVolumeBar[]): number {
        // Simplified support/resistance strength calculation
        const priceVolumePairs = data.map(bar => ({
            price: (bar.high + bar.low) / 2,
            volume: bar.volume
        }));

        // Find price levels with high volume concentration
        const avgVolume = data.reduce((sum, bar) => sum + bar.volume, 0) / data.length;
        const highVolumeCount = priceVolumePairs.filter(pair => pair.volume > avgVolume * 1.5).length;

        return Math.min(1, highVolumeCount / (data.length * 0.2));
    }

    private estimateDarkPoolActivity(data: PriceVolumeBar[], spikes: VolumeSpike[]): number {
        // Simplified dark pool estimation based on volume efficiency
        const totalVolume = data.reduce((sum, bar) => sum + bar.volume, 0);
        const spikeVolume = spikes.reduce((sum, spike) => sum + spike.volume, 0);
        const visibleVolume = totalVolume - spikeVolume;

        // Estimate dark pool as percentage of total volume
        return Math.min(0.8, Math.max(0.2, spikeVolume / totalVolume));
    }

    private calculateInstitutionalConfidence(spikes: VolumeSpike[], pattern: string, strength: number): number {
        let confidence = 0.5;

        // Boost confidence for multiple volume spikes
        confidence += Math.min(0.3, spikes.length * 0.05);

        // Boost confidence for strong patterns
        confidence += strength * 0.3;

        // Boost confidence for consistent spike efficiency
        if (spikes.length > 0) {
            const avgEfficiency = spikes.reduce((sum, spike) => sum + spike.efficiency, 0) / spikes.length;
            confidence += Math.min(0.2, avgEfficiency * 0.5);
        }

        return Math.max(0.2, Math.min(1, confidence));
    }

    // Utility methods
    private async getPriceVolumeData(ticker: string, periods: number): Promise<PriceVolumeBar[]> {
        // TODO: Integrate with actual market data service
        // Mock data generation for demonstration
        const mockData: PriceVolumeBar[] = [];
        const basePrice = 100;
        const baseVolume = 1000000;
        let currentPrice = basePrice;

        for (let i = 0; i < periods; i++) {
            const priceChange = (Math.random() - 0.5) * 0.02; // ±1% random change
            currentPrice *= (1 + priceChange);

            const high = currentPrice * (1 + Math.random() * 0.01);
            const low = currentPrice * (1 - Math.random() * 0.01);
            const volume = baseVolume * (0.5 + Math.random() * 1.5); // 0.5x to 2x base volume

            mockData.push({
                timestamp: new Date(Date.now() - (periods - i) * 3600000), // 1 hour intervals
                open: i === 0 ? basePrice : mockData[i - 1].close,
                high,
                low,
                close: currentPrice,
                volume: Math.floor(volume)
            });
        }

        return mockData;
    }

    private getDefaultVolumeResult(ticker: string): VolumeProfileResult {
        return {
            ticker,
            compositeScore: 0.5,
            volumeProfile: {
                bins: [],
                pocPrice: 0,
                pocVolume: 0,
                valueAreaHigh: 0,
                valueAreaLow: 0,
                volumeDistribution: 'BALANCED'
            },
            institutionalFlow: {
                pattern: this.INSTITUTIONAL_PATTERNS.NEUTRAL,
                strength: 0.5,
                confidence: 0.3,
                volumeSpikes: [],
                darkPoolActivity: 0.5,
                institutionalBias: 'NEUTRAL'
            },
            volumeIndicators: {
                vwap: 0,
                obv: 0,
                accumulationDistribution: 0,
                moneyFlowIndex: 50,
                volumeOscillator: 0
            },
            volumePriceRelationship: {
                correlation: 0,
                priceVolumeConfirmation: 'NEUTRAL',
                volumeEfficiency: 0.5,
                supportResistanceStrength: 0.5
            },
            volumePatterns: [],
            volumeRegime: 'NORMAL',
            confidence: 0.3,
            timestamp: new Date()
        };
    }
}

// Supporting interfaces and types
export interface VolumeProfileResult {
    ticker: string;
    compositeScore: number;
    volumeProfile: VolumeProfile;
    institutionalFlow: InstitutionalFlow;
    volumeIndicators: VolumeIndicators;
    volumePriceRelationship: VolumePriceRelationship;
    volumePatterns: VolumePattern[];
    volumeRegime: VolumeRegime;
    confidence: number;
    timestamp: Date;
}

export interface VolumeProfile {
    bins: VolumeBin[];
    pocPrice: number; // Point of Control price
    pocVolume: number; // Point of Control volume
    valueAreaHigh: number;
    valueAreaLow: number;
    volumeDistribution: VolumeDistribution;
}

export interface VolumeBin {
    priceLevel: number;
    volume: number;
    buyVolume: number;
    sellVolume: number;
    trades: number;
}

export interface InstitutionalFlow {
    pattern: string;
    strength: number;
    confidence: number;
    volumeSpikes: VolumeSpike[];
    darkPoolActivity: number;
    institutionalBias: InstitutionalBias;
}

export interface VolumeSpike {
    timestamp: Date;
    volume: number;
    priceLevel: number;
    priceImpact: number;
    efficiency: number;
    type: 'BUYING' | 'SELLING';
}

export interface VolumeIndicators {
    vwap: number;
    obv: number;
    accumulationDistribution: number;
    moneyFlowIndex: number;
    volumeOscillator: number;
}

export interface VolumePriceRelationship {
    correlation: number;
    priceVolumeConfirmation: PriceVolumeConfirmation;
    volumeEfficiency: number;
    supportResistanceStrength: number;
}

export interface VolumePattern {
    type: VolumePatternType;
    timestamp: Date;
    strength: number;
    priceLevel: number;
    volume: number;
    description: string;
}

export type VolumeDistribution = 'BULLISH_SKEW' | 'BEARISH_SKEW' | 'BALANCED';
export type InstitutionalBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type PriceVolumeConfirmation = 'STRONG_CONFIRMATION' | 'MODERATE_CONFIRMATION' | 'DIVERGENCE' | 'NEUTRAL';
export type VolumePatternType = 'BUYING_CLIMAX' | 'SELLING_CLIMAX' | 'VOLUME_DRYUP' | 'ACCUMULATION' | 'DISTRIBUTION';
export type VolumeRegime = 'ACCUMULATION' | 'DISTRIBUTION' | 'CLIMAX' | 'LOW_VOLUME' | 'NORMAL';

interface PriceVolumeBar {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
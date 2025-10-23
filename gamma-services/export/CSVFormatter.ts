export class CSVFormatter {
  private delimiter: string;
  private quote: string;
  private escape: string;
  private lineBreak: string;

  constructor(options: {
    delimiter?: string;
    quote?: string;
    escape?: string;
    lineBreak?: string;
  } = {}) {
    this.delimiter = options.delimiter || ',';
    this.quote = options.quote || '"';
    this.escape = options.escape || '"';
    this.lineBreak = options.lineBreak || '\n';
  }

  // Format array of objects to CSV
  public formatObjectsToCSV<T extends Record<string, any>>(
    data: T[],
    options: {
      headers?: string[];
      excludeFields?: string[];
      fieldMapping?: Record<string, string>;
      formatters?: Record<string, (value: any) => string>;
    } = {}
  ): string {
    if (data.length === 0) {
      return '';
    }

    const { headers, excludeFields = [], fieldMapping = {}, formatters = {} } = options;
    
    // Determine fields to include
    const allFields = Object.keys(data[0]);
    const fields = headers || allFields.filter(field => !excludeFields.includes(field));
    
    // Generate header row
    const headerRow = fields.map(field => fieldMapping[field] || field);
    const csvRows = [this.formatRow(headerRow)];

    // Generate data rows
    data.forEach(item => {
      const row = fields.map(field => {
        let value = item[field];
        
        // Apply custom formatter if available
        if (formatters[field]) {
          value = formatters[field](value);
        } else {
          // Default formatting
          value = this.formatValue(value);
        }
        
        return value;
      });
      
      csvRows.push(this.formatRow(row));
    });

    return csvRows.join(this.lineBreak);
  }

  // Format 2D array to CSV
  public formatArrayToCSV(data: any[][]): string {
    return data.map(row => this.formatRow(row)).join(this.lineBreak);
  }

  // Format single row
  private formatRow(row: any[]): string {
    return row.map(cell => this.formatCell(cell)).join(this.delimiter);
  }

  // Format single cell
  private formatCell(value: any): string {
    const stringValue = this.formatValue(value);
    
    // Check if quoting is needed
    if (this.needsQuoting(stringValue)) {
      return this.quote + stringValue.replace(new RegExp(this.quote, 'g'), this.escape + this.quote) + this.quote;
    }
    
    return stringValue;
  }

  // Format value to string
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  // Check if value needs quoting
  private needsQuoting(value: string): boolean {
    return (
      value.includes(this.delimiter) ||
      value.includes(this.quote) ||
      value.includes('\n') ||
      value.includes('\r') ||
      value.startsWith(' ') ||
      value.endsWith(' ')
    );
  }

  // Create trade-specific CSV formatter
  public static createTradeFormatter(): CSVFormatter {
    return new CSVFormatter({
      delimiter: ',',
      quote: '"',
      lineBreak: '\n'
    });
  }

  // Create performance metrics CSV formatter
  public static createPerformanceFormatter(): CSVFormatter {
    return new CSVFormatter({
      delimiter: ',',
      quote: '"',
      lineBreak: '\n'
    });
  }

  // Utility method to escape CSV special characters
  public static escapeCSV(value: string): string {
    return value
      .replace(/"/g, '""')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  // Utility method to parse CSV line (basic implementation)
  public static parseCSVLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  // Create formatted trade export
  public formatTradeExport(trades: any[]): string {
    return this.formatObjectsToCSV(trades, {
      headers: [
        'tradeId',
        'ticker',
        'side',
        'entryDate',
        'exitDate',
        'entryPrice',
        'exitPrice',
        'quantity',
        'pnl',
        'pnlPercent',
        'confidence',
        'conviction',
        'expectedMove',
        'actualMove',
        'timeframe',
        'regime',
        'source',
        'status',
        'daysHeld',
        'maxFavorableExcursion',
        'maxAdverseExcursion',
        'exitReason'
      ],
      fieldMapping: {
        tradeId: 'Trade ID',
        ticker: 'Ticker',
        side: 'Side',
        entryDate: 'Entry Date',
        exitDate: 'Exit Date',
        entryPrice: 'Entry Price',
        exitPrice: 'Exit Price',
        quantity: 'Quantity',
        pnl: 'P&L',
        pnlPercent: 'P&L %',
        confidence: 'Confidence',
        conviction: 'Conviction',
        expectedMove: 'Expected Move',
        actualMove: 'Actual Move',
        timeframe: 'Timeframe',
        regime: 'Regime',
        source: 'Source',
        status: 'Status',
        daysHeld: 'Days Held',
        maxFavorableExcursion: 'MFE',
        maxAdverseExcursion: 'MAE',
        exitReason: 'Exit Reason'
      },
      formatters: {
        entryDate: (date: string) => new Date(date).toLocaleDateString(),
        exitDate: (date: string) => date ? new Date(date).toLocaleDateString() : '',
        entryPrice: (price: number) => price.toFixed(4),
        exitPrice: (price: number) => price ? price.toFixed(4) : '',
        pnl: (pnl: number) => pnl.toFixed(2),
        pnlPercent: (percent: number) => percent.toFixed(2) + '%',
        confidence: (conf: number) => conf.toFixed(3),
        conviction: (conv: number) => conv.toFixed(3),
        expectedMove: (move: number) => move.toFixed(2) + '%',
        actualMove: (move: number) => move ? move.toFixed(2) + '%' : '',
        maxFavorableExcursion: (mfe: number) => mfe ? mfe.toFixed(2) : '',
        maxAdverseExcursion: (mae: number) => mae ? mae.toFixed(2) : ''
      }
    });
  }

  // Create formatted performance export
  public formatPerformanceExport(performance: any): string {
    const metrics = [
      ['Metric', 'Value'],
      ['Total Trades', performance.totalTrades?.toString() || '0'],
      ['Winning Trades', performance.winningTrades?.toString() || '0'],
      ['Losing Trades', performance.losingTrades?.toString() || '0'],
      ['Win Rate', `${((performance.winRate || 0) * 100).toFixed(2)}%`],
      ['Profit Factor', (performance.profitFactor || 0).toFixed(2)],
      ['Total P&L', `$${(performance.totalPnL || 0).toFixed(2)}`],
      ['Average Win', `$${(performance.averageWin || 0).toFixed(2)}`],
      ['Average Loss', `$${(performance.averageLoss || 0).toFixed(2)}`],
      ['Largest Win', `$${(performance.largestWin || 0).toFixed(2)}`],
      ['Largest Loss', `$${(performance.largestLoss || 0).toFixed(2)}`],
      ['Max Drawdown', `${((performance.maxDrawdown || 0) * 100).toFixed(2)}%`],
      ['Sharpe Ratio', (performance.sharpeRatio || 0).toFixed(2)],
      ['Calmar Ratio', (performance.calmarRatio || 0).toFixed(2)],
      ['Avg Holding Period', `${(performance.averageHoldingPeriod || 0).toFixed(1)} days`],
      ['Confidence Effectiveness', `${((performance.confidenceEffectiveness || 0) * 100).toFixed(1)}%`]
    ];

    let csv = this.formatArrayToCSV(metrics);

    // Add regime performance if available
    if (performance.regimePerformance && Object.keys(performance.regimePerformance).length > 0) {
      csv += this.lineBreak + this.lineBreak;
      csv += this.formatRow(['Regime Performance']);
      csv += this.lineBreak;
      csv += this.formatRow(['Regime', 'Trades', 'Win Rate', 'Avg P&L']);
      
      Object.entries(performance.regimePerformance).forEach(([regime, stats]: [string, any]) => {
        csv += this.lineBreak;
        csv += this.formatRow([
          regime,
          stats.trades?.toString() || '0',
          `${((stats.winRate || 0) * 100).toFixed(1)}%`,
          `$${(stats.avgPnL || 0).toFixed(2)}`
        ]);
      });
    }

    return csv;
  }
}
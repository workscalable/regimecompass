import { NextRequest, NextResponse } from 'next/server';
import { DataExportService } from '../../../../../gamma-services/export/DataExportService';
import { ReportGenerator } from '../../../../../gamma-services/export/ReportGenerator';
import { getPaperTradingEngine } from '../../../../../gamma-services/paper/PaperTradingEngine';
import { getTradeAnalyzer } from '../../../../../gamma-services/analytics/TradeAnalyzer';

// GET /api/paper/reports - Generate formatted reports
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'trading'; // trading, risk, monthly
    const format = searchParams.get('format') || 'json'; // json, html
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // Get service instances
    const paperEngine = getPaperTradingEngine();
    const tradeAnalyzer = getTradeAnalyzer();
    const exportService = new DataExportService(tradeAnalyzer, paperEngine);
    const reportGenerator = new ReportGenerator(exportService);

    let report;
    let filename: string;

    // Generate report based on type
    switch (reportType.toLowerCase()) {
      case 'trading':
        const options: any = {
          includeCharts: true,
          includeDetailedTrades: true
        };
        
        if (startDate && endDate) {
          options.dateRange = {
            start: new Date(startDate),
            end: new Date(endDate)
          };
        }
        
        report = await reportGenerator.generateTradingReport(options);
        filename = `trading-report-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'monthly':
        if (!year || !month) {
          return NextResponse.json(
            { error: 'Year and month parameters required for monthly report' },
            { status: 400 }
          );
        }
        
        report = await reportGenerator.generateMonthlySummary(
          parseInt(year), 
          parseInt(month)
        );
        filename = `monthly-report-${year}-${month.padStart(2, '0')}`;
        break;

      case 'risk':
        const riskOptions: any = {};
        
        if (startDate && endDate) {
          riskOptions.dateRange = {
            start: new Date(startDate),
            end: new Date(endDate)
          };
        }
        
        report = await reportGenerator.generateRiskReport(riskOptions);
        filename = `risk-report-${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid report type. Use: trading, risk, or monthly' },
          { status: 400 }
        );
    }

    // Return report in requested format
    if (format.toLowerCase() === 'html') {
      const htmlContent = reportGenerator.generateHTMLReport(report);
      
      const response = new NextResponse(htmlContent);
      response.headers.set('Content-Type', 'text/html');
      response.headers.set('Content-Disposition', `attachment; filename="${filename}.html"`);
      response.headers.set('Cache-Control', 'no-cache');
      
      return response;
    } else {
      // Return JSON format
      return NextResponse.json({
        success: true,
        report,
        metadata: {
          reportType,
          format,
          generatedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/paper/reports - Generate custom reports
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reportType = 'trading',
      format = 'json',
      dateRange,
      includeCharts = true,
      includeDetailedTrades = false,
      customSections = [],
      filters = {}
    } = body;

    // Get service instances
    const paperEngine = getPaperTradingEngine();
    const tradeAnalyzer = getTradeAnalyzer();
    const exportService = new DataExportService(tradeAnalyzer, paperEngine);
    const reportGenerator = new ReportGenerator(exportService);

    let report;

    // Build report options
    const options: any = {
      includeCharts,
      includeDetailedTrades
    };

    if (dateRange) {
      options.dateRange = {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      };
    }

    // Generate base report
    switch (reportType.toLowerCase()) {
      case 'trading':
        report = await reportGenerator.generateTradingReport(options);
        break;
      case 'risk':
        report = await reportGenerator.generateRiskReport(options);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type for custom generation' },
          { status: 400 }
        );
    }

    // Add custom sections if specified
    if (customSections.length > 0) {
      for (const customSection of customSections) {
        await addCustomSection(report, customSection, exportService);
      }
    }

    // Apply filters if specified
    if (Object.keys(filters).length > 0) {
      report = applyReportFilters(report, filters);
    }

    return NextResponse.json({
      success: true,
      report,
      metadata: {
        reportType,
        format,
        customSections: customSections.length,
        filtersApplied: Object.keys(filters).length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Custom report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate custom report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to add custom sections
async function addCustomSection(report: any, sectionConfig: any, exportService: DataExportService): Promise<void> {
  const { type, title, dataSource, parameters = {} } = sectionConfig;

  let sectionData;

  switch (dataSource) {
    case 'account_summary':
      sectionData = await exportService.exportAccountSummary();
      break;
    case 'trade_history':
      const trades = await exportService.exportToJSON({ format: 'JSON', ...parameters });
      sectionData = trades.trades;
      break;
    case 'performance_metrics':
      const performance = await exportService.exportToJSON({ 
        format: 'JSON', 
        includeAnalytics: true,
        ...parameters 
      });
      sectionData = performance.performance;
      break;
    default:
      console.warn(`Unknown data source: ${dataSource}`);
      return;
  }

  // Add the custom section to the report
  report.sections.push({
    title: title || 'Custom Section',
    type: type || 'table',
    data: sectionData,
    description: `Custom section: ${dataSource}`
  });
}

// Helper function to apply filters to report
function applyReportFilters(report: any, filters: any): any {
  const filteredReport = { ...report };

  // Filter sections if specified
  if (filters.includeSections && Array.isArray(filters.includeSections)) {
    filteredReport.sections = report.sections.filter((section: any) => 
      filters.includeSections.includes(section.title) || 
      filters.includeSections.includes(section.type)
    );
  }

  // Filter data within sections
  if (filters.dataFilters) {
    filteredReport.sections = filteredReport.sections.map((section: any) => {
      if (section.type === 'table' && section.data.rows) {
        // Apply row filters based on criteria
        let filteredRows = section.data.rows;

        if (filters.dataFilters.minValue !== undefined) {
          filteredRows = filteredRows.filter((row: any[]) => {
            // Assume last column contains numeric values for filtering
            const value = parseFloat(row[row.length - 1]?.toString().replace(/[$,%]/g, '') || '0');
            return value >= filters.dataFilters.minValue;
          });
        }

        return {
          ...section,
          data: {
            ...section.data,
            rows: filteredRows
          }
        };
      }
      return section;
    });
  }

  return filteredReport;
}
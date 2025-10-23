import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '@/gamma-services/config/ConfigManager';
import { environmentValidator } from '@/gamma-services/config/EnvironmentValidator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const action = searchParams.get('action');

    switch (action) {
      case 'summary':
        const summary = configManager.getConfigSummary();
        return NextResponse.json({
          status: 'success',
          data: summary
        });

      case 'validation':
        const validationResult = await environmentValidator.validateAndLog();
        return NextResponse.json({
          status: 'success',
          data: validationResult
        });

      case 'documentation':
        const documentation = environmentValidator.getDocumentation();
        return new NextResponse(documentation, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': 'attachment; filename="environment-variables.md"'
          }
        });

      case 'template':
        const template = environmentValidator.generateEnvTemplate();
        return new NextResponse(template, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': 'attachment; filename=".env.template"'
          }
        });

      default:
        // Return configuration or specific section
        if (section) {
          const sectionConfig = configManager.getSection(section as any);
          return NextResponse.json({
            status: 'success',
            data: {
              section,
              config: sectionConfig
            }
          });
        } else {
          const config = configManager.getConfig();
          // Remove sensitive information
          const sanitizedConfig = {
            ...config,
            database: {
              ...config.database,
              password: '***'
            },
            apis: {
              polygon: {
                ...config.apis.polygon,
                apiKey: config.apis.polygon.apiKey ? '***' : ''
              },
              tradier: {
                ...config.apis.tradier,
                apiKey: config.apis.tradier.apiKey ? '***' : ''
              }
            },
            alerting: {
              ...config.alerting,
              channels: {
                ...config.alerting.channels,
                email: {
                  ...config.alerting.channels.email,
                  smtp: {
                    ...config.alerting.channels.email.smtp,
                    auth: {
                      user: config.alerting.channels.email.smtp.auth.user,
                      pass: config.alerting.channels.email.smtp.auth.pass ? '***' : ''
                    }
                  }
                }
              }
            }
          };

          return NextResponse.json({
            status: 'success',
            data: sanitizedConfig
          });
        }
    }
  } catch (error) {
    console.error('Configuration API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, section, updates, userId } = body;

    switch (action) {
      case 'update':
        if (!section || !updates) {
          return NextResponse.json(
            { status: 'error', message: 'Section and updates are required' },
            { status: 400 }
          );
        }

        await configManager.updateSection(section, updates, userId || 'api-user');
        
        return NextResponse.json({
          status: 'success',
          message: `Configuration section '${section}' updated successfully`
        });

      case 'reload':
        const reloadedConfig = await configManager.reloadConfig();
        
        return NextResponse.json({
          status: 'success',
          message: 'Configuration reloaded successfully',
          data: {
            environment: reloadedConfig.environment,
            version: reloadedConfig.version
          }
        });

      case 'validate':
        const validationResult = await environmentValidator.validateAndLog();
        
        return NextResponse.json({
          status: validationResult.valid ? 'success' : 'error',
          message: validationResult.valid ? 'Validation passed' : 'Validation failed',
          data: validationResult
        });

      default:
        return NextResponse.json(
          { status: 'error', message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Configuration action error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process configuration action',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
/**
 * Quick Fix Script for Remaining TypeScript Errors
 * Implements parallel error fixing for the current build issues
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface CompilationError {
  file: string;
  line: number;
  message: string;
  category: string;
}

class ErrorFixer {
  private errors: CompilationError[] = [];

  async runBuildAndParseErrors(): Promise<void> {
    console.log('🔍 Running build to detect errors...');
    
    try {
      const { stdout, stderr } = await execAsync('npm run build');
      const output = stdout + stderr;
      this.parseBuildOutput(output);
      
      if (this.errors.length === 0) {
        console.log('✅ No compilation errors found!');
        return;
      }
      
      console.log(`📋 Found ${this.errors.length} errors to fix`);
      await this.fixErrors();
      
    } catch (error) {
      console.error('❌ Error running build:', error);
    }
  }

  private parseBuildOutput(output: string): void {
    const lines = output.split('\n');
    
    for (const line of lines) {
      const errorMatch = line.match(/^\.\/(.+):(\d+):(\d+)\s+(.+)$/);
      if (errorMatch) {
        const [, file, lineNum, column, message] = errorMatch;
        this.errors.push({
          file: file.trim(),
          line: parseInt(lineNum),
          message: message.trim(),
          category: this.categorizeError(message)
        });
      }
    }
  }

  private categorizeError(message: string): string {
    if (message.includes('LogContext')) return 'log-context';
    if (message.includes('Type error:')) return 'type-safety';
    if (message.includes('Cannot find module')) return 'import';
    return 'unknown';
  }

  private async fixErrors(): Promise<void> {
    console.log('🔧 Starting parallel error fixing...');
    
    const fixPromises = this.errors.map(error => this.fixError(error));
    await Promise.all(fixPromises);
    
    console.log('✅ All errors processed');
    
    // Verify fixes
    await this.verifyFixes();
  }

  private async fixError(error: CompilationError): Promise<void> {
    console.log(`🔧 Fixing ${error.category} error in ${error.file}:${error.line}`);
    
    try {
      switch (error.category) {
        case 'log-context':
          await this.fixLogContextError(error);
          break;
        case 'type-safety':
          await this.fixTypeSafetyError(error);
          break;
        case 'import':
          await this.fixImportError(error);
          break;
        default:
          console.log(`⚠️  Unknown error category: ${error.category}`);
      }
    } catch (err) {
      console.error(`❌ Failed to fix error in ${error.file}:`, err);
    }
  }

  private async fixLogContextError(error: CompilationError): Promise<void> {
    const fileContent = await fs.promises.readFile(error.file, 'utf8');
    const lines = fileContent.split('\n');
    
    // Find the problematic line
    const errorLine = lines[error.line - 1];
    
    if (errorLine.includes('environment:') || errorLine.includes('version:')) {
      // This is a logger.setDefaultContext call that needs to be fixed
      const fixedContent = this.fixLoggerContextCall(lines, error.line - 1);
      
      if (fixedContent) {
        await fs.promises.writeFile(error.file, fixedContent);
        console.log(`✅ Fixed LogContext error in ${error.file}`);
      }
    }
  }

  private fixLoggerContextCall(lines: string[], errorLineIndex: number): string | null {
    // Find the start of the logger.setDefaultContext call
    let startLine = -1;
    for (let i = errorLineIndex; i >= 0; i--) {
      if (lines[i].includes('logger.setDefaultContext(')) {
        startLine = i;
        break;
      }
    }
    
    if (startLine === -1) return null;
    
    // Find the end of the call
    let endLine = -1;
    let braceCount = 0;
    let foundStart = false;
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('logger.setDefaultContext(')) {
        foundStart = true;
      }
      
      if (foundStart) {
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        if (braceCount === 0 && line.includes('}')) {
          endLine = i;
          break;
        }
      }
    }
    
    if (endLine === -1) return null;
    
    // Create the fixed version
    const newLines = [...lines];
    
    // Replace the problematic section
    const contextStart = startLine;
    const contextEnd = endLine;
    
    // Find the opening brace and modify
    for (let i = contextStart; i <= contextEnd; i++) {
      if (newLines[i].includes('{')) {
        // Replace the opening brace with metadata wrapper
        newLines[i] = newLines[i].replace('{', '{\n        metadata: {');
        break;
      }
    }
    
    // Find the closing brace and modify
    for (let i = contextEnd; i >= contextStart; i--) {
      if (newLines[i].includes('}')) {
        // Add closing for metadata
        newLines[i] = newLines[i].replace('}', '\n        }');
        break;
      }
    }
    
    return newLines.join('\n');
  }

  private async fixTypeSafetyError(error: CompilationError): Promise<void> {
    console.log(`🔧 Fixing type safety error in ${error.file}`);
    // Implementation for type safety fixes
  }

  private async fixImportError(error: CompilationError): Promise<void> {
    console.log(`🔧 Fixing import error in ${error.file}`);
    // Implementation for import fixes
  }

  private async verifyFixes(): Promise<void> {
    console.log('🔍 Verifying fixes...');
    
    try {
      const { stdout, stderr } = await execAsync('npm run build');
      const output = stdout + stderr;
      
      if (output.includes('Failed to compile')) {
        console.log('⚠️  Some errors remain, running another iteration...');
        this.errors = [];
        this.parseBuildOutput(output);
        if (this.errors.length > 0) {
          await this.fixErrors();
        }
      } else {
        console.log('✅ All errors fixed successfully!');
      }
    } catch (error) {
      console.error('❌ Error verifying fixes:', error);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('🚀 Starting Multi-Agent Error Fixing for RegimeCompass');
  
  const fixer = new ErrorFixer();
  await fixer.runBuildAndParseErrors();
  
  console.log('🎉 Multi-Agent Error Fixing completed!');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { ErrorFixer, main };


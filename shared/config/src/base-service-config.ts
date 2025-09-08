/**
 * Base configuration class for all services
 * Provides common functionality for environment-based configuration
 */
export abstract class BaseServiceConfig {
  protected static getEnvironment(): string {
    return process.env.ENV || 'dev';
  }

  protected static getRegion(): string {
    return process.env.AWS_REGION || 'us-east-1';
  }

  protected static getTableName(envVar: string, defaultSuffix: string): string {
    return process.env[envVar] || `${defaultSuffix}-${this.getEnvironment()}`;
  }
}

import { BaseServiceConfig } from './base-service-config';

/**
 * Configuration class for Account Service
 */
export class AccountServiceConfig extends BaseServiceConfig {
  readonly accountTableName: string;
  readonly outboxTableName: string;

  constructor(
    accountTableName: string,
    outboxTableName: string
  ) {
    super();
    this.accountTableName = accountTableName;
    this.outboxTableName = outboxTableName;
  }

  /**
   * Creates configuration from environment variables
   */
  static fromEnvironment(): AccountServiceConfig {
    return new AccountServiceConfig(
      this.getTableName('ACCOUNTS_TABLE_NAME', 'AccountsSvc-AccountsTable'),
      this.getTableName('ACCOUNTS_OUTBOX_TABLE_NAME', 'AccountsSvc-OutboxTable')
    );
  }

  /**
   * Creates configuration for testing with custom table names
   */
  static forTesting(tableSuffix = 'test'): AccountServiceConfig {
    return new AccountServiceConfig(
      `AccountsSvc-AccountsTable-${tableSuffix}`,
      `AccountsSvc-OutboxTable-${tableSuffix}`
    );
  }
}

import { BaseServiceConfig } from './base-service-config';

/**
 * Configuration class for Banking Service
 */
export class BankingServiceConfig extends BaseServiceConfig {
  readonly inboxTableName: string;
  readonly operationsTableName: string;
  readonly outboxTableName: string;
  readonly accountProjectionTableName: string;

  constructor(
    inboxTableName: string,
    operationsTableName: string,
    outboxTableName: string,
    accountProjectionTableName: string
  ) {
    super();
    this.inboxTableName = inboxTableName;
    this.operationsTableName = operationsTableName;
    this.outboxTableName = outboxTableName;
    this.accountProjectionTableName = accountProjectionTableName;
  }

  /**
   * Creates configuration from environment variables
   */
  static fromEnvironment(): BankingServiceConfig {
    return new BankingServiceConfig(
      this.getTableName('BANKING_INBOX_TABLE_NAME', 'BankingSvc-InboxTable'),
      this.getTableName('OPERATIONS_TABLE_NAME', 'BankingSvc-OperationsTable'),
      this.getTableName('BANKING_OUTBOX_TABLE_NAME', 'BankingSvc-OutboxTable'),
      this.getTableName('ACCOUNTS_PROJECTION_TABLE_NAME', 'BankingSvc-AccountsProjectionTable')
    );
  }

  /**
   * Creates configuration for testing with custom table names
   */
  static forTesting(tableSuffix = 'test'): BankingServiceConfig {
    return new BankingServiceConfig(
      `BankingSvc-InboxTable-${tableSuffix}`,
      `BankingSvc-OperationsTable-${tableSuffix}`,
      `BankingSvc-OutboxTable-${tableSuffix}`,
      `BankingSvc-AccountsProjectionTable-${tableSuffix}`
    );
  }
}

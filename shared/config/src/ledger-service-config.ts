import { BaseServiceConfig } from './base-service-config';

/**
 * Configuration class for Ledger Service
 */
export class LedgerServiceConfig extends BaseServiceConfig {
  readonly inboxTableName: string;
  readonly ledgerTableName: string;
  readonly balanceTableName: string;
  readonly outboxTableName: string;

  constructor(
    inboxTableName: string,
    ledgerTableName: string,
    balanceTableName: string,
    outboxTableName: string
  ) {
    super();
    this.inboxTableName = inboxTableName;
    this.ledgerTableName = ledgerTableName;
    this.balanceTableName = balanceTableName;
    this.outboxTableName = outboxTableName;
  }

  /**
   * Creates configuration from environment variables
   */
  static fromEnvironment(): LedgerServiceConfig {
    return new LedgerServiceConfig(
      this.getTableName('LEDGER_INBOX_TABLE_NAME', 'LedgerSvc-InboxTable'),
      this.getTableName('LEDGER_TABLE_NAME', 'LedgerSvc-LedgerTable'),
      this.getTableName('BALANCE_TABLE_NAME', 'LedgerSvc-BalanceTable'),
      this.getTableName('OUTBOX_TABLE_NAME', 'LedgerSvc-OutboxTable')
    );
  }

  /**
   * Creates configuration for testing with custom table names
   */
  static forTesting(tableSuffix = 'test'): LedgerServiceConfig {
    return new LedgerServiceConfig(
      `LedgerSvc-InboxTable-${tableSuffix}`,
      `LedgerSvc-LedgerTable-${tableSuffix}`,
      `LedgerSvc-BalanceTable-${tableSuffix}`,
      `LedgerSvc-OutboxTable-${tableSuffix}`
    );
  }
}

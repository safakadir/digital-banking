import { BaseServiceConfig } from './base-service-config';

/**
 * Configuration class for Query Service
 */
export class QueryServiceConfig extends BaseServiceConfig {
  readonly inboxTableName: string;
  readonly transactionTableName: string;
  readonly balanceTableName: string;
  readonly accountProjectionTableName: string;

  constructor(
    inboxTableName: string,
    transactionTableName: string,
    balanceTableName: string,
    accountProjectionTableName: string
  ) {
    super();
    this.inboxTableName = inboxTableName;
    this.transactionTableName = transactionTableName;
    this.balanceTableName = balanceTableName;
    this.accountProjectionTableName = accountProjectionTableName;
  }

  /**
   * Creates configuration from environment variables
   */
  static fromEnvironment(): QueryServiceConfig {
    return new QueryServiceConfig(
      this.getTableName('QUERY_INBOX_TABLE_NAME', 'QuerySvc-InboxTable'),
      this.getTableName('TRANSACTIONS_TABLE_NAME', 'QuerySvc-TransactionsTable'),
      this.getTableName('BALANCES_TABLE_NAME', 'QuerySvc-BalancesTable'),
      this.getTableName('ACCOUNTS_PROJECTION_TABLE_NAME', 'QuerySvc-AccountsProjectionTable')
    );
  }

  /**
   * Creates configuration for testing with custom table names
   */
  static forTesting(tableSuffix = 'test'): QueryServiceConfig {
    return new QueryServiceConfig(
      `QuerySvc-InboxTable-${tableSuffix}`,
      `QuerySvc-TransactionsTable-${tableSuffix}`,
      `QuerySvc-BalancesTable-${tableSuffix}`,
      `QuerySvc-AccountsProjectionTable-${tableSuffix}`
    );
  }
}

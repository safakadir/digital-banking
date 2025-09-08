import { Logger } from '@aws-lambda-powertools/logger';
import { Transaction, Balance, BalanceWithAccountInfo } from '@digital-banking/models';
import { 
  IBalanceRepository,
  ITransactionRepository,
  IAccountProjectionRepository
 } from './repositories/interfaces';
import { AccountProjection } from './models';
import { NotFoundError } from '@digital-banking/errors';

// Powertools
const logger = new Logger();

/**
 * Query Service - Business logic for query operations
 */
export class QueryService {
  constructor(
    private balanceRepository: IBalanceRepository,
    private transactionRepository: ITransactionRepository,
    private accountProjectionRepository: IAccountProjectionRepository
  ) {}
  /**
   * Get transactions for an account
   */
  async getTransactions(
    accountId: string,
    limit = 50,
    offset = 0
  ): Promise<{ transactions: Transaction[] }> {
    logger.info('Getting transactions in service', { accountId, limit, offset });

    try {
      // 1. Fetch transactions from database
      const transactions = await this.transactionRepository.getByAccountId(accountId, limit, offset);

      logger.info('Transactions retrieved successfully', { accountId, count: transactions.length });
      
      return { transactions };
    } catch (error) {
      logger.error('Error getting transactions', { error, accountId });
      throw error;
    }
  }

  /**
   * Get balance for an account
   */
  async getBalance(accountId: string): Promise<Balance> {
    logger.info('Getting balance in service', { accountId });

    try {
      // 1. Fetch balance from database
      const balance = await this.balanceRepository.getByAccountId(accountId);

      if (!balance) {
        logger.warn('Balance not found for account', { accountId });
        throw new NotFoundError(`Balance not found for account ${accountId}`);
      }

      logger.info('Balance retrieved successfully', { accountId, balance: balance.balance });
      return balance;
    } catch (error) {
      logger.error('Error getting balance', { error, accountId });
      throw error;
    }
  }

  /**
   * Get balances for all accounts of the user
   */
  async getBalances(userId: string): Promise<BalanceWithAccountInfo[]> {
    logger.info('Getting all balances in service', { userId });

    try {
      // 1. Fetch all accounts for the user
      const accountProjections = await this.accountProjectionRepository.getByUserId(userId);

      if (accountProjections.length === 0) {
        logger.info('No accounts found for user', { userId });
        return [];
      }

      // 2. Fetch balances for all accounts
      const accountIds = accountProjections.map((acc: AccountProjection) => acc.accountId);
      const balances = await this.balanceRepository.getByAccountIds(accountIds);

      // 3. Combine account info with balances
      const balancesWithAccountInfo: BalanceWithAccountInfo[] = balances.map((balance: Balance) => {
        const accountProjection = accountProjections.find((acc: AccountProjection) => acc.accountId === balance.accountId);
        return {
          ...balance,
          accountName: accountProjection?.name || 'Unknown Account'
        };
      });

      logger.info('Balances retrieved successfully', { userId, count: balancesWithAccountInfo.length });
      return balancesWithAccountInfo;
    } catch (error) {
      logger.error('Error getting balances', { error, userId });
      throw error;
    }
  }
}

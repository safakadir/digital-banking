import { Logger } from '@aws-lambda-powertools/logger';
import { v4 as uuidv4 } from 'uuid';
import { DepositCommand, WithdrawCommand } from '@digital-banking/commands';
import { Operation } from '@digital-banking/models';
import { IOperationRepository, IAccountsProjectionRepository } from './repositories/interfaces';
import { NotFoundError, ValidationError } from '@digital-banking/errors';

// Powertools
const logger = new Logger();

export class BankingService {
  private operationRepository: IOperationRepository;
  private accountsProjectionRepository: IAccountsProjectionRepository;

  constructor(
    operationRepository: IOperationRepository,
    accountsProjectionRepository: IAccountsProjectionRepository
  ) {
    this.operationRepository = operationRepository;
    this.accountsProjectionRepository = accountsProjectionRepository;
  }

  /**
   * Validate that user owns the account
   */
  private async validateAccountOwnership(accountId: string, userId: string): Promise<void> {
    logger.info('Validating account ownership', { accountId, userId });

    try {
      const isValid = await this.accountsProjectionRepository.validateOwnership(accountId, userId);

      if (!isValid) {
        throw new ValidationError('Account not found, not owned by user, or not active');
      }

      logger.info('Account ownership validated successfully', { accountId, userId });
    } catch (error) {
      logger.error('Account ownership validation failed', { error, accountId, userId });
      throw error;
    }
  }

  /**
   * Create operation record and send command atomically using outbox pattern
   */
  private async createOperationWithCommand(
    operationId: string,
    accountId: string,
    userId: string,
    type: 'deposit' | 'withdraw',
    amount: number
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    const operation: Operation = {
      operationId,
      accountId,
      type,
      amount,
      status: 'pending',
      createdAt: timestamp
    };

    // Create command for outbox
    const command =
      type === 'deposit'
        ? ({
            id: uuidv4(),
            type: 'DEPOSIT_CMD',
            timestamp,
            accountId,
            userId,
            amount,
            operationId,
            description: 'Deposit operation'
          } as DepositCommand)
        : ({
            id: uuidv4(),
            type: 'WITHDRAW_CMD',
            timestamp,
            accountId,
            userId,
            amount,
            operationId,
            description: 'Withdraw operation'
          } as WithdrawCommand);

    // Use repository transaction method for atomic operation
    await this.operationRepository.createWithCommand(operation, command);
    logger.info('Operation created successfully via repository', {
      operationId,
      type,
      accountId,
      amount,
      commandId: command.id
    });
  }

  /**
   * Process a deposit request
   */
  async processDeposit(
    accountId: string,
    amount: number,
    userId: string
  ): Promise<{ operationId: string; status: string }> {
    logger.info('Processing deposit in service', { accountId, amount, userId });

    try {
      // 1. Validate account ownership
      await this.validateAccountOwnership(accountId, userId);

      // 2. Generate operation ID
      const operationId = uuidv4();

      // 3. Create operation record and send command atomically via outbox
      await this.createOperationWithCommand(operationId, accountId, userId, 'deposit', amount);

      logger.info('Deposit processing completed', { operationId, accountId, amount });

      return {
        operationId,
        status: 'PENDING'
      };
    } catch (error) {
      logger.error('Error processing deposit', { error, accountId, amount, userId });
      throw error;
    }
  }

  /**
   * Process a withdraw request
   */
  async processWithdraw(
    accountId: string,
    amount: number,
    userId: string
  ): Promise<{ operationId: string; status: string }> {
    logger.info('Processing withdraw in service', { accountId, amount, userId });

    try {
      // 1. Validate account ownership
      await this.validateAccountOwnership(accountId, userId);

      // 2. Generate operation ID
      const operationId = uuidv4();

      // 3. Create operation record and send command atomically via outbox
      await this.createOperationWithCommand(operationId, accountId, userId, 'withdraw', amount);

      logger.info('Withdraw processing completed', { operationId, accountId, amount });

      return {
        operationId,
        status: 'PENDING'
      };
    } catch (error) {
      logger.error('Error processing withdraw', { error, accountId, amount, userId });
      throw error;
    }
  }

  /**
   * Get operation
   */
  async getOperation(operationId: string): Promise<{
    operationId: string;
    status: string;
    type: string;
    amount: number;
    accountId: string;
    timestamp: string;
  }> {
    logger.info('Getting operation in service', { operationId });

    try {
      // 1. Fetch operation from repository
      const operation = await this.operationRepository.getById(operationId);

      if (!operation) {
        throw new NotFoundError('Operation not found');
      }

      // 2. Return operation
      return {
        operationId: operation.operationId,
        status: operation.status.toUpperCase(),
        type: operation.type.toUpperCase(),
        amount: operation.amount,
        accountId: operation.accountId,
        timestamp: operation.completedAt || operation.createdAt
      };
    } catch (error) {
      logger.error('Error getting operation', { error, operationId });
      throw error;
    }
  }
}

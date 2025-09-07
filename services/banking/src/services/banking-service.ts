import { Logger } from '@aws-lambda-powertools/logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  DepositEvent, 
  WithdrawSuccessEvent, 
  WithdrawFailedEvent, 
  CreateAccountEvent, 
  CloseAccountEvent 
} from '@digital-banking/events';
import { DepositCommand, WithdrawCommand } from '@digital-banking/commands';
import { Operation, Account, AccountStatus } from '@digital-banking/models';
import { 
  IOperationRepository, 
  IAccountsProjectionRepository 
} from '../repositories/interfaces';

// Powertools
const logger = new Logger();

/**
 * Banking Service - Business logic for banking operations
 */
export class BankingService {
  private operationRepository: IOperationRepository;
  private accountsProjectionRepository: IAccountsProjectionRepository;

  constructor(
    operationRepository: IOperationRepository,
    accountsProjectionRepository: IAccountsProjectionRepository
  ) {
    // Inject repositories
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
        throw new Error('Account not found, not owned by user, or not active');
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
    const command = type === 'deposit' 
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
   * Update operation status
   */
  private async updateOperationStatus(
    operationId: string, 
    status: 'pending' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    await this.operationRepository.updateStatus(operationId, status, errorMessage);
    logger.info('Operation status updated', { operationId, status });
  }

  /**
   * Update accounts projection table
   */
  private async updateAccountsProjection(accountId: string, userId: string, status: AccountStatus): Promise<void> {
    const accountProjection = {
      accountId,
      userId,
      status
    };
    await this.accountsProjectionRepository.upsert(accountProjection);
    logger.info('Accounts projection updated', { accountId, userId, status });
  }
  /**
   * Process a deposit event
   */
  async processDepositEvent(event: DepositEvent): Promise<void> {
    logger.info('Processing deposit event in service', { eventId: event.id });
    
    try {
      // 1. Update operation status to COMPLETED
      await this.updateOperationStatus(event.operationId, 'completed');
      logger.info('Deposit event processed successfully', { eventId: event.id, operationId: event.operationId });
    } catch (error) {
      logger.error('Error processing deposit event', { error, eventId: event.id });
      throw error;
    }
  }

  /**
   * Process a withdraw success event
   */
  async processWithdrawSuccessEvent(event: WithdrawSuccessEvent): Promise<void> {
    logger.info('Processing withdraw success event in service', { eventId: event.id });
    
    try {
      // 1. Update operation status to COMPLETED
      await this.updateOperationStatus(event.operationId, 'completed');
      logger.info('Withdraw success event processed successfully', { eventId: event.id, operationId: event.operationId });
    } catch (error) {
      logger.error('Error processing withdraw success event', { error, eventId: event.id });
      throw error;
    }
  }

  /**
   * Process a withdraw failed event
   */
  async processWithdrawFailedEvent(event: WithdrawFailedEvent): Promise<void> {
    logger.info('Processing withdraw failed event in service', { eventId: event.id });
    
    try {
      // 1. Update operation status to FAILED
      await this.updateOperationStatus(event.operationId, 'failed', event.reason);
      logger.info('Withdraw failed event processed successfully', { eventId: event.id, operationId: event.operationId });
    } catch (error) {
      logger.error('Error processing withdraw failed event', { error, eventId: event.id });
      throw error;
    }
  }

  /**
   * Process a create account event
   */
  async processCreateAccountEvent(event: CreateAccountEvent): Promise<void> {
    logger.info('Processing create account event in service', { eventId: event.id });
    
    try {
      // 1. Update accounts projection table with minimal data
      await this.updateAccountsProjection(event.accountId, event.userId, AccountStatus.ACTIVE);
      logger.info('Create account event processed successfully', { eventId: event.id, accountId: event.accountId });
    } catch (error) {
      logger.error('Error processing create account event', { error, eventId: event.id });
      throw error;
    }
  }

  /**
   * Process a close account event
   */
  async processCloseAccountEvent(event: CloseAccountEvent): Promise<void> {
    logger.info('Processing close account event in service', { eventId: event.id });
    
    try {
      // 1. Update account status to CLOSED in projection table
      await this.accountsProjectionRepository.updateStatus(
        event.accountId, 
        AccountStatus.CLOSED
      );
      
      logger.info('Close account event processed successfully', { eventId: event.id, accountId: event.accountId });
    } catch (error) {
      logger.error('Error processing close account event', { error, eventId: event.id });
      throw error;
    }
  }
  /**
   * Process a deposit request
   */
  async processDeposit(accountId: string, amount: number, userId: string): Promise<{ operationId: string, status: string }> {
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
  async processWithdraw(accountId: string, amount: number, userId: string): Promise<{ operationId: string, status: string }> {
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
    operationId: string, 
    status: string, 
    type: string, 
    amount: number, 
    accountId: string, 
    timestamp: string 
  }> {
    logger.info('Getting operation in service', { operationId });
    
    try {
      // 1. Fetch operation from repository
      const operation = await this.operationRepository.getById(operationId);
      
      if (!operation) {
        throw new Error('Operation not found');
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

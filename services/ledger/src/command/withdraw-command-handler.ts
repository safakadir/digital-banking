import { TelemetryBundle } from '@digital-banking/utils';
import { WithdrawCommand } from '@digital-banking/commands';
import { WithdrawSuccessEvent, WithdrawFailedEvent } from '@digital-banking/events';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { JournalEntry } from '../models/journal-entry';
import { InboxItem, OutboxItem } from '@digital-banking/models';
import { LedgerServiceConfig } from '@digital-banking/config';

export class WithdrawCommandHandler {
  constructor(
    private readonly telemetry: TelemetryBundle,
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly config: LedgerServiceConfig
  ) {}

  /**
   * Process a withdraw command with event sourcing and double-entry bookkeeping
   */
  async handle(command: WithdrawCommand): Promise<void> {
    const { logger } = this.telemetry;

    if (command.type !== 'WITHDRAW_CMD') {
      logger.warn('Invalid command type for withdraw handler', { commandType: command.type });
      return;
    }

    logger.info('Processing withdraw command with event sourcing pattern', {
      commandId: command.id,
      accountId: command.accountId,
      amount: command.amount,
      operationId: command.operationId
    });

    const now = new Date().toISOString();
    const transactionId = uuidv4();

    // Create journal entries for double-entry bookkeeping
    const journalEntryDebit: JournalEntry = {
      id: `journal#${uuidv4()}`,
      transactionId,
      accountId: command.accountId,
      userId: command.userId,
      operationId: command.operationId,
      entryType: 'DEBIT', // Debit from customer account
      amount: command.amount,
      description: command.description || 'Withdraw - Customer Account',
      createdAt: now
    };

    const journalEntryCredit: JournalEntry = {
      id: `journal#${uuidv4()}`,
      transactionId,
      accountId: 'SYSTEM_CASH',
      userId: command.userId,
      operationId: command.operationId,
      entryType: 'CREDIT', // Credit to cash/external account
      amount: command.amount,
      description: command.description || 'Withdraw - External Cash',
      createdAt: now
    };

    const withdrawSuccessEventId = uuidv4();

    // Try atomic withdraw with balance condition check
    try {
      const withdrawSuccessEvent: WithdrawSuccessEvent = {
        id: withdrawSuccessEventId,
        type: 'WITHDRAW_SUCCESS_EVENT',
        timestamp: now,
        accountId: command.accountId,
        userId: command.userId,
        amount: command.amount,
        operationId: command.operationId,
        transactionId,
        balance: 0 // Will be calculated after update
      };

      const outboxItem: OutboxItem = {
        id: withdrawSuccessEvent.id,
        timestamp: withdrawSuccessEvent.timestamp,
        eventType: withdrawSuccessEvent.type,
        eventData: withdrawSuccessEvent
      };

      const inboxItem: InboxItem = {
        messageId: command.id,
        timestamp: now
      };

      // Attempt atomic transaction with balance condition
      const transactCommand = new TransactWriteCommand({
        TransactItems: [
          // a) Inbox insert (IN_PROGRESS)
          {
            Put: {
              TableName: this.config.inboxTableName,
              Item: inboxItem,
              ConditionExpression: 'attribute_not_exists(messageId)'
            }
          },
          // b) Journal Entry - Debit (Customer Account)
          {
            Put: {
              TableName: this.config.ledgerTableName,
              Item: journalEntryDebit
            }
          },
          // c) Journal Entry - Credit (External Cash)
          {
            Put: {
              TableName: this.config.ledgerTableName,
              Item: journalEntryCredit
            }
          },
          // d) Atomic Balance Decrement with condition check
          {
            Update: {
              TableName: this.config.balanceTableName,
              Key: { accountId: command.accountId },
              UpdateExpression: 'ADD balance :negativeAmount SET updatedAt = :now',
              ConditionExpression: 'balance >= :amount', // Atomic condition check
              ExpressionAttributeValues: {
                ':negativeAmount': -command.amount,
                ':amount': command.amount,
                ':now': now
              }
            }
          },
          // e) Outbox event for success
          {
            Put: {
              TableName: this.config.outboxTableName,
              Item: outboxItem
            }
          }
        ]
      });

      await this.dynamoClient.send(transactCommand);

      logger.info('Withdraw command processed successfully with atomic balance condition', {
        commandId: command.id,
        transactionId,
        accountId: command.accountId,
        amount: command.amount,
        eventId: withdrawSuccessEvent.id,
        journalEntries: [journalEntryDebit.id, journalEntryCredit.id]
      });
    } catch (error: any) {
      if (error.name === 'TransactionCanceledException') {
        // Use CancellationReasons to determine which condition failed
        const cancellationReasons = error.CancellationReasons;

        // Check if inbox insert failed (item 0) - command already processed
        if (
          cancellationReasons &&
          cancellationReasons[0] &&
          cancellationReasons[0].Code === 'ConditionalCheckFailed'
        ) {
          logger.info('Withdraw command already processed, skipping', {
            commandId: command.id,
            accountId: command.accountId,
            reason: 'Command duplicate - inbox record already exists'
          });
          return;
        }

        // Check if balance update failed (item 3) - insufficient funds
        if (
          cancellationReasons &&
          cancellationReasons[3] &&
          cancellationReasons[3].Code === 'ConditionalCheckFailed'
        ) {
          this.handleFailedWithdraw(command);
          return;
        }

        // Fallback for unexpected conditional check failures
        logger.error('Unexpected conditional check failure', {
          commandId: command.id,
          accountId: command.accountId,
          cancellationReasons,
          error: error.message
        });
        throw error;
      }

      logger.error('Error processing withdraw command transaction', {
        error,
        commandId: command.id,
        accountId: command.accountId
      });
      throw error;
    }
  }

  private async handleFailedWithdraw(command: WithdrawCommand): Promise<void> {
    const { logger } = this.telemetry;

    const now = new Date().toISOString();
    const withdrawFailedEventId = uuidv4();

    try {
      // Insufficient funds - handle as separate transaction
      const withdrawFailedEvent: WithdrawFailedEvent = {
        id: withdrawFailedEventId,
        type: 'WITHDRAW_FAILED_EVENT',
        timestamp: now,
        accountId: command.accountId,
        userId: command.userId,
        amount: command.amount,
        operationId: command.operationId,
        reason: 'Insufficient funds'
      };

      const failedOutboxItem: OutboxItem = {
        id: withdrawFailedEvent.id,
        timestamp: withdrawFailedEvent.timestamp,
        eventType: withdrawFailedEvent.type,
        eventData: withdrawFailedEvent
      };

      const inboxItem: InboxItem = {
        messageId: command.id,
        timestamp: now
      };

      // Create separate transaction for failed case (no journal entries, no balance change)
      const failedTransactCommand = new TransactWriteCommand({
        TransactItems: [
          // a) Inbox insert (IN_PROGRESS) - try again for failed case
          {
            Put: {
              TableName: this.config.inboxTableName,
              Item: inboxItem,
              ConditionExpression: 'attribute_not_exists(messageId)'
            }
          },
          // b) Outbox event for publishing failed event
          {
            Put: {
              TableName: this.config.outboxTableName,
              Item: failedOutboxItem
            }
          }
        ]
      });

      await this.dynamoClient.send(failedTransactCommand);
      logger.info(
        'Withdraw command handled successfully - insufficient funds (business rule)',
        {
          commandId: command.id,
          accountId: command.accountId,
          requestedAmount: command.amount,
          eventId: withdrawFailedEvent.id,
          inboxStatus: 'SUCCESS', // Command processing successful
          businessOutcome: 'FAILED' // Business rule prevented transaction
          }
      );
    } catch (error: any) {
      logger.error('Error processing withdraw command transaction in failed case', {
        error,
        commandId: command.id,
        accountId: command.accountId
      });
      throw error;
    }
  }
}

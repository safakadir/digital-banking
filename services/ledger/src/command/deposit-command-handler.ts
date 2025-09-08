import { TelemetryBundle } from '@digital-banking/utils';
import { DepositCommand } from '@digital-banking/commands';
import { DepositEvent } from '@digital-banking/events';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  GetCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { JournalEntry } from '../models/journal-entry';
import { InboxItem, OutboxItem } from '@digital-banking/models';
import { LedgerServiceConfig } from '@digital-banking/config';

export class DepositCommandHandler {
  constructor(
    private readonly telemetry: TelemetryBundle,
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly config: LedgerServiceConfig
  ) {}

  /**
   * Process a deposit command with event sourcing and double-entry bookkeeping
   */
  async handle(command: DepositCommand): Promise<void> {
    const { logger } = this.telemetry;

    if (command.type !== 'DEPOSIT_CMD') {
      logger.warn('Invalid command type for deposit handler', { commandType: command.type });
      return;
    }

    logger.info('Processing deposit command with event sourcing pattern', {
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
      accountId: 'SYSTEM_CASH',
      userId: command.userId,
      operationId: `${command.operationId}#DEBIT`,
      entryType: 'DEBIT', // Debit to cash/external account
      amount: command.amount,
      description: command.description || 'Deposit - External Cash',
      createdAt: now
    };

    const journalEntryCredit: JournalEntry = {
      id: `journal#${uuidv4()}`,
      transactionId,
      accountId: command.accountId,
      userId: command.userId,
      operationId: `${command.operationId}#CREDIT`,
      entryType: 'CREDIT', // Credit to customer account
      amount: command.amount,
      description: command.description || 'Deposit - Customer Account',
      createdAt: now
    };

    // Create deposit event to be published (balance will be calculated after atomic update)
    const depositEventId = uuidv4();
    const depositEvent: DepositEvent = {
      id: depositEventId,
      type: 'DEPOSIT_EVENT',
      timestamp: now,
      accountId: command.accountId,
      userId: command.userId,
      amount: command.amount,
      operationId: command.operationId,
      transactionId,
      balance: 0 // Will be set in the update expression result
    };

    // Create outbox item for event publishing
    const outboxItem: OutboxItem = {
      id: depositEvent.id,
      timestamp: depositEvent.timestamp,
      eventType: depositEvent.type,
      eventData: depositEvent
    };

    const inboxItem: InboxItem = {
      messageId: command.id,
      timestamp: now
    };

    try {
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
          // b) Journal Entry - Debit (External Cash)
          {
            Put: {
              TableName: this.config.ledgerTableName,
              Item: journalEntryDebit
            }
          },
          // c) Journal Entry - Credit (Customer Account)
          {
            Put: {
              TableName: this.config.ledgerTableName,
              Item: journalEntryCredit
            }
          },
          // d) Atomic Balance Increment
          {
            Update: {
              TableName: this.config.balanceTableName,
              Key: { accountId: command.accountId },
              UpdateExpression: 'ADD balance :amount SET updatedAt = :now',
              ExpressionAttributeValues: {
                ':amount': command.amount,
                ':now': now
              },
              // Initialize balance to 0 if account doesn't exist
              ConditionExpression: 'attribute_exists(accountId) OR attribute_not_exists(accountId)'
            }
          },
          // e) Outbox event for publishing (updated with new balance after calculation)
          {
            Put: {
              TableName: this.config.outboxTableName,
              Item: outboxItem
            }
          }
        ]
      });

      await this.dynamoClient.send(transactCommand);

      // Get the updated balance to include in the event (eventual consistency is fine here)
      const balanceResult = await this.dynamoClient.send(
        new GetCommand({
          TableName: this.config.balanceTableName,
          Key: { accountId: command.accountId }
        })
      );
      const newBalance = balanceResult.Item?.balance || command.amount;

      // Update the event in outbox with correct balance
      const finalDepositEvent: DepositEvent = {
        ...depositEvent,
        balance: newBalance
      };

      await this.dynamoClient.send(
        new UpdateCommand({
          TableName: this.config.outboxTableName,
          Key: { id: depositEventId },
          UpdateExpression: 'SET eventData = :eventData',
          ExpressionAttributeValues: {
            ':eventData': finalDepositEvent
          }
        })
      );

      logger.info('Deposit command processed successfully with atomic balance update', {
        commandId: command.id,
        transactionId,
        accountId: command.accountId,
        amount: command.amount,
        newBalance,
        eventId: depositEvent.id,
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
          logger.info('Deposit command already processed, skipping', {
            commandId: command.id,
            accountId: command.accountId,
            reason: 'Command duplicate - inbox record already exists'
          });
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

      logger.error('Error processing deposit command transaction', {
        error,
        commandId: command.id,
        accountId: command.accountId
      });
      throw error;
    }
  }
}

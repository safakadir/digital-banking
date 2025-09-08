import { TelemetryBundle } from '@digital-banking/utils';
import { DepositCommand } from '@digital-banking/commands';
import { DepositEvent } from '@digital-banking/events';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  GetCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { JournalEntry } from '../models/journal-entry';
import { OutboxItem } from '@digital-banking/models';

export class DepositCommandHandler {
  private dynamoClient: DynamoDBDocumentClient;
  private inboxTableName: string;
  private ledgerTableName: string;
  private balanceTableName: string;
  private outboxTableName: string;

  constructor(private readonly telemetry: TelemetryBundle) {
    // Initialize DynamoDB client for transactions
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.dynamoClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true
      }
    });
    this.inboxTableName =
      process.env.INBOX_TABLE || `LedgerSvc-CommandFn-Inbox-${process.env.ENV || 'dev'}`;
    this.ledgerTableName =
      process.env.LEDGER_TABLE_NAME || `LedgerSvc-LedgerTable-${process.env.ENV || 'dev'}`;
    this.balanceTableName =
      process.env.BALANCE_TABLE_NAME || `LedgerSvc-BalanceTable-${process.env.ENV || 'dev'}`;
    this.outboxTableName =
      process.env.OUTBOX_TABLE_NAME || `LedgerSvc-OutboxTable-${process.env.ENV || 'dev'}`;
  }

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
    const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours TTL
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

    try {
      const transactCommand = new TransactWriteCommand({
        TransactItems: [
          // a) Inbox insert (IN_PROGRESS)
          {
            Put: {
              TableName: this.inboxTableName,
              Item: {
                id: command.id,
                status: 'IN_PROGRESS',
                createdAt: now,
                updatedAt: now,
                expiration: ttl
              },
              ConditionExpression: 'attribute_not_exists(id)'
            }
          },
          // b) Journal Entry - Debit (External Cash)
          {
            Put: {
              TableName: this.ledgerTableName,
              Item: journalEntryDebit
            }
          },
          // c) Journal Entry - Credit (Customer Account)
          {
            Put: {
              TableName: this.ledgerTableName,
              Item: journalEntryCredit
            }
          },
          // d) Atomic Balance Increment
          {
            Update: {
              TableName: this.balanceTableName,
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
              TableName: this.outboxTableName,
              Item: outboxItem
            }
          },
          // f) Inbox status → SUCCESS
          {
            Update: {
              TableName: this.inboxTableName,
              Key: { id: command.id },
              UpdateExpression: 'SET #status = :success, updatedAt = :now',
              ConditionExpression: '#status = :inprogress',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':success': 'SUCCESS',
                ':inprogress': 'IN_PROGRESS',
                ':now': now
              }
            }
          }
        ]
      });

      await this.dynamoClient.send(transactCommand);

      // Get the updated balance to include in the event (eventual consistency is fine here)
      const balanceResult = await this.dynamoClient.send(
        new GetCommand({
          TableName: this.balanceTableName,
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
          TableName: this.outboxTableName,
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
      if (error.name === 'ConditionalCheckFailedException') {
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

        // Check if inbox status update failed (item 5) - status inconsistency
        if (
          cancellationReasons &&
          cancellationReasons[5] &&
          cancellationReasons[5].Code === 'ConditionalCheckFailed'
        ) {
          logger.warn('Inbox status update failed - possible race condition', {
            commandId: command.id,
            accountId: command.accountId,
            reason: 'Inbox status not in expected IN_PROGRESS state'
          });
          throw error; // Re-throw to trigger retry mechanism
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

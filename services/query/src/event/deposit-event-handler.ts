import { TelemetryBundle } from '@digital-banking/utils';
import { DepositEvent } from '@digital-banking/events';
import { DynamoDBDocumentClient, TransactWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { InboxItem } from '@digital-banking/models';

export class DepositEventHandler {
  private dynamoClient: DynamoDBDocumentClient
  private inboxTableName: string;

  constructor(private readonly telemetry: TelemetryBundle) {
    this.dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
    this.inboxTableName = 
      process.env.INBOX_TABLE_NAME || `QuerySvc-InboxTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Process a deposit event with transaction-based inbox pattern
   */
  async handle(event: DepositEvent): Promise<void> {
    const { logger } = this.telemetry;

    logger.info('Processing deposit event with transaction-based inbox pattern', {
      eventId: event.id,
      accountId: event.accountId,
      operationId: event.operationId
    });

    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours TTL

    const transactionTableName = 
      process.env.TRANSACTION_TABLE_NAME || 
      `QuerySvc-TransactionTable-${process.env.ENV || 'dev'}`;
    
    const balanceTableName = 
      process.env.BALANCE_TABLE_NAME || 
      `QuerySvc-BalanceTable-${process.env.ENV || 'dev'}`;

    const inboxItem: InboxItem = {
      messageId: event.id,
      timestamp: now
    };

    try {
      const transactCommand = new TransactWriteCommand({
        TransactItems: [
          // a) Inbox insert (IN_PROGRESS)
          {
            Put: {
              TableName: this.inboxTableName,
              Item: inboxItem,
              ConditionExpression: 'attribute_not_exists(messageId)'
            }
          },
          // b) Domain state update - Create transaction record
          {
            Put: {
              TableName: transactionTableName,
              Item: {
                id: event.operationId,
                accountId: event.accountId,
                type: 'deposit',
                amount: event.amount,
                status: 'completed',
                timestamp: now,
                description: `Deposit of ${event.amount}`
              }
            }
          },
          // c) Update balance with atomic increment (creates record with 0 if not exists)
          {
            Update: {
              TableName: balanceTableName,
              Key: { accountId: event.accountId },
              UpdateExpression: 'ADD balance :amount SET lastUpdated = :now',
              ExpressionAttributeValues: {
                ':amount': event.amount,
                ':now': now
              }
            }
          }
        ]
      });

      await this.dynamoClient.send(transactCommand);

      logger.info('Deposit event processed successfully with transaction', {
        eventId: event.id,
        accountId: event.accountId,
        operationId: event.operationId,
        amount: event.amount
      });
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        // Use CancellationReasons to determine which condition failed
        const cancellationReasons = error.CancellationReasons;

        // Check if inbox insert failed (item 0) - event already processed
        if (
          cancellationReasons &&
          cancellationReasons[0] &&
          cancellationReasons[0].Code === 'ConditionalCheckFailed'
        ) {
          logger.info('Deposit event already processed, skipping', {
            eventId: event.id,
            accountId: event.accountId,
            operationId: event.operationId,
            reason: 'Event duplicate - inbox record already exists'
          });
          return;
        }

        // Check if transaction creation failed (item 1) - transaction already exists
        if (
          cancellationReasons &&
          cancellationReasons[1] &&
          cancellationReasons[1].Code === 'ConditionalCheckFailed'
        ) {
          logger.info('Transaction already exists for deposit event, skipping', {
            eventId: event.id,
            accountId: event.accountId,
            operationId: event.operationId,
            reason: 'Transaction record already exists'
          });
          return; // Skip as transaction might already be processed
        }

        // Balance update uses ADD operation which doesn't fail for non-existent records
        // No special handling needed for item 2 (balance update)

        // Fallback for unexpected conditional check failures
        logger.error('Unexpected conditional check failure', {
          eventId: event.id,
          accountId: event.accountId,
          operationId: event.operationId,
          cancellationReasons,
          error: error.message
        });
        throw error;
      }

      logger.error('Error processing deposit event transaction', {
        error,
        eventId: event.id,
        accountId: event.accountId,
        operationId: event.operationId
      });
      throw error;
    }
  }
}

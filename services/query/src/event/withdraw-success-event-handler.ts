import { TelemetryBundle } from '@digital-banking/utils';
import { WithdrawSuccessEvent } from '@digital-banking/events';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class WithdrawSuccessEventHandler {
  private dynamoClient: DynamoDBDocumentClient
  private inboxTableName: string;

  constructor(private readonly telemetry: TelemetryBundle) {
    this.dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
    this.inboxTableName = 
      process.env.INBOX_TABLE_NAME || `QuerySvc-InboxTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Process a withdraw success event with transaction-based inbox pattern
   */
  async handle(event: WithdrawSuccessEvent): Promise<void> {
    const { logger } = this.telemetry;

    logger.info('Processing withdraw success event with transaction-based inbox pattern', {
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

    try {
      const transactCommand = new TransactWriteCommand({
        TransactItems: [
          // a) Inbox insert (IN_PROGRESS)
          {
            Put: {
              TableName: this.inboxTableName,
              Item: {
                messageId: event.id,
                status: 'IN_PROGRESS',
                createdAt: now,
                updatedAt: now,
                ttl
              },
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
                type: 'withdraw',
                amount: event.amount,
                balance: event.newBalance,
                status: 'completed',
                timestamp: now,
                description: `Withdrawal of ${event.amount}`
              }
            }
          },
          // c) Update balance
          {
            Update: {
              TableName: balanceTableName,
              Key: { accountId: event.accountId },
              UpdateExpression: 'SET balance = :newBalance, lastUpdated = :now',
              ConditionExpression: 'attribute_exists(accountId)',
              ExpressionAttributeValues: {
                ':newBalance': event.newBalance,
                ':now': now
              }
            }
          },
          // d) Inbox status → SUCCESS
          {
            Update: {
              TableName: this.inboxTableName,
              Key: { messageId: event.id },
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

      logger.info('Withdraw success event processed successfully with transaction', {
        eventId: event.id,
        accountId: event.accountId,
        operationId: event.operationId,
        amount: event.amount,
        newBalance: event.newBalance
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
          logger.info('Withdraw success event already processed, skipping', {
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
          logger.info('Transaction already exists for withdraw success event, skipping', {
            eventId: event.id,
            accountId: event.accountId,
            operationId: event.operationId,
            reason: 'Transaction record already exists'
          });
          return; // Skip as transaction might already be processed
        }

        // Check if balance update failed (item 2) - balance not found
        if (
          cancellationReasons &&
          cancellationReasons[2] &&
          cancellationReasons[2].Code === 'ConditionalCheckFailed'
        ) {
          logger.warn('Balance not found for withdraw success event', {
            eventId: event.id,
            accountId: event.accountId,
            operationId: event.operationId,
            reason: 'Account balance does not exist'
          });
          return; // Skip as account might not exist or be closed
        }

        // Check if inbox status update failed (item 3) - status inconsistency
        if (
          cancellationReasons &&
          cancellationReasons[3] &&
          cancellationReasons[3].Code === 'ConditionalCheckFailed'
        ) {
          logger.warn('Inbox status update failed - possible race condition', {
            eventId: event.id,
            accountId: event.accountId,
            operationId: event.operationId,
            reason: 'Inbox status not in expected IN_PROGRESS state'
          });
          throw error; // Re-throw to trigger retry mechanism
        }

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

      logger.error('Error processing withdraw success event transaction', {
        error,
        eventId: event.id,
        accountId: event.accountId,
        operationId: event.operationId
      });
      throw error;
    }
  }
}

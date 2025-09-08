import { TelemetryBundle } from '@digital-banking/utils';
import { CreateAccountEvent } from '@digital-banking/events';
import { AccountStatus } from '@digital-banking/models';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class CreateAccountEventHandler {
  private dynamoClient: DynamoDBDocumentClient
  private inboxTableName: string;

  constructor(private readonly telemetry: TelemetryBundle) {
    this.dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
    this.inboxTableName = 
      process.env.INBOX_TABLE_NAME || `QuerySvc-InboxTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Process a create account event with transaction-based inbox pattern
   */
  async handle(event: CreateAccountEvent): Promise<void> {
    const { logger } = this.telemetry;

    logger.info('Processing create account event with transaction-based inbox pattern', {
      eventId: event.id,
      accountId: event.accountId
    });

    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours TTL

    const accountProjectionTableName = 
      process.env.ACCOUNT_PROJECTION_TABLE_NAME || 
      `QuerySvc-AccountProjectionTable-${process.env.ENV || 'dev'}`;
    
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
          // b) Domain state update - Create account projection
          {
            Put: {
              TableName: accountProjectionTableName,
              Item: {
                accountId: event.accountId,
                userId: event.userId,
                status: AccountStatus.ACTIVE,
                name: event.name
              }
            }
          },
          // c) Create initial balance record
          {
            Put: {
              TableName: balanceTableName,
              Item: {
                accountId: event.accountId,
                balance: 0,
                currency: event.currency,
                lastUpdated: now
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

      logger.info('Create account event processed successfully with transaction', {
        eventId: event.id,
        accountId: event.accountId,
        userId: event.userId
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
          logger.info('Create account event already processed, skipping', {
            eventId: event.id,
            accountId: event.accountId,
            reason: 'Event duplicate - inbox record already exists'
          });
          return;
        }

        // Check if account projection creation failed (item 1) - account already exists
        if (
          cancellationReasons &&
          cancellationReasons[1] &&
          cancellationReasons[1].Code === 'ConditionalCheckFailed'
        ) {
          logger.info('Account projection creation skipped - account already exists', {
            eventId: event.id,
            accountId: event.accountId,
            reason: 'Account already exists in projection'
          });
          // Continue processing - end state is correct
        }

        // Check if balance creation failed (item 2) - balance already exists
        if (
          cancellationReasons &&
          cancellationReasons[2] &&
          cancellationReasons[2].Code === 'ConditionalCheckFailed'
        ) {
          logger.info('Balance creation skipped - balance already exists', {
            eventId: event.id,
            accountId: event.accountId,
            reason: 'Balance already exists for account'
          });
          // Continue processing - end state is correct
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
            reason: 'Inbox status not in expected IN_PROGRESS state'
          });
          throw error; // Re-throw to trigger retry mechanism
        }

        // Fallback for unexpected conditional check failures
        logger.error('Unexpected conditional check failure', {
          eventId: event.id,
          accountId: event.accountId,
          cancellationReasons,
          error: error.message
        });
        throw error;
      }

      logger.error('Error processing create account event transaction', {
        error,
        eventId: event.id,
        accountId: event.accountId
      });
      throw error;
    }
  }
}

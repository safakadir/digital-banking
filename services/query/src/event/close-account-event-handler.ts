import { TelemetryBundle } from '@digital-banking/utils';
import { CloseAccountEvent } from '@digital-banking/events';
import { AccountStatus, InboxItem } from '@digital-banking/models';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class CloseAccountEventHandler {
  private dynamoClient: DynamoDBDocumentClient
  private inboxTableName: string;

  constructor(private readonly telemetry: TelemetryBundle) {
    this.dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
    this.inboxTableName = 
      process.env.QUERY_INBOX_TABLE_NAME || `QuerySvc-InboxTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Process a close account event with transaction-based inbox pattern
   */
  async handle(event: CloseAccountEvent): Promise<void> {
    const { logger } = this.telemetry;

    logger.info('Processing close account event with transaction-based inbox pattern', {
      eventId: event.id,
      accountId: event.accountId
    });

    const now = new Date().toISOString();

    const accountProjectionTableName = 
      process.env.ACCOUNTS_PROJECTION_TABLE_NAME || 
      `QuerySvc-AccountsProjectionTable-${process.env.ENV || 'dev'}`;

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
          // b) Domain state update - Update account status to CLOSED
          {
            Update: {
              TableName: accountProjectionTableName,
              Key: { accountId: event.accountId },
              UpdateExpression: 'SET #status = :status',
              ConditionExpression: 'attribute_exists(accountId)',
              ExpressionAttributeNames: {
                '#status': 'status'
              },
              ExpressionAttributeValues: {
                ':status': AccountStatus.CLOSED
              }
            }
          }
        ]
      });

      await this.dynamoClient.send(transactCommand);

      logger.info('Close account event processed successfully with transaction', {
        eventId: event.id,
        accountId: event.accountId
      });
    } catch (error: any) {
      if (error.name === 'TransactionCanceledException') {
        // Use CancellationReasons to determine which condition failed
        const cancellationReasons = error.CancellationReasons;

        // Check if inbox insert failed (item 0) - event already processed
        if (
          cancellationReasons &&
          cancellationReasons[0] &&
          cancellationReasons[0].Code === 'ConditionalCheckFailed'
        ) {
          logger.info('Close account event already processed, skipping', {
            eventId: event.id,
            accountId: event.accountId,
            reason: 'Event duplicate - inbox record already exists'
          });
          return;
        }

        // Check if account update failed (item 1) - account not found
        if (
          cancellationReasons &&
          cancellationReasons[1] &&
          cancellationReasons[1].Code === 'ConditionalCheckFailed'
        ) {
          logger.warn('Account not found for close event, skipping', {
            eventId: event.id,
            accountId: event.accountId,
            reason: 'Account does not exist or already closed'
          });
          return; // Skip as account might already be closed or doesn't exist
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

      logger.error('Error processing close account event transaction', {
        error,
        eventId: event.id,
        accountId: event.accountId
      });
      throw error;
    }
  }
}

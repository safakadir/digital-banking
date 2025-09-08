import { TelemetryBundle } from '@digital-banking/utils';
import { WithdrawFailedEvent } from '@digital-banking/events';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { InboxItem } from '@digital-banking/models';
import { BankingServiceConfig } from '@digital-banking/config';

export class WithdrawFailedEventHandler {
  constructor(
    private readonly telemetry: TelemetryBundle,
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly config: BankingServiceConfig
  ) {}

  /**
   * Process a withdraw failed event with transaction-based inbox pattern
   */
  async handle(event: WithdrawFailedEvent): Promise<void> {
    const { logger } = this.telemetry;

    logger.info('Processing withdraw failed event with transaction-based inbox pattern', {
      eventId: event.id
    });

    const now = new Date().toISOString();

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
              TableName: this.config.inboxTableName,
              Item: inboxItem,
              ConditionExpression: 'attribute_not_exists(messageId)'
            }
          },
          // b) Domain state update - Update operation status to FAILED
          {
            Update: {
              TableName: this.config.operationsTableName,
              Key: { operationId: event.operationId },
              UpdateExpression:
                'SET #status = :status, updatedAt = :updatedAt, errorMessage = :errorMessage',
              ConditionExpression: '#status = :pendingStatus',
              ExpressionAttributeNames: {
                '#status': 'status'
              },
              ExpressionAttributeValues: {
                ':status': 'failed',
                ':updatedAt': now,
                ':errorMessage': event.reason,
                ':pendingStatus': 'pending'
              }
            }
          }
        ]
      });

      await this.dynamoClient.send(transactCommand);
      logger.info('Withdraw failed event processed successfully with transaction', {
        eventId: event.id,
        operationId: event.operationId,
        reason: event.reason
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
          logger.info('Withdraw failed event already processed, skipping', {
            eventId: event.id,
            operationId: event.operationId,
            reason: 'Event duplicate - inbox record already exists'
          });
          return;
        }

        // Check if operation update failed (item 1) - operation not in pending state
        if (
          cancellationReasons &&
          cancellationReasons[1] &&
          cancellationReasons[1].Code === 'ConditionalCheckFailed'
        ) {
          logger.warn('Operation not in pending state for withdraw failed event', {
            eventId: event.id,
            operationId: event.operationId,
            reason: 'Operation already completed, failed, or does not exist'
          });
          return; // Skip as operation might already be processed or in wrong state
        }

        // Fallback for unexpected conditional check failures
        logger.error('Unexpected conditional check failure', {
          eventId: event.id,
          operationId: event.operationId,
          cancellationReasons,
          error: error.message
        });
        throw error;
      }

      logger.error('Error processing withdraw failed event transaction', {
        error,
        eventId: event.id,
        operationId: event.operationId
      });
      throw error;
    }
  }
}

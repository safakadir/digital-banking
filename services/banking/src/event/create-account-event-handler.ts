import { TelemetryBundle } from '@digital-banking/utils';
import { CreateAccountEvent } from '@digital-banking/events';
import { AccountStatus, InboxItem } from '@digital-banking/models';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class CreateAccountEventHandler {
  private dynamoClient: DynamoDBDocumentClient;
  private inboxTableName: string;

  constructor(private readonly telemetry: TelemetryBundle) {
    // Initialize DynamoDB client for transactions
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.dynamoClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true
      }
    });
    this.inboxTableName =
      process.env.BANKING_INBOX_TABLE_NAME || `BankingSvc-InboxTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Process a create account event with transaction-based inbox pattern
   */
  async handle(event: CreateAccountEvent): Promise<void> {
    const { logger } = this.telemetry;

    logger.info('Processing create account event with transaction-based inbox pattern', {
      eventId: event.id
    });

    const now = new Date().toISOString();

    const accountsProjectionTableName =
      process.env.ACCOUNTS_PROJECTION_TABLE_NAME ||
      `BankingSvc-AccountsProjectionTable-${process.env.ENV || 'dev'}`;

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
          // b) Domain state update - Create/Update accounts projection
          {
            Put: {
              TableName: accountsProjectionTableName,
              Item: {
                accountId: event.accountId,
                userId: event.userId,
                status: AccountStatus.ACTIVE
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
      if (error.name === 'TransactionCanceledException') {
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

        // Check if account creation failed (item 1) - this is fine for Put operation
        if (
          cancellationReasons &&
          cancellationReasons[1] &&
          cancellationReasons[1].Code === 'ConditionalCheckFailed'
        ) {
          logger.info('Account creation skipped - account already exists', {
            eventId: event.id,
            accountId: event.accountId,
            reason: 'Account already exists in projection'
          });
          // Still continue to mark as processed since the end state is correct
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

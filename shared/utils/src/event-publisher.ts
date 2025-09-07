import { BaseEvent } from '@digital-banking/events';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Event publisher utility for sending events to outbox tables
 * Events will be picked up by DynamoDB Streams and sent to SNS via EventBridge Pipes
 */
export class EventPublisher {
  private dynamoClient: DynamoDBDocumentClient;
  private ledgerOutboxTableName: string;
  private accountsOutboxTableName: string;

  constructor(region = process.env.AWS_REGION || 'us-east-1') {
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    
    // Get table names from environment variables or use defaults for local development
    this.ledgerOutboxTableName = process.env.LEDGER_OUTBOX_TABLE || `LedgerSvc-OutboxTable-${process.env.ENV || 'dev'}`;
    this.accountsOutboxTableName = process.env.ACCOUNTS_OUTBOX_TABLE || `AccountsSvc-OutboxTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Publish an event to the appropriate outbox table based on event type
   * @param event The event to publish
   * @param service Optional service name to override default table selection
   */
  async publishEvent<T extends BaseEvent>(event: T, service?: 'ledger' | 'accounts'): Promise<string> {
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();
    
    try {
      // Determine which outbox table to use based on event type or service parameter
      let tableName: string;
      
      if (service) {
        // Use explicitly provided service
        if (service === 'ledger') {
          tableName = this.ledgerOutboxTableName;
        } else if (service === 'accounts') {
          tableName = this.accountsOutboxTableName;
        } else {
          throw new Error(`Unknown service: ${service}`);
        }
      } else {
        // Determine by event type prefix
        if (event.type.startsWith('DEPOSIT_') || event.type.startsWith('WITHDRAW_') || 
            !event.type.startsWith('CREATE_ACCOUNT_') && !event.type.startsWith('CLOSE_ACCOUNT_')) {
          // All banking events and any other events go to ledger outbox
          tableName = this.ledgerOutboxTableName;
        } else if (event.type.startsWith('CREATE_ACCOUNT_') || event.type.startsWith('CLOSE_ACCOUNT_')) {
          tableName = this.accountsOutboxTableName;
        } else {
          // Default to ledger outbox for other events
          tableName = this.ledgerOutboxTableName;
        }
      }
      
      // Create outbox item with event data
      const outboxItem = {
        id: messageId,
        timestamp,
        eventType: event.type,
        eventData: event,
        processed: false
      };
      
      const command = new PutCommand({
        TableName: tableName,
        Item: outboxItem
      });

      await this.dynamoClient.send(command);
      return messageId;
    } catch (error) {
      console.error('Error publishing event to outbox:', error);
      throw new Error(`Failed to publish event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

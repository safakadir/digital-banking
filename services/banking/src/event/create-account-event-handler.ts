import { TelemetryBundle } from '@digital-banking/utils';
import { CreateAccountEvent } from '@digital-banking/events';
import { AccountStatus } from '@digital-banking/models';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class CreateAccountEventHandler {
  private dynamoClient: DynamoDBDocumentClient;
  private inboxTableName: string;
  
  constructor(private readonly telemetry: TelemetryBundle) {
    // Initialize DynamoDB client for transactions
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.inboxTableName = process.env.BANKING_INBOX_TABLE || `BankingSvc-InboxTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Process a create account event with transaction-based inbox pattern
   */
  async handle(event: CreateAccountEvent): Promise<void> {
    const { logger } = this.telemetry;
  
    logger.info('Processing create account event with transaction-based inbox pattern', { eventId: event.id });
    
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours TTL
    
    const accountsProjectionTableName = process.env.ACCOUNTS_PROJECTION_TABLE_NAME || `BankingSvc-AccountsProjectionTable-${process.env.ENV || 'dev'}`;
    
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
          // b) Domain state update - Create/Update accounts projection
          {
            Put: {
              TableName: accountsProjectionTableName,
              Item: {
                id: event.accountId,
                user_id: event.userId,
                status: AccountStatus.ACTIVE
              }
            }
          },
          // c) Inbox status → SUCCESS
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
        // Message already processed
        logger.info('Create account event already processed, skipping', { 
          eventId: event.id, 
          accountId: event.accountId 
        });
        return;
      }
      
      logger.error('Error processing create account event transaction', { 
        error, 
        eventId: event.id, 
        accountId: event.accountId 
      });
      throw error;
    }
  }
};

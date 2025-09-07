import { TelemetryBundle } from '@digital-banking/utils';
import { WithdrawSuccessEvent } from '@digital-banking/events';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class WithdrawSuccessEventHandler {
  private dynamoClient: DynamoDBDocumentClient;
  private inboxTableName: string;
  
  constructor(private readonly telemetry: TelemetryBundle) {
    // Initialize DynamoDB client for transactions
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.inboxTableName = process.env.BANKING_INBOX_TABLE || `BankingSvc-InboxTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Process a withdraw success event with transaction-based inbox pattern
   */
  async handle(event: WithdrawSuccessEvent): Promise<void> {
    const { logger } = this.telemetry;
  
    logger.info('Processing withdraw success event with transaction-based inbox pattern', { eventId: event.id });
    
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours TTL
    
    const operationsTableName = process.env.OPERATIONS_TABLE_NAME || `BankingSvc-OperationsTable-${process.env.ENV || 'dev'}`;
    
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
          // b) Domain state update - Update operation status to COMPLETED
          {
            Update: {
              TableName: operationsTableName,
              Key: { operationId: event.operationId },
              UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
              ConditionExpression: '#status = :pendingStatus',
              ExpressionAttributeNames: {
                '#status': 'status'
              },
              ExpressionAttributeValues: {
                ':status': 'completed',
                ':updatedAt': now,
                ':pendingStatus': 'pending'
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
      logger.info('Withdraw success event processed successfully with transaction', { 
        eventId: event.id, 
        operationId: event.operationId 
      });
      
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        // Message already processed or operation not in pending state
        logger.info('Withdraw success event already processed or operation not pending, skipping', { 
          eventId: event.id, 
          operationId: event.operationId 
        });
        return;
      }
      
      logger.error('Error processing withdraw success event transaction', { 
        error, 
        eventId: event.id, 
        operationId: event.operationId 
      });
      throw error;
    }
  }
};

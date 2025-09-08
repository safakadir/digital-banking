import { TelemetryBundle } from '@digital-banking/utils';
import { DepositEvent } from '@digital-banking/events';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class DepositEventHandler {
  private dynamoClient: DynamoDBDocumentClient;
  private inboxTableName: string;
  
  constructor(private readonly telemetry: TelemetryBundle) {
    // Initialize DynamoDB client for transactions
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.inboxTableName = process.env.BANKING_INBOX_TABLE || `BankingSvc-InboxTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Process a deposit event with transaction-based inbox pattern
   */
  async handle(event: DepositEvent): Promise<void> {
    const { logger } = this.telemetry;
  
    logger.info('Processing deposit event with transaction-based inbox pattern', { eventId: event.id });
    
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
      logger.info('Deposit event processed successfully with transaction', { 
        eventId: event.id, 
        operationId: event.operationId 
      });
      
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        // Use CancellationReasons to determine which condition failed
        const cancellationReasons = error.CancellationReasons;
        
        // Check if inbox insert failed (item 0) - event already processed
        if (cancellationReasons && cancellationReasons[0] && cancellationReasons[0].Code === 'ConditionalCheckFailed') {
          logger.info('Deposit event already processed, skipping', { 
            eventId: event.id, 
            operationId: event.operationId,
            reason: 'Event duplicate - inbox record already exists'
          });
          return;
        }
        
        // Check if operation update failed (item 1) - operation not in pending state
        if (cancellationReasons && cancellationReasons[1] && cancellationReasons[1].Code === 'ConditionalCheckFailed') {
          logger.warn('Operation not in pending state for deposit event', {
            eventId: event.id,
            operationId: event.operationId,
            reason: 'Operation already completed, failed, or does not exist'
          });
          return; // Skip as operation might already be processed or in wrong state
        }
        
        // Check if inbox status update failed (item 2) - status inconsistency
        if (cancellationReasons && cancellationReasons[2] && cancellationReasons[2].Code === 'ConditionalCheckFailed') {
          logger.warn('Inbox status update failed - possible race condition', {
            eventId: event.id,
            operationId: event.operationId,
            reason: 'Inbox status not in expected IN_PROGRESS state'
          });
          throw error; // Re-throw to trigger retry mechanism
        }
        
        // Fallback for unexpected conditional check failures
        logger.error('Unexpected conditional check failure', {
          eventId: event.id,
          operationId: event.operationId,
          cancellationReasons: cancellationReasons,
          error: error.message
        });
        throw error;
        
      }
      
      logger.error('Error processing deposit event transaction', { 
        error, 
        eventId: event.id, 
        operationId: event.operationId 
      });
      throw error;
    }
  }
};

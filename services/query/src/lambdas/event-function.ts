import { SQSEvent } from 'aws-lambda';
import { createDefaultTelemetryBundle, transformEventData, createOrUseDynamoDbClient } from '@digital-banking/utils';
import { BankingEvent } from '@digital-banking/events';
import { DepositEventHandler } from '../event/deposit-event-handler';
import { WithdrawSuccessEventHandler } from '../event/withdraw-success-event-handler';
import { CreateAccountEventHandler } from '../event/create-account-event-handler';
import { CloseAccountEventHandler } from '../event/close-account-event-handler';
import { commonEventMiddleware } from '@digital-banking/middleware';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { QueryServiceConfig } from '@digital-banking/config';

/**
 * Creates an event handler with dependency injection support
 * @param telemetry - Telemetry bundle with logger, tracer and metrics
 * @param dynamoClient - DynamoDB document client (optional, will create default if not provided)
 * @param config - Service configuration (optional, will use env vars if not provided)
 * @returns Event handler function
 */
export function createEventFunctionHandler(
  telemetry = createDefaultTelemetryBundle(),
  dynamoClient?: DynamoDBDocumentClient,
  config?: QueryServiceConfig
) {
  const { logger } = telemetry;
  
  // Create default DynamoDB client if not provided
  const dbClient = createOrUseDynamoDbClient(dynamoClient);
  
  // Use provided config or create default from environment
  const serviceConfig = config || QueryServiceConfig.fromEnvironment();

  /**
   * Processes events for the Query service
   * Returns batchItemFailures for failed records to enable partial batch processing
   */

  const eventHandler = async (
    event: SQSEvent
  ): Promise<{ batchItemFailures: { itemIdentifier: string }[] }> => {
    logger.info('Processing query events', { recordCount: event.Records.length });

    const batchItemFailures: { itemIdentifier: string }[] = [];

    for (const record of event.Records) {
      try {
        const body = JSON.parse(record.body);
        
        // Transform the event data from DynamoDB format to plain format
        const message = transformEventData(body.eventData) as BankingEvent;

        logger.info('Processing event', {
          sqsMessageId: record.messageId,
          eventType: message.type,
          eventBody: message
        });

        switch (message.type) {
          case 'DEPOSIT_EVENT':
            await new DepositEventHandler(
              telemetry,
              dbClient,
              serviceConfig
            ).handle(message);
            break;
          case 'WITHDRAW_SUCCESS_EVENT':
            await new WithdrawSuccessEventHandler(
              telemetry,
              dbClient,
              serviceConfig
            ).handle(message);
            break;
          case 'CREATE_ACCOUNT_EVENT':
            await new CreateAccountEventHandler(
              telemetry,
              dbClient,
              serviceConfig
            ).handle(message);
            break;
          case 'CLOSE_ACCOUNT_EVENT':
            await new CloseAccountEventHandler(
              telemetry,
              dbClient,
              serviceConfig
            ).handle(message);
            break;
          case 'WITHDRAW_FAILED_EVENT':
            break;
          default: {
            // Exhaustive check to ensure all event types are handled
            const _exhaustiveCheck: never = message;
            logger.warn('Unknown event type', { eventType: (message as any).type });
          }
        }
      } catch (error) {
        logger.error('Error processing record', { error, messageId: record.messageId });
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  };

  // Return the handler with middleware
  return commonEventMiddleware(eventHandler, telemetry);
}

// Export the default handler instance
export const eventFunctionHandler = createEventFunctionHandler();

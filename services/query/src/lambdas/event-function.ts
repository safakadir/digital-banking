import { SQSEvent } from 'aws-lambda';
import { createQueryService } from '../services';
import { createDefaultTelemetryBundle } from '@digital-banking/utils';
import { BankingEvent } from '@digital-banking/events';
import { depositEventHandler } from './event-handlers/deposit-event-handler';
import { withdrawSuccessEventHandler } from './event-handlers/withdraw-success-event-handler';
import { withdrawFailedEventHandler } from './event-handlers/withdraw-failed-event-handler';
import { createAccountEventHandler } from './event-handlers/create-account-event-handler';
import { closeAccountEventHandler } from './event-handlers/close-account-event-handler';
import { commonEventMiddleware } from '@digital-banking/middleware';

/**
 * Creates an event handler with dependency injection support
 * @param queryService - QueryService instance
 * @param logger - Logger instance
 * @param tracer - Tracer instance
 * @param metrics - Metrics instance
 * @returns Event handler function
 */
export function createEventFunctionHandler(
  queryService = createQueryService(),
  telemetry = createDefaultTelemetryBundle()
) {
  const { logger } = telemetry;
  /**
   * Processes events for the Query service
   * Returns batchItemFailures for failed records to enable partial batch processing
   */

  const eventHandler = async (event: SQSEvent): Promise<{ batchItemFailures: { itemIdentifier: string }[] }> => {
    logger.info('Processing query events', { recordCount: event.Records.length });
    
    const batchItemFailures: { itemIdentifier: string }[] = [];
    
    for (const record of event.Records) {
      try {
        const message = JSON.parse(record.body) as BankingEvent;
        logger.info('Processing event', { messageId: record.messageId, eventType: message.type });
        
        switch (message.type) {
          case 'DEPOSIT_EVENT':
            await depositEventHandler(queryService, telemetry)(message);
            break;
          case 'WITHDRAW_SUCCESS_EVENT':
            await withdrawSuccessEventHandler(queryService, telemetry)(message);
            break;
          case 'WITHDRAW_FAILED_EVENT':
            await withdrawFailedEventHandler(queryService, telemetry)(message);
            break;
          case 'CREATE_ACCOUNT_EVENT':
            await createAccountEventHandler(queryService, telemetry)(message);
            break;
          case 'CLOSE_ACCOUNT_EVENT':
            await closeAccountEventHandler(queryService, telemetry)(message);
            break;
          default:
            // Exhaustive check to ensure all event types are handled
            const _exhaustiveCheck: never = message;
            logger.warn('Unknown event type', { eventType: (message as any).type });
        }
      } catch (error) {
        logger.error('Error processing record', { error, messageId: record.messageId });
        throw error;
      }
    }
    
    return { batchItemFailures };
  };
  
  // Return the handler with middleware
  return commonEventMiddleware(eventHandler, telemetry);
}

// Export the default handler instance
export const eventFunctionHandler = createEventFunctionHandler();

import { SQSEvent } from 'aws-lambda';
import { commonEventMiddleware } from '@digital-banking/middleware';
import { createDefaultTelemetryBundle, transformEventData } from '@digital-banking/utils';
import {
  BankingEvent,
  CloseAccountEvent,
  CreateAccountEvent,
  DepositEvent,
  WithdrawFailedEvent,
  WithdrawSuccessEvent
} from '@digital-banking/events';
import { 
  DepositEventHandler,
  WithdrawSuccessEventHandler,
  WithdrawFailedEventHandler,
  CreateAccountEventHandler,
  CloseAccountEventHandler
} from '../event';

/**
 * Creates an event handler with dependency injection support
 * @param telemetry - TelemetryBundle instance
 * @returns Event handler function
 */
export function createEventFunctionHandler(telemetry = createDefaultTelemetryBundle()) {
  const { logger } = telemetry;
  /**
   * Processes events for the Banking service
   * Returns batchItemFailures for failed records to enable partial batch processing
   */

  const eventHandler = async (
    event: SQSEvent
  ): Promise<{ batchItemFailures: { itemIdentifier: string }[] }> => {
    logger.info('Processing banking events', { recordCount: event.Records.length });

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
            await new DepositEventHandler(telemetry).handle(message as DepositEvent);
            break;
          case 'WITHDRAW_SUCCESS_EVENT':
            await new WithdrawSuccessEventHandler(telemetry).handle(
              message as WithdrawSuccessEvent
            );
            break;
          case 'WITHDRAW_FAILED_EVENT':
            await new WithdrawFailedEventHandler(telemetry).handle(message as WithdrawFailedEvent);
            break;
          case 'CREATE_ACCOUNT_EVENT':
            await new CreateAccountEventHandler(telemetry).handle(message as CreateAccountEvent);
            break;
          case 'CLOSE_ACCOUNT_EVENT':
            await new CloseAccountEventHandler(telemetry).handle(message as CloseAccountEvent);
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
  // Note: Idempotency is now handled by inbox pattern in business logic
  return commonEventMiddleware(eventHandler, telemetry);
}

// Export the default handler instance
export const eventFunctionHandler = createEventFunctionHandler();

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { commonEventMiddleware } from '@digital-banking/middleware';
import { BankingService } from '../services/banking-service';
import { BankingEvent } from '@digital-banking/events';

// Powertools
const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

// Services
const bankingService = new BankingService();

/**
 * Processes events for the Banking service
 * Returns batchItemFailures for failed records to enable partial batch processing
 */
export const eventHandler = async (event: SQSEvent): Promise<{ batchItemFailures: { itemIdentifier: string }[] }> => {
  logger.info('Processing banking events', { recordCount: event.Records.length });
  
  const batchItemFailures: { itemIdentifier: string }[] = [];
  
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      logger.error('Error processing record', { error, messageId: record.messageId });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  
  return { batchItemFailures };
};

/**
 * Process a single SQS record
 */
async function processRecord(record: SQSRecord): Promise<void> {
  try {
    const message = JSON.parse(record.body) as BankingEvent;
    logger.info('Processing event', { messageId: record.messageId, eventType: message.type });
    
    switch (message.type) {
      case 'DEPOSIT_EVENT':
        await bankingService.processDepositEvent(message);
        break;
      case 'WITHDRAW_EVENT':
        await bankingService.processWithdrawEvent(message);
        break;
      case 'WITHDRAW_FAILED_EVENT':
        await bankingService.processWithdrawFailedEvent(message);
        break;
      case 'CREATE_ACCOUNT_EVENT':
        await bankingService.processCreateAccountEvent(message);
        break;
      case 'CLOSE_ACCOUNT_EVENT':
        await bankingService.processCloseAccountEvent(message);
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

// Export the handler with middleware
export const handler = commonEventMiddleware(eventHandler, logger, tracer, metrics);

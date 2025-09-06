import { SQSEvent, SQSRecord } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { LedgerService } from '../services/ledger-service';
import { commonEventMiddleware } from '@digital-banking/middleware';
import { BankingCommand } from '@digital-banking/commands';

// Powertools
const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

// Services
const ledgerService = new LedgerService();

/**
 * Processes deposit and withdraw commands from SQS
 * Returns batchItemFailures for failed records to enable partial batch processing
 */
export const commandHandler = async (event: SQSEvent): Promise<{ batchItemFailures: { itemIdentifier: string }[] }> => {
  logger.info('Processing ledger commands', { recordCount: event.Records.length });
  
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
    const message = JSON.parse(record.body) as BankingCommand;
    logger.info('Processing command', { messageId: record.messageId, commandType: message.type });
    
    switch (message.type) {
      case 'DEPOSIT_CMD':
        await ledgerService.processDepositCommand(message);
        break;
      case 'WITHDRAW_CMD':
        await ledgerService.processWithdrawCommand(message);
        break;
      default:
        // Exhaustive check to ensure all command types are handled
        const _exhaustiveCheck: never = message;
        logger.warn('Unknown command type', { messageType: (message as any).type });
    }
  } catch (error) {
    logger.error('Error processing record', { error, messageId: record.messageId });
    throw error;
  }
}

export const handler = commonEventMiddleware(commandHandler, logger, tracer, metrics);

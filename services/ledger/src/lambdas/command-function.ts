import { SQSEvent } from 'aws-lambda';
import { commonEventMiddleware } from '@digital-banking/middleware';
import { createDefaultTelemetryBundle, transformEventData } from '@digital-banking/utils';
import { DepositCommandHandler, WithdrawCommandHandler } from '../command';
import { BankingCommand } from '@digital-banking/commands';

/**
 * Creates a command handler with dependency injection support
 * @param telemetry - TelemetryBundle instance
 * @returns Command handler function
 */
export function createCommandFunctionHandler(telemetry = createDefaultTelemetryBundle()) {
  const { logger } = telemetry;
  /**
   * Processes deposit and withdraw commands from SQS
   * Returns batchItemFailures for failed records to enable partial batch processing
   */

  const commandHandler = async (
    event: SQSEvent
  ): Promise<{ batchItemFailures: { itemIdentifier: string }[] }> => {
    logger.info('Processing ledger commands', { recordCount: event.Records.length });

    const batchItemFailures: { itemIdentifier: string }[] = [];

    for (const record of event.Records) {
      try {
        const body = JSON.parse(record.body);
        
        // Transform the event data from DynamoDB format to plain format
        const message = transformEventData(body.eventData) as BankingCommand;

        logger.info('Processing command', {
          sqsMessageId: record.messageId,
          commandType: message.type,
          commandBody: message
        });

        switch (message.type) {
          case 'DEPOSIT_CMD':
            await new DepositCommandHandler(telemetry).handle(message);
            break;
          case 'WITHDRAW_CMD':
            await new WithdrawCommandHandler(telemetry).handle(message);
            break;
          default: {
            // Exhaustive check to ensure all command types are handled
            const _exhaustiveCheck: never = message;
            logger.warn('Unknown command type', { messageType: (message as any).type });
          }
        }
      } catch (error) {
        logger.error('Error processing record', { error, messageId: record.messageId });
        throw error;
      }
    }

    return { batchItemFailures };
  };

  // Return the handler with middleware
  return commonEventMiddleware(commandHandler, telemetry);
}

// Export the default handler instance
export const commandFunctionHandler = createCommandFunctionHandler();

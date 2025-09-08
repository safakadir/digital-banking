import { SQSEvent } from 'aws-lambda';
import { commonEventMiddleware } from '@digital-banking/middleware';
import { createDefaultTelemetryBundle } from '@digital-banking/utils';
import { DepositCommandHandler } from '../command/deposit-command-handler';
import { WithdrawCommandHandler } from '../command/withdraw-command-handler';
import { BankingCommand } from '@digital-banking/commands';
import { IdempotencyConfig, makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';

// Configure idempotency
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE || 'LedgerSvc-CommandFn-Idempotency-dev'
});

const idempotencyConfig = new IdempotencyConfig({
  // Use message ID as the idempotency key
  eventKeyJmesPath: 'Records[*].body | fromjson(@).id',
  // TTL for idempotency records (24 hours)
  expiresAfterSeconds: 86400
});

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
        const message = JSON.parse(record.body) as BankingCommand;
        logger.info('Processing command', {
          messageId: record.messageId,
          commandType: message.type,
          messageUuid: message.id
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

  // Make the handler idempotent
  const idempotentHandler = makeIdempotent(commandHandler, {
    persistenceStore,
    config: idempotencyConfig
  });

  // Return the handler with middleware
  return commonEventMiddleware(idempotentHandler, telemetry);
}

// Export the default handler instance
export const commandFunctionHandler = createCommandFunctionHandler();

import { TelemetryBundle } from '@digital-banking/utils';
import { QueryService } from '../../services';
import { BankingEvent } from '@digital-banking/events';

export const createAccountEventHandler =
  (queryService: QueryService, telemetry: TelemetryBundle) =>
  async (message: BankingEvent): Promise<void> => {
    const { logger } = telemetry;

    if (message.type !== 'CREATE_ACCOUNT_EVENT') {
      logger.warn('Invalid event type for create account handler', { eventType: message.type });
      return;
    }

    logger.info('Processing create account event', { accountId: message.accountId });
    await queryService.processCreateAccountEvent(message);
  };

import { TelemetryBundle } from '@digital-banking/utils';
import { QueryService } from '../../services';
import { BankingEvent } from '@digital-banking/events';

export const closeAccountEventHandler =
  (queryService: QueryService, telemetry: TelemetryBundle) =>
  async (message: BankingEvent): Promise<void> => {
    const { logger } = telemetry;

    if (message.type !== 'CLOSE_ACCOUNT_EVENT') {
      logger.warn('Invalid event type for close account handler', { eventType: message.type });
      return;
    }

    logger.info('Processing close account event', { accountId: message.accountId });
    await queryService.processCloseAccountEvent(message);
  };

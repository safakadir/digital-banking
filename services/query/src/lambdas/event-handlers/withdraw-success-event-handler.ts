import { TelemetryBundle } from '@digital-banking/utils';
import { QueryService } from '../../services';
import { BankingEvent } from '@digital-banking/events';

export const withdrawSuccessEventHandler =
  (queryService: QueryService, telemetry: TelemetryBundle) =>
  async (message: BankingEvent): Promise<void> => {
    const { logger } = telemetry;

    if (message.type !== 'WITHDRAW_SUCCESS_EVENT') {
      logger.warn('Invalid event type for withdraw handler', { eventType: message.type });
      return;
    }

    logger.info('Processing withdraw success event', { accountId: message.accountId });
    await queryService.processWithdrawSuccessEvent(message);
  };

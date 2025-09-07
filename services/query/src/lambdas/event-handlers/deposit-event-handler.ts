import { TelemetryBundle } from '@digital-banking/utils';
import { QueryService } from '../../services';
import { BankingEvent } from '@digital-banking/events';

export const depositEventHandler = (
  queryService: QueryService,
  telemetry: TelemetryBundle
) => async (message: BankingEvent): Promise<void> => {
  const { logger } = telemetry;
  
  if (message.type !== 'DEPOSIT_EVENT') {
    logger.warn('Invalid event type for deposit handler', { eventType: message.type });
    return;
  }
  
  logger.info('Processing deposit event', { accountId: message.accountId });
  await queryService.processDepositEvent(message);
};

import { TelemetryBundle } from '@digital-banking/utils';
import { BankingService } from '../../services';
import { BankingEvent } from '@digital-banking/events';

export const withdrawFailedEventHandler = (
  bankingService: BankingService,
  telemetry: TelemetryBundle
) => async (message: BankingEvent): Promise<void> => {
  const { logger } = telemetry;
  
  if (message.type !== 'WITHDRAW_FAILED_EVENT') {
    logger.warn('Invalid event type for withdraw failed handler', { eventType: message.type });
    return;
  }
  
  logger.info('Processing withdraw failed event', { accountId: message.accountId });
  await bankingService.processWithdrawFailedEvent(message);
};

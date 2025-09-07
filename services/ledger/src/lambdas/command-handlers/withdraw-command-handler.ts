import { TelemetryBundle } from '@digital-banking/utils';
import { LedgerService } from '../../services';
import { BankingCommand } from '@digital-banking/commands';

export const withdrawCommandHandler = (
  ledgerService: LedgerService,
  telemetry: TelemetryBundle
) => async (message: BankingCommand): Promise<void> => {
  const { logger } = telemetry;
  
  if (message.type !== 'WITHDRAW_CMD') {
    logger.warn('Invalid command type for withdraw handler', { commandType: message.type });
    return;
  }
  
  logger.info('Processing withdraw command', { accountId: message.accountId });
  await ledgerService.processWithdrawCommand(message);
};

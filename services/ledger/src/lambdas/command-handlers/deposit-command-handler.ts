import { TelemetryBundle } from '@digital-banking/utils';
import { LedgerService } from '../../services';
import { BankingCommand } from '@digital-banking/commands';

export const depositCommandHandler = (
  ledgerService: LedgerService,
  telemetry: TelemetryBundle
) => async (message: BankingCommand): Promise<void> => {
  const { logger } = telemetry;
  
  if (message.type !== 'DEPOSIT_CMD') {
    logger.warn('Invalid command type for deposit handler', { commandType: message.type });
    return;
  }
  
  logger.info('Processing deposit command', { accountId: message.accountId });
  await ledgerService.processDepositCommand(message);
};

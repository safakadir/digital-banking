import { BaseCommand } from './base-command';

/**
 * Deposit command
 */
export interface DepositCommand extends BaseCommand {
  type: 'DEPOSIT_CMD';
  accountId: string;
  amount: number;
  description?: string;
  operationId: string;
}

import { BaseCommand } from './base-command';

/**
 * Withdraw command
 */
export interface WithdrawCommand extends BaseCommand {
  type: 'WITHDRAW_CMD';
  accountId: string;
  userId: string;
  amount: number;
  description?: string;
  operationId: string;
}

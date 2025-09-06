import { BaseEvent } from './base-event';

/**
 * Withdraw event
 */
export interface WithdrawEvent extends BaseEvent {
  type: 'WITHDRAW_EVENT';
  accountId: string;
  amount: number;
  operationId: string;
}

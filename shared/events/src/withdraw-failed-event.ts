import { BaseEvent } from './base-event';

/**
 * Withdraw failed event
 */
export interface WithdrawFailedEvent extends BaseEvent {
  type: 'WITHDRAW_FAILED_EVENT';
  accountId: string;
  amount: number;
  operationId: string;
  reason: string;
}

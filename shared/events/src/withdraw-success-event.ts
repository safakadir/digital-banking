import { BaseEvent } from './base-event';

/**
 * Withdraw success event
 */
export interface WithdrawSuccessEvent extends BaseEvent {
  type: 'WITHDRAW_SUCCESS_EVENT';
  accountId: string;
  userId: string;
  amount: number;
  operationId: string;
  transactionId: string;
  balance: number;
}

/**
 * Base event interface that all events must implement
 */
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
}

/**
 * Deposit event
 */
export interface DepositEvent extends BaseEvent {
  type: 'DEPOSIT_EVENT';
  accountId: string;
  amount: number;
  operationId: string;
}

/**
 * Withdraw event
 */
export interface WithdrawEvent extends BaseEvent {
  type: 'WITHDRAW_EVENT';
  accountId: string;
  amount: number;
  operationId: string;
}

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

/**
 * Create account event
 */
export interface CreateAccountEvent extends BaseEvent {
  type: 'CREATE_ACCOUNT_EVENT';
  accountId: string;
  userId: string;
  accountType: string;
  initialBalance: number;
}

/**
 * Close account event
 */
export interface CloseAccountEvent extends BaseEvent {
  type: 'CLOSE_ACCOUNT_EVENT';
  accountId: string;
  reason?: string;
}

/**
 * Union type of all banking events
 */
export type BankingEvent = 
  | DepositEvent 
  | WithdrawEvent 
  | WithdrawFailedEvent 
  | CreateAccountEvent 
  | CloseAccountEvent;

import { DepositEvent } from './deposit-event';
import { WithdrawSuccessEvent } from './withdraw-success-event';
import { WithdrawFailedEvent } from './withdraw-failed-event';
import { CreateAccountEvent } from './create-account-event';
import { CloseAccountEvent } from './close-account-event';

/**
 * Union type of all banking events
 */

export type BankingEvent =
  | DepositEvent
  | WithdrawSuccessEvent
  | WithdrawFailedEvent
  | CreateAccountEvent
  | CloseAccountEvent;

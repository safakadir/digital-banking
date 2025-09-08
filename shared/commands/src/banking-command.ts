import { DepositCommand } from './deposit-command';
import { WithdrawCommand } from './withdraw-command';

export type BankingCommand = DepositCommand | WithdrawCommand;

/**
 * Base command interface that all commands must implement
 */
export interface Command {
  id: string;
  timestamp: Date;
}

/**
 * Deposit command
 */
export interface DepositCommand extends Command {
  type: 'DEPOSIT_CMD';
  accountId: string;
  amount: number;
  description?: string;
  operationId: string;
}

/**
 * Withdraw command
 */
export interface WithdrawCommand extends Command {
  type: 'WITHDRAW_CMD';
  accountId: string;
  amount: number;
  description?: string;
  operationId: string;
}

/**
 * Union type of all banking commands
 */
export type BankingCommand = 
  | DepositCommand 
  | WithdrawCommand;

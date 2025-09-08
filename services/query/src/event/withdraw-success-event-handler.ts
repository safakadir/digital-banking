import { TelemetryBundle } from '@digital-banking/utils';
import { WithdrawSuccessEvent } from '@digital-banking/events';

export class WithdrawSuccessEventHandler {
  constructor(private readonly telemetry: TelemetryBundle) {}

  /**
   * Process a withdraw success event
   */
  async handle(event: WithdrawSuccessEvent): Promise<void> {
    const { logger } = this.telemetry;

    logger.info('Processing withdraw success event', {
      eventId: event.id,
      accountId: event.accountId,
      operationId: event.operationId
    });

    // TODO: Implement withdraw success event processing logic
    logger.info('Withdraw success event processing completed', {
      eventId: event.id,
      accountId: event.accountId,
      operationId: event.operationId
    });
  }
}

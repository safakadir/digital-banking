import { TelemetryBundle } from '@digital-banking/utils';
import { WithdrawFailedEvent } from '@digital-banking/events';

export class WithdrawFailedEventHandler {
  constructor(private readonly telemetry: TelemetryBundle) {}

  /**
   * Process a withdraw failed event
   */
  async handle(event: WithdrawFailedEvent): Promise<void> {
    const { logger } = this.telemetry;

    logger.info('Processing withdraw failed event', {
      eventId: event.id,
      accountId: event.accountId,
      operationId: event.operationId
    });

    // TODO: Implement withdraw failed event processing logic
    logger.info('Withdraw failed event processing completed', {
      eventId: event.id,
      accountId: event.accountId,
      operationId: event.operationId
    });
  }
}

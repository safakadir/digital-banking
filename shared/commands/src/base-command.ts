/**
 * Base command interface that all commands must implement
 */
export interface BaseCommand {
  id: string;
  timestamp: Date;
}

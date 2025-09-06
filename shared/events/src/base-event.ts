/**
 * Base event interface that all events must implement
 */
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
}

import { EventEmitter } from "events";

export interface GBSEvent {
  id: string;
  type: string;
  tenantId?: string;
  userId?: string;
  payload: Record<string, any>;
  timestamp: string;
  correlationId?: string;
}

export type GBSEventHandler = (event: GBSEvent) => Promise<void> | void;

class GBSEventBus extends EventEmitter {
  private static instance: GBSEventBus;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): GBSEventBus {
    if (!GBSEventBus.instance) {
      GBSEventBus.instance = new GBSEventBus();
    }
    return GBSEventBus.instance;
  }

  public publish(
    type: string,
    payload: Record<string, any>,
    options?: { tenantId?: string; userId?: string; correlationId?: string },
  ): GBSEvent {
    const event: GBSEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      tenantId: options?.tenantId,
      userId: options?.userId,
      correlationId: options?.correlationId,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.emit(type, event);
    this.emit("*", event);
    return event;
  }

  public subscribe(type: string, handler: GBSEventHandler): void {
    this.on(type, async (event: GBSEvent) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus] Error handling event type "${type}":`, err);
      }
    });
  }
}

export const eventBus = GBSEventBus.getInstance();

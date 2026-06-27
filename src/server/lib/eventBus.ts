type Handler = (payload: unknown) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, payload: unknown): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

const globalForBus = globalThis as unknown as { eventBus: EventBus | undefined };
export const eventBus = globalForBus.eventBus ?? new EventBus();
if (process.env.NODE_ENV !== 'production') globalForBus.eventBus = eventBus;

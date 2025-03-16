/**
 * Event Manager
 * For state notification of asynchronous processing
 */
export class EventEmitter {
  private events: Record<string, Array<(...args: any[]) => void>> = {};

  /**
   * Register event listener
   * @param event Event name
   * @param listener Callback function
   */
  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  /**
   * Register event listener that will only be executed once
   * @param event Event name
   * @param listener Callback function
   */
  once(event: string, listener: (...args: any[]) => void): void {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Remove event listener
   * @param event Event name
   * @param listener Listener to remove (if omitted, all listeners will be removed)
   */
  off(event: string, listener?: (...args: any[]) => void): void {
    if (!this.events[event]) {
      return;
    }

    if (!listener) {
      delete this.events[event];
      return;
    }

    this.events[event] = this.events[event].filter((l) => l !== listener);
  }

  /**
   * Emit event
   * @param event Event name
   * @param args Arguments to pass to the event
   */
  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) {
      return;
    }

    this.events[event].forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });
  }

  /**
   * Clear all event listeners
   */
  removeAllListeners(): void {
    this.events = {};
  }
}

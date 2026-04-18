/**
 * Swipe Gesture Detection — Touch & Mouse
 *
 * Detects swipe gestures on both touch devices and desktop
 */

export interface SwipeEvent {
  type: 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distance: number;
  angle: number; // degrees
  duration: number; // ms
  velocity: number; // pixels per ms
  isTouch: boolean;
}

export interface SwipeDetectorConfig {
  threshold: number; // minimum pixels to register swipe
  velocityThreshold: number; // minimum velocity
  timeThreshold: number; // maximum ms for swipe
  preventDefault: boolean;
  capture: boolean;
}

export const DEFAULT_SWIPE_CONFIG: SwipeDetectorConfig = {
  threshold: 40, // 40px minimum swipe
  velocityThreshold: 0.2, // 0.2 px/ms
  timeThreshold: 1000, // 1 second max
  preventDefault: true,
  capture: false,
};

/**
 * Swipe detector class
 */
export class SwipeDetector {
  private config: SwipeDetectorConfig;
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private startTarget: EventTarget | null = null;
  private callbacks: Map<string, (event: SwipeEvent) => void> = new Map();

  constructor(element: HTMLElement, config: Partial<SwipeDetectorConfig> = {}) {
    this.config = { ...DEFAULT_SWIPE_CONFIG, ...config };

    element.addEventListener('touchstart', this.onStart.bind(this), this.config.capture);
    element.addEventListener('touchmove', this.onMove.bind(this), this.config.capture);
    element.addEventListener('touchend', this.onEnd.bind(this), this.config.capture);

    element.addEventListener('mousedown', this.onStart.bind(this), this.config.capture);
    element.addEventListener('mousemove', this.onMove.bind(this), this.config.capture);
    element.addEventListener('mouseup', this.onEnd.bind(this), this.config.capture);
  }

  private onStart(event: TouchEvent | MouseEvent) {
    const { clientX, clientY } = this.getClientCoordinates(event);
    this.startX = clientX;
    this.startY = clientY;
    this.startTime = Date.now();
    this.startTarget = event.target;
  }

  private onMove(event: TouchEvent | MouseEvent) {
    // Can be used for real-time feedback
  }

  private onEnd(event: TouchEvent | MouseEvent) {
    const { clientX, clientY } = this.getClientCoordinates(event);
    const endX = clientX;
    const endY = clientY;
    const endTime = Date.now();

    const deltaX = endX - this.startX;
    const deltaY = endY - this.startY;
    const duration = endTime - this.startTime;

    // Check if swipe meets criteria
    if (duration > this.config.timeThreshold) {
      return; // Took too long
    }

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < this.config.threshold) {
      return; // Not enough movement
    }

    const velocity = distance / duration;
    if (velocity < this.config.velocityThreshold) {
      return; // Too slow
    }

    // Determine swipe direction
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    let swipeType: SwipeEvent['type'];
    if (Math.abs(angle) < 45) {
      swipeType = deltaX > 0 ? 'swipe-right' : 'swipe-left';
    } else if (Math.abs(angle) > 135) {
      swipeType = deltaX > 0 ? 'swipe-right' : 'swipe-left';
    } else if (angle > 0) {
      swipeType = 'swipe-down';
    } else {
      swipeType = 'swipe-up';
    }

    if (this.config.preventDefault) {
      event.preventDefault();
    }

    const swipeEvent: SwipeEvent = {
      type: swipeType,
      startX: this.startX,
      startY: this.startY,
      endX,
      endY,
      distance,
      angle,
      duration,
      velocity,
      isTouch: event instanceof TouchEvent,
    };

    this.emit(swipeType, swipeEvent);
  }

  private getClientCoordinates(
    event: TouchEvent | MouseEvent
  ): { clientX: number; clientY: number } {
    if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0];
      return { clientX: touch.clientX, clientY: touch.clientY };
    }
    return { clientX: event.clientX, clientY: event.clientY };
  }

  public on(type: string, callback: (event: SwipeEvent) => void) {
    this.callbacks.set(type, callback);
  }

  public off(type: string) {
    this.callbacks.delete(type);
  }

  private emit(type: string, event: SwipeEvent) {
    const callback = this.callbacks.get(type);
    if (callback) {
      callback(event);
    }
  }
}

/**
 * Hook for swipe detection in React
 */
export function useSwipe(
  ref: React.RefObject<HTMLElement>,
  callbacks: {
    onSwipeLeft?: (event: SwipeEvent) => void;
    onSwipeRight?: (event: SwipeEvent) => void;
    onSwipeUp?: (event: SwipeEvent) => void;
    onSwipeDown?: (event: SwipeEvent) => void;
  },
  config: Partial<SwipeDetectorConfig> = {}
) {
  const [detector, setDetector] = React.useState<SwipeDetector | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;

    const d = new SwipeDetector(ref.current, config);

    if (callbacks.onSwipeLeft) d.on('swipe-left', callbacks.onSwipeLeft);
    if (callbacks.onSwipeRight) d.on('swipe-right', callbacks.onSwipeRight);
    if (callbacks.onSwipeUp) d.on('swipe-up', callbacks.onSwipeUp);
    if (callbacks.onSwipeDown) d.on('swipe-down', callbacks.onSwipeDown);

    setDetector(d);
  }, [ref, callbacks, config]);

  return detector;
}

/**
 * Simple swipe direction helper
 */
export function getSwipeDirection(event: SwipeEvent): 'horizontal' | 'vertical' {
  return Math.abs(event.angle) < 45 || Math.abs(event.angle) > 135
    ? 'horizontal'
    : 'vertical';
}

/**
 * Calculate swipe velocity percentage (for progress bars)
 */
export function getSwipeVelocityPercent(
  event: SwipeEvent,
  maxVelocity: number = 1.0
): number {
  return Math.min((event.velocity / maxVelocity) * 100, 100);
}

/**
 * Detect if swipe was flick (fast swipe)
 */
export function isFlickSwipe(event: SwipeEvent): boolean {
  return event.velocity > 0.5; // > 0.5 pixels per ms is a flick
}

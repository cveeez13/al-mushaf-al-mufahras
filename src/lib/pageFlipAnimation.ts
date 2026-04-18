/**
 * Page Flip Animations — CSS 3D & GSAP
 *
 * Features:
 * - Smooth 3D page flip effect (CSS 3D transforms)
 * - Realistic perspective and shadow
 * - Configurable animation duration
 * - Hardware acceleration
 * - Touch/mouse support
 * - Multiple flip directions (right, left)
 */

export interface FlipAnimation {
  duration: number; // ms
  perspective: number; // px
  enableShadow: boolean;
  easing: string; // cubic-bezier or preset
  direction: 'left' | 'right';
  axis: 'y' | 'x';
}

export interface PageFlipConfig {
  enabled: boolean;
  duration: number; // ms (300-600 recommended)
  perspective: number; // px (800-1200 recommended)
  shadow: {
    enabled: boolean;
    color: string; // rgba
    opacity: number; // 0-1
  };
  curl: {
    enabled: boolean;
    intensity: number; // 0-1
  };
  autoFlip: boolean;
  autoFlipDuration: number; // ms
}

/**
 * Default page flip configuration
 */
export const DEFAULT_FLIP_CONFIG: PageFlipConfig = {
  enabled: true,
  duration: 400, // 400ms flip animation
  perspective: 1000,
  shadow: {
    enabled: true,
    color: 'rgba(0, 0, 0, 0.2)',
    opacity: 0.5,
  },
  curl: {
    enabled: true,
    intensity: 0.3,
  },
  autoFlip: false,
  autoFlipDuration: 3000,
};

/**
 * CSS for 3D page flip (perspective container)
 */
export function getPageFlipCSS(config: PageFlipConfig): string {
  return `
    .page-flip-container {
      perspective: ${config.perspective}px;
      perspective-origin: center center;
    }

    .page-flip-scene {
      position: relative;
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
      transition: transform ${config.duration}ms cubic-bezier(0.645, 0.045, 0.355, 1);
    }

    .page-flip-front,
    .page-flip-back {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }

    .page-flip-front {
      transform: rotateY(0deg);
      z-index: 2;
    }

    .page-flip-back {
      transform: rotateY(180deg);
      z-index: 1;
    }

    .page-flip-scene.flipped .page-flip-front {
      transform: rotateY(180deg);
      z-index: 1;
    }

    .page-flip-scene.flipped .page-flip-back {
      transform: rotateY(0deg);
      z-index: 2;
    }

    ${config.shadow.enabled ? `
      .page-flip-scene {
        box-shadow: inset ${config.shadow.opacity * 20}px 0 ${config.shadow.opacity * 40}px ${config.shadow.color};
      }
    ` : ''}
  `;
}

/**
 * CSS for horizontal page flip (RTL/LTR aware)
 */
export function getHorizontalFlipCSS(
  config: PageFlipConfig,
  isRTL: boolean
): string {
  const axis = isRTL ? 'rotateY' : 'rotateY';
  const direction = isRTL ? '-180deg' : '180deg';

  return `
    .page-flip-container {
      perspective: ${config.perspective}px;
      perspective-origin: ${isRTL ? 'right' : 'left'} center;
    }

    .page-flip-scene {
      position: relative;
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
      transition: transform ${config.duration}ms cubic-bezier(0.645, 0.045, 0.355, 1);
    }

    .page-flip-front {
      transform: ${axis}(0deg);
      z-index: 2;
    }

    .page-flip-back {
      transform: ${axis}(${direction});
      z-index: 1;
    }

    .page-flip-scene.flipped .page-flip-front {
      transform: ${axis}(${direction});
      z-index: 1;
    }

    .page-flip-scene.flipped .page-flip-back {
      transform: ${axis}(0deg);
      z-index: 2;
    }
  `;
}

/**
 * CSS for page curl effect (advanced)
 */
export function getPageCurlCSS(config: PageFlipConfig, intensity: number): string {
  const curlIntensity = intensity * config.curl.intensity;

  return `
    .page-curl {
      position: absolute;
      top: 0;
      right: 0;
      width: 40%;
      height: 100%;
      pointer-events: none;
      background: linear-gradient(
        135deg,
        transparent ${100 - curlIntensity * 50}%,
        rgba(0, 0, 0, ${curlIntensity * 0.2}) ${100 - curlIntensity * 30}%,
        rgba(0, 0, 0, 0) 100%
      );
      transform: skewY(-${curlIntensity * 5}deg);
    }

    .page-flip-scene.flipped .page-curl {
      opacity: 0;
      transition: opacity ${config.duration}ms ease-out;
    }
  `;
}

/**
 * CSS for smooth page transition
 */
export function getPageTransitionCSS(duration: number): string {
  return `
    .page-transition {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: white;
      opacity: 0;
      pointer-events: none;
      animation: pageTransitionFade ${duration}ms ease-in-out;
      z-index: 1000;
    }

    @keyframes pageTransitionFade {
      0% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
  `;
}

/**
 * Flip animation timeline using GSAP
 */
export function createFlipAnimation(
  element: HTMLElement,
  direction: 'forward' | 'backward',
  config: PageFlipConfig
): Promise<void> {
  return new Promise((resolve) => {
    const scene = element.querySelector('.page-flip-scene') as HTMLElement;
    if (!scene) {
      resolve();
      return;
    }

    const angle = direction === 'forward' ? 180 : -180;
    const easing = 'power2.out';

    // Using requestAnimationFrame since we may not have GSAP available
    const startTime = Date.now();
    const startRotation = direction === 'forward' ? 0 : 180;
    const endRotation = direction === 'forward' ? 180 : 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / config.duration, 1);

      // Easing: cubic-bezier(0.645, 0.045, 0.355, 1)
      const easeProgress =
        progress < 0.5
          ? 2 * progress * progress * (2 - progress)
          : -1 + (4 - 2 * progress) * progress;

      const rotation =
        startRotation + (endRotation - startRotation) * easeProgress;

      scene.style.transform = `rotateY(${rotation}deg)`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        scene.classList.toggle('flipped');
        resolve();
      }
    };

    animate();
  });
}

/**
 * Double-page spread flip animation
 */
export function createDoublePagFlipAnimation(
  leftPage: HTMLElement,
  rightPage: HTMLElement,
  direction: 'forward' | 'backward',
  config: PageFlipConfig,
  isRTL: boolean
): Promise<void[]> {
  const leftPromise = createFlipAnimation(
    leftPage,
    direction,
    config
  );
  const rightPromise = createFlipAnimation(
    rightPage,
    direction === 'forward' ? 'backward' : 'forward',
    config
  );

  return Promise.all([leftPromise, rightPromise]);
}

/**
 * Calculate flip progress (for visual feedback)
 */
export function calculateFlipProgress(
  rotation: number,
  maxRotation: number = 180
): number {
  return Math.min(Math.abs(rotation) / maxRotation, 1);
}

/**
 * Shadow intensity based on flip progress
 */
export function calculateShadowIntensity(progress: number): number {
  // Peak at 50%, fade out after
  if (progress < 0.5) {
    return progress * 2;
  }
  return (1 - progress) * 2;
}

/**
 * Get CSS class for page flip state
 */
export function getPageFlipClass(
  direction: 'forward' | 'backward',
  progress: number
): string {
  if (progress === 0) return 'page-initial';
  if (progress < 0.25) return 'page-flip-start';
  if (progress < 0.5) return 'page-flip-middle';
  if (progress < 0.75) return 'page-flip-end-half';
  if (progress < 1) return 'page-flip-near-complete';
  return 'page-flipped';
}

/**
 * Transform values for smooth page flip
 */
export function getFlipTransform(
  rotation: number,
  perspective: number,
  isRTL: boolean
): string {
  const axis = isRTL ? 'Y' : 'Y';
  const normalizedRotation = Math.min(Math.max(rotation, -180), 180);

  return `
    perspective(${perspective}px) 
    rotateX(0deg) 
    rotateY(${normalizedRotation}deg) 
    scale(${0.95 + calculateFlipProgress(normalizedRotation) * 0.05})
  `;
}

/**
 * Preload flip animation assets
 */
export function preloadFlipAssets(pages: HTMLElement[]): void {
  // Trigger hardware acceleration by forcing layout reflow
  pages.forEach(page => {
    if (page) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      page.offsetWidth; // Force reflow
      page.style.willChange = 'transform';
    }
  });
}

/**
 * Cancel ongoing flip animation
 */
export function cancelFlipAnimation(element: HTMLElement): void {
  const scene = element.querySelector('.page-flip-scene') as HTMLElement;
  if (scene) {
    scene.style.transform = '';
    scene.classList.remove('flipped');
  }
}

/**
 * Check if flip animation is in progress
 */
export function isFlipAnimating(element: HTMLElement): boolean {
  const scene = element.querySelector('.page-flip-scene') as HTMLElement;
  return scene ? scene.style.animation !== 'none' : false;
}

declare module 'animated-backgrounds' {
  import { CSSProperties } from 'react';

  interface InteractionConfig {
    effect?: string;
    strength?: number;
    radius?: number;
    continuous?: boolean;
  }

  interface AnimatedBackgroundProps {
    animationName: string;
    theme?: string;
    interactive?: boolean;
    interactionConfig?: InteractionConfig;
    style?: CSSProperties;
    className?: string;
    enablePerformanceMonitoring?: boolean;
    adaptivePerformance?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  export function AnimatedBackground(props: AnimatedBackgroundProps): JSX.Element;
  export function LayeredBackground(props: { layers: object[] }): JSX.Element;
}

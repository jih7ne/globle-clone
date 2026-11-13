import { Component, type ReactNode } from 'react';

interface Props {
  /** Shown in place of the globe when it fails. */
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Keeps the game playable when the globe cannot start: no WebGL (disabled, blocklisted
 * driver, some CI browsers) or its code failing to load. Without it React removes the whole
 * page, guess box included, on any error thrown while the globe renders.
 */
export class GlobeBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('Globe failed', error);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

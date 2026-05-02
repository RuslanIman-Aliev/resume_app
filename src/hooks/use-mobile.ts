import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect if the viewport width is below the mobile breakpoint (768px).
 * Uses media query listener to track real-time viewport changes.
 * Returns undefined on initial render (SSR), then updates after hydration.
 * @returns Boolean indicating if viewport is mobile-sized (< 768px)
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

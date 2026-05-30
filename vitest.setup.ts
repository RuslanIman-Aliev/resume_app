// Test setup: provide minimal DOM APIs used by third-party libs (canvas, getComputedStyle)
declare const global: any;

import { vi } from "vitest";

// Mock Syncfusion React DocumentEditor to avoid heavy DOM/canvas usage in tests
vi.mock("@syncfusion/ej2-react-documenteditor", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require("react");
  const Dummy = (props: any) =>
    React.createElement(
      "div",
      { "data-mock-doc-editor": true },
      props.children,
    );
  // Provide static Injectable API used in the component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Dummy as any).Inject = (_toolkit?: any) => {};
  return {
    DocumentEditorContainerComponent: Dummy,
    Toolbar: {},
  };
});

if (typeof window !== "undefined") {
  // Mock getComputedStyle to support pseudo-elements used by some libs
  const originalGetComputedStyle = window.getComputedStyle;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).getComputedStyle = (elt: Element, pseudo?: string) => {
    try {
      const res = originalGetComputedStyle(elt as any, pseudo as any);
      // Provide a getPropertyValue fallback for tests
      return {
        ...res,
        getPropertyValue: (prop: string) =>
          (res as any).getPropertyValue?.(prop) ?? "",
      } as CSSStyleDeclaration;
    } catch (e) {
      return {
        getPropertyValue: () => "",
      } as unknown as CSSStyleDeclaration;
    }
  };

  // Provide a minimal 2D canvas context implementation to satisfy libraries
  // that call canvas.getContext('2d').save() / restore() etc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto: any = (window as any).HTMLCanvasElement?.prototype;
  if (proto && !proto.getContext.__patched) {
    proto.getContext = function getContext(_type: string) {
      return {
        save: () => {},
        restore: () => {},
        scale: () => {},
        translate: () => {},
        fillRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        fillText: () => {},
        measureText: () => ({ width: 0 }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        drawImage: () => {},
      };
    };
    proto.getContext.__patched = true;
  }
}

// Optional: silence aria warnings from testing-library in tests
process.env.TESTING = "1";

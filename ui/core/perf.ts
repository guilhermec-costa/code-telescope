import { IFuzzyFinderDataAdapter } from "./abstractions/fuzzy-finder-data-adapter";
import { IPreviewRendererAdapter } from "./abstractions/preview-renderer-adapter";

export class PerformanceLogger {
  static measure<T>(operation: string, fn: () => T | Promise<T>): Promise<T> {
    const start = performance.now();

    return Promise.resolve()
      .then(fn)
      .finally(() => {
        const duration = performance.now() - start;
        console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`);
      });
  }
}

export function withPerformanceLogging<T extends IFuzzyFinderDataAdapter | IPreviewRendererAdapter>(provider: T): T {
  return new Proxy(provider, {
    get(target, prop) {
      const original = (target as any)[prop];
      if (typeof original === "function") {
        return async (...args: any[]) => {
          const name = `${target.constructor.name}.${String(prop)}`;
          return PerformanceLogger.measure(name, () => original.apply(target, args));
        };
      }
      return original;
    },
  });
}

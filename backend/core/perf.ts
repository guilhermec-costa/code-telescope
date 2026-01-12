import * as vscode from "vscode";
import { IFuzzyFinderProvider } from "./abstractions/fuzzy-finder.provider";
import { IWebviewMessageHandler } from "./abstractions/webview-message-handler";

export class PerformanceLogger {
  private static outputChannel = vscode.window.createOutputChannel("Code Telescope Performance");

  static measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      const message = `${operation}: ${duration.toFixed(2)}ms`;

      console.log(`[Performance] ${message}`);
      this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
    });
  }
}

export function withPerformanceLogging<T extends IFuzzyFinderProvider | IWebviewMessageHandler>(provider: T): T {
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

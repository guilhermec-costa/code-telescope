import * as vscode from "vscode";
import { IFuzzyFinderProvider } from "../core/abstractions/fuzzy-finder.provider";
import { IWebviewMessageHandler } from "../core/abstractions/webview-message-handler";

interface PerformanceMetrics {
  operation: string;
  duration: number;
  heapUsedBefore: number;
  heapUsedAfter: number;
  heapDelta: number;
  timestamp: Date;
}

export class PerformanceLogger {
  private static enabled = true;
  private static outputChannel: vscode.OutputChannel;
  private static metrics: PerformanceMetrics[] = [];
  private static maxMetricsHistory = 100;

  /**
   * Initialize the performance logger
   */
  static initialize() {
    this.outputChannel = vscode.window.createOutputChannel("Code Telescope Performance");
  }

  /**
   * Enable or disable performance logging
   */
  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Get current heap usage in MB
   */
  private static getHeapUsedMB(): number {
    const used = process.memoryUsage().heapUsed;
    return Math.round((used / 1024 / 1024) * 100) / 100;
  }

  /**
   * Measure execution time and memory usage of an async operation
   */
  static async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();

    // run Node with --expose-gc to enable
    if (global.gc) {
      global.gc();
    }

    const heapBefore = this.getHeapUsedMB();
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;
      const heapAfter = this.getHeapUsedMB();
      const heapDelta = heapAfter - heapBefore;

      this.recordMetrics({
        operation,
        duration,
        heapUsedBefore: heapBefore,
        heapUsedAfter: heapAfter,
        heapDelta,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      const heapAfter = this.getHeapUsedMB();

      this.log("ERROR", `${operation} failed after ${duration.toFixed(2)}ms`, { error, heapUsed: heapAfter });
      throw error;
    }
  }

  /**
   * Record metrics and log them
   */
  private static recordMetrics(metrics: PerformanceMetrics) {
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    const { operation, duration, heapUsedBefore, heapUsedAfter, heapDelta } = metrics;

    let message = `${operation}: ${duration.toFixed(2)}ms`;
    message += ` | Heap: ${heapUsedBefore}MB → ${heapUsedAfter}MB`;

    if (heapDelta !== 0) {
      const sign = heapDelta > 0 ? "+" : "";
      message += ` (${sign}${heapDelta.toFixed(2)}MB)`;
    }

    // log level based on thresholds
    if (duration > 1000 || Math.abs(heapDelta) > 10) {
      this.log("WARN", message);
    } else if (duration > 500 || Math.abs(heapDelta) > 5) {
      this.log("INFO", message);
    } else {
      this.log("DEBUG", message);
    }
  }

  /**
   * Log a message with level
   */
  private static log(level: "DEBUG" | "INFO" | "WARN" | "ERROR", message: string, data?: any) {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
    }

    switch (level) {
      case "ERROR":
        console.error(formattedMessage);
        break;
      case "WARN":
        console.warn(formattedMessage);
        break;
      case "DEBUG":
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }

    if (this.outputChannel) {
      this.outputChannel.appendLine(formattedMessage);
    }
  }

  /**
   * Get performance summary
   */
  static getSummary(): string {
    if (this.metrics.length === 0) {
      return "No performance metrics recorded yet.";
    }

    const totalOps = this.metrics.length;
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOps;
    const maxDuration = Math.max(...this.metrics.map((m) => m.duration));
    const minDuration = Math.min(...this.metrics.map((m) => m.duration));

    const totalHeapDelta = this.metrics.reduce((sum, m) => sum + m.heapDelta, 0);
    const avgHeapDelta = totalHeapDelta / totalOps;

    const currentHeap = this.getHeapUsedMB();
    const memoryUsage = process.memoryUsage();

    let summary = "\n=== PERFORMANCE SUMMARY ===\n";
    summary += `Total Operations: ${totalOps}\n`;
    summary += `Duration: avg=${avgDuration.toFixed(2)}ms, min=${minDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms\n`;
    summary += `Heap Delta: avg=${avgHeapDelta.toFixed(2)}MB, total=${totalHeapDelta.toFixed(2)}MB\n`;
    summary += `\n=== CURRENT MEMORY ===\n`;
    summary += `Heap Used: ${currentHeap}MB\n`;
    summary += `Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB\n`;
    summary += `RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB\n`;
    summary += `External: ${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB\n`;

    if (memoryUsage.arrayBuffers) {
      summary += `Array Buffers: ${(memoryUsage.arrayBuffers / 1024 / 1024).toFixed(2)}MB\n`;
    }

    return summary;
  }

  /**
   * Print summary to console and output channel
   */
  static printSummary() {
    const summary = this.getSummary();
    console.log(summary);

    if (this.outputChannel) {
      this.outputChannel.appendLine(summary);
      this.outputChannel.show(true);
    }
  }

  /**
   * Get slowest operations
   */
  static getSlowestOperations(count: number = 10): PerformanceMetrics[] {
    return [...this.metrics].sort((a, b) => b.duration - a.duration).slice(0, count);
  }

  /**
   * Get operations with highest memory usage
   */
  static getHighestMemoryOperations(count: number = 10): PerformanceMetrics[] {
    return [...this.metrics].sort((a, b) => Math.abs(b.heapDelta) - Math.abs(a.heapDelta)).slice(0, count);
  }

  /**
   * Clear metrics history
   */
  static clearMetrics() {
    this.metrics = [];
    this.log("INFO", "Performance metrics cleared");
  }

  /**
   * Dispose the logger
   */
  static dispose() {
    if (this.outputChannel) {
      this.outputChannel.dispose();
    }
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

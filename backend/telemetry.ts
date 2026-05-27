import { TelemetryReporter } from "@vscode/extension-telemetry";
import * as vscode from "vscode";
import { Logger } from "./core/log";
import { Globals } from "./globals";

export type TelemetryEventName =
  | "extension.activation.started"
  | "finder.invoked"
  | "customFinder.empty"
  | "customFinder.selected";

export class TelemetryService {
  static readonly instance = new TelemetryService();
  private reporter?: TelemetryReporter;

  private constructor() {}

  trackFinderInvoked(finderName: string) {
    this.track("finder.invoked", { finder: finderName });
  }

  track(eventName: TelemetryEventName, properties?: Record<string, string>, measurements?: Record<string, number>) {
    const reporter = this.getReporter();
    if (!reporter) return;

    try {
      reporter.sendTelemetryEvent(eventName, properties, measurements);
    } catch (error) {
      Logger.warn(`[Telemetry] Failed to send event '${eventName}': ${String(error)}`);
    }
  }

  private getReporter() {
    if (Globals.ENV === vscode.ExtensionMode.Development) {
      return;
    }

    if (!this.reporter) {
      this.reporter = new TelemetryReporter(Globals.REPORT_CONN_STR);
    }

    return this.reporter;
  }

  async dispose() {
    await this.reporter?.dispose();
    this.reporter = undefined;
  }
}

import * as vscode from "vscode";

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static outputChannel = vscode.window.createOutputChannel("Code Telescope - Backend Logs");
  private static level: LogLevel = LogLevel.DEBUG;

  static setLevel(level: LogLevel) {
    this.level = level;
  }

  static log(level: "DEBUG" | "INFO" | "WARN" | "ERROR", message: string, data?: any) {
    const formattedMessage = this.format(level, message);

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
    this.outputChannel.appendLine(formattedMessage);
  }

  static error(message: string, error?: Error) {
    if (this.level < LogLevel.ERROR) return;
    const msg = this.format("ERROR", message, error);
    console.error(msg);
    this.outputChannel.appendLine(msg);
    this.outputChannel.show(true);
  }

  static warn(message: string) {
    if (this.level < LogLevel.WARN) return;
    const msg = this.format("WARN", message);
    console.warn(msg);
    this.outputChannel.appendLine(msg);
  }

  static info(message: string) {
    if (this.level < LogLevel.INFO) return;
    const msg = this.format("INFO", message);
    console.log(msg);
    this.outputChannel.appendLine(msg);
  }

  static debug(message: string, data?: any) {
    if (this.level < LogLevel.DEBUG) return;
    const msg = this.format("DEBUG", message, data);
    console.debug(msg);
    this.outputChannel.appendLine(msg);
  }

  private static format(level: string, message: string, extra?: any): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level}] ${message}`;
    if (extra) {
      formatted += `\n${JSON.stringify(extra, null, 2)}`;
    }
    return formatted;
  }
}

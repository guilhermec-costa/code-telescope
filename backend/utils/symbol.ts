import * as vscode from "vscode";
/**
 * Returns an icon for the symbol kind
 */
export function getSymbolCodicon(kind: vscode.SymbolKind): string {
  const icons: Record<number, string> = {
    [vscode.SymbolKind.File]: "file",
    [vscode.SymbolKind.Module]: "package",
    [vscode.SymbolKind.Namespace]: "symbol-namespace",
    [vscode.SymbolKind.Package]: "package",
    [vscode.SymbolKind.Class]: "symbol-class",
    [vscode.SymbolKind.Method]: "symbol-method",
    [vscode.SymbolKind.Property]: "symbol-property",
    [vscode.SymbolKind.Field]: "symbol-field",
    [vscode.SymbolKind.Constructor]: "symbol-constructor",
    [vscode.SymbolKind.Enum]: "symbol-enum",
    [vscode.SymbolKind.Interface]: "symbol-interface",
    [vscode.SymbolKind.Function]: "symbol-function",
    [vscode.SymbolKind.Variable]: "symbol-variable",
    [vscode.SymbolKind.Constant]: "symbol-constant",
    [vscode.SymbolKind.String]: "symbol-string",
    [vscode.SymbolKind.Number]: "symbol-number",
    [vscode.SymbolKind.Boolean]: "symbol-boolean",
    [vscode.SymbolKind.Array]: "symbol-array",
    [vscode.SymbolKind.Object]: "symbol-object",
    [vscode.SymbolKind.Key]: "key",
    [vscode.SymbolKind.Null]: "circle-slash",
    [vscode.SymbolKind.EnumMember]: "symbol-enum-member",
    [vscode.SymbolKind.Struct]: "symbol-struct",
    [vscode.SymbolKind.Event]: "symbol-event",
    [vscode.SymbolKind.Operator]: "symbol-operator",
    [vscode.SymbolKind.TypeParameter]: "symbol-type-parameter",
  };

  return icons[kind] ?? "symbol-misc";
}

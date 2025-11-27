export interface FuzzyProvider {
  /**
   * Retorna a lista de itens a serem exibidos no fuzzy.
   * Ex: files, branches, symbols, commands...
   */
  querySelectableOptions(): Promise<string[]>;

  /**
   * Quando o usuário seleciona um item (Enter).
   * Pode abrir arquivo, trocar branch, executar comando...
   */
  onSelect?(item: string): void | Promise<void>;
}

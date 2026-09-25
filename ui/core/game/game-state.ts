const ACTIVE_GAME_CLASS = "game-active";

export function isGameActive(): boolean {
  return document.body.classList.contains(ACTIVE_GAME_CLASS);
}

export function setGameActive(active: boolean): void {
  document.body.classList.toggle(ACTIVE_GAME_CLASS, active);
}

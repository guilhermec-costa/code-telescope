import { GameSession } from "../abstractions/game-session";

const SCREEN_WIDTH = 320;
const SCREEN_HEIGHT = 200;
const PIXEL_COUNT = SCREEN_WIDTH * SCREEN_HEIGHT;
const PALETTE_BYTES = 256 * 3;
const ARGV_BUFFER_CAPACITY = 4096;
const TYPE_CHARACTER_FLAG = 0x100;
const DMX_HEADER_BYTES = 8;
const DMX_SAMPLE_RATE = 11025;

const EVENT = {
  SOUND_START: 10,
  SOUND_STOP: 11,
  SOUND_UPDATE: 12,
  MUSIC_SET_GENMIDI: 20,
  MUSIC_REGISTER: 21,
  MUSIC_PLAY: 22,
  MUSIC_PAUSE: 23,
  MUSIC_RESUME: 24,
  MUSIC_STOP: 25,
  MUSIC_UNREGISTER: 26,
  MUSIC_SET_VOLUME: 27,
} as const;

type DoomExports = {
  memory: WebAssembly.Memory;
  wasmdoom_init(): void;
  wasmdoom_argv_ptr(): number;
  wasmdoom_wad_alloc(length: number): number;
  wasmdoom_tick(): void;
  wasmdoom_keydown(key: number): void;
  wasmdoom_keyup(key: number): void;
  wasmdoom_send_mouse(buttons: number, dx: number, dy: number): void;
  wasmdoom_get_framebuffer(): number;
  wasmdoom_get_palette(): number;
  wasmdoom_events_ptr(): number;
  wasmdoom_events_len(): number;
  wasmdoom_events_clear(): void;
};

type MusicExports = {
  memory: WebAssembly.Memory;
  wasmdoom_music_init(sampleRate: number): void;
  wasmdoom_music_alloc(length: number): number;
  wasmdoom_music_set_genmidi(pointer: number, length: number): void;
  wasmdoom_music_register(handle: number, pointer: number, length: number): void;
  wasmdoom_music_play(handle: number, looping: number): void;
  wasmdoom_music_pause(handle: number): void;
  wasmdoom_music_resume(handle: number): void;
  wasmdoom_music_stop(handle: number): void;
  wasmdoom_music_unregister(handle: number): void;
  wasmdoom_music_set_volume(volume: number): void;
  wasmdoom_music_render(frames: number): number;
};

type Voice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
};

type StartDoomOptions = {
  canvas: HTMLCanvasElement;
  engineUrl: string;
  musicEngineUrl: string;
  wadUrl: string;
  onStatus(message: string): void;
  signal?: AbortSignal;
};

const KEY_MAP = new Map<string, number>([
  ["KeyW", 0xad],
  ["KeyS", 0xaf],
  ["KeyA", 0x2c],
  ["KeyD", 0x2e],
  ["ArrowUp", 0xad],
  ["ArrowDown", 0xaf],
  ["ArrowLeft", 0xac],
  ["ArrowRight", 0xae],
  ["Enter", 0x0d],
  ["Backspace", 0x7f],
  ["Space", 0x80 + 0x1d],
  ["ShiftLeft", 0x80 + 0x36],
  ["ShiftRight", 0x80 + 0x36],
  ["KeyE", 0x20],
  ["KeyQ", 0x1b],
  ["Escape", 0x1b],
  ["Tab", 0x09],
  ["Minus", 0x2d],
  ["Equal", 0x3d],
  ["Digit0", 0x30],
  ["Digit1", 0x31],
  ["Digit2", 0x32],
  ["Digit3", 0x33],
  ["Digit4", 0x34],
  ["Digit5", 0x35],
  ["Digit6", 0x36],
  ["Digit7", 0x37],
  ["F1", 0x80 + 0x3b],
  ["F2", 0x80 + 0x3c],
  ["F3", 0x80 + 0x3d],
  ["F4", 0x80 + 0x3e],
  ["F5", 0x80 + 0x3f],
  ["F6", 0x80 + 0x40],
  ["F7", 0x80 + 0x41],
  ["F8", 0x80 + 0x42],
  ["F9", 0x80 + 0x43],
  ["F10", 0x80 + 0x44],
  ["F11", 0x80 + 0x57],
  ["F12", 0x80 + 0x58],
]);

const MOUSE_BUTTONS = [1, 2, 4];

export function stageDoomArguments(memory: WebAssembly.Memory, pointer: number, args: readonly string[]): void {
  const encoded = args.map((arg) => new TextEncoder().encode(arg));
  const requiredBytes = encoded.reduce((total, arg) => total + arg.length + 1, 1);
  if (requiredBytes > ARGV_BUFFER_CAPACITY) throw new Error(`DOOM arguments exceed ${ARGV_BUFFER_CAPACITY} bytes`);

  const target = new Uint8Array(memory.buffer, pointer, ARGV_BUFFER_CAPACITY);
  target.fill(0);
  let offset = 0;
  for (const arg of encoded) {
    target.set(arg, offset);
    offset += arg.length + 1;
  }
}

export function indexedFrameToRgba(indices: Uint8Array, palette: Uint8Array, output: Uint8ClampedArray): void {
  for (let index = 0; index < indices.length; index++) {
    const paletteOffset = indices[index] * 3;
    const outputOffset = index * 4;
    output[outputOffset] = palette[paletteOffset];
    output[outputOffset + 1] = palette[paletteOffset + 1];
    output[outputOffset + 2] = palette[paletteOffset + 2];
    output[outputOffset + 3] = 255;
  }
}

export async function startDoom(options: StartDoomOptions): Promise<GameSession> {
  const { canvas, onStatus } = options;
  const abortController = new AbortController();
  const { signal } = abortController;
  const detachCallerAbort = forwardAbort(options.signal, abortController);

  let runtime: Awaited<ReturnType<typeof initializeDoom>>;
  try {
    runtime = await initializeDoom(options, signal);
    throwIfAborted(signal);
  } catch (error) {
    abortController.abort();
    detachCallerAbort();
    throw error;
  }
  const { doom, audio, context, imageData } = runtime;

  let mouseButtons = 0;
  let mouseX = 0;
  let animationFrame = 0;
  let stopped = false;
  let lastTick = performance.now();

  const draw = () => {
    const framebuffer = new Uint8Array(doom.memory.buffer, doom.wasmdoom_get_framebuffer(), PIXEL_COUNT);
    const palette = new Uint8Array(doom.memory.buffer, doom.wasmdoom_get_palette(), PALETTE_BYTES);
    indexedFrameToRgba(framebuffer, palette, imageData.data);
    context.putImageData(imageData, 0, 0);
  };

  const keydown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    const key = KEY_MAP.get(event.code);
    if (key !== undefined) {
      doom.wasmdoom_keydown(key);
      event.preventDefault();
      event.stopPropagation();
    }
    if (event.key.length === 1) {
      const character = event.key.charCodeAt(0);
      if (character >= 32 && character <= 126) doom.wasmdoom_keydown(TYPE_CHARACTER_FLAG | character);
    }
  };

  const keyup = (event: KeyboardEvent) => {
    const key = KEY_MAP.get(event.code);
    if (key === undefined) return;
    doom.wasmdoom_keyup(key);
    event.preventDefault();
    event.stopPropagation();
  };

  window.addEventListener("keydown", keydown, { signal });
  window.addEventListener("keyup", keyup, { signal });
  document.addEventListener(
    "mousemove",
    (event) => {
      if (document.pointerLockElement !== canvas) return;
      mouseX += event.movementX;
    },
    { signal },
  );
  document.addEventListener(
    "mousedown",
    (event) => {
      if (document.pointerLockElement !== canvas) return;
      const button = MOUSE_BUTTONS[event.button];
      if (button) mouseButtons |= button;
    },
    { signal },
  );
  document.addEventListener(
    "mouseup",
    (event) => {
      const button = MOUSE_BUTTONS[event.button];
      if (button) mouseButtons &= ~button;
    },
    { signal },
  );
  canvas.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });

  const frameDuration = 1000 / 35;
  const loop = (now: number) => {
    if (stopped) return;
    animationFrame = requestAnimationFrame(loop);
    const elapsed = now - lastTick;
    if (elapsed < frameDuration) return;
    lastTick = now - (elapsed % frameDuration);

    try {
      doom.wasmdoom_send_mouse(mouseButtons, mouseX, 0);
      mouseX = 0;
      doom.wasmdoom_tick();
      drainEvents(doom, audio.handleEvent);
      draw();
    } catch (error) {
      stop();
      onStatus(`DOOM stopped: ${toErrorMessage(error)}`);
      console.error("[DOOM] Runtime failure", error);
    }
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    abortController.abort();
    detachCallerAbort();
    cancelAnimationFrame(animationFrame);
    audio.stop();
    if (document.pointerLockElement === canvas) void document.exitPointerLock();
  };

  draw();
  animationFrame = requestAnimationFrame(loop);
  onStatus("Running — click the game to capture the mouse");

  return {
    async capturePointer() {
      if (stopped) return;
      canvas.focus();
      if (document.pointerLockElement !== canvas) await canvas.requestPointerLock();
    },
    stop,
  };
}

async function initializeDoom(options: StartDoomOptions, signal: AbortSignal) {
  const { canvas, engineUrl, musicEngineUrl, wadUrl, onStatus } = options;
  const audioContext = new AudioContext();
  let audio: ReturnType<typeof createDoomAudio> | undefined;

  try {
    throwIfAborted(signal);
    const audioReady = audioContext.resume();
    onStatus("Loading engine and shareware WAD...");
    const [engineResponse, musicResponse, wadResponse] = await Promise.all([
      fetch(engineUrl, { signal }),
      fetch(musicEngineUrl, { signal }),
      fetch(wadUrl, { signal }),
    ]);
    if (!engineResponse.ok) throw new Error(`Could not load DOOM engine (${engineResponse.status})`);
    if (!musicResponse.ok) throw new Error(`Could not load DOOM music engine (${musicResponse.status})`);
    if (!wadResponse.ok) throw new Error(`Could not load DOOM WAD (${wadResponse.status})`);

    const [engineBytes, musicBytes, wadBuffer] = await Promise.all([
      engineResponse.arrayBuffer(),
      musicResponse.arrayBuffer(),
      wadResponse.arrayBuffer(),
    ]);
    throwIfAborted(signal);
    const [engineInstance, musicInstance] = await Promise.all([
      WebAssembly.instantiate(engineBytes, {}),
      WebAssembly.instantiate(musicBytes, {}),
    ]);
    throwIfAborted(signal);
    const doom = engineInstance.instance.exports as unknown as DoomExports;
    const music = musicInstance.instance.exports as unknown as MusicExports;
    assertDoomExports(doom);
    assertMusicExports(music);
    await audioReady;
    throwIfAborted(signal);

    audio = createDoomAudio(doom, music, audioContext);
    const wad = new Uint8Array(wadBuffer);
    const wadPointer = doom.wasmdoom_wad_alloc(wad.length);
    if (wadPointer === 0) throw new Error("DOOM could not allocate memory for the WAD");
    new Uint8Array(doom.memory.buffer, wadPointer, wad.length).set(wad);

    stageDoomArguments(doom.memory, doom.wasmdoom_argv_ptr(), ["-mode", "shareware"]);
    doom.wasmdoom_init();
    drainEvents(doom, audio.handleEvent);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    const imageData = context.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    throwIfAborted(signal);
    return { doom, audio, context, imageData };
  } catch (error) {
    if (audio) audio.stop();
    else void audioContext.close();
    throw error;
  }
}

function createDoomAudio(doom: DoomExports, music: MusicExports, context: AudioContext) {
  const sfxBuffers = new Map<number, AudioBuffer>();
  const voices = new Map<number, Voice>();
  let stopped = false;
  music.wasmdoom_music_init(context.sampleRate);

  const processor = context.createScriptProcessor(1024, 0, 2);
  processor.onaudioprocess = (event) => {
    const left = event.outputBuffer.getChannelData(0);
    const right = event.outputBuffer.getChannelData(1);
    const pointer = music.wasmdoom_music_render(left.length);
    const samples = new Float32Array(music.memory.buffer, pointer, left.length * 2);
    for (let index = 0; index < left.length; index++) {
      left[index] = samples[index * 2];
      right[index] = samples[index * 2 + 1];
    }
  };
  processor.connect(context.destination);

  const stageMusicData = (pointer: number, length: number): number => {
    const target = music.wasmdoom_music_alloc(length);
    if (target !== 0) {
      new Uint8Array(music.memory.buffer, target, length).set(new Uint8Array(doom.memory.buffer, pointer, length));
    }
    return target;
  };

  const handleEvent = (tag: number, payload: DataView) => {
    if (tag === EVENT.SOUND_START) {
      const handle = payload.getInt32(0, true);
      const sfxId = payload.getInt32(4, true);
      const pointer = payload.getUint32(8, true);
      const length = payload.getInt32(12, true);
      const volume = payload.getInt32(16, true);
      const separation = payload.getInt32(20, true);
      const pitch = payload.getInt32(24, true);

      let buffer = sfxBuffers.get(sfxId);
      if (!buffer) {
        const sampleCount = Math.max(0, length - DMX_HEADER_BYTES);
        buffer = context.createBuffer(1, sampleCount, DMX_SAMPLE_RATE);
        const source = new Uint8Array(doom.memory.buffer, pointer + DMX_HEADER_BYTES, sampleCount);
        const channel = buffer.getChannelData(0);
        for (let index = 0; index < sampleCount; index++) channel[index] = (source[index] - 128) / 128;
        sfxBuffers.set(sfxId, buffer);
      }

      const source = context.createBufferSource();
      const pan = context.createStereoPanner();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = Math.max(pitch, 1) / 128;
      pan.pan.value = clamp((separation - 128) / 127, -1, 1);
      gain.gain.value = clamp(volume / 127, 0, 1);
      source.connect(pan).connect(gain).connect(context.destination);
      source.onended = () => voices.delete(handle);
      voices.set(handle, { source, gain, pan });
      source.start();
      return;
    }

    if (tag === EVENT.SOUND_STOP) {
      const handle = payload.getInt32(0, true);
      const voice = voices.get(handle);
      if (voice) {
        try {
          voice.source.stop();
        } catch {}
        voices.delete(handle);
      }
      return;
    }

    if (tag === EVENT.SOUND_UPDATE) {
      const voice = voices.get(payload.getInt32(0, true));
      if (!voice) return;
      voice.gain.gain.value = clamp(payload.getInt32(4, true) / 127, 0, 1);
      voice.pan.pan.value = clamp((payload.getInt32(8, true) - 128) / 127, -1, 1);
      voice.source.playbackRate.value = Math.max(payload.getInt32(12, true), 1) / 128;
      return;
    }

    if (tag === EVENT.MUSIC_SET_GENMIDI) {
      const length = payload.getInt32(4, true);
      const pointer = stageMusicData(payload.getUint32(0, true), length);
      if (pointer) music.wasmdoom_music_set_genmidi(pointer, length);
    } else if (tag === EVENT.MUSIC_REGISTER) {
      const handle = payload.getInt32(0, true);
      const length = payload.getInt32(8, true);
      const pointer = stageMusicData(payload.getUint32(4, true), length);
      if (pointer) music.wasmdoom_music_register(handle, pointer, length);
    } else if (tag === EVENT.MUSIC_PLAY) {
      music.wasmdoom_music_play(payload.getInt32(0, true), payload.getInt32(4, true));
    } else if (tag === EVENT.MUSIC_PAUSE) {
      music.wasmdoom_music_pause(payload.getInt32(0, true));
    } else if (tag === EVENT.MUSIC_RESUME) {
      music.wasmdoom_music_resume(payload.getInt32(0, true));
    } else if (tag === EVENT.MUSIC_STOP) {
      music.wasmdoom_music_stop(payload.getInt32(0, true));
    } else if (tag === EVENT.MUSIC_UNREGISTER) {
      music.wasmdoom_music_unregister(payload.getInt32(0, true));
    } else if (tag === EVENT.MUSIC_SET_VOLUME) {
      music.wasmdoom_music_set_volume(payload.getInt32(0, true));
    }
  };

  return {
    handleEvent,
    stop() {
      if (stopped) return;
      stopped = true;
      processor.disconnect();
      for (const voice of voices.values()) {
        try {
          voice.source.stop();
        } catch {}
      }
      voices.clear();
      void context.close();
    },
  };
}

function forwardAbort(source: AbortSignal | undefined, target: AbortController): () => void {
  if (!source) return () => {};
  const abort = () => target.abort();
  if (source.aborted) abort();
  else source.addEventListener("abort", abort, { once: true });
  return () => source.removeEventListener("abort", abort);
}

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  throw new DOMException("The DOOM launch was aborted", "AbortError");
}

function drainEvents(doom: DoomExports, handler: (tag: number, payload: DataView) => void): void {
  const length = doom.wasmdoom_events_len();
  if (length === 0) return;
  const base = doom.wasmdoom_events_ptr();
  const records = new DataView(doom.memory.buffer, base, length);
  let offset = 0;
  while (offset + 4 <= length) {
    const tag = records.getUint16(offset, true);
    const payloadLength = records.getUint16(offset + 2, true);
    const payloadStart = offset + 4;
    if (payloadStart + payloadLength > length) break;
    handler(tag, new DataView(doom.memory.buffer, base + payloadStart, payloadLength));
    offset = payloadStart + payloadLength;
  }
  doom.wasmdoom_events_clear();
}

function assertDoomExports(exports: DoomExports): void {
  const required = [
    "wasmdoom_init",
    "wasmdoom_argv_ptr",
    "wasmdoom_wad_alloc",
    "wasmdoom_tick",
    "wasmdoom_keydown",
    "wasmdoom_keyup",
    "wasmdoom_send_mouse",
    "wasmdoom_get_framebuffer",
    "wasmdoom_get_palette",
    "wasmdoom_events_ptr",
    "wasmdoom_events_len",
    "wasmdoom_events_clear",
  ] as const;
  if (!(exports.memory instanceof WebAssembly.Memory)) throw new Error("Invalid DOOM WebAssembly memory export");
  for (const name of required) {
    if (typeof exports[name] !== "function") throw new Error(`Missing DOOM WebAssembly export: ${name}`);
  }
}

function assertMusicExports(exports: MusicExports): void {
  const required = [
    "wasmdoom_music_init",
    "wasmdoom_music_alloc",
    "wasmdoom_music_set_genmidi",
    "wasmdoom_music_register",
    "wasmdoom_music_play",
    "wasmdoom_music_pause",
    "wasmdoom_music_resume",
    "wasmdoom_music_stop",
    "wasmdoom_music_unregister",
    "wasmdoom_music_set_volume",
    "wasmdoom_music_render",
  ] as const;
  if (!(exports.memory instanceof WebAssembly.Memory)) throw new Error("Invalid DOOM music memory export");
  for (const name of required) {
    if (typeof exports[name] !== "function") throw new Error(`Missing DOOM music export: ${name}`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

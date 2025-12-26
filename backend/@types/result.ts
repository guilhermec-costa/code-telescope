export type Result<T extends any = any> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: string;
    };

export type AsyncResult<T> = Promise<Result<T>>;

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

type Ok = <T>(value: T) => Result<T, never>;
export const ok: Ok = <T>(value: T) => ({ ok: true, value });

type Err = <E>(error: E) => Result<never, E>;
export const error: Err = <E>(errorValue: E) => ({
  ok: false,
  error: errorValue,
});

/** One value of a search param (Next gives a string, an array or nothing). */
export function param(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

/** A link to `path` with the current params, overridden by `changes` (an undefined value removes a param). */
export function hrefWith(
  path: string,
  current: Record<string, string | undefined>,
  changes: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

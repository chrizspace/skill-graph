/**
 * Name rules shared by the seed, the admin forms and future imports (docs/PLAN.md §2).
 * Two nodes may not share a normalised name, whatever their type.
 */

/** Lowercase, accents and punctuation removed (except + and #, so C# and C++ stay distinct), "&" read as "and". */
export function normalizeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

/** URL-safe slug: "C#" → "csharp", "C++" → "cplusplus", "HTML & CSS" → "html-and-css". */
export function slugify(name: string) {
  return normalizeName(name).replace(/#/g, "sharp").replace(/\+/g, "plus").replace(/ /g, "-");
}

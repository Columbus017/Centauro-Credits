/**
 * Client-side matching for the searchable variant of `SelectField`.
 *
 * The counterpart of `searchTerms()` in `lib/pagination.ts`, which does the
 * same job in SQL for the list screens. Both split a query on whitespace and
 * require *every* term to match, so the combobox and the credits list never
 * disagree about what a query means — "perez 104" finds the same credit in
 * either place.
 *
 * Deliberately dependency-free: this is the only part of the combobox with
 * real edge cases, so it lives in `lib/` under test rather than inside the
 * component.
 */

/** The shape this module needs. `SelectOption` satisfies it structurally. */
type Searchable = { label: string; detail?: string }

/**
 * Fold a string down to what an operator would actually type.
 *
 * Accents go: Guatemalan client names carry them (Pérez, Ordóñez) and nobody
 * types them into a lookup box. Stripping the combining marks after NFD also
 * folds ñ to n, which is the same bargain and equally wanted here.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The options whose label or detail line contains every term of the query.
 *
 * Matching is substring rather than prefix: operators read partial numbers off
 * worn paper cards, so `047` has to find card `1047`. An empty query filters
 * nothing.
 */
export function filterOptions<T extends Searchable>(options: T[], query: string): T[] {
  const terms = normalizeForSearch(query).split(' ').filter(Boolean)
  if (terms.length === 0) return options

  return options.filter((option) => {
    // Both lines are searched as one string, so a term may match either.
    const haystack = normalizeForSearch(`${option.label} ${option.detail ?? ''}`)
    return terms.every((term) => haystack.includes(term))
  })
}

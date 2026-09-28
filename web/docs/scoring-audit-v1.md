# Scoring audit for `student-scoring-v1`

The production rules below are copied from the old project's executed scoring path. They are not inferred from UI labels.

## Evidence

- Old implementation: `student-strength-portrait-open-source/lib/scoring.ts:6-9,18-65,68-72,86-91`.
- Old production result entry: `student-strength-portrait-open-source/components/results-experience.tsx:15,44-46`.
- Old persisted-report entry: `student-strength-portrait-open-source/lib/storage.ts:251-285`.
- Old item/pole import: `student-strength-portrait-open-source/scripts/import_workbook.py:16-37,47-68`.
- Old item mapping: `student-strength-portrait-open-source/data/assessment.ts`.
- Current item mapping: `student-development/web/data/question-bank.json`.

## Confirmed rules

1. Ordinary subdimensions are arithmetic means of their item scores with equal item weight.
2. No ordinary item had `reverse: true`. The old scorer did not reverse ordinary items.
3. Preference left-pole items Q39, Q42, Q44, Q45, Q48 and Q50 execute `6 - raw`; right-pole items keep `raw`.
4. Each of the four preference groups is one bipolar position: the arithmetic mean after aligning all three items to the right-pole direction.
5. Ordinary main dimensions are equal-weight arithmetic means of their already rounded subdimension scores.
6. The old preference overview score exists and measures clarity: `1 + mean(abs(position - 3)) * 2`; it is not ability or direction.
7. Preference direction labels use `< 2.75` left, `> 3.25` right, otherwise between. These are preference-description boundaries, not high/medium/low ability thresholds.
8. No ranking, percentile, norm, or ability level is generated.
9. Old runtime skipped missing answers while grouping, but its production gate required exactly 72 valid answers. The new scorer enforces that gate before scoring and rejects missing, extra, unknown, non-integer, or out-of-range values.
10. Subdimensions and dimensions are rounded to two decimal places with `Math.round(value * 100) / 100`. Preference positions and clarity use the same rule.

Current and old banks both contain Q01-Q72 in the same order with the same dimension and subdimension membership. The current wording is revised, while the scoring mappings are unchanged. The current `scoring_direction` values reproduce the old `preferencePole` map exactly.

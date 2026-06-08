/**
 * Moteur de calculs et answer piping (style Tally).
 * Références de champs : @fieldId ou @{fieldId}
 */

export function resolveFieldReference(
  ref: string,
  formData: Record<string, unknown>,
  blockLabels?: Record<string, string>,
): string {
  const id = ref.trim();
  const value = formData[id];
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Remplace @fieldId dans un texte par les valeurs du formulaire */
export function resolvePipedText(
  text: string,
  formData: Record<string, unknown>,
): string {
  if (!text) return '';
  return text.replace(/@\{?([a-zA-Z0-9_.-]+)\}?/g, (_, fieldId: string) =>
    resolveFieldReference(fieldId, formData),
  );
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function extractFieldRefs(formula: string): string[] {
  const refs: string[] = [];
  const re = /@\{?([a-zA-Z0-9_.-]+)\}?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula)) !== null) {
    refs.push(m[1]);
  }
  return refs;
}

/** Évalue une formule simple */
export function evaluateFormula(
  formula: string,
  formData: Record<string, unknown>,
): string | number {
  if (!formula?.trim()) return '';

  const trimmed = formula.trim();

  // SUM(@a, @b, @c)
  const sumMatch = trimmed.match(/^SUM\s*\((.+)\)$/i);
  if (sumMatch) {
    const refs = extractFieldRefs(sumMatch[1]);
    const total = refs.reduce((acc, id) => acc + toNumber(formData[id]), 0);
    return total;
  }

  // COUNT(@a, @b) — compte les champs non vides
  const countMatch = trimmed.match(/^COUNT\s*\((.+)\)$/i);
  if (countMatch) {
    const refs = extractFieldRefs(countMatch[1]);
    const count = refs.filter((id) => {
      const v = formData[id];
      return v !== null && v !== undefined && v !== '';
    }).length;
    return count;
  }

  // Expression arithmétique : remplacer @refs par nombres
  let expr = formula;
  for (const id of extractFieldRefs(formula)) {
    expr = expr.replace(new RegExp(`@\\{?${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}?`, 'g'), String(toNumber(formData[id])));
  }

  // Sécurité : uniquement chiffres et opérateurs
  if (!/^[\d\s+\-*/().]+$/.test(expr)) {
    return resolvePipedText(formula, formData);
  }

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr})`)();
    return typeof result === 'number' && Number.isFinite(result) ? result : String(result);
  } catch {
    return resolvePipedText(formula, formData);
  }
}

export function computeCalculatedFields(
  blocks: { id: string; type: string; formula?: string }[],
  formData: Record<string, unknown>,
): Record<string, unknown> {
  const computed = { ...formData };
  for (const block of blocks) {
    if (block.type === 'calculated' && block.formula) {
      computed[block.id] = evaluateFormula(block.formula, computed);
    }
  }
  return computed;
}

import { describe, expect, it } from 'vitest';
import {
  evaluateFormula,
  resolvePipedText,
  computeCalculatedFields,
} from './formCalculations';

describe('formCalculations', () => {
  it('résout le answer piping @fieldId', () => {
    expect(resolvePipedText('Bonjour @nom', { nom: 'Marie' })).toBe('Bonjour Marie');
  });

  it('calcule SUM et expressions', () => {
    expect(evaluateFormula('SUM(@a,@b)', { a: 10, b: 5 })).toBe(15);
    expect(evaluateFormula('@x * 2', { x: 3 })).toBe(6);
  });

  it('injecte les champs calculés', () => {
    const blocks = [
      { id: 'total', type: 'calculated', formula: 'SUM(@a,@b)' },
    ];
    const result = computeCalculatedFields(blocks, { a: 1, b: 2 });
    expect(result.total).toBe(3);
  });
});

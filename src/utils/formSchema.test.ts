import { describe, expect, it } from 'vitest';
import {
  blocksToLegacyFields,
  createBlock,
  evaluateConditional,
  parseToFormSchemaV1,
} from './formSchema';

describe('formSchema', () => {
  it('parse le schéma v1', () => {
    const schema = parseToFormSchemaV1({
      version: 1,
      settings: { title: 'Test' },
      blocks: [createBlock('short_text', 'Nom')],
    });
    expect(schema.version).toBe(1);
    expect(schema.blocks).toHaveLength(1);
  });

  it('migre le format imbriqué legacy', () => {
    const schema = parseToFormSchemaV1({
      identification: {
        label: 'Identification',
        fields: {
          nom: { type: 'text', label: 'Nom', required: true },
        },
      },
    });
    expect(schema.blocks.length).toBeGreaterThanOrEqual(2);
    const fields = blocksToLegacyFields(schema.blocks);
    expect(fields.some((f) => f.id === 'identification.nom')).toBe(true);
  });

  it('évalue la logique conditionnelle', () => {
    expect(
      evaluateConditional(
        { fieldId: 'a', operator: 'equals', value: 'Oui', action: 'show' },
        { a: 'Oui' },
      ),
    ).toBe(true);
    expect(
      evaluateConditional(
        { fieldId: 'a', operator: 'equals', value: 'Oui', action: 'hide' },
        { a: 'Oui' },
      ),
    ).toBe(false);
  });
});

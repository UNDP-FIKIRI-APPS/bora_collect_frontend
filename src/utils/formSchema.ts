import type {
  ConditionalRule,
  FormBlock,
  FormBlockType,
  FormSchemaV1,
  FormSettings,
  LegacyExtractedField,
} from '../types/formSchema';

const DEFAULT_SETTINGS = (): FormSettings => ({
  title: 'Nouveau formulaire',
  description: '',
  theme: {
    primaryColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  thankYou: {
    title: 'Merci !',
    message: 'Votre réponse a bien été enregistrée.',
  },
  hiddenFields: [],
});

export function createEmptySchema(title = 'Nouveau formulaire'): FormSchemaV1 {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS(), title },
    blocks: [],
  };
}

export function createBlock(type: FormBlockType, label?: string): FormBlock {
  const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const defaults: Partial<Record<FormBlockType, Partial<FormBlock>>> = {
    heading: { label: 'Titre de section', content: 'Titre de section' },
    paragraph: { label: 'Texte', content: 'Ajoutez du texte explicatif ici.' },
    divider: { label: 'Séparateur' },
    page_break: { label: 'Nouvelle page' },
    short_text: { label: 'Question courte', placeholder: 'Votre réponse' },
    long_text: { label: 'Question longue', placeholder: 'Votre réponse détaillée' },
    dropdown: {
      label: 'Liste déroulante',
      options: [
        { id: 'opt_1', label: 'Option 1' },
        { id: 'opt_2', label: 'Option 2' },
      ],
    },
    multiple_choice: {
      label: 'Choix unique',
      options: [
        { id: 'opt_1', label: 'Option 1' },
        { id: 'opt_2', label: 'Option 2' },
      ],
    },
    checkboxes: {
      label: 'Cases à cocher',
      options: [
        { id: 'opt_1', label: 'Option 1' },
        { id: 'opt_2', label: 'Option 2' },
      ],
    },
    ranking: {
      label: 'Classement',
      rankingOptions: ['Option A', 'Option B', 'Option C'],
    },
    rating: { label: 'Note', ratingMax: 5 },
    hidden: { label: 'Champ caché', hiddenKey: 'ref' },
    file: { label: 'Fichier', fileTypes: ['image/*', 'application/pdf'] },
    gps: { label: 'Géolocalisation' },
    signature: { label: 'Signature', required: true },
    calculated: { label: 'Total calculé', formula: 'SUM(@champ1,@champ2)' },
  };

  const base = defaults[type] || { label: label || 'Question' };
  return {
    id,
    type,
    required: false,
    ...base,
    label: label || base.label || 'Question',
  } as FormBlock;
}

function parseJsonIfString(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

export function isFormSchemaV1(raw: unknown): raw is FormSchemaV1 {
  return (
    !!raw &&
    typeof raw === 'object' &&
    (raw as FormSchemaV1).version === 1 &&
    Array.isArray((raw as FormSchemaV1).blocks)
  );
}

function mapLegacyType(type: string): FormBlockType {
  const map: Record<string, FormBlockType> = {
    text: 'short_text',
    textarea: 'long_text',
    select: 'dropdown',
    multiselect: 'checkboxes',
    radio: 'multiple_choice',
    checkbox: 'checkboxes',
    section: 'heading',
    info: 'paragraph',
    tel: 'phone',
  };
  return map[type] || (type as FormBlockType);
}

function flatArrayToBlocks(fields: any[]): FormBlock[] {
  return fields.map((f, index) => {
    const type = mapLegacyType(f.type || 'text');
    const block = createBlock(type, f.label);
    return {
      ...block,
      id: f.id || block.id,
      required: Boolean(f.required),
      placeholder: f.placeholder,
      helpText: f.helpText,
      defaultValue: f.defaultValue,
      conditional: f.conditional
        ? {
            fieldId: f.conditional.field,
            operator: f.conditional.operator || 'equals',
            value: f.conditional.value,
            action: 'show',
          }
        : undefined,
      options: Array.isArray(f.options)
        ? f.options.map((o: string | { label?: string }, i: number) => ({
            id: `opt_${i}`,
            label: typeof o === 'string' ? o : o.label || `Option ${i + 1}`,
          }))
        : block.options,
      rankingOptions: f.rankingOptions,
      validation: f.validation,
      content: type === 'heading' || type === 'paragraph' ? f.label : undefined,
    };
  });
}

const FIELD_ORDER_BY_SECTION: Record<string, string[]> = {
  identification: [
    'nomOuCode',
    'age',
    'sexe',
    'tailleMenage',
    'commune',
    'autreCommune',
    'quartier',
    'autreQuartier',
    'province',
    'ville',
    'city',
    'communeQuartier',
    'geolocalisation',
  ],
  household: [
    'nomOuCode',
    'age',
    'sexe',
    'tailleMenage',
    'commune',
    'autreCommune',
    'quartier',
    'autreQuartier',
    'province',
    'ville',
    'city',
    'communeQuartier',
    'geolocalisation',
  ],
  modeCuisson: ['combustibles', 'autresCombustibles', 'equipements', 'autresEquipements'],
  cooking: ['combustibles', 'equipements', 'autresCombustibles', 'autresEquipements'],
  connaissance: [
    'connaissanceSolutions',
    'explicationSolutions',
    'solutionsConnaissances',
    'avantages',
    'autresAvantages',
  ],
  perceptions: ['obstacles', 'autresObstacles', 'pretA'],
  intentionAdoption: ['pretAcheterFoyer', 'pretAcheterGPL'],
};

function getFieldSortOrder(field: LegacyExtractedField): number {
  const fieldKey = field.id.includes('.') ? field.id.split('.').pop()! : field.id;
  const canonical = FIELD_ORDER_BY_SECTION[field.section];
  if (!canonical) return 999;
  const index = canonical.indexOf(fieldKey);
  return index === -1 ? 999 : index;
}

export function sortExtractedFields(fields: LegacyExtractedField[]): LegacyExtractedField[] {
  return [...fields].sort((a, b) => {
    const sectionDiff =
      getSectionSortOrder(a.sectionLabel, a.section) -
      getSectionSortOrder(b.sectionLabel, b.section);
    if (sectionDiff !== 0) return sectionDiff;
    return getFieldSortOrder(a) - getFieldSortOrder(b);
  });
}

export function getSectionSortOrder(label: string, sectionKey?: string): number {
  const fromLabel = String(label || '').match(/^(\d+)\./);
  if (fromLabel) return Number(fromLabel[1]);

  const byKey: Record<string, number> = {
    identification: 1,
    household: 1,
    modeCuisson: 2,
    cooking: 2,
    connaissance: 3,
    perceptions: 4,
    intentionAdoption: 5,
  };
  if (sectionKey && byKey[sectionKey] !== undefined) return byKey[sectionKey];
  return 99;
}

function nestedObjectToBlocks(fields: Record<string, any>): FormBlock[] {
  const blocks: FormBlock[] = [];
  Object.keys(fields).forEach((sectionKey) => {
    const section = fields[sectionKey];
    if (!section?.fields) return;

    const heading = createBlock('heading', section.label || section.title || sectionKey);
    heading.id = sectionKey;
    heading.content = section.label || section.title || sectionKey;
    blocks.push(heading);

    Object.keys(section.fields).forEach((fieldKey) => {
      const f = section.fields[fieldKey];
      const type = mapLegacyType(f.type || 'text');
      const block = createBlock(type, f.label || f.title || fieldKey);
      block.id = `${sectionKey}.${fieldKey}`;
      block.required = Boolean(f.required);
      block.placeholder = f.placeholder || '';
      block.helpText = f.helpText;
      block.rankingOptions = f.rankingOptions;
      if (f.conditional) {
        block.conditional = {
          fieldId: f.conditional.field?.includes('.')
            ? f.conditional.field
            : `${sectionKey}.${f.conditional.field}`,
          operator: f.conditional.operator || 'equals',
          value: f.conditional.value,
          action: 'show',
        };
      }
      if (Array.isArray(f.options)) {
        block.options = f.options.map((o: string, i: number) => ({
          id: `opt_${i}`,
          label: o,
        }));
      } else if (Array.isArray(f.enum)) {
        block.options = f.enum.map((o: string, i: number) => ({
          id: `opt_${i}`,
          label: o,
        }));
      }
      if (type === 'paragraph' && f.type === 'info') {
        block.content = f.label || f.content || '';
      }
      blocks.push(block);
    });
  });
  return blocks;
}

export function parseToFormSchemaV1(
  raw: unknown,
  meta?: { title?: string; description?: string },
): FormSchemaV1 {
  const parsed = parseJsonIfString(raw);

  if (isFormSchemaV1(parsed)) {
    return {
      ...parsed,
      settings: {
        ...DEFAULT_SETTINGS(),
        ...parsed.settings,
        theme: { ...DEFAULT_SETTINGS().theme, ...parsed.settings?.theme },
        thankYou: { ...DEFAULT_SETTINGS().thankYou, ...parsed.settings?.thankYou },
      },
    };
  }

  const settings = {
    ...DEFAULT_SETTINGS(),
    title: meta?.title || 'Formulaire',
    description: meta?.description || '',
  };

  if (Array.isArray(parsed)) {
    return { version: 1, settings, blocks: flatArrayToBlocks(parsed) };
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.blocks)) {
      return parseToFormSchemaV1({ version: 1, settings: obj.settings || settings, blocks: obj.blocks });
    }
    const hasNestedSections = Object.values(obj).some(
      (v) => v && typeof v === 'object' && (v as any).fields,
    );
    if (hasNestedSections) {
      return { version: 1, settings, blocks: nestedObjectToBlocks(obj as Record<string, any>) };
    }
  }

  return createEmptySchema(settings.title);
}

function blockTypeToLegacy(type: FormBlockType): string {
  const map: Partial<Record<FormBlockType, string>> = {
    short_text: 'text',
    long_text: 'textarea',
    dropdown: 'select',
    multiple_choice: 'radio',
    checkboxes: 'checkbox',
    paragraph: 'info',
    phone: 'tel',
    signature: 'signature',
    calculated: 'calculated',
  };
  return map[type] || type;
}

export function blocksToLegacyFields(blocks: FormBlock[]): LegacyExtractedField[] {
  const fields: LegacyExtractedField[] = [];
  let currentSection = 'page_1';
  let currentSectionLabel = 'Page 1';
  let pageIndex = 1;

  for (const block of blocks) {
    if (block.type === 'page_break') {
      pageIndex += 1;
      currentSection = `page_${pageIndex}`;
      currentSectionLabel = block.label || `Page ${pageIndex}`;
      continue;
    }
    if (block.type === 'heading') {
      currentSection = block.id;
      currentSectionLabel = block.content || block.label;
      continue;
    }
    if (block.type === 'divider' || block.type === 'paragraph') {
      fields.push({
        id: block.id,
        label: block.content || block.label,
        type: block.type === 'paragraph' ? 'info' : 'divider',
        required: false,
        placeholder: '',
        options: [],
        section: currentSection,
        sectionLabel: currentSectionLabel,
        conditional: null,
        rankingOptions: null,
        helpText: block.helpText,
      });
      continue;
    }
    if (block.type === 'hidden') continue;

    if (block.type === 'calculated') {
      fields.push({
        id: block.id,
        label: block.label,
        type: 'calculated',
        required: false,
        placeholder: block.formula || '',
        options: [],
        section: currentSection,
        sectionLabel: currentSectionLabel,
        conditional: block.conditional || null,
        rankingOptions: null,
        helpText: block.helpText,
      });
      continue;
    }

    fields.push({
      id: block.id,
      label: block.label,
      type: blockTypeToLegacy(block.type),
      required: Boolean(block.required),
      placeholder: block.placeholder || '',
      options: (block.options || []).map((o) => o.label),
      min: block.validation?.min,
      max: block.validation?.max,
      section: currentSection,
      sectionLabel: currentSectionLabel,
      conditional: block.conditional || null,
      rankingOptions: block.rankingOptions || null,
      helpText: block.helpText,
      defaultValue: block.defaultValue,
      hiddenKey: block.hiddenKey,
      fileTypes: block.fileTypes,
      ratingMax: block.ratingMax,
    });
  }

  return fields;
}

export function extractFieldsFromFormSchema(raw: unknown): LegacyExtractedField[] {
  const schema = parseToFormSchemaV1(raw);
  return sortExtractedFields(blocksToLegacyFields(schema.blocks));
}

export function getFormPages(blocks: FormBlock[]): FormBlock[][] {
  const pages: FormBlock[][] = [[]];
  for (const block of blocks) {
    if (block.type === 'page_break') {
      pages.push([]);
    } else {
      pages[pages.length - 1].push(block);
    }
  }
  return pages.filter((p) => p.length > 0);
}

export function evaluateConditional(
  rule: ConditionalRule | null | undefined,
  formData: Record<string, unknown>,
): boolean {
  if (!rule) return true;

  const value = formData[rule.fieldId];
  const strValue = value === null || value === undefined ? '' : String(value);
  const compare = rule.value ?? '';

  let matches = false;
  switch (rule.operator) {
    case 'equals':
      matches = strValue === compare;
      break;
    case 'not_equals':
      matches = strValue !== compare;
      break;
    case 'contains':
      matches = Array.isArray(value)
        ? value.map(String).includes(compare)
        : strValue.includes(compare);
      break;
    case 'greater_than':
      matches = Number(value) > Number(compare);
      break;
    case 'less_than':
      matches = Number(value) < Number(compare);
      break;
    case 'is_empty':
      matches = strValue === '' || (Array.isArray(value) && value.length === 0);
      break;
    case 'is_not_empty':
      matches = strValue !== '' && !(Array.isArray(value) && value.length === 0);
      break;
    default:
      matches = true;
  }

  const action = rule.action || 'show';
  if (action === 'hide') return !matches;
  return matches;
}

export function schemaToStorage(schema: FormSchemaV1): FormSchemaV1 {
  return {
    version: 1,
    settings: schema.settings,
    blocks: schema.blocks.map((b, index) => ({
      ...b,
      id: b.id || `blk_${index}`,
    })),
  };
}

export function applyHiddenFieldDefaults(
  schema: FormSchemaV1,
  urlParams: URLSearchParams,
): Record<string, string> {
  const hidden: Record<string, string> = {};
  for (const hf of schema.settings.hiddenFields) {
    hidden[hf.key] = urlParams.get(hf.key) || hf.defaultValue || '';
  }
  for (const block of schema.blocks) {
    if (block.type === 'hidden' && block.hiddenKey) {
      hidden[block.hiddenKey] =
        urlParams.get(block.hiddenKey) || block.defaultValue || '';
    }
  }
  return hidden;
}

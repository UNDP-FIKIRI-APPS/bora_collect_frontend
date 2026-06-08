/** Schéma canonique v1 — inspiré du modèle par blocs de Tally (https://tally.so) */

export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export type ConditionalAction = 'show' | 'hide' | 'require';

export interface ConditionalRule {
  fieldId: string;
  operator: ConditionalOperator;
  value?: string;
  action?: ConditionalAction;
}

export type FormBlockType =
  | 'heading'
  | 'paragraph'
  | 'divider'
  | 'page_break'
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'number'
  | 'phone'
  | 'dropdown'
  | 'multiple_choice'
  | 'checkboxes'
  | 'date'
  | 'file'
  | 'gps'
  | 'ranking'
  | 'rating'
  | 'hidden'
  | 'signature'
  | 'calculated';

export interface BlockOption {
  id: string;
  label: string;
  imageUrl?: string;
}

export interface BlockValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FormBlock {
  id: string;
  type: FormBlockType;
  label: string;
  content?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: BlockOption[];
  validation?: BlockValidation;
  conditional?: ConditionalRule;
  rankingOptions?: string[];
  fileTypes?: string[];
  maxFileSizeMb?: number;
  hiddenKey?: string;
  ratingMax?: number;
  columns?: 1 | 2;
  /** Formule de calcul — ex: "@prix * @quantite" ou "SUM(@a,@b,@c)" */
  formula?: string;
  /** Texte avec références @fieldId (answer piping Tally) */
  pipedContent?: string;
}

export interface HiddenFieldParam {
  key: string;
  label: string;
  defaultValue?: string;
}

export interface FormTheme {
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  coverImageUrl?: string;
  logoUrl?: string;
}

export interface ThankYouSettings {
  title: string;
  message: string;
  redirectUrl?: string;
}

export interface FormSettings {
  title: string;
  description: string;
  theme: FormTheme;
  thankYou: ThankYouSettings;
  hiddenFields: HiddenFieldParam[];
}

export interface FormSchemaV1 {
  version: 1;
  settings: FormSettings;
  blocks: FormBlock[];
}

/** Format aplati utilisé par les renderers existants (ControllerCampaignForms) */
export interface LegacyExtractedField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  options: string[];
  min?: number;
  max?: number;
  section: string;
  sectionLabel: string;
  conditional: ConditionalRule | null;
  rankingOptions: string[] | null;
  helpText?: string;
  defaultValue?: string;
  hiddenKey?: string;
  fileTypes?: string[];
  ratingMax?: number;
}

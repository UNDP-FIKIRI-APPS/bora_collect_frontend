import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormBlock, FormSchemaV1 } from '../../types/formSchema';
import {
  evaluateConditional,
  getFormPages,
} from '../../utils/formSchema';
import {
  computeCalculatedFields,
  evaluateFormula,
  resolvePipedText,
} from '../../utils/formCalculations';
import SignaturePad from './SignaturePad';

interface FormRendererProps {
  schema: FormSchemaV1;
  mode?: 'preview' | 'fill';
  formData?: Record<string, unknown>;
  onChange?: (id: string, value: unknown) => void;
  onSubmit?: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
  embedMode?: boolean;
  showHeader?: boolean;
  submitting?: boolean;
}

function PipedLabel({ text, formData }: { text: string; formData: Record<string, unknown> }) {
  const resolved = resolvePipedText(text, formData);
  return <span>{resolved}</span>;
}

function BlockInput({
  block,
  value,
  formData,
  onChange,
  readOnly,
  primaryColor,
}: {
  block: FormBlock;
  value: unknown;
  formData: Record<string, unknown>;
  onChange?: (v: unknown) => void;
  readOnly?: boolean;
  primaryColor: string;
}) {
  const baseClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm';

  const captureGPS = () => {
    if (!navigator.geolocation || readOnly) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        onChange?.(coords);
      },
      () => alert('Impossible de capturer le GPS'),
      { enableHighAccuracy: true, timeout: 30000 },
    );
  };

  if (block.type === 'heading') {
    const text = block.pipedContent || block.content || block.label;
    return (
      <h2 className="text-xl font-bold text-gray-900">
        <PipedLabel text={text} formData={formData} />
      </h2>
    );
  }
  if (block.type === 'paragraph') {
    const text = block.pipedContent || block.content || block.label;
    return (
      <p className="text-gray-600 text-sm whitespace-pre-wrap">
        <PipedLabel text={text} formData={formData} />
      </p>
    );
  }
  if (block.type === 'divider') return <hr className="border-gray-200" />;
  if (block.type === 'hidden') return null;

  if (block.type === 'calculated') {
    const result = block.formula
      ? evaluateFormula(block.formula, formData)
      : '';
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-sm font-medium text-gray-700">{block.label}</p>
        <p className="text-lg font-semibold mt-1" style={{ color: primaryColor }}>
          {String(result)}
        </p>
      </div>
    );
  }

  const labelText = block.pipedContent
    ? resolvePipedText(block.pipedContent, formData) || block.label
    : block.label;

  const label = (
    <label className="block text-sm font-medium text-gray-800 mb-1">
      {labelText}
      {block.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  const help = block.helpText ? (
    <p className="text-xs text-gray-500 mt-1">{block.helpText}</p>
  ) : null;

  switch (block.type) {
    case 'signature':
      return (
        <div>
          {label}
          <SignaturePad
            value={typeof value === 'string' ? value : ''}
            onChange={(v) => onChange?.(v)}
            readOnly={readOnly}
            primaryColor={primaryColor}
          />
          {help}
        </div>
      );
    case 'long_text':
      return (
        <div>
          {label}
          <textarea
            className={`${baseClass} min-h-[96px]`}
            placeholder={block.placeholder}
            value={String(value ?? '')}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
          />
          {help}
        </div>
      );
    case 'dropdown':
      return (
        <div>
          {label}
          <select
            id={block.id}
            className={baseClass}
            value={String(value ?? '')}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={readOnly}
          >
            <option value="">Sélectionnez...</option>
            {(block.options || []).map((o) => (
              <option key={o.id} value={o.label}>{o.label}</option>
            ))}
          </select>
          {help}
        </div>
      );
    case 'multiple_choice':
    case 'checkboxes':
      return (
        <div>
          {label}
          <div className="space-y-2">
            {(block.options || []).map((o) => {
              const checked =
                block.type === 'checkboxes'
                  ? Array.isArray(value) && value.includes(o.label)
                  : value === o.label;
              return (
                <label key={o.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type={block.type === 'checkboxes' ? 'checkbox' : 'radio'}
                    name={block.id}
                    checked={checked}
                    onChange={() => {
                      if (readOnly) return;
                      if (block.type === 'checkboxes') {
                        const arr = Array.isArray(value) ? [...value] : [];
                        onChange?.(
                          checked ? arr.filter((v) => v !== o.label) : [...arr, o.label],
                        );
                      } else {
                        onChange?.(o.label);
                      }
                    }}
                    disabled={readOnly}
                    style={{ accentColor: primaryColor }}
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          {help}
        </div>
      );
    case 'ranking': {
      const options = block.rankingOptions || (block.options || []).map((o) => o.label);
      const ranks = ['1er', '2e', '3e', '4e', '5e'];
      const rankings = (typeof value === 'object' && value !== null ? value : {}) as Record<string, string>;
      return (
        <div>
          {label}
          <div className="space-y-2">
            {options.map((opt) => (
              <div key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(rankings[opt])}
                  onChange={(e) => {
                    if (readOnly) return;
                    const next = { ...rankings };
                    if (e.target.checked) {
                      const used = Object.values(next);
                      const available = ranks.find((r) => !used.includes(r));
                      if (available) next[opt] = available;
                    } else {
                      delete next[opt];
                    }
                    onChange?.(next);
                  }}
                  disabled={readOnly}
                />
                <span className="flex-1">{opt}</span>
                <select
                  className="text-xs border rounded px-1 py-0.5"
                  value={rankings[opt] || ''}
                  onChange={(e) => onChange?.({ ...rankings, [opt]: e.target.value })}
                  disabled={readOnly || !rankings[opt]}
                >
                  <option value="">—</option>
                  {ranks.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {help}
        </div>
      );
    }
    case 'rating':
      return (
        <div>
          {label}
          <div className="flex gap-1">
            {Array.from({ length: block.ratingMax || 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                className="text-2xl"
                style={{ color: Number(value) >= i + 1 ? primaryColor : '#D1D5DB' }}
                onClick={() => !readOnly && onChange?.(i + 1)}
                disabled={readOnly}
              >
                ★
              </button>
            ))}
          </div>
          {help}
        </div>
      );
    case 'file':
      return (
        <div>
          {label}
          <input
            type="file"
            className={baseClass}
            accept={(block.fileTypes || []).join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > (block.maxFileSizeMb || 5) * 1024 * 1024) {
                alert(`Fichier trop volumineux (max ${block.maxFileSizeMb || 5} Mo)`);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => onChange?.(reader.result);
              reader.readAsDataURL(file);
            }}
            disabled={readOnly}
          />
          {help}
        </div>
      );
    case 'gps':
      return (
        <div>
          {label}
          <input
            className={`${baseClass} bg-gray-50 mb-2`}
            placeholder="Latitude, Longitude"
            value={String(value ?? '')}
            readOnly
          />
          {!readOnly && (
            <button
              type="button"
              onClick={captureGPS}
              className="w-full py-2 text-sm text-white rounded-lg"
              style={{ backgroundColor: primaryColor }}
            >
              Capturer ma position GPS
            </button>
          )}
          {help}
        </div>
      );
    case 'date':
      return (
        <div>
          {label}
          <input
            type="date"
            className={baseClass}
            value={String(value ?? '')}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly}
          />
          {help}
        </div>
      );
    default:
      return (
        <div>
          {label}
          <input
            type={
              block.type === 'email'
                ? 'email'
                : block.type === 'number'
                  ? 'number'
                  : block.type === 'phone'
                    ? 'tel'
                    : 'text'
            }
            className={baseClass}
            placeholder={block.placeholder}
            value={String(value ?? block.defaultValue ?? '')}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
          />
          {help}
        </div>
      );
  }
}

function isBlockValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    return (
      Object.keys(value).length === 0 ||
      Object.values(value).every(
        (entry) => !entry || (typeof entry === 'string' && entry.trim() === ''),
      )
    );
  }
  return false;
}

function validateBlocks(
  blocks: FormBlock[],
  formData: Record<string, unknown>,
): string | null {
  for (const block of blocks) {
    if (!evaluateConditional(block.conditional, formData)) continue;
    if (block.type === 'hidden' || block.type === 'calculated') continue;
    if (['heading', 'paragraph', 'divider', 'page_break'].includes(block.type)) continue;
    if (block.required && isBlockValueEmpty(formData[block.id])) {
      return `Le champ « ${block.label} » est obligatoire`;
    }
  }
  return null;
}

export default function FormRenderer({
  schema,
  mode = 'preview',
  formData: externalData,
  onChange,
  onSubmit,
  readOnly = mode === 'preview',
  embedMode = false,
  showHeader = true,
  submitting = false,
}: FormRendererProps) {
  const [internalData, setInternalData] = useState<Record<string, unknown>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const formData = externalData ?? internalData;
  const { theme } = schema.settings;
  const pages = useMemo(() => getFormPages(schema.blocks), [schema.blocks]);
  const currentPage = pages[pageIndex] || [];
  const isMultiPage = pages.length > 1;

  const computedData = useMemo(
    () => computeCalculatedFields(schema.blocks, formData),
    [schema.blocks, formData],
  );

  const handleChange = useCallback(
    (id: string, value: unknown) => {
      if (onChange) onChange(id, value);
      else setInternalData((prev) => ({ ...prev, [id]: value }));
      setValidationError(null);
    },
    [onChange],
  );

  const visibleBlocks = currentPage
    .filter((block) => evaluateConditional(block.conditional, computedData))
    .sort((a, b) => {
      const aIsGps = a.type === 'gps' ? 1 : 0;
      const bIsGps = b.type === 'gps' ? 1 : 0;
      return aIsGps - bIsGps;
    });

  const handleNext = () => {
    const err =
      pageIndex < pages.length - 1
        ? validateBlocks(visibleBlocks, computedData)
        : validateBlocks(
            schema.blocks.filter((block) => evaluateConditional(block.conditional, computedData)),
            computedData,
          );
    if (err) {
      setValidationError(err);
      return;
    }
    if (pageIndex < pages.length - 1) {
      setPageIndex((p) => p + 1);
    } else {
      onSubmit?.(computeCalculatedFields(schema.blocks, computedData));
    }
  };

  const wrapperClass = embedMode
    ? 'rounded-none border-0 shadow-none'
    : 'rounded-xl shadow-sm border border-gray-100';

  return (
    <div
      className={`overflow-hidden ${wrapperClass}`}
      style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.fontFamily }}
    >
      {!embedMode && theme.coverImageUrl && (
        <img src={theme.coverImageUrl} alt="" className="w-full h-40 object-cover" />
      )}
      <div className={embedMode ? 'p-4 space-y-5' : 'p-6 sm:p-8 space-y-6'}>
        {showHeader && (
          <>
            {theme.logoUrl && (
              <img src={theme.logoUrl} alt="Logo" className="h-10 object-contain mb-2" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{schema.settings.title}</h1>
              {schema.settings.description && (
                <p className="text-gray-600 mt-1 text-sm">{schema.settings.description}</p>
              )}
            </div>
          </>
        )}

        {visibleBlocks.map((block) => (
          <div key={block.id}>
            <BlockInput
              block={block}
              value={computedData[block.id]}
              formData={computedData}
              onChange={(v) => handleChange(block.id, v)}
              readOnly={readOnly}
              primaryColor={theme.primaryColor}
            />
          </div>
        ))}

        {validationError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {validationError}
          </p>
        )}

        {mode === 'fill' && (
          <div className="flex items-center justify-between pt-4">
            {isMultiPage && pageIndex > 0 && (
              <button
                type="button"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setPageIndex((p) => p - 1)}
              >
                ← Précédent
              </button>
            )}
            <button
              type="button"
              className="ml-auto px-6 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting
                ? 'Envoi...'
                : pageIndex < pages.length - 1
                  ? 'Suivant →'
                  : 'Soumettre'}
            </button>
          </div>
        )}

        {isMultiPage && mode === 'fill' && (
          <p className="text-xs text-gray-400 text-center">
            Page {pageIndex + 1} / {pages.length}
          </p>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import enhancedApiService from '../services/enhancedApiService';
import FormRenderer from '../components/form-builder/FormRenderer';
import {
  applyHiddenFieldDefaults,
  isFormSchemaV1,
  parseToFormSchemaV1,
} from '../utils/formSchema';
import {
  normalizeSubmissionFormData,
  validateFormLocation,
} from '../utils/formValidation';
import type { FormSchemaV1 } from '../types/formSchema';

interface LinkData {
  linkId: string;
  survey: {
    id: string;
    title: string;
    description: string;
    formTemplates: { id: string; name: string; description: string; fields: unknown }[];
  };
  enumerator: { id: string; name: string };
}

interface PublicFormSchemaViewProps {
  token: string;
  linkData: LinkData;
  embedMode?: boolean;
}

export default function PublicFormSchemaView({
  token,
  linkData,
  embedMode = false,
}: PublicFormSchemaViewProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [submitterName, setSubmitterName] = useState('');
  const [submitterContact, setSubmitterContact] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema: FormSchemaV1 = useMemo(() => {
    const raw = linkData.survey.formTemplates?.[0]?.fields;
    const parsed = parseToFormSchemaV1(raw, {
      title: linkData.survey.formTemplates?.[0]?.name || linkData.survey.title,
      description: linkData.survey.formTemplates?.[0]?.description || linkData.survey.description,
    });
    if (!parsed.settings.title) {
      parsed.settings.title = linkData.survey.title;
    }
    return parsed;
  }, [linkData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hidden = applyHiddenFieldDefaults(schema, params);
    if (Object.keys(hidden).length > 0) {
      setFormData((prev) => ({ ...prev, ...hidden }));
    }
    for (const block of schema.blocks) {
      if (block.type === 'hidden' && block.hiddenKey) {
        const v = params.get(block.hiddenKey) || block.defaultValue;
        if (v) setFormData((prev) => ({ ...prev, [block.id]: v }));
      }
      if (block.defaultValue && block.type !== 'hidden') {
        setFormData((prev) =>
          prev[block.id] !== undefined ? prev : { ...prev, [block.id]: block.defaultValue },
        );
      }
    }
  }, [schema]);

  const handleChange = useCallback((id: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);

    const normalizedData = normalizeSubmissionFormData(data);
    const locationValidation = validateFormLocation(normalizedData);
    if (!locationValidation.isValid) {
      setError(locationValidation.message || 'Localisation requise');
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      await enhancedApiService.post(
        `/public-links/form/${token}/submit`,
        {
          formData: normalizedData,
          submitterName: submitterName || undefined,
          submitterContact: submitterContact || undefined,
          _hp: honeypot || undefined,
        },
        { skipAuth: true },
      );
      setSubmitted(true);
      const redirect = schema.settings.thankYou.redirectUrl;
      if (redirect) {
        setTimeout(() => {
          window.location.href = redirect;
        }, 2500);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const { thankYou, theme } = schema.settings;
    return (
      <div
        className={`text-center ${embedMode ? 'p-6' : 'min-h-[50vh] flex items-center justify-center p-8'}`}
        style={{ fontFamily: theme.fontFamily }}
      >
        <div className="max-w-md mx-auto">
          <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: theme.primaryColor }} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{thankYou.title}</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{thankYou.message}</p>
          {thankYou.redirectUrl && (
            <p className="text-sm text-gray-400 mt-4">Redirection en cours...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={embedMode ? '' : 'max-w-2xl mx-auto px-3 sm:px-0'} role="main">
      <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
        <label htmlFor="schema_hp">Ne pas remplir</label>
        <input
          type="text"
          id="schema_hp"
          name="_hp"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>
      {!embedMode && (
        <div className="mb-6 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom (optionnel)</label>
            <input
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Nom complet"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact (optionnel)</label>
            <input
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={submitterContact}
              onChange={(e) => setSubmitterContact(e.target.value)}
              placeholder="Téléphone ou email"
            />
          </div>
        </div>
      )}

      <FormRenderer
        schema={schema}
        mode="fill"
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        embedMode={embedMode}
        submitting={submitting}
      />

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}

/** Détecte si le formulaire utilise le schéma v1 */
export function usesFormSchemaV1(linkData: LinkData | null): boolean {
  if (!linkData?.survey?.formTemplates?.[0]?.fields) return false;
  const raw = linkData.survey.formTemplates[0].fields;
  if (isFormSchemaV1(raw)) return true;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return isFormSchemaV1(parsed);
  } catch {
    return false;
  }
}

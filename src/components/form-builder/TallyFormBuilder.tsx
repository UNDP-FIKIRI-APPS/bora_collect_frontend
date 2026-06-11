import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  GripVertical,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import enhancedApiService from '../../services/enhancedApiService';
import type { FormBlock, FormSchemaV1, FormBlockType } from '../../types/formSchema';
import {
  createBlock,
  parseToFormSchemaV1,
  schemaToStorage,
} from '../../utils/formSchema';
import { BLOCK_TYPES, searchBlockTypes } from './blockTypes';
import FormRenderer from './FormRenderer';

export interface TallyFormBuilderProps {
  formId?: string;
  surveyId: string;
  surveyTitle: string;
  initialName: string;
  initialDescription: string;
  initialFields: unknown;
  isPublished?: boolean;
  isVisibleToControllers?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function TallyFormBuilder({
  formId,
  surveyId,
  surveyTitle,
  initialName,
  initialDescription,
  initialFields,
  isPublished = false,
  isVisibleToControllers = false,
  onClose,
  onSaved,
}: TallyFormBuilderProps) {
  const [schema, setSchema] = useState<FormSchemaV1>(() => {
    const parsed = parseToFormSchemaV1(initialFields, {
      title: initialName,
      description: initialDescription,
    });
    parsed.settings.title = initialName;
    parsed.settings.description = initialDescription;
    return parsed;
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ index: number; query: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(isPublished);
  const [visible, setVisible] = useState(isVisibleToControllers);
  const dragIndex = useRef<number | null>(null);
  const selectedBlock = schema.blocks.find((b) => b.id === selectedBlockId);

  const updateBlock = useCallback((id: string, patch: Partial<FormBlock>) => {
    setSchema((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }, []);

  const insertBlock = useCallback((type: FormBlockType, index: number) => {
    const block = createBlock(type);
    setSchema((prev) => {
      const blocks = [...prev.blocks];
      blocks.splice(index, 0, block);
      return { ...prev, blocks };
    });
    setSelectedBlockId(block.id);
    setSlashMenu(null);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setSchema((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [selectedBlockId]);

  const moveBlock = useCallback((from: number, to: number) => {
    if (to < 0 || to >= schema.blocks.length) return;
    setSchema((prev) => {
      const blocks = [...prev.blocks];
      const [item] = blocks.splice(from, 1);
      blocks.splice(to, 0, item);
      return { ...prev, blocks };
    });
  }, [schema.blocks.length]);

  const saveForm = async () => {
    if (schema.blocks.filter((b) => !['heading', 'paragraph', 'divider', 'page_break'].includes(b.type)).length === 0) {
      toast.error('Ajoutez au moins une question');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: schema.settings.title,
        description: schema.settings.description,
        surveyId,
        fields: schemaToStorage(schema),
        isActive: true,
        isVisibleToControllers: visible,
      };

      const isNew = !formId || formId.startsWith('temp_');
      if (isNew) {
        await enhancedApiService.post('/forms', payload);
      } else {
        await enhancedApiService.put(`/forms/${formId}`, payload);
      }

      toast.success('Formulaire sauvegardé');
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Erreur de sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const publishForm = async () => {
    if (!formId || formId.startsWith('temp_')) {
      toast.warning('Sauvegardez le formulaire avant de publier');
      return;
    }
    setLoading(true);
    try {
      await enhancedApiService.post(`/forms/${formId}/publish`);
      setPublished(true);
      toast.success('Formulaire publié — visible par les enquêteurs');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Barre d'outils */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">
          ← Retour
        </button>
        <div className="flex-1 min-w-0">
          <input
            className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none w-full"
            value={schema.settings.title}
            onChange={(e) =>
              setSchema((p) => ({ ...p, settings: { ...p.settings, title: e.target.value } }))
            }
            placeholder="Titre du formulaire"
          />
          <p className="text-xs text-gray-500 truncate">Campagne : {surveyTitle}</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg ${showSettings ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
          title="Paramètres"
        >
          <Settings2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`p-2 rounded-lg ${showPreview ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
          title="Aperçu"
        >
          <Eye className="w-5 h-5" />
        </button>
        <button
          onClick={saveForm}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Sauvegarder
        </button>
        <button
          onClick={publishForm}
          disabled={loading || published}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {published ? 'Publié' : 'Publier'}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Éditeur — style document Tally */}
        <main className={`overflow-y-auto p-6 ${showPreview ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 min-h-[70vh] p-8">
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Tapez <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">/</kbd> pour insérer un bloc
            </div>

            {schema.blocks.length === 0 && (
              <SlashInsertRow
                index={0}
                slashMenu={slashMenu}
                setSlashMenu={setSlashMenu}
                onInsert={insertBlock}
              />
            )}

            {schema.blocks.map((block, index) => (
              <div key={block.id} className="group relative mb-4">
                <div className="flex gap-2 items-start">
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600 cursor-grab"
                      draggable
                      onDragStart={() => { dragIndex.current = index; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex.current !== null) moveBlock(dragIndex.current, index);
                        dragIndex.current = null;
                      }}
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveBlock(index, index - 1)} className="p-0.5 text-gray-400 hover:text-gray-600">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveBlock(index, index + 1)} className="p-0.5 text-gray-400 hover:text-gray-600">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div
                    className={`flex-1 rounded-lg border-2 p-4 transition-colors cursor-pointer ${
                      selectedBlockId === block.id
                        ? 'border-indigo-400 bg-indigo-50/30'
                        : 'border-transparent hover:border-gray-200'
                    }`}
                    onClick={() => setSelectedBlockId(block.id)}
                  >
                    <BlockEditorPreview block={block} onChange={(p) => updateBlock(block.id, p)} />
                  </div>

                  <button
                    onClick={() => removeBlock(block.id)}
                    className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <InsertButton onClick={() => insertBlock('short_text', index + 1)} />

                <SlashInsertRow
                  index={index + 1}
                  slashMenu={slashMenu}
                  setSlashMenu={setSlashMenu}
                  onInsert={insertBlock}
                />
              </div>
            ))}
          </div>
        </main>

        {/* Panneau latéral */}
        {showPreview && (
          <aside className="w-1/2 border-l border-gray-200 bg-gray-50 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Aperçu en direct</h3>
            <FormRenderer schema={schema} mode="preview" readOnly />
          </aside>
        )}

        {showSettings && (
          <aside className="w-80 border-l border-gray-200 bg-white overflow-y-auto p-4 shrink-0">
            <SettingsPanel
              schema={schema}
              setSchema={setSchema}
              selectedBlock={selectedBlock}
              updateBlock={updateBlock}
              visible={visible}
              setVisible={setVisible}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-center my-1 opacity-0 hover:opacity-100 transition-opacity">
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-3 py-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
      >
        <Plus className="w-3.5 h-3.5" /> Ajouter
      </button>
    </div>
  );
}

function SlashInsertRow({
  index,
  slashMenu,
  setSlashMenu,
  onInsert,
}: {
  index: number;
  slashMenu: { index: number; query: string } | null;
  setSlashMenu: (v: { index: number; query: string } | null) => void;
  onInsert: (type: FormBlockType, index: number) => void;
}) {
  const isOpen = slashMenu?.index === index;
  const results = isOpen ? searchBlockTypes(slashMenu.query) : [];

  return (
    <div className="relative my-2">
      <input
        className="w-full px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
        placeholder="Tapez / pour ajouter un bloc..."
        onChange={(e) => {
          const val = e.target.value;
          if (val.startsWith('/')) {
            setSlashMenu({ index, query: val.slice(1) });
          } else if (!val) {
            setSlashMenu(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setSlashMenu(null);
        }}
      />
      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((b) => (
            <button
              key={b.type}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm"
              onClick={() => onInsert(b.type, index)}
            >
              <span className="font-medium">{b.label}</span>
              <span className="text-gray-400 ml-2 text-xs">{b.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockEditorPreview({
  block,
  onChange,
}: {
  block: FormBlock;
  onChange: (p: Partial<FormBlock>) => void;
}) {
  const def = BLOCK_TYPES.find((b) => b.type === block.type);

  if (block.type === 'heading' || block.type === 'paragraph') {
    return (
      <textarea
        className="w-full text-lg font-semibold bg-transparent border-none outline-none resize-none"
        value={block.content || block.label}
        onChange={(e) => onChange({ content: e.target.value, label: e.target.value })}
        rows={block.type === 'heading' ? 1 : 3}
      />
    );
  }

  if (block.type === 'divider') {
    return <hr className="border-gray-300" />;
  }

  if (block.type === 'page_break') {
    return (
      <div className="text-center py-2 text-xs text-indigo-500 font-medium border-y border-dashed border-indigo-200">
        — Nouvelle page —
      </div>
    );
  }

  return (
    <div>
      <input
        className="w-full font-medium text-gray-900 bg-transparent border-none outline-none mb-2"
        value={block.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Question"
      />
      <p className="text-xs text-gray-400">{def?.description}</p>
    </div>
  );
}

function SettingsPanel({
  schema,
  setSchema,
  selectedBlock,
  updateBlock,
  visible,
  setVisible,
}: {
  schema: FormSchemaV1;
  setSchema: React.Dispatch<React.SetStateAction<FormSchemaV1>>;
  selectedBlock?: FormBlock;
  updateBlock: (id: string, p: Partial<FormBlock>) => void;
  visible: boolean;
  setVisible: (v: boolean) => void;
}) {
  if (selectedBlock) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Bloc sélectionné</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(selectedBlock.required)}
            onChange={(e) => updateBlock(selectedBlock.id, { required: e.target.checked })}
          />
          Obligatoire
        </label>
        <div>
          <label className="text-xs text-gray-500">Texte d'aide</label>
          <input
            className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
            value={selectedBlock.helpText || ''}
            onChange={(e) => updateBlock(selectedBlock.id, { helpText: e.target.value })}
          />
        </div>
        {!['calculated', 'signature', 'heading', 'paragraph'].includes(selectedBlock.type) && (
          <div>
            <label className="text-xs text-gray-500">Valeur par défaut</label>
            <input
              className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
              value={selectedBlock.defaultValue || ''}
              onChange={(e) => updateBlock(selectedBlock.id, { defaultValue: e.target.value })}
            />
          </div>
        )}
        {(selectedBlock.type === 'heading' || selectedBlock.type === 'paragraph') && (
          <div>
            <label className="text-xs text-gray-500">Answer piping (@fieldId)</label>
            <input
              className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
              value={selectedBlock.pipedContent || ''}
              onChange={(e) => updateBlock(selectedBlock.id, { pipedContent: e.target.value })}
              placeholder="Bonjour @nom, merci pour votre réponse"
            />
          </div>
        )}
        {selectedBlock.type === 'calculated' && (
          <div>
            <label className="text-xs text-gray-500">Formule</label>
            <input
              className="w-full mt-1 px-2 py-1.5 border rounded text-sm font-mono"
              value={selectedBlock.formula || ''}
              onChange={(e) => updateBlock(selectedBlock.id, { formula: e.target.value })}
              placeholder="SUM(@prix,@taxe) ou @a * @b"
            />
            <p className="text-xs text-gray-400 mt-1">
              Fonctions : SUM(), COUNT(), +, -, *, /. Références : @idChamp
            </p>
          </div>
        )}
        {(selectedBlock.type === 'dropdown' ||
          selectedBlock.type === 'multiple_choice' ||
          selectedBlock.type === 'checkboxes') && (
          <div>
            <label className="text-xs text-gray-500">Options (une par ligne)</label>
            <textarea
              className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
              rows={4}
              value={(selectedBlock.options || []).map((o) => o.label).join('\n')}
              onChange={(e) =>
                updateBlock(selectedBlock.id, {
                  options: e.target.value
                    .split('\n')
                    .filter(Boolean)
                    .map((label, i) => ({ id: `opt_${i}`, label })),
                })
              }
            />
          </div>
        )}
        <ConditionalLogicEditor
          block={selectedBlock}
          allBlocks={schema.blocks}
          onChange={(conditional) => updateBlock(selectedBlock.id, { conditional })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Paramètres du formulaire</h3>
      <div>
        <label className="text-xs text-gray-500">Description</label>
        <textarea
          className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
          rows={2}
          value={schema.settings.description}
          onChange={(e) =>
            setSchema((p) => ({ ...p, settings: { ...p.settings, description: e.target.value } }))
          }
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Couleur principale</label>
        <input
          type="color"
          className="w-full h-9 mt-1 rounded cursor-pointer"
          value={schema.settings.theme.primaryColor}
          onChange={(e) =>
            setSchema((p) => ({
              ...p,
              settings: {
                ...p.settings,
                theme: { ...p.settings.theme, primaryColor: e.target.value },
              },
            }))
          }
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        Visible pour les enquêteurs
      </label>
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Page de remerciement</h4>
        <input
          className="w-full mb-2 px-2 py-1.5 border rounded text-sm"
          value={schema.settings.thankYou.title}
          onChange={(e) =>
            setSchema((p) => ({
              ...p,
              settings: {
                ...p.settings,
                thankYou: { ...p.settings.thankYou, title: e.target.value },
              },
            }))
          }
          placeholder="Titre"
        />
        <textarea
          className="w-full px-2 py-1.5 border rounded text-sm"
          rows={3}
          value={schema.settings.thankYou.message}
          onChange={(e) =>
            setSchema((p) => ({
              ...p,
              settings: {
                ...p.settings,
                thankYou: { ...p.settings.thankYou, message: e.target.value },
              },
            }))
          }
        />
        <input
          className="w-full mt-2 px-2 py-1.5 border rounded text-sm"
          value={schema.settings.thankYou.redirectUrl || ''}
          onChange={(e) =>
            setSchema((p) => ({
              ...p,
              settings: {
                ...p.settings,
                thankYou: { ...p.settings.thankYou, redirectUrl: e.target.value },
              },
            }))
          }
          placeholder="URL de redirection (optionnel)"
        />
      </div>
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Code embed (iframe)</h4>
        <p className="text-xs text-gray-500 mb-2">
          Intégrez ce formulaire sur votre site web
        </p>
        <code className="block text-xs bg-gray-100 p-2 rounded break-all">
          {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/TOKEN" width="100%" height="600" frameborder="0"></iframe>`}
        </code>
      </div>
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Champs cachés (URL)</h4>
        <p className="text-xs text-gray-500 mb-2">
          Ex: <code>?ref=campagne1</code> — comme les hidden fields Tally
        </p>
        <button
          className="text-xs text-indigo-600"
          onClick={() =>
            setSchema((p) => ({
              ...p,
              settings: {
                ...p.settings,
                hiddenFields: [
                  ...p.settings.hiddenFields,
                  { key: `param_${p.settings.hiddenFields.length + 1}`, label: 'Nouveau paramètre' },
                ],
              },
            }))
          }
        >
          + Ajouter un paramètre
        </button>
        {schema.settings.hiddenFields.map((hf, i) => (
          <div key={i} className="flex gap-1 mt-2">
            <input
              className="flex-1 px-2 py-1 border rounded text-xs"
              value={hf.key}
              onChange={(e) => {
                const hiddenFields = [...schema.settings.hiddenFields];
                hiddenFields[i] = { ...hf, key: e.target.value };
                setSchema((p) => ({ ...p, settings: { ...p.settings, hiddenFields } }));
              }}
              placeholder="clé URL"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionalLogicEditor({
  block,
  allBlocks,
  onChange,
}: {
  block: FormBlock;
  allBlocks: FormBlock[];
  onChange: (c: FormBlock['conditional']) => void;
}) {
  const inputBlocks = allBlocks.filter(
    (b) =>
      b.id !== block.id &&
      !['heading', 'paragraph', 'divider', 'page_break', 'hidden'].includes(b.type),
  );
  const rule = block.conditional;

  return (
    <div className="border-t pt-4">
      <h4 className="text-sm font-medium mb-2">Logique conditionnelle</h4>
      {!rule ? (
        <button
          className="text-xs text-indigo-600"
          onClick={() =>
            onChange({
              fieldId: inputBlocks[0]?.id || '',
              operator: 'equals',
              value: '',
              action: 'show',
            })
          }
        >
          + Ajouter une condition
        </button>
      ) : (
        <div className="space-y-2 text-xs">
          <select
            className="w-full px-2 py-1.5 border rounded"
            value={rule.fieldId}
            onChange={(e) => onChange({ ...rule, fieldId: e.target.value })}
          >
            {inputBlocks.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
          <select
            className="w-full px-2 py-1.5 border rounded"
            value={rule.operator}
            onChange={(e) => onChange({ ...rule, operator: e.target.value as any })}
          >
            <option value="equals">est égal à</option>
            <option value="not_equals">n'est pas égal à</option>
            <option value="contains">contient</option>
            <option value="is_empty">est vide</option>
            <option value="is_not_empty">n'est pas vide</option>
          </select>
          {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
            <input
              className="w-full px-2 py-1.5 border rounded"
              value={rule.value || ''}
              onChange={(e) => onChange({ ...rule, value: e.target.value })}
              placeholder="Valeur"
            />
          )}
          <button className="text-red-500" onClick={() => onChange(undefined)}>
            Supprimer la condition
          </button>
        </div>
      )}
    </div>
  );
}

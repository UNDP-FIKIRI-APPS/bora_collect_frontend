import type { FormBlockType } from '../../types/formSchema';

export interface BlockTypeDefinition {
  type: FormBlockType;
  label: string;
  description: string;
  category: 'layout' | 'input' | 'advanced';
  slashAliases: string[];
}

export const BLOCK_TYPES: BlockTypeDefinition[] = [
  { type: 'heading', label: 'Titre', description: 'Titre de section', category: 'layout', slashAliases: ['titre', 'heading', 'h1'] },
  { type: 'paragraph', label: 'Texte', description: 'Bloc de texte informatif', category: 'layout', slashAliases: ['texte', 'paragraph', 'info'] },
  { type: 'divider', label: 'Séparateur', description: 'Ligne de séparation', category: 'layout', slashAliases: ['divider', 'ligne'] },
  { type: 'page_break', label: 'Nouvelle page', description: 'Début d\'une nouvelle page', category: 'layout', slashAliases: ['page', 'nouvelle page'] },
  { type: 'short_text', label: 'Texte court', description: 'Réponse courte sur une ligne', category: 'input', slashAliases: ['texte', 'short', 'court'] },
  { type: 'long_text', label: 'Texte long', description: 'Réponse longue multi-lignes', category: 'input', slashAliases: ['long', 'textarea', 'paragraphe'] },
  { type: 'email', label: 'Email', description: 'Adresse email', category: 'input', slashAliases: ['email', 'mail'] },
  { type: 'number', label: 'Nombre', description: 'Valeur numérique', category: 'input', slashAliases: ['nombre', 'number'] },
  { type: 'phone', label: 'Téléphone', description: 'Numéro de téléphone', category: 'input', slashAliases: ['tel', 'phone', 'téléphone'] },
  { type: 'dropdown', label: 'Liste déroulante', description: 'Sélection unique dans une liste', category: 'input', slashAliases: ['dropdown', 'select', 'liste'] },
  { type: 'multiple_choice', label: 'Choix unique', description: 'Boutons radio', category: 'input', slashAliases: ['radio', 'choix', 'multiple'] },
  { type: 'checkboxes', label: 'Cases à cocher', description: 'Sélection multiple', category: 'input', slashAliases: ['checkbox', 'cases'] },
  { type: 'date', label: 'Date', description: 'Sélecteur de date', category: 'input', slashAliases: ['date', 'calendrier'] },
  { type: 'file', label: 'Fichier', description: 'Upload de fichier', category: 'input', slashAliases: ['file', 'fichier', 'upload'] },
  { type: 'gps', label: 'Géolocalisation', description: 'Coordonnées GPS ou adresse', category: 'input', slashAliases: ['gps', 'localisation'] },
  { type: 'ranking', label: 'Classement', description: 'Classer des options par ordre', category: 'advanced', slashAliases: ['ranking', 'classement'] },
  { type: 'rating', label: 'Note', description: 'Échelle de notation', category: 'advanced', slashAliases: ['rating', 'note', 'étoiles'] },
  { type: 'hidden', label: 'Champ caché', description: 'Donnée invisible (URL params)', category: 'advanced', slashAliases: ['hidden', 'caché'] },
  { type: 'signature', label: 'Signature', description: 'Signature électronique manuscrite', category: 'advanced', slashAliases: ['signature', 'sign'] },
  { type: 'calculated', label: 'Calcul', description: 'Champ calculé (formule)', category: 'advanced', slashAliases: ['calcul', 'formula', 'calc'] },
];

export function searchBlockTypes(query: string): BlockTypeDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return BLOCK_TYPES;
  return BLOCK_TYPES.filter(
    (b) =>
      b.label.toLowerCase().includes(q) ||
      b.type.includes(q) ||
      b.slashAliases.some((a) => a.includes(q)),
  );
}

export const INPUT_BLOCK_TYPES = BLOCK_TYPES.filter((b) => b.category !== 'layout' || b.type === 'hidden');

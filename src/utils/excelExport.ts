import * as XLSX from 'xlsx';
import { collectFormDataKeysFromRecords, flattenFormData } from './formDataFlatten';

// Interface pour les données d'enquête
export interface EnqueteData {
  id: string;
  nomOuCode: string;
  age: string;
  sexe: string;
  tailleMenage: string;
  communeQuartier: string;
  geolocalisation: string;
  dateCreation: string;
  authorName: string;
  combustibles: string[];
  equipements: string[];
  connaissanceSolutions: string;
  avantages: string[];
  obstacles: string[];
  pretAcheterFoyer: string;
  pretAcheterGPL: string;
}

// Interface pour les statistiques par commune
export interface StatsCommune {
  commune: string;
  nombreEnquetes: number;
  typesCombustibles: number;
  typesEquipements: number;
  pourcentageTotal: string;
}

// Interface pour les statistiques globales
export interface StatsGlobales {
  combustible: string;
  nombreEnquetes: number;
}

// Fonction pour exporter les enquêtes en Excel (tous les champs formData dynamiquement)
export const exportEnquetesToExcel = (enquetes: any[], filename: string = 'enquetes') => {
  try {
    const formKeys = collectFormDataKeysFromRecords(enquetes);
    const metadataHeaders = [
      'ID',
      'Source',
      'Date de création',
      'Enquêteur',
      'Statut',
      'Statut validation analyste',
      'Commentaire analyste',
      'ID Campagne',
      'Données complètes (JSON)',
    ];

    const exportData = enquetes.map((enquete) => {
      const flat = flattenFormData(enquete.formData);
      const row: Record<string, string> = {
        ID: enquete.id || '',
        Source:
          enquete.source === 'public_link'
            ? 'Lien public'
            : enquete.source === 'application'
              ? 'Application'
              : '',
        'Date de création': enquete.createdAt
          ? new Date(enquete.createdAt).toLocaleString('fr-FR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '',
        Enquêteur:
          enquete.authorName ||
          enquete.author?.name ||
          enquete.submitterName ||
          '',
        Statut: enquete.status || '',
        'Statut validation analyste': enquete.analystValidationStatus || '',
        'Commentaire analyste': enquete.analystComments || '',
        'ID Campagne': enquete.surveyId || '',
        'Données complètes (JSON)': JSON.stringify(enquete.formData ?? {}),
      };

      for (const key of formKeys) {
        row[key] = flat[key] ?? '';
      }

      return row;
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData, {
      header: [...metadataHeaders, ...formKeys],
    });
    worksheet['!cols'] = [...metadataHeaders, ...formKeys].map(() => ({ wch: 20 }));

    // Ajouter la feuille au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enquêtes');

    // Générer le fichier et le télécharger
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    console.log('✅ Export Excel des enquêtes réussi');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'export Excel des enquêtes:', error);
    return false;
  }
};

// Fonction pour exporter les statistiques en Excel
export const exportStatsToExcel = (
  statsCommune: StatsCommune[], 
  statsCombustibles: StatsGlobales[], 
  statsEquipements: StatsGlobales[],
  filename: string = 'statistiques'
) => {
  try {
    // Créer le workbook
    const workbook = XLSX.utils.book_new();

    // 1. Feuille des statistiques par commune
    const worksheetCommune = XLSX.utils.json_to_sheet(statsCommune.map(stat => ({
      'Commune': stat.commune,
      'Nombre d\'Enquêtes': stat.nombreEnquetes,
      'Types de Combustibles': stat.typesCombustibles,
      'Types d\'Équipements': stat.typesEquipements,
      '% du Total': stat.pourcentageTotal
    })));

    // Ajuster la largeur des colonnes pour la feuille commune
    worksheetCommune['!cols'] = [
      { wch: 20 }, // Commune
      { wch: 20 }, // Nombre d'Enquêtes
      { wch: 20 }, // Types de Combustibles
      { wch: 20 }, // Types d'Équipements
      { wch: 15 }  // % du Total
    ];

    // 2. Feuille des statistiques des combustibles
    const worksheetCombustibles = XLSX.utils.json_to_sheet(statsCombustibles.map(stat => ({
      'Type de Combustible': stat.combustible,
      'Nombre d\'Enquêtes': stat.nombreEnquetes
    })));

    // Ajuster la largeur des colonnes pour la feuille combustibles
    worksheetCombustibles['!cols'] = [
      { wch: 25 }, // Type de Combustible
      { wch: 20 }  // Nombre d'Enquêtes
    ];

    // 3. Feuille des statistiques des équipements
    const worksheetEquipements = XLSX.utils.json_to_sheet(statsEquipements.map(stat => ({
      'Type d\'Équipement': stat.combustible, // Réutiliser la même interface
      'Nombre d\'Enquêtes': stat.nombreEnquetes
    })));

    // Ajuster la largeur des colonnes pour la feuille équipements
    worksheetEquipements['!cols'] = [
      { wch: 25 }, // Type d'Équipement
      { wch: 20 }  // Nombre d'Enquêtes
    ];

    // Ajouter toutes les feuilles au workbook
    XLSX.utils.book_append_sheet(workbook, worksheetCommune, 'Statistiques par Commune');
    XLSX.utils.book_append_sheet(workbook, worksheetCombustibles, 'Combustibles');
    XLSX.utils.book_append_sheet(workbook, worksheetEquipements, 'Équipements');

    // Générer le fichier et le télécharger
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    console.log('✅ Export Excel des statistiques réussi');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'export Excel des statistiques:', error);
    return false;
  }
};

// Fonction pour exporter les statistiques par sexe
export const exportStatsSexeToExcel = (
  statsHommes: number,
  statsFemmes: number,
  statsAutre: number,
  totalEnquetes: number,
  filename: string = 'statistiques_sexe'
) => {
  try {
    // Créer le workbook
    const workbook = XLSX.utils.book_new();

    // Données des statistiques par sexe
    const statsSexe = [
      {
        'Sexe': 'Hommes',
        'Nombre d\'Enquêtes': statsHommes,
        'Pourcentage': totalEnquetes > 0 ? `${((statsHommes / totalEnquetes) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Sexe': 'Femmes',
        'Nombre d\'Enquêtes': statsFemmes,
        'Pourcentage': totalEnquetes > 0 ? `${((statsFemmes / totalEnquetes) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Sexe': 'Autre',
        'Nombre d\'Enquêtes': statsAutre,
        'Pourcentage': totalEnquetes > 0 ? `${((statsAutre / totalEnquetes) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Sexe': 'Total',
        'Nombre d\'Enquêtes': totalEnquetes,
        'Pourcentage': '100%'
      }
    ];

    // Créer la feuille
    const worksheet = XLSX.utils.json_to_sheet(statsSexe);

    // Ajuster la largeur des colonnes
    worksheet['!cols'] = [
      { wch: 15 }, // Sexe
      { wch: 20 }, // Nombre d'Enquêtes
      { wch: 15 }  // Pourcentage
    ];

    // Ajouter la feuille au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Statistiques par Sexe');

    // Générer le fichier et le télécharger
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    console.log('✅ Export Excel des statistiques par sexe réussi');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'export Excel des statistiques par sexe:', error);
    return false;
  }
};

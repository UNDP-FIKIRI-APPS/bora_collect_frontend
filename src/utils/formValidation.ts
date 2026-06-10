export function isGpsFormField(field: {
  type?: string;
  id?: string;
  label?: string;
}): boolean {
  return (
    field.type === 'gps' ||
    /geolocalisation/i.test(field.id || '') ||
    /géolocalisation/i.test(field.label || '') ||
    /GPS/i.test(field.label || '')
  );
}

export function isCommuneFormField(fieldId: string, label?: string): boolean {
  return (
    (/commune/i.test(fieldId) || /commune/i.test(label || '')) &&
    !/autrecommune/i.test(fieldId) &&
    !/geolocalisation/i.test(fieldId)
  );
}

export function isQuartierFormField(fieldId: string, label?: string): boolean {
  return (
    (/quartier/i.test(fieldId) || /quartier/i.test(label || '')) &&
    !/autrequartier/i.test(fieldId) &&
    !/geolocalisation/i.test(fieldId)
  );
}

export function hasValidGpsState(gps?: {
  latitude: number | null;
  longitude: number | null;
}): boolean {
  return (
    gps?.latitude !== null &&
    gps?.latitude !== undefined &&
    gps?.longitude !== null &&
    gps?.longitude !== undefined &&
    !isNaN(gps.latitude) &&
    !isNaN(gps.longitude)
  );
}

export function normalizeSubmissionFormData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = { ...data };
  const geoBase = Object.keys(normalized).find((key) => /geolocalisation$/i.test(key));

  if (geoBase) {
    if (!String(normalized['identification.commune'] || '').trim() && normalized[`${geoBase}_commune`]) {
      normalized['identification.commune'] = normalized[`${geoBase}_commune`];
    }
    if (!String(normalized['identification.quartier'] || '').trim() && normalized[`${geoBase}_quartier`]) {
      normalized['identification.quartier'] = normalized[`${geoBase}_quartier`];
    }
  }

  return normalized;
}

export function isFieldValueEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
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

export function hasFilledCommune(data: Record<string, unknown>): boolean {
  return Object.entries(data).some(([key, value]) => {
    if (!/commune/i.test(key) || /autrecommune/i.test(key) || /geolocalisation/i.test(key)) {
      return false;
    }
    return !isFieldValueEmpty(value);
  });
}

export function hasFilledQuartier(data: Record<string, unknown>): boolean {
  return Object.entries(data).some(([key, value]) => {
    if (!/quartier/i.test(key) || /autrequartier/i.test(key) || /geolocalisation/i.test(key)) {
      return false;
    }
    return !isFieldValueEmpty(value);
  });
}

function looksLikeGpsCoordinates(valueStr: string): boolean {
  if (!valueStr.includes(',') && !valueStr.includes(';')) return false;
  const coords = valueStr.split(/[,;]/).map((part) => parseFloat(part.trim()));
  return coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1]);
}

export function hasGpsInFormData(data: Record<string, unknown>): boolean {
  return Object.entries(data).some(([key, value]) => {
    if (!value) return false;
    const valueStr = String(value).trim();

    if (/geolocalisation/i.test(key) || /gps/i.test(key)) {
      if (looksLikeGpsCoordinates(valueStr)) return true;
      if (typeof value === 'object' && value !== null && ('latitude' in value || 'longitude' in value)) {
        return true;
      }
      return valueStr !== '';
    }

    if (looksLikeGpsCoordinates(valueStr)) {
      return true;
    }

    return false;
  });
}

/** Le formulaire public exige une position GPS capturée. */
export function isFormLocationValid(
  data: Record<string, unknown>,
  gps?: { latitude: number | null; longitude: number | null },
): boolean {
  const normalized = normalizeSubmissionFormData(data);
  return hasValidGpsState(gps) || hasGpsInFormData(normalized);
}

export function validateFormLocation(
  data: Record<string, unknown>,
  gps?: { latitude: number | null; longitude: number | null },
): { isValid: boolean; message?: string } {
  if (isFormLocationValid(data, gps)) {
    return { isValid: true };
  }

  return {
    isValid: false,
    message:
      'Veuillez capturer votre position GPS avant de soumettre le formulaire.',
  };
}

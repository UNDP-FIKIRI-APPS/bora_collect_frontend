export function serializeFormValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.map((item) => serializeFormValue(item)).join('; ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export function flattenFormData(
  data: unknown,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {};

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return result;
  }

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(result, flattenFormData(value, fullKey));
    } else {
      result[fullKey] = serializeFormValue(value);
    }
  }

  return result;
}

export function collectFormDataKeysFromRecords(records: { formData?: unknown }[]): string[] {
  const keys = new Set<string>();
  for (const record of records) {
    Object.keys(flattenFormData(record.formData)).forEach((key) => keys.add(key));
  }
  return Array.from(keys).sort();
}

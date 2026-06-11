type QuartiersModule = typeof import('../data/quartiersData');

let quartiersModule: QuartiersModule | null = null;

export async function loadQuartiersData() {
  if (!quartiersModule) {
    quartiersModule = await import('../data/quartiersData');
  }
  return quartiersModule.quartiersData;
}

export async function getQuartiersByCommuneLazy(
  province: string,
  city: string,
  commune: string,
): Promise<string[]> {
  if (!quartiersModule) {
    quartiersModule = await import('../data/quartiersData');
  }
  return quartiersModule.getQuartiersByCommune(province, city, commune);
}

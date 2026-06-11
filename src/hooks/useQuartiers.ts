import { useEffect, useState } from 'react';
import { getQuartiersByCommuneLazy } from '../utils/loadGeoData';

export function useQuartiers(province: string, city: string, commune: string): string[] {
  const [quartiers, setQuartiers] = useState<string[]>([]);

  useEffect(() => {
    if (!province || !city || !commune) {
      setQuartiers([]);
      return;
    }

    let cancelled = false;
    getQuartiersByCommuneLazy(province, city, commune).then((list) => {
      if (!cancelled) setQuartiers(list);
    });

    return () => {
      cancelled = true;
    };
  }, [province, city, commune]);

  return quartiers;
}

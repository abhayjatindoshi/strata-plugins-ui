import { useMemo } from 'react';
import type { EntityDefinition } from 'strata-data-sync';
import { useStrata } from './use-strata';

export function useRepo<T>(def: EntityDefinition<T>) {
  const { strata } = useStrata();
  return useMemo(() => {
    if (!strata) return null;
    return strata.repo(def);
  }, [strata, def]);
}

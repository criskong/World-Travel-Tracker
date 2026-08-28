import { useMemo } from 'react'
import { buildVisitedSet } from '../store/selectors'
import { useTravelStore } from '../store/travelStore'

/**
 * Insieme dei Paesi visitati, ricalcolato solo quando cambiano le fonti.
 * È stato derivato: vive qui, non nello store e men che meno su IndexedDB.
 */
export function useVisitedCodes(): ReadonlySet<string> {
  const manuallyMarked = useTravelStore((state) => state.manuallyMarked)
  const visits = useTravelStore((state) => state.visits)

  return useMemo(
    () => buildVisitedSet({ manuallyMarked, visits }),
    [manuallyMarked, visits],
  )
}

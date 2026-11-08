import type { CupSnapshot } from "./types"

const CACHE_KEY = "wbpc-cup-v1"

export function readCache(season: number): CupSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSnapshot(parsed) || parsed.season !== season || parsed.matches.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

export function writeCache(snapshot: CupSnapshot) {
  if (snapshot.matches.length === 0) return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    // Ignore quota and private-mode failures. The page still works for this visit.
  }
}

function isSnapshot(value: unknown): value is CupSnapshot {
  if (typeof value !== "object" || value === null) return false
  const snapshot = value as Partial<CupSnapshot>
  return (
    typeof snapshot.season === "number" &&
    typeof snapshot.updatedAt === "number" &&
    Array.isArray(snapshot.matches) &&
    typeof snapshot.teams === "object" &&
    snapshot.teams !== null
  )
}

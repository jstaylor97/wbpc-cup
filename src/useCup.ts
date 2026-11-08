import { useEffect, useRef, useState } from "react"
import { fetchCup, fetchScoreboard, applyScoreboard, needsScoreboardPoll } from "./espn"
import { readCache, writeCache } from "./storage"
import { currentSeasonYear, fallbackTeams } from "./teams"
import type { CupMatch, TeamInfo } from "./types"

const SCHEDULE_INTERVAL_MS = 10 * 60 * 1000
const SCOREBOARD_INTERVAL_MS = 30 * 1000

export function useCup() {
  const season = currentSeasonYear()
  const [matches, setMatches] = useState<CupMatch[]>(() => readCache(season)?.matches ?? [])
  const [teams, setTeams] = useState<Record<string, TeamInfo>>(() => readCache(season)?.teams ?? fallbackTeams())
  const [updatedAt, setUpdatedAt] = useState<number | null>(() => readCache(season)?.updatedAt ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => readCache(season) === null)

  const matchesRef = useRef(matches)
  const teamsRef = useRef(teams)
  const refreshToken = useRef(0)
  matchesRef.current = matches
  teamsRef.current = teams

  useEffect(() => {
    let cancelled = false
    let timer = 0
    let lastFetch = 0
    let inFlight = false

    const publish = (nextMatches: CupMatch[], nextTeams: Record<string, TeamInfo>) => {
      const nextUpdatedAt = Date.now()
      matchesRef.current = nextMatches
      teamsRef.current = nextTeams
      setMatches(nextMatches)
      setTeams(nextTeams)
      setUpdatedAt(nextUpdatedAt)
      setError(null)
      setLoading(false)
      writeCache({ season, matches: nextMatches, teams: nextTeams, updatedAt: nextUpdatedAt })
    }

    const refreshSchedules = async (force: boolean) => {
      if (document.visibilityState === "hidden") return
      if (!force && Date.now() - lastFetch < 60_000) return
      if (inFlight) return
      inFlight = true
      const ticket = ++refreshToken.current
      try {
        const snapshot = await fetchCup(season)
        if (cancelled || ticket !== refreshToken.current) return
        lastFetch = Date.now()
        publish(snapshot.matches, snapshot.teams)
      } catch (cause) {
        if (cancelled || ticket !== refreshToken.current) return
        console.error(cause)
        setLoading(false)
        setError(
          matchesRef.current.length > 0
            ? "Couldn't refresh the cup. Showing the last update."
            : "Couldn't load the cup.",
        )
      } finally {
        inFlight = false
      }
    }

    const scheduleNext = () => {
      timer = window.setTimeout(async () => {
        await refreshSchedules(true)
        if (!cancelled) scheduleNext()
      }, SCHEDULE_INTERVAL_MS)
    }

    void refreshSchedules(true).finally(() => {
      if (!cancelled) scheduleNext()
    })

    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshSchedules(false)
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      refreshToken.current += 1
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [season])

  const pollScoreboard = needsScoreboardPoll(matches)

  useEffect(() => {
    if (!pollScoreboard) return
    let cancelled = false
    let timer = 0

    const poll = async () => {
      if (document.visibilityState === "hidden") return
      const ticket = refreshToken.current
      try {
        const live = await fetchScoreboard()
        if (cancelled || ticket !== refreshToken.current) return
        const next = applyScoreboard(matchesRef.current, live)
        if (cancelled || ticket !== refreshToken.current) return
        const nextUpdatedAt = Date.now()
        matchesRef.current = next
        setMatches(next)
        setUpdatedAt(nextUpdatedAt)
        setError(null)
        writeCache({
          season,
          matches: next,
          teams: teamsRef.current,
          updatedAt: nextUpdatedAt,
        })
      } catch (cause) {
        if (cancelled || ticket !== refreshToken.current) return
        console.error(cause)
        setError("Couldn't refresh live scores. Showing the last update.")
      }
    }

    const scheduleNext = () => {
      timer = window.setTimeout(async () => {
        await poll()
        if (!cancelled) scheduleNext()
      }, SCOREBOARD_INTERVAL_MS)
    }

    scheduleNext()

    const onVisible = () => {
      if (document.visibilityState === "visible") void poll()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [pollScoreboard, season])

  return { season, matches, teams, updatedAt, error, loading }
}

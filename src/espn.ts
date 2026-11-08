import { CUP_TEAMS, fallbackTeams, isCupTeam } from "./teams"
import type { CupMatch, MatchState, TeamInfo } from "./types"

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1"

const STATE_RANK: Record<MatchState, number> = { pre: 0, in: 1, post: 2 }

export async function fetchCup(season: number): Promise<{ matches: CupMatch[]; teams: Record<string, TeamInfo> }> {
  const [schedule, live] = await Promise.all([
    fetchSchedules(season),
    fetchScoreboard().catch(() => [] as CupMatch[]),
  ])
  const matches = applyScoreboard(schedule.matches, live)
  if (import.meta.env.DEV && matches.length !== 12) {
    console.warn(`Expected 12 cup matches, found ${matches.length}`)
  }
  return { matches, teams: schedule.teams }
}

export async function fetchScoreboard(): Promise<CupMatch[]> {
  const payload = await fetchJson(`${ESPN_BASE}/scoreboard`)
  const matches: CupMatch[] = []
  for (const event of asArray(payload.events)) {
    const match = parseMatch(event)
    if (match) matches.push(match)
  }
  return matches
}

export function applyScoreboard(matches: CupMatch[], liveMatches: CupMatch[]): CupMatch[] {
  if (liveMatches.length === 0) return matches
  const byId = new Map(matches.map((match) => [match.id, match]))
  for (const live of liveMatches) {
    const existing = byId.get(live.id)
    byId.set(live.id, existing ? overlayMatch(existing, live) : live)
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
}

export function needsScoreboardPoll(matches: CupMatch[], now = Date.now()): boolean {
  const lookahead = 2 * 60 * 60 * 1000
  const lookback = 3 * 60 * 60 * 1000
  return matches.some((match) => {
    if (match.state === "in") return true
    if (match.state === "post") return false
    const kickoff = Date.parse(match.kickoff)
    if (Number.isNaN(kickoff)) return false
    return kickoff >= now - lookback && kickoff <= now + lookahead
  })
}

async function fetchSchedules(season: number): Promise<{ matches: CupMatch[]; teams: Record<string, TeamInfo> }> {
  const ids = Object.keys(CUP_TEAMS)
  const payloads = await Promise.all(
    ids.flatMap((id) => [
      fetchJson(`${ESPN_BASE}/teams/${id}/schedule?season=${season}`),
      fetchJson(`${ESPN_BASE}/teams/${id}/schedule?season=${season}&fixture=true`),
    ]),
  )

  const teams = fallbackTeams()
  const byId = new Map<string, CupMatch>()
  for (const payload of payloads) {
    collectTeam(payload.team, teams)
    for (const event of asArray(payload.events)) {
      const match = parseMatch(event)
      if (!match) continue
      const existing = byId.get(match.id)
      byId.set(match.id, existing ? preferMatch(existing, match) : match)
    }
  }

  return {
    teams,
    matches: [...byId.values()].sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff)),
  }
}

function overlayMatch(existing: CupMatch, live: CupMatch): CupMatch {
  return {
    ...existing,
    kickoff: live.kickoff || existing.kickoff,
    state: live.state,
    completed: live.completed,
    postponed: live.postponed,
    clock: live.clock,
    home: { teamId: existing.home.teamId, score: live.home.score },
    away: { teamId: existing.away.teamId, score: live.away.score },
  }
}

function preferMatch(a: CupMatch, b: CupMatch): CupMatch {
  if (STATE_RANK[a.state] !== STATE_RANK[b.state]) {
    return STATE_RANK[a.state] > STATE_RANK[b.state] ? a : b
  }
  if (a.completed !== b.completed) return a.completed ? a : b
  const aHasScore = a.home.score !== null
  const bHasScore = b.home.score !== null
  if (aHasScore !== bHasScore) return aHasScore ? a : b
  return a
}

function collectTeam(value: unknown, teams: Record<string, TeamInfo>) {
  if (!isRecord(value)) return
  const id = stringValue(value.id)
  const current = teams[id]
  if (!current) return
  const abbreviation = stringValue(value.abbreviation)
  const logo = stringValue(value.logo)
  teams[id] = {
    ...current,
    abbreviation: abbreviation || current.abbreviation,
    color: normalizeColor(value.color) ?? current.color,
    logo: logo || current.logo,
  }
}

function parseMatch(value: unknown): CupMatch | null {
  if (!isRecord(value)) return null
  const competition = asArray(value.competitions).find(isRecord)
  if (!competition) return null
  const competitors = asArray(competition.competitors).filter(isRecord)
  const home = competitors.find((side) => side.homeAway === "home")
  const away = competitors.find((side) => side.homeAway === "away")
  if (!home || !away) return null

  const homeTeam = isRecord(home.team) ? home.team : {}
  const awayTeam = isRecord(away.team) ? away.team : {}
  const homeId = stringValue(homeTeam.id)
  const awayId = stringValue(awayTeam.id)
  if (!isCupTeam(homeId) || !isCupTeam(awayId)) return null

  const id = stringValue(value.id) || stringValue(competition.id)
  const kickoff = stringValue(value.date) || stringValue(competition.date)
  if (!id || !kickoff) return null

  const status = isRecord(competition.status) ? competition.status : isRecord(value.status) ? value.status : {}
  const statusType = isRecord(status.type) ? status.type : {}
  const typeName = stringValue(statusType.name)
  const state = parseState(statusType.state)
  const postponed = typeName.includes("POSTPON")
  const cancelled = typeName.includes("CANCEL") || typeName.includes("ABANDON")
  if (cancelled) return null

  const completed =
    statusType.completed === true || typeName === "STATUS_FULL_TIME" || typeName === "STATUS_FINAL"

  return {
    id,
    kickoff,
    state,
    completed,
    postponed,
    clock: state === "in" ? liveClock(status, statusType) : null,
    home: { teamId: homeId, score: scoreFor(home.score, state) },
    away: { teamId: awayId, score: scoreFor(away.score, state) },
  }
}

function parseState(value: unknown): MatchState {
  if (value === "in" || value === "post" || value === "pre") return value
  return "pre"
}

function scoreFor(value: unknown, state: MatchState): number | null {
  const score = parseScore(value)
  if (state === "pre") return null
  return score ?? 0
}

function parseScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (isRecord(value)) {
    if ("displayValue" in value) return parseScore(value.displayValue)
    if ("value" in value) return parseScore(value.value)
  }
  return null
}

function liveClock(status: Record<string, unknown>, statusType: Record<string, unknown>): string | null {
  const shortDetail = stringValue(statusType.shortDetail)
  const description = stringValue(statusType.description)
  if (shortDetail === "HT" || description === "Halftime") return "HT"
  const displayClock = stringValue(status.displayClock)
  if (displayClock) return displayClock
  return shortDetail || null
}

function normalizeColor(value: unknown): string | null {
  if (typeof value !== "string") return null
  const hex = value.trim().replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  return `#${hex}`
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error(`ESPN request failed (${response.status})`)
  const payload: unknown = await response.json()
  if (!isRecord(payload)) throw new Error("ESPN returned an unexpected response")
  return payload
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

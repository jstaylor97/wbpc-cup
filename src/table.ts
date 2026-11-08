import { CUP_TEAMS } from "./teams"
import type { CupMatch, Standing, TeamInfo } from "./types"

type Row = {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  live: boolean
  h2hPoints: number
  h2hAwayGoals: number
}

// Premier League order: points, goal difference, goals scored, then
// head-to-head points and away goals among the clubs still level.
// Clubs still level after that share a place.
export function buildStandings(matches: CupMatch[], teams: Record<string, TeamInfo>): Standing[] {
  const rows = new Map<string, Row>()
  for (const team of Object.values(CUP_TEAMS)) rows.set(team.id, emptyRow(team.id))

  for (const match of matches) {
    if (!matchCounts(match)) continue
    const home = match.home.score ?? 0
    const away = match.away.score ?? 0
    addResult(rows.get(match.home.teamId), home, away, match.state === "in")
    addResult(rows.get(match.away.teamId), away, home, match.state === "in")
  }

  const groups = new Map<string, Row[]>()
  for (const row of rows.values()) {
    const key = baseKey(row)
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }

  const ordered: Row[] = []
  for (const group of [...groups.values()].sort((a, b) => compareBase(a[0], b[0]))) {
    if (group.length > 1) {
      const tiedIds = new Set(group.map((row) => row.teamId))
      const headToHeadTotals = headToHead(matches, tiedIds)
      for (const row of group) {
        const total = headToHeadTotals.get(row.teamId)
        row.h2hPoints = total?.points ?? 0
        row.h2hAwayGoals = total?.awayGoals ?? 0
      }
      group.sort((a, b) => compareHeadToHead(a, b, teams))
    }
    ordered.push(...group)
  }

  const standings: Standing[] = []
  for (let index = 0; index < ordered.length; index += 1) {
    const row = ordered[index]
    const previous = standings[index - 1]
    const position = previous && samePlace(ordered[index - 1], row) ? previous.position : index + 1
    standings.push(toStanding(row, position))
  }
  return standings
}

export function matchCounts(match: CupMatch): boolean {
  return match.state === "in" || (match.state === "post" && match.completed && !match.postponed)
}

export function formatGoalDifference(goalDifference: number): string {
  if (goalDifference > 0) return `+${goalDifference}`
  return String(goalDifference)
}

function emptyRow(teamId: string): Row {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    live: false,
    h2hPoints: 0,
    h2hAwayGoals: 0,
  }
}

function addResult(row: Row | undefined, goalsFor: number, goalsAgainst: number, live: boolean) {
  if (!row) return
  row.played += 1
  row.goalsFor += goalsFor
  row.goalsAgainst += goalsAgainst
  if (live) row.live = true
  if (goalsFor > goalsAgainst) {
    row.won += 1
    row.points += 3
  } else if (goalsFor === goalsAgainst) {
    row.drawn += 1
    row.points += 1
  } else {
    row.lost += 1
  }
}

function headToHead(matches: CupMatch[], ids: Set<string>) {
  const totals = new Map<string, { points: number; awayGoals: number }>()
  for (const id of ids) totals.set(id, { points: 0, awayGoals: 0 })

  for (const match of matches) {
    if (!matchCounts(match)) continue
    if (!ids.has(match.home.teamId) || !ids.has(match.away.teamId)) continue
    const home = match.home.score ?? 0
    const away = match.away.score ?? 0
    const homeTotal = totals.get(match.home.teamId)
    const awayTotal = totals.get(match.away.teamId)
    if (!homeTotal || !awayTotal) continue
    if (home > away) homeTotal.points += 3
    else if (home < away) awayTotal.points += 3
    else {
      homeTotal.points += 1
      awayTotal.points += 1
    }
    awayTotal.awayGoals += away
  }

  return totals
}

function baseKey(row: Row): string {
  return `${row.points}|${row.goalsFor - row.goalsAgainst}|${row.goalsFor}`
}

function compareBase(a: Row, b: Row): number {
  if (b.points !== a.points) return b.points - a.points
  const goalDifference = b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst)
  if (goalDifference !== 0) return goalDifference
  return b.goalsFor - a.goalsFor
}

function compareHeadToHead(a: Row, b: Row, teams: Record<string, TeamInfo>): number {
  if (b.h2hPoints !== a.h2hPoints) return b.h2hPoints - a.h2hPoints
  if (b.h2hAwayGoals !== a.h2hAwayGoals) return b.h2hAwayGoals - a.h2hAwayGoals
  return teamName(a.teamId, teams).localeCompare(teamName(b.teamId, teams))
}

function samePlace(a: Row, b: Row): boolean {
  return baseKey(a) === baseKey(b) && a.h2hPoints === b.h2hPoints && a.h2hAwayGoals === b.h2hAwayGoals
}

function teamName(teamId: string, teams: Record<string, TeamInfo>): string {
  return teams[teamId]?.shortName ?? CUP_TEAMS[teamId]?.shortName ?? teamId
}

function toStanding(row: Row, position: number): Standing {
  return {
    teamId: row.teamId,
    position,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalsFor - row.goalsAgainst,
    points: row.points,
    live: row.live,
  }
}

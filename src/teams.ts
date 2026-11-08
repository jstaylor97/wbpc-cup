import type { TeamInfo } from "./types"

export const CUP_TEAMS: Record<string, TeamInfo> = {
  "359": {
    id: "359",
    shortName: "Arsenal",
    name: "Arsenal",
    abbreviation: "ARS",
    color: "#EF0107",
    logo: null,
  },
  "337": {
    id: "337",
    shortName: "Brentford",
    name: "Brentford",
    abbreviation: "BRE",
    color: "#E30613",
    logo: null,
  },
  "331": {
    id: "331",
    shortName: "Brighton",
    name: "Brighton & Hove Albion",
    abbreviation: "BHA",
    color: "#0057B8",
    logo: null,
  },
  "384": {
    id: "384",
    shortName: "Crystal Palace",
    name: "Crystal Palace",
    abbreviation: "CRY",
    color: "#1B458F",
    logo: null,
  },
}

export function isCupTeam(teamId: string): boolean {
  return Object.prototype.hasOwnProperty.call(CUP_TEAMS, teamId)
}

export function fallbackTeams(): Record<string, TeamInfo> {
  return Object.fromEntries(Object.values(CUP_TEAMS).map((team) => [team.id, { ...team }]))
}

export function currentSeasonYear(now = new Date()): number {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
}

export function seasonLabel(year: number): string {
  return `${year}-${String(year + 1).slice(-2)}`
}

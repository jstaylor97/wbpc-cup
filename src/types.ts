export type MatchState = "pre" | "in" | "post"

export type MatchSide = {
  teamId: string
  score: number | null
}

export type CupMatch = {
  id: string
  kickoff: string
  state: MatchState
  completed: boolean
  postponed: boolean
  clock: string | null
  home: MatchSide
  away: MatchSide
}

export type TeamInfo = {
  id: string
  shortName: string
  name: string
  abbreviation: string
  color: string | null
  logo: string | null
}

export type Standing = {
  teamId: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  live: boolean
}

export type CupSnapshot = {
  season: number
  matches: CupMatch[]
  teams: Record<string, TeamInfo>
  updatedAt: number
}

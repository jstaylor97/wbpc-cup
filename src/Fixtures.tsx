import { CUP_TEAMS } from "./teams"
import { formatKickoff } from "./format"
import { matchCounts } from "./table"
import type { CupMatch, TeamInfo } from "./types"
import { Crest } from "./Crest"

export function Fixtures({ matches, teams }: { matches: CupMatch[]; teams: Record<string, TeamInfo> }) {
  const live = sortByKickoff(matches.filter((match) => match.state === "in"))
  const upcoming = sortByKickoff(matches.filter((match) => !matchCounts(match) && match.state !== "in"))
  const results = sortByKickoff(
    matches.filter((match) => match.state === "post" && match.completed && !match.postponed),
    true,
  )

  return (
    <div className="fixtures">
      {live.length > 0 ? (
        <FixtureGroup id="live" title="Live" matches={live} teams={teams} live />
      ) : null}
      <FixtureGroup
        id="upcoming"
        title="Upcoming"
        matches={upcoming}
        teams={teams}
        empty="No upcoming cup games."
      />
      <FixtureGroup
        id="results"
        title="Results"
        matches={results}
        teams={teams}
        empty="No completed cup games."
      />
    </div>
  )
}

function FixtureGroup({
  id,
  title,
  matches,
  teams,
  empty,
  live = false,
}: {
  id: string
  title: string
  matches: CupMatch[]
  teams: Record<string, TeamInfo>
  empty?: string
  live?: boolean
}) {
  return (
    <section id={id} className="card" aria-labelledby={`${id}-heading`} aria-live={live ? "polite" : undefined}>
      <h2 id={`${id}-heading`}>{title}</h2>
      {matches.length === 0 ? <p className="empty">{empty}</p> : null}
      <div className="fixture-list">
        {matches.map((match) => (
          <Fixture key={match.id} match={match} teams={teams} />
        ))}
      </div>
    </section>
  )
}

function Fixture({ match, teams }: { match: CupMatch; teams: Record<string, TeamInfo> }) {
  const home = teams[match.home.teamId] ?? CUP_TEAMS[match.home.teamId]
  const away = teams[match.away.teamId] ?? CUP_TEAMS[match.away.teamId]
  const live = match.state === "in"

  return (
    <article className={live ? "fixture is-live" : "fixture"}>
      <time dateTime={match.kickoff}>{formatKickoff(match.kickoff)}</time>
      <div className="fixture-match">
        <TeamSide team={home} side="home" />
        <div className="mid">
          {live || match.completed ? (
            <span className="score">
              {match.home.score ?? 0}
              <span className="dash">–</span>
              {match.away.score ?? 0}
            </span>
          ) : (
            <span className="versus">{match.postponed ? "Postponed" : "vs"}</span>
          )}
          {live && match.clock ? <span className="clock">{match.clock}</span> : null}
        </div>
        <TeamSide team={away} side="away" />
      </div>
    </article>
  )
}

function TeamSide({ team, side }: { team: TeamInfo; side: "home" | "away" }) {
  return (
    <div className={`side ${side}`} title={team.name}>
      {side === "away" ? <Crest team={team} /> : null}
      <span className="team-name">{team.shortName}</span>
      {side === "home" ? <Crest team={team} /> : null}
    </div>
  )
}

function sortByKickoff(matches: CupMatch[], descending = false): CupMatch[] {
  return [...matches].sort((a, b) => {
    const delta = Date.parse(a.kickoff) - Date.parse(b.kickoff)
    return descending ? -delta : delta
  })
}

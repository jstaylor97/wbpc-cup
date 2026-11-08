import type { CSSProperties } from "react"
import { CUP_TEAMS } from "./teams"
import { formatGoalDifference } from "./table"
import type { Standing, TeamInfo } from "./types"
import { Crest } from "./Crest"

const COLUMNS: { key: string; label: string; title: string }[] = [
  { key: "played", label: "P", title: "Played" },
  { key: "won", label: "W", title: "Won" },
  { key: "drawn", label: "D", title: "Drawn" },
  { key: "lost", label: "L", title: "Lost" },
  { key: "goalsFor", label: "GF", title: "Goals for" },
  { key: "goalsAgainst", label: "GA", title: "Goals against" },
  { key: "goalDifference", label: "GD", title: "Goal difference" },
  { key: "points", label: "Pts", title: "Points" },
]

export function Standings({
  standings,
  teams,
  hasLive,
}: {
  standings: Standing[]
  teams: Record<string, TeamInfo>
  hasLive: boolean
}) {
  return (
    <section id="standings" className="card" aria-labelledby="standings-heading">
      <h2 id="standings-heading">Standings</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">
                <abbr title="Position">#</abbr>
              </th>
              <th scope="col">Team</th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" className={column.key === "points" ? "points" : undefined}>
                  <abbr title={column.title}>{column.label}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const team = teams[row.teamId] ?? CUP_TEAMS[row.teamId]
              return (
                <tr key={row.teamId} className={row.live ? "is-live" : undefined}>
                  <td className="pos">{row.position}</td>
                  <th scope="row" style={{ "--club": team.color ?? "#14372b" } as CSSProperties}>
                    <span className="team">
                      <Crest team={team} />
                      <span className="team-name" title={team.name}>
                        {team.shortName}
                      </span>
                      {row.live ? <span className="badge">Live</span> : null}
                    </span>
                  </th>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.goalsFor}</td>
                  <td>{row.goalsAgainst}</td>
                  <td>{formatGoalDifference(row.goalDifference)}</td>
                  <td className="points">{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {hasLive ? <p className="note">Points include the current score.</p> : null}
    </section>
  )
}

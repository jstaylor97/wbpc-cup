import { useMemo } from "react"
import crest from "../wbpc_cup_crest_simple.png"
import { Fixtures } from "./Fixtures"
import { formatUpdated } from "./format"
import { buildStandings } from "./table"
import { seasonLabel } from "./teams"
import { useCup } from "./useCup"
import { Standings } from "./Standings"

export function App() {
  const { season, matches, teams, updatedAt, error, loading } = useCup()
  const standings = useMemo(() => buildStandings(matches, teams), [matches, teams])
  const hasLive = matches.some((match) => match.state === "in")

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <img className="logo" src={crest} alt="Wrox Bros Pickling Co crest" />
            <div>
              <h1>WBPC Cup</h1>
              <p className="subtitle">
                Wrox Bros Pickling Co Cup · <span className="season">{seasonLabel(season)}</span>
              </p>
            </div>
          </div>
          {matches.length > 0 ? (
            <nav className="jumps" aria-label="Sections">
              <a href="#standings">Standings</a>
              {hasLive ? <a href="#live">Live</a> : null}
              <a href="#upcoming">Upcoming</a>
              <a href="#results">Results</a>
            </nav>
          ) : null}
        </div>
      </header>
      <main>
        {loading ? <p className="banner">Loading cup fixtures…</p> : null}
        {error ? (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && matches.length === 0 ? <p className="banner">No cup games found for this season.</p> : null}
        {matches.length > 0 ? (
          <>
            <Standings standings={standings} teams={teams} hasLive={hasLive} />
            <Fixtures matches={matches} teams={teams} />
          </>
        ) : null}
        {updatedAt ? <p className="updated">Updated {formatUpdated(updatedAt)}</p> : null}
      </main>
    </div>
  )
}

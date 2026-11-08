import { useState } from "react"
import type { TeamInfo } from "./types"

export function Crest({ team }: { team: TeamInfo }) {
  const [failed, setFailed] = useState(false)
  if (!team.logo || failed) {
    return <span className="crest crest-fallback">{team.abbreviation.slice(0, 1)}</span>
  }

  return (
    <img
      className="crest"
      src={team.logo}
      alt=""
      width={28}
      height={28}
      onError={() => setFailed(true)}
    />
  )
}

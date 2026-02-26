import { useState } from 'react'
import './TeamLogo.css'

const SIZES = { sm: 20, md: 32, lg: 48, xl: 64 }

export default function TeamLogo({ logoUrl, abbreviation, teamName, size = 'md' }) {
  const [imgError, setImgError] = useState(false)
  const px = SIZES[size] || SIZES.md

  if (!logoUrl || imgError) {
    return (
      <span
        className={`team-logo-fallback team-logo-${size}`}
        style={{ width: px, height: px, fontSize: px * 0.4 }}
      >
        {abbreviation}
      </span>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={teamName ? `${teamName} logo` : abbreviation}
      className={`team-logo team-logo-${size}`}
      style={{ width: px, height: px }}
      onError={() => setImgError(true)}
    />
  )
}

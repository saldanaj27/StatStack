import api from "./client";

/*
  Game APIs

  Output of Game Object: 
  {
    'id': <game_id>,
    'home_team': <team_object>, (team_id, name, abbreviation, city, logo_url)
    'away_team': <team_object>, (team_id, name, abbreviation, city, logo_url)
    'season': <int>,
    'week': <int>,
    "date": <YYYY-MM-DD>,
    "time": <HH:MM>,
    "stage": <stage>, (REG, WC, SB)
    "home_score": <int>,
    "away_score": <int>,
    "total_score": <int>,
    "overtime": <boolean>,
    "location": <location>, (Home, Away, ...)
    "roof": <roof>, (outdoors, dome, ...)
    "temp": <int>, (null)
    "wind": <int> (null)
  }
*/

// GET Game info for all games in a specific week+season
export async function getGames(season, week) {
  const response = await api.get(`/games/?season=${season}&week=${week}`)
  // DRF pagination wraps results in {count, next, previous, results}
  return response.data.results || response.data
}

// GET Game info for current week
export async function getCurrentWeekGames() {
  const response = await api.get(`/games/currentWeek/`)
  return response.data
}

// GET specific Game info
export const getGameById = async (gameId) => {
  const response = await api.get(`/games/${gameId}/`)
  return response.data
}
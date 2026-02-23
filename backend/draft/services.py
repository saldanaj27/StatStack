from django.db.models import Avg, Count

from players.models import Player

from .models import DraftPick

# Position limits for AI teams
POSITION_LIMITS = {
    "QB": 2,
    "RB": 5,
    "WR": 5,
    "TE": 2,
}


class DraftAI:
    """AI draft logic — picks best available player by avg fantasy points, respecting position limits."""

    @staticmethod
    def get_available_players(session):
        """Return players not yet drafted, sorted by avg fantasy points."""
        drafted_ids = session.picks.values_list("player_id", flat=True)
        players = Player.objects.filter(
            status="ACT",
            position__in=["QB", "RB", "WR", "TE"],
        ).exclude(id__in=drafted_ids)

        # Annotate with avg fantasy points via reverse relation
        players = (
            players.annotate(
                avg_fpts=Avg("game_stats__fantasy_points_ppr"),
                games_played=Count("game_stats"),
            )
            .filter(games_played__gte=1)
            .order_by("-avg_fpts")
        )

        return players

    @staticmethod
    def get_team_roster(session, team_number):
        """Get position counts for a given team."""
        picks = session.picks.filter(team_number=team_number).select_related("player")
        counts = {}
        for pick in picks:
            pos = pick.player.position
            counts[pos] = counts.get(pos, 0) + 1
        return counts

    @classmethod
    def make_pick(cls, session, team_number):
        """AI picks the best available player within position limits."""
        available = cls.get_available_players(session)
        roster = cls.get_team_roster(session, team_number)

        for player in available:
            pos = player.position
            current_count = roster.get(pos, 0)
            limit = POSITION_LIMITS.get(pos, 0)
            if current_count < limit:
                return player

        # Fallback: pick best available regardless of limits
        return available.first()

    @classmethod
    def auto_pick_until_user(cls, session):
        """Advance the draft through AI picks until it's the user's turn or draft is complete."""
        picks_made = []

        while session.current_pick <= session.total_picks:
            current_team = session.get_team_for_pick(session.current_pick)

            # If it's the user's turn, stop
            if current_team == session.user_team_position:
                break

            # AI makes a pick
            player = cls.make_pick(session, current_team)
            if player is None:
                break

            round_num = (session.current_pick - 1) // session.num_teams + 1
            pick = DraftPick.objects.create(
                session=session,
                player=player,
                team_number=current_team,
                round_number=round_num,
                overall_pick=session.current_pick,
                is_user=False,
            )
            picks_made.append(pick)

            session.current_pick += 1
            session.current_round = (session.current_pick - 1) // session.num_teams + 1

        # Check if draft is complete
        if session.current_pick > session.total_picks:
            session.status = "completed"

        session.save()
        return picks_made

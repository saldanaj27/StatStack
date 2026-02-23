from django.db import models

from teams.models import Team

from .constants import STAGE_CHOICES


class Game(models.Model):
    id = models.CharField(max_length=20, primary_key=True)
    season = models.IntegerField(default=0)
    week = models.IntegerField(default=0)
    date = models.DateField()
    time = models.CharField(max_length=10, default="00:00")

    home_team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="home_games"
    )
    away_team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="away_games"
    )

    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default="REG")

    home_score = models.IntegerField(default=0, null=True)
    away_score = models.IntegerField(default=0, null=True)
    total_score = models.IntegerField(default=0, null=True)
    overtime = models.BooleanField(default=False, null=True)

    location = models.CharField(max_length=15, default="Home")
    roof = models.CharField(max_length=15, default="outdoors")
    temp = models.IntegerField(default=0, null=True)
    wind = models.IntegerField(default=0, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["season", "week"]),
            models.Index(fields=["date"]),
        ]

    def __str__(self):
        return f"{self.away_team} @ {self.home_team} - Week {self.week}"

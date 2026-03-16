from rest_framework import viewsets

from api.serializers import TeamSerializer
from teams.models import Team


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all().order_by("abbreviation")
    serializer_class = TeamSerializer
    pagination_class = None

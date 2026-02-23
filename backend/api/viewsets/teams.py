from rest_framework import viewsets

from api.serializers import TeamSerializer
from teams.models import Team


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

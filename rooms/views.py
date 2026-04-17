from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import Room
from .serializers import RoomSerializer

class RoomListView(APIView):

    @extend_schema(responses=RoomSerializer(many=True))
    def get(self, request):
        rooms = Room.objects.filter(is_available=True)
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)
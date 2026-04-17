from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Booking
from .serializers import BookingSerializer
from rooms.models import Room
from rest_framework.permissions import IsAuthenticated


class BookRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get('room')

        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response({"error": "Xona topilmadi"}, status=404)

        if not room.is_available:
            return Response({"error": "Xona band"}, status=400)

        # Booking yaratish
        booking = Booking.objects.create(
            user=request.user,
            room=room
        )

        # Xonani band qilish
        room.is_available = False
        room.save()

        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=201)
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAdminUser
from .models import Booking
from .serializers import BookingSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Room, Booking
from .serializers import RoomSerializer, BookingSerializer

# 🔹 ADMIN - barcha bookinglarni ko‘rish
class AdminBookingListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        bookings = Booking.objects.all().order_by('-id')
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


# 🔹 ADMIN - booking statusni o‘zgartirish
class UpdateBookingStatusView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=404)

        status_value = request.data.get("status")

        if status_value not in ["pending", "approved", "rejected"]:
            return Response({"error": "Invalid status"}, status=400)

        booking.status = status_value
        booking.save()

        return Response({"message": "Status updated"})
    
# ✅ USER → bo‘sh xonalar
class AvailableRoomsView(ListAPIView):
    serializer_class = RoomSerializer

    def get_queryset(self):
        return Room.objects.filter(is_available=True)


# ✅ USER → booking qiladi
class CreateBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("room_id")

        try:
            room = Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=404)

        # ❗ muhim tekshiruv
        if not room.is_available:
            return Response({"error": "Room already booked"}, status=400)

        # ❗ shu user oldin booking qilganmi?
        if Booking.objects.filter(user=request.user, room=room).exists():
            return Response({"error": "You already booked this room"}, status=400)

        # ✅ booking yaratamiz
        booking = Booking.objects.create(
            user=request.user,
            room=room
        )

        # ✅ roomni band qilamiz
        room.is_available = False
        room.save()

        return Response({
            "message": "Room booked successfully",
            "room": room.number
        })
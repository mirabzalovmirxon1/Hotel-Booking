from rest_framework import serializers
from .models import Room, Booking

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'


class BookingSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    room = serializers.StringRelatedField()

    class Meta:
        model = Booking
        fields = '__all__'
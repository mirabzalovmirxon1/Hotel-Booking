from django.db import models
from django.conf import settings
from rooms.models import Room

User = settings.AUTH_USER_MODEL


class Booking(models.Model):
    STATUS_CHOICES = (
        ('BOOKED', 'Booked'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='BOOKED')

    def __str__(self):
        return f"{self.user} - {self.room}"
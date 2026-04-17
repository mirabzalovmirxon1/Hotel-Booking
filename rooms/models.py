from django.db import models

class Room(models.Model):
    ROOM_TYPE_CHOICES = (
        ('STANDARD', 'Standard'),
        ('CLASSIC', 'Classic'),
        ('SUPER', 'Super Classic'),
    )

    room_number = models.CharField(max_length=10, unique=True)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.room_number} - {self.room_type}"
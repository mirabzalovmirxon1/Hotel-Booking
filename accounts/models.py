from django.contrib.auth.models import AbstractUser
from django.db import models
from .managers import AccountManager


class Accounts(AbstractUser):
    ROLE_CHOICES = (
        ('USER', 'User'),
        ('ADMIN', 'Admin'),
        ('SUPPORT', 'SupportAdmin'),
    )

    full_name = models.CharField(max_length=255)
    age = models.IntegerField()
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='USER')

    objects = AccountManager()   

    def __str__(self):
        return self.username
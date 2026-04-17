from rest_framework import serializers
from .models import Accounts
from django.contrib.auth import authenticate


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Accounts
        fields = ['full_name', 'username', 'age', 'password', 'phone_number',]

    def create(self, validated_data):
        user = Accounts.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            age=validated_data.get('age')
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(
            username=data['username'],
            password=data['password']
        )
        if not user:
            raise serializers.ValidationError("Login yoki parol noto'g'ri")
        return user
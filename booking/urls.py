from django.urls import path
from .views import BookRoomView

urlpatterns = [
    path('', BookRoomView.as_view()),
]
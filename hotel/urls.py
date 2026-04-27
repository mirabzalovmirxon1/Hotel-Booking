from django.urls import path
from .views import *

urlpatterns = [
    # USER
    path('available/', AvailableRoomsView.as_view()),
    path('book/', CreateBookingView.as_view()),

    # ADMIN
    path('admin/bookings/', AdminBookingListView.as_view()),
    path('admin/bookings/<int:pk>/', UpdateBookingStatusView.as_view()),
]
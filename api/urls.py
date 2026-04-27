from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


urlpatterns = [
    path('', SpectacularSwaggerView.as_view(url_name='schema')),
    path('schema/', SpectacularAPIView.as_view(), name='schema'),

    path('hotel/', include('hotel.urls')),
    path('', include('accounts.urls')),
    path('rooms/', include('rooms.urls')),
]
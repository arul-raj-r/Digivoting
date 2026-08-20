from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/voters/', include('voters.urls')),
    path('api/elections/', include('elections.urls')),
]

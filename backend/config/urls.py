from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from config.views import HealthCheckView, DatabaseHealthCheckView
from identity.views import DigiLockerDemoAuthorizeView

api_v1_patterns = [
    # Health endpoints
    path('health/', HealthCheckView.as_view(), name='health_check'),
    path('health/database/', DatabaseHealthCheckView.as_view(), name='database_health_check'),
    
    # Domain APIs
    path('auth/', include('accounts.urls')),
    path('auth/', include('authentication.urls')),
    path('voters/', include('voters.urls')),
    path('elections/', include('elections.urls')),
    path('identity/', include('identity.urls')),
    path('digilocker/demo-authorize/', DigiLockerDemoAuthorizeView.as_view(), name='digilocker_demo_auth'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Direct Auth Root for standard spec
    path('api/auth/', include('accounts.urls')),
    
    # API Version 1
    path('api/v1/', include((api_v1_patterns, 'v1'), namespace='v1')),
    
    # API Schema Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

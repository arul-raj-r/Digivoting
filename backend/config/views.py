from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "success": True,
            "message": "DigiVote backend is running"
        }, status=status.HTTP_200_OK)


class DatabaseHealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            # Test query to check actual database liveness
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()
            
            if row and row[0] == 1:
                return Response({
                    "success": True,
                    "message": "Database is connected and operational"
                }, status=status.HTTP_200_OK)
            
            return Response({
                "success": False,
                "message": "Database query returned unexpected result"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception:
            # Fail clearly without exposing backend credentials or raw stack traces
            return Response({
                "success": False,
                "message": "Database connectivity check failed"
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

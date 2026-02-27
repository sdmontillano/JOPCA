from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import BankAccountViewSet

router = DefaultRouter()
router.register(r'bankaccounts', BankAccountViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
]

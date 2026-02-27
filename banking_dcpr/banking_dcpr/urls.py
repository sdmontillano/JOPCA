from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from core.views import (
    BankAccountViewSet,
    TransactionViewSet,
    DailyCashPositionViewSet,
    MonthlyReportViewSet,
    daily_summary,
    monthly_summary,
    cash_position_summary,
)

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'bankaccounts', BankAccountViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'dailycashpositions', DailyCashPositionViewSet)
router.register(r'monthlyreports', MonthlyReportViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),

    # ✅ Include core app routes (dashboard, etc.)
    path("", include("core.urls")),

    # ✅ Summary endpoints (now include PDC in responses)
    path("api/summary/daily/", daily_summary, name="daily-summary"),
    path("api/summary/monthly/", monthly_summary, name="monthly-summary"),
    path("api/summary/cashposition/", cash_position_summary, name="cashposition-summary"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("transactions/", views.TransactionListCreate.as_view(), name="transactions"),
]
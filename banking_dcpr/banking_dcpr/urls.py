from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    BankAccountViewSet,
    TransactionViewSet,
    DailyCashPositionViewSet,
    MonthlyReportViewSet,
    daily_summary,
    monthly_summary,
    cash_position_summary,
)

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

    # ✅ Summary endpoints
    path("api/summary/daily/", daily_summary, name="daily-summary"),
    path("api/summary/monthly/", monthly_summary, name="monthly-summary"),
    path("api/summary/cashposition/", cash_position_summary, name="cashposition-summary"),
]
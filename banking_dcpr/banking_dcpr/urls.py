# banking_dcpr/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token

from core.views import (
    TransactionListCreate,
    detailed_daily_summary,
    detailed_daily_report,
    detailed_monthly_report,
    BankAccountViewSet,
    TransactionViewSet,
    DailyCashPositionViewSet,
    MonthlyReportViewSet,
    PdcViewSet,
)

router = DefaultRouter()
router.register(r'bankaccounts', BankAccountViewSet, basename='bankaccount')
router.register(r'transactions-crud', TransactionViewSet, basename='transaction')
router.register(r'pdc', PdcViewSet, basename='pdc')
router.register(r'dailycashpositions', DailyCashPositionViewSet, basename='dailycashposition')
router.register(r'monthlyreports', MonthlyReportViewSet, basename='monthlyreport')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),

    # keep the transactions list endpoint (if still used)
    path('transactions/', TransactionListCreate.as_view(), name='transactions'),

    # summary endpoints (mounted without /api/ prefix)
    path('summary/detailed-daily/', detailed_daily_summary, name='detailed_daily_summary'),
    path('summary/detailed-monthly/', detailed_monthly_report, name='detailed_monthly_report'),

    # router endpoints
    path('', include(router.urls)),
]
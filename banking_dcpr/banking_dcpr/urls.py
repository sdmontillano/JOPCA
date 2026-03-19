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
    PettyCashFundViewSet,
    PettyCashTransactionViewSet,
    CashCountViewSet,
    bank_reconciliation_summary,
    cash_counts_summary,
    pcf_alerts,
    pcf_daily_report,
    pcf_weekly_report,
    pcf_monthly_report,
    pcf_unreplenished_aging,
    export_pcf_excel,
    export_pcf_pdf,
)

router = DefaultRouter()
router.register(r'bankaccounts', BankAccountViewSet, basename='bankaccount')
router.register(r'transactions-crud', TransactionViewSet, basename='transaction')
router.register(r'pdc', PdcViewSet, basename='pdc')
router.register(r'dailycashpositions', DailyCashPositionViewSet, basename='dailycashposition')
router.register(r'monthlyreports', MonthlyReportViewSet, basename='monthlyreport')
router.register(r'pcf', PettyCashFundViewSet, basename='pcf')
router.register(r'pcf-transactions', PettyCashTransactionViewSet, basename='pcf-transaction')
router.register(r'cash-counts', CashCountViewSet, basename='cash-count')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),

    # transactions list endpoint
    path('transactions/', TransactionListCreate.as_view(), name='transactions'),

    # summary endpoints
    path('summary/detailed-daily/', detailed_daily_summary, name='detailed_daily_summary'),
    path('summary/detailed-monthly/', detailed_monthly_report, name='detailed_monthly_report'),
    path('summary/bank-reconciliation/', bank_reconciliation_summary, name='bank_reconciliation_summary'),
    path('summary/cash-counts/', cash_counts_summary, name='cash_counts_summary'),
    path('summary/pcf-alerts/', pcf_alerts, name='pcf_alerts'),

    # PCF report endpoints
    path('api/reports/pcf-daily/', pcf_daily_report, name='pcf_daily_report'),
    path('api/reports/pcf-weekly/', pcf_weekly_report, name='pcf_weekly_report'),
    path('api/reports/pcf-monthly/', pcf_monthly_report, name='pcf_monthly_report'),
    path('api/reports/pcf-unreplenished-aging/', pcf_unreplenished_aging, name='pcf_unreplenished_aging'),

    # Export endpoints
    path('api/reports/export/excel/', export_pcf_excel, name='export_pcf_excel'),
    path('api/reports/export/pdf/', export_pcf_pdf, name='export_pcf_pdf'),

    # router endpoints
    path('', include(router.urls)),
]

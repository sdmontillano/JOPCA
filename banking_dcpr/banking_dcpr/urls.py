from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import (
    TransactionListCreate,
    daily_summary,
    monthly_summary,
    cash_position_summary,
    BankAccountViewSet,
    TransactionViewSet,
    DailyCashPositionViewSet,
    MonthlyReportViewSet,
)
from rest_framework.routers import DefaultRouter

# Router for ViewSets (CRUD endpoints)
router = DefaultRouter()
router.register(r'bankaccounts', BankAccountViewSet, basename='bankaccount')
router.register(r'transactions-crud', TransactionViewSet, basename='transaction')
router.register(r'dailycashpositions', DailyCashPositionViewSet, basename='dailycashposition')
router.register(r'monthlyreports', MonthlyReportViewSet, basename='monthlyreport')

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Authentication
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Transactions (list + create)
    path('transactions/', TransactionListCreate.as_view(), name='transactions'),

    # Summary endpoints
    path('summary/daily/', daily_summary, name='daily_summary'),
    path('summary/monthly/', monthly_summary, name='monthly_summary'),
    path('summary/cash/', cash_position_summary, name='cash_position_summary'),

    # Include router endpoints
    path('', include(router.urls)),
]

# core/admin.py
from django.contrib import admin
from django.db.models import Sum
from .models import Transaction, BankAccount, DailyCashPosition, MonthlyReport, Pdc, PettyCashFund, PettyCashTransaction, CashCount


class TransactionInline(admin.TabularInline):
    model = Transaction
    extra = 0
    readonly_fields = ('date', 'type', 'amount', 'description')
    can_delete = False
    max_num = 0
    fk_name = 'bank_account'


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('date', 'type', 'amount', 'bank_account', 'description')
    search_fields = ('description', 'bank_account__name', 'bank_account__account_number')
    list_filter = ('type', 'date')
    ordering = ('-date',)


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'account_number', 'opening_balance_display', 'balance_display')
    search_fields = ('name', 'account_number')
    list_filter = ('name',)
    ordering = ('-balance',)
    readonly_fields = ('balance',)
    inlines = [TransactionInline]

    def opening_balance_display(self, obj):
        return f"{obj.opening_balance:.2f}"
    opening_balance_display.short_description = "Opening Balance"

    def balance_display(self, obj):
        return f"{obj.balance:.2f}"
    balance_display.short_description = "Current Balance"


@admin.register(DailyCashPosition)
class DailyCashPositionAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "beginning_balance",
        "collections",
        "local_deposits",
        "disbursements",
        "adjustments",
        "ending_balance",
    )
    ordering = ("-date",)
    readonly_fields = (
        "beginning_balance",
        "collections",
        "local_deposits",
        "disbursements",
        "adjustments",
        "ending_balance",
    )

    def save_model(self, request, obj, form, change):
        obj.save()  # forces recalculation before saving

    actions = ["recalculate_positions", "recalculate_all_positions"]

    def recalculate_positions(self, request, queryset):
        for position in queryset:
            position.save()  # forces recalculation
        self.message_user(request, f"{queryset.count()} Daily Cash Positions recalculated.")
    recalculate_positions.short_description = "Recalculate selected Daily Cash Positions"

    def recalculate_all_positions(self, request, queryset):
        all_positions = DailyCashPosition.objects.all()
        for position in all_positions:
            position.save()
        self.message_user(request, f"All {all_positions.count()} Daily Cash Positions recalculated.")
    recalculate_all_positions.short_description = "Recalculate ALL Daily Cash Positions"


@admin.register(MonthlyReport)
class MonthlyReportAdmin(admin.ModelAdmin):
    list_display = ('month', 'total_inflows', 'total_disbursements', 'ending_balance')
    ordering = ('-month',)
    readonly_fields = ('total_inflows', 'total_disbursements', 'ending_balance')


@admin.register(Pdc)
class PdcAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "check_no", "maturity_date", "amount", "status", "deposit_bank", "date_deposited")
    search_fields = ("customer_name", "check_no")
    list_filter = ("status", "maturity_date")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-maturity_date", "-id")


@admin.register(PettyCashFund)
class PettyCashFundAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'opening_balance', 'current_balance_display', 'is_active')
    search_fields = ('name', 'location')
    list_filter = ('location', 'is_active')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('name',)

    def current_balance_display(self, obj):
        return f"{obj.current_balance:.2f}"
    current_balance_display.short_description = "Current Balance"


class PettyCashTransactionInline(admin.TabularInline):
    model = PettyCashTransaction
    extra = 1
    readonly_fields = ('date', 'type', 'amount', 'description')


@admin.register(PettyCashTransaction)
class PettyCashTransactionAdmin(admin.ModelAdmin):
    list_display = ('date', 'pcf', 'type', 'amount', 'description', 'created_by')
    search_fields = ('pcf__name', 'description')
    list_filter = ('type', 'date', 'pcf')
    ordering = ('-date', '-created_at')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CashCount)
class CashCountAdmin(admin.ModelAdmin):
    list_display = ('count_date', 'pcf', 'system_balance', 'actual_count', 'variance', 'verified_by')
    search_fields = ('pcf__name', 'notes')
    list_filter = ('count_date', 'pcf')
    ordering = ('-count_date', '-created_at')
    readonly_fields = ('variance', 'created_at', 'updated_at')
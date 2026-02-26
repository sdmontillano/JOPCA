from django.contrib import admin
from django.contrib.humanize.templatetags.humanize import intcomma
from .models import Transaction, BankAccount, DailyCashPosition, MonthlyReport


class TransactionInline(admin.TabularInline):
    model = Transaction
    extra = 0
    readonly_fields = ('date', 'type', 'amount', 'description')
    can_delete = False
    max_num = 0


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
        "disbursements",
        "transfers",
        "returned_checks",
        "ending_balance",
    )
    ordering = ("-date",)
    readonly_fields = ("beginning_balance", "collections", "disbursements", "transfers", "returned_checks", "ending_balance")


@admin.register(MonthlyReport)
class MonthlyReportAdmin(admin.ModelAdmin):
    list_display = ('month', 'total_inflows', 'total_disbursements', 'ending_balance')
    ordering = ('-month',)
    readonly_fields = ('total_inflows', 'total_disbursements', 'ending_balance')
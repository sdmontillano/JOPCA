from django.contrib import admin

from django.contrib.humanize.templatetags.humanize import intcomma
from .models import Transaction, BankAccount, DailyCashPosition, MonthlyReport


# Inline transactions inside BankAccount admin
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
        return f"{intcomma(f'{obj.opening_balance:.2f}')}"
    opening_balance_display.short_description = "Opening Balance"

    def balance_display(self, obj):
        return f"{intcomma(f'{obj.balance:.2f}')}"
    balance_display.short_description = "Current Balance"


@admin.register(DailyCashPosition)
class DailyCashPositionAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "beginning_balance_display",
        "ending_balance_display",
        "total_collections",
        "total_disbursements",
        "total_transfers",
    )
    ordering = ("-date",)
    readonly_fields = ("ending_balance",)

    def beginning_balance_display(self, obj):
        return f"{intcomma(f'{obj.beginning_balance:.2f}')}"
    beginning_balance_display.short_description = "Beginning Balance"

    def ending_balance_display(self, obj):
        return f"{intcomma(f'{obj.ending_balance:.2f}')}"
    ending_balance_display.short_description = "Ending Balance"

    def total_collections(self, obj):
        return sum(t.amount for t in Transaction.objects.filter(date=obj.date, type="collection"))

    def total_disbursements(self, obj):
        return sum(t.amount for t in Transaction.objects.filter(date=obj.date, type="disbursement"))

    def total_transfers(self, obj):
        return sum(t.amount for t in Transaction.objects.filter(date=obj.date, type="transfer"))

@admin.register(MonthlyReport)
class MonthlyReportAdmin(admin.ModelAdmin):
    list_display = ('month', 'total_inflows_display', 'total_disbursements_display', 'ending_balance_display')
    ordering = ('-month',)

    def total_inflows_display(self, obj):
        return f"{intcomma(f'{obj.total_inflows:.2f}')}"
    total_inflows_display.short_description = "Total Inflows"

    def total_disbursements_display(self, obj):
        return f"{intcomma(f'{obj.total_disbursements:.2f}')}"
    total_disbursements_display.short_description = "Total Disbursements"

    def ending_balance_display(self, obj):
        return f"{intcomma(f'{obj.ending_balance:.2f}')}"
    ending_balance_display.short_description = "Ending Balance"



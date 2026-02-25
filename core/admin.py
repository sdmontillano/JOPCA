from django.contrib import admin
from core.models import BankAccount
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
    list_display = ('date', 'bank_account', 'type', 'formatted_amount', 'description')
    search_fields = ('description',)
    list_filter = ('type', 'bank_account')
    ordering = ('-date',)

    # Format amount with commas and cents
    def formatted_amount(self, obj):
        return f"{intcomma(f'{obj.amount:.2f}')}"
    formatted_amount.short_description = "Amount"

    # Disable delete action
    def has_delete_permission(self, request, obj=None):
        return False

    # Disable bulk delete from the action dropdown
    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions


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
    list_display = ('date', 'opening_balance_display', 'inflows_display', 'disbursements_display', 'closing_balance_display')
    ordering = ('-date',)

    def opening_balance_display(self, obj):
        return f"{intcomma(f'{obj.opening_balance:.2f}')}"
    opening_balance_display.short_description = "Opening Balance"

    def inflows_display(self, obj):
        return f"{intcomma(f'{obj.inflows:.2f}')}"
    inflows_display.short_description = "Inflows"

    def disbursements_display(self, obj):
        return f"{intcomma(f'{obj.disbursements:.2f}')}"
    disbursements_display.short_description = "Disbursements"

    def closing_balance_display(self, obj):
        return f"{intcomma(f'{obj.closing_balance:.2f}')}"
    closing_balance_display.short_description = "Closing Balance"


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

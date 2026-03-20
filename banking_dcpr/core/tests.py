"""
Unit tests for JOPCA Banking DCPR System
"""
from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework.authtoken.models import Token

from .models import (
    BankAccount,
    Transaction,
    DailyCashPosition,
    PettyCashFund,
    PettyCashTransaction,
    Pdc,
    CashCount,
    AuditLog,
)
from .constants import INFLOW_TYPES, OUTFLOW_TYPES


class BankAccountModelTests(TestCase):
    """Tests for BankAccount model"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.bank = BankAccount.objects.create(
            name='Test Bank',
            account_number='1234567890',
            area='main_office',
            opening_balance=Decimal('10000.00')
        )

    def test_bank_account_creation(self):
        """Test bank account is created with correct opening balance"""
        self.assertEqual(self.bank.balance, Decimal('10000.00'))
        self.assertEqual(self.bank.opening_balance, Decimal('10000.00'))

    def test_bank_account_str(self):
        """Test bank account string representation"""
        self.assertIn('Test Bank', str(self.bank))
        self.assertIn('1234567890', str(self.bank))

    def test_recalc_balance_with_inflow(self):
        """Test balance recalculation with inflow transaction"""
        Transaction.objects.create(
            bank_account=self.bank,
            date=date.today(),
            type='deposit',
            amount=Decimal('5000.00'),
            description='Test deposit',
            created_by=self.user
        )
        self.bank.recalc_balance()
        self.assertEqual(self.bank.balance, Decimal('15000.00'))

    def test_recalc_balance_with_outflow(self):
        """Test balance recalculation with outflow transaction"""
        Transaction.objects.create(
            bank_account=self.bank,
            date=date.today(),
            type='disbursement',
            amount=Decimal('2000.00'),
            description='Test disbursement',
            created_by=self.user
        )
        self.bank.recalc_balance()
        self.assertEqual(self.bank.balance, Decimal('8000.00'))

    def test_negative_balance_prevention(self):
        """Test that negative balance raises validation error"""
        self.bank.opening_balance = Decimal('100.00')
        self.bank.save()
        
        Transaction.objects.create(
            bank_account=self.bank,
            date=date.today(),
            type='disbursement',
            amount=Decimal('500.00'),
            description='Large disbursement',
            created_by=self.user
        )
        
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            self.bank.recalc_balance()


class TransactionModelTests(TestCase):
    """Tests for Transaction model"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.bank = BankAccount.objects.create(
            name='Test Bank',
            account_number='1234567890',
            area='main_office',
            opening_balance=Decimal('10000.00')
        )

    def test_transaction_creation(self):
        """Test transaction is created correctly"""
        tx = Transaction.objects.create(
            bank_account=self.bank,
            date=date.today(),
            type='deposit',
            amount=Decimal('5000.00'),
            description='Test deposit',
            created_by=self.user
        )
        self.assertEqual(tx.amount, Decimal('5000.00'))
        self.assertEqual(tx.bank_account, self.bank)

    def test_transaction_str(self):
        """Test transaction string representation"""
        tx = Transaction.objects.create(
            bank_account=self.bank,
            date=date.today(),
            type='deposit',
            amount=Decimal('5000.00'),
            description='Test deposit',
            created_by=self.user
        )
        self.assertIn('5000.00', str(tx))
        self.assertIn('deposit', str(tx))


class PettyCashFundModelTests(TestCase):
    """Tests for PettyCashFund model"""

    def setUp(self):
        self.pcf = PettyCashFund.objects.create(
            name='Office PCF',
            location='office',
            opening_balance=Decimal('5000.00')
        )

    def test_pcf_creation(self):
        """Test PCF is created with correct balance"""
        self.assertEqual(self.pcf.opening_balance, Decimal('5000.00'))
        self.assertEqual(self.pcf.current_balance, Decimal('5000.00'))

    def test_pcf_str(self):
        """Test PCF string representation"""
        self.assertIn('Office PCF', str(self.pcf))

    def test_pcf_current_balance_with_transactions(self):
        """Test PCF current balance calculation with transactions"""
        PettyCashTransaction.objects.create(
            pcf=self.pcf,
            date=date.today(),
            type='disbursement',
            amount=Decimal('1000.00'),
            description='Test disbursement'
        )
        PettyCashTransaction.objects.create(
            pcf=self.pcf,
            date=date.today(),
            type='replenishment',
            amount=Decimal('500.00'),
            description='Test replenishment'
        )
        # Current balance = opening - disbursements + replenishments
        self.assertEqual(self.pcf.current_balance, Decimal('4500.00'))

    def test_pcf_unreplenished_amount(self):
        """Test PCF unreplenished amount calculation"""
        PettyCashTransaction.objects.create(
            pcf=self.pcf,
            date=date.today(),
            type='disbursement',
            amount=Decimal('3000.00'),
            description='Test disbursement'
        )
        PettyCashTransaction.objects.create(
            pcf=self.pcf,
            date=date.today(),
            type='replenishment',
            amount=Decimal('1000.00'),
            description='Partial replenishment'
        )
        # Unreplenished = max(0, 3000 - 1000) = 2000
        self.assertEqual(self.pcf.unreplenished_amount, Decimal('2000.00'))


class PdcModelTests(TestCase):
    """Tests for PDC model"""

    def setUp(self):
        self.bank = BankAccount.objects.create(
            name='Test Bank',
            account_number='1234567890',
            area='main_office',
            opening_balance=Decimal('10000.00')
        )

    def test_pdc_creation(self):
        """Test PDC is created correctly"""
        pdc = Pdc.objects.create(
            customer_name='Test Customer',
            check_no='CHK001',
            bank_account=self.bank,
            amount=Decimal('5000.00'),
            maturity_date=date.today() + timedelta(days=30),
            status='outstanding'
        )
        self.assertEqual(pdc.amount, Decimal('5000.00'))
        self.assertEqual(pdc.status, 'outstanding')

    def test_pdc_status_choices(self):
        """Test PDC status choices"""
        pdc = Pdc.objects.create(
            customer_name='Test Customer',
            check_no='CHK001',
            bank_account=self.bank,
            amount=Decimal('5000.00'),
            maturity_date=date.today() + timedelta(days=30),
            status='outstanding'
        )
        valid_statuses = ['outstanding', 'matured', 'deposited', 'returned']
        for status in valid_statuses:
            pdc.status = status
            pdc.save()
            pdc.refresh_from_db()
            self.assertEqual(pdc.status, status)


class ConstantsTests(TestCase):
    """Tests for constants.py"""

    def test_inflow_types_not_empty(self):
        """Test that INFLOW_TYPES is defined and not empty"""
        self.assertTrue(len(INFLOW_TYPES) > 0)

    def test_outflow_types_not_empty(self):
        """Test that OUTFLOW_TYPES is defined and not empty"""
        self.assertTrue(len(OUTFLOW_TYPES) > 0)

    def test_inflow_outflow_disjoint(self):
        """Test that INFLOW and OUTFLOW types are mutually exclusive"""
        inflow_set = set(INFLOW_TYPES)
        outflow_set = set(OUTFLOW_TYPES)
        self.assertEqual(len(inflow_set & outflow_set), 0)


class DailyCashPositionTests(TestCase):
    """Tests for DailyCashPosition model"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.bank = BankAccount.objects.create(
            name='Test Bank',
            account_number='1234567890',
            area='main_office',
            opening_balance=Decimal('10000.00')
        )

    def test_daily_position_auto_creation(self):
        """Test that DailyCashPosition is auto-created when transaction is added"""
        today = date.today()
        Transaction.objects.create(
            bank_account=self.bank,
            date=today,
            type='deposit',
            amount=Decimal('5000.00'),
            description='Test deposit',
            created_by=self.user
        )
        
        daily = DailyCashPosition.objects.filter(date=today).first()
        self.assertIsNotNone(daily)
        self.assertEqual(daily.collections, Decimal('5000.00'))


class AuditLogTests(TestCase):
    """Tests for AuditLog model"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass123')

    def test_audit_log_creation(self):
        """Test audit log entry is created correctly"""
        log = AuditLog.objects.create(
            user=self.user,
            action='CREATE',
            model_name='BankAccount',
            object_id=1,
            details='Created new bank account'
        )
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.action, 'CREATE')

    def test_audit_log_helper_function(self):
        """Test the log_audit helper function"""
        from .models import log_audit
        
        log_audit(
            user=self.user,
            action='LOGIN',
            details='User logged in'
        )
        
        latest_log = AuditLog.objects.filter(user=self.user, action='LOGIN').first()
        self.assertIsNotNone(latest_log)


class ChangePasswordAPITests(APITestCase):
    """Tests for change password API"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='oldpass123',
            email='test@test.com'
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_change_password_success(self):
        """Test successful password change"""
        response = self.client.post('/api/change-password/', {
            'current_password': 'oldpass123',
            'new_password': 'newpass456',
            'confirm_password': 'newpass456'
        })
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass456'))

    def test_change_password_wrong_current(self):
        """Test password change with wrong current password"""
        response = self.client.post('/api/change-password/', {
            'current_password': 'wrongpass',
            'new_password': 'newpass456',
            'confirm_password': 'newpass456'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('incorrect', response.data['detail'].lower())

    def test_change_password_mismatch(self):
        """Test password change with mismatched passwords"""
        response = self.client.post('/api/change-password/', {
            'current_password': 'oldpass123',
            'new_password': 'newpass456',
            'confirm_password': 'differentpass'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('match', response.data['detail'].lower())

    def test_change_password_too_short(self):
        """Test password change with too short password"""
        response = self.client.post('/api/change-password/', {
            'current_password': 'oldpass123',
            'new_password': 'short',
            'confirm_password': 'short'
        })
        self.assertEqual(response.status_code, 400)

    def test_change_password_unauthenticated(self):
        """Test password change without authentication"""
        self.client.credentials()  # Remove auth
        response = self.client.post('/api/change-password/', {
            'current_password': 'oldpass123',
            'new_password': 'newpass456',
            'confirm_password': 'newpass456'
        })
        self.assertEqual(response.status_code, 401)


class UserProfileAPITests(APITestCase):
    """Tests for user profile API"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@test.com',
            first_name='Test',
            last_name='User'
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_get_profile(self):
        """Test getting user profile"""
        response = self.client.get('/api/user/profile/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@test.com')
        self.assertEqual(response.data['first_name'], 'Test')


class AuditLogAPITests(APITestCase):
    """Tests for audit log API"""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_get_audit_log(self):
        """Test getting audit log"""
        AuditLog.objects.create(
            user=self.user,
            action='CREATE',
            model_name='Test',
            details='Test entry'
        )
        response = self.client.get('/api/audit-log/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)

    def test_audit_log_pagination(self):
        """Test audit log pagination"""
        for i in range(5):
            AuditLog.objects.create(
                user=self.user,
                action='CREATE',
                model_name='Test',
                details=f'Test entry {i}'
            )
        
        response = self.client.get('/api/audit-log/?limit=2')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['count'], 5)

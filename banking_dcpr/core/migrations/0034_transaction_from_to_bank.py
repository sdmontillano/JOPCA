# Migration to add from_bank and to_bank fields to Transaction model
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0033_add_collection'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='from_bank',
            field=models.ForeignKey(
                blank=True,
                help_text='Source bank for fund transfers',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='transfers_out',
                to='core.BankAccount'
            ),
        ),
        migrations.AddField(
            model_name='transaction',
            name='to_bank',
            field=models.ForeignKey(
                blank=True,
                help_text='Destination bank for fund transfers',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='transfers_in',
                to='core.BankAccount'
            ),
        ),
    ]
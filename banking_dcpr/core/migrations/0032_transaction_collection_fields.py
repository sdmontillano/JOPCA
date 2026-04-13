from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0031_alter_transaction_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='collection_type',
            field=models.CharField(blank=True, choices=[('cash', 'Cash'), ('bank_transfer', 'Bank Transfer'), ('check', 'Check/PDC')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='transaction',
            name='check_no',
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name='transaction',
            name='reference',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='transaction',
            name='pdc_status',
            field=models.CharField(blank=True, choices=[('outstanding', 'Outstanding'), ('cleared', 'Cleared'), ('bounced', 'Bounced')], max_length=20, null=True),
        ),
    ]
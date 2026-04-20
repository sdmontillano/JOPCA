# Generated migration for Collection model
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0032_transaction_collection_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='Collection',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(max_digits=12, decimal_places=2)),
                ('status', models.CharField(choices=[('UNDEPOSITED', 'Undeposited'), ('DEPOSITED', 'Deposited')], default='UNDEPOSITED', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('description', models.CharField(blank=True, max_length=255, null=True)),
                ('transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='collections', to='core.Transaction')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
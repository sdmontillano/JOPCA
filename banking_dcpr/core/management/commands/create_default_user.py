from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Creates a default superuser for production'

    def handle(self, *args, **options):
        username = 'siegfred'
        password = 'siegfred321'
        email = 'admin@jopca.local'

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created successfully!'))
        else:
            self.stdout.write(f'Superuser "{username}" already exists.')

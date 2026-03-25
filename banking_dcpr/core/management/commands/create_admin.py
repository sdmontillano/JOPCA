from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Creates an admin user with staff and superuser permissions'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username for the admin user')
        parser.add_argument('password', type=str, help='Password for the admin user')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']

        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Updated existing user "{username}" to admin'))
        else:
            user = User.objects.create_user(
                username=username,
                password=password,
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(self.style.SUCCESS(f'Created admin user "{username}"'))

        # Ensure auth token exists
        from rest_framework.authtoken.models import Token
        token, created = Token.objects.get_or_create(user=user)
        self.stdout.write(self.style.SUCCESS(f'Token ready for user "{username}"'))
        
        self.stdout.write(self.style.SUCCESS('Admin user ready!'))
        self.stdout.write(f'   Username: {username}')
        self.stdout.write(f'   Frontend Admin: Select "Admin" and login')
        self.stdout.write(f'   Django Admin: http://localhost:8000/admin')

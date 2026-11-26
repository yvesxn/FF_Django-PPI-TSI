from django.core.management.base import BaseCommand
from api.models import Administrador


class Command(BaseCommand):
    help = 'Cria o usuário administrador inicial da F&F Imports'

    def add_arguments(self, parser):
        parser.add_argument('--nome', type=str, default='Administrador')
        parser.add_argument('--email', type=str, default='admin@ffimports.com')
        parser.add_argument('--senha', type=str, default='123456')

    def handle(self, *args, **options):
        email = options['email']
        if Administrador.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'Administrador com e-mail {email} já existe.'))
            return

        admin = Administrador(nome=options['nome'], email=email)
        admin.set_senha(options['senha'])
        admin.save()

        self.stdout.write(self.style.SUCCESS(
            f"Administrador criado com sucesso! {{ id_admin: {admin.id_admin}, nome: '{admin.nome}', email: '{admin.email}' }}"
        ))
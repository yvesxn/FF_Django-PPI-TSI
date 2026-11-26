import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from rest_framework import authentication, exceptions
from .models import Administrador


def gerar_token_admin(admin: Administrador) -> str:
    agora = datetime.now(timezone.utc)
    payload = {
        'id_admin': admin.id_admin,
        'email': admin.email,
        'iat': agora,
        'exp': agora + timedelta(hours=24),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


class AdminJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        partes = auth_header.split()
        if len(partes) != 2 or partes[0].lower() != 'bearer':
            raise exceptions.AuthenticationFailed('Formato de token inválido. Use: Bearer <token>')

        token = partes[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token expirado.')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Token inválido.')

        try:
            admin = Administrador.objects.get(id_admin=payload.get('id_admin'))
        except Administrador.DoesNotExist:
            raise exceptions.AuthenticationFailed('Administrador não encontrado.')

        return (admin, token)
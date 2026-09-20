from getpass import getpass
from werkzeug.security import generate_password_hash

email = input('Email administrateur: ').strip()
password = getpass('Mot de passe administrateur: ')
confirmation = getpass('Confirmer le mot de passe: ')
if not email or not password or password != confirmation:
    raise SystemExit('Email ou mot de passe invalide.')
print(f'ADMIN_EMAIL={email}')
print(f'ADMIN_PASSWORD_HASH={generate_password_hash(password)}')

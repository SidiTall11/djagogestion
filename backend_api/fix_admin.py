import os
import django

# Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_api.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import Enterprise

User = get_user_model()

def fix_admin():
    username = 'admin'
    password = 'admin'
    email = 'admin@fintrade.com'
    
    # 1. Création ou Reset de l'Utilisateur
    user, created = User.objects.get_or_create(username=username)
    user.set_password(password)
    user.email = email
    user.role = 'ADMIN_PME'
    user.is_staff = True
    user.is_superuser = True
    user.save()
    
    if created:
        print(f"Utilisateur '{username}' créé.")
    else:
        print(f"Utilisateur '{username}' mis à jour (mot de passe reset à '{password}').")
        
    # 2. Création de l'Entreprise si elle n'existe pas
    if not hasattr(user, 'enterprise'):
        Enterprise.objects.create(
            name="Ma Super PME",
            owner=user,
            email=email,
            phone="00000000",
            address="Siège Social"
        )
        print("Entreprise par défaut créée pour l'admin.")
    else:
        print(f"L'admin possède déjà l'entreprise : {user.enterprise.name}")

if __name__ == '__main__':
    fix_admin()

import os
import django
import sys

# Ajouter le répertoire de l'application au chemin de recherche
sys.path.append(os.path.join(os.getcwd(), 'backend_api'))

# Configuration de l'environnement Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_api.settings')
django.setup()

from users.models import User, Enterprise
from catalog.models import Category, Product
from trade.models import Supplier, Customer
from decimal import Decimal

def seed():
    print("Début du seeding...")

    # 1. Récupérer l'utilisateur admin et l'entreprise cible
    admin_user = User.objects.get(username='admin')
    enterprise, _ = Enterprise.objects.get_or_create(
        owner=admin_user,
        defaults={'name': 'Ma PME', 'email': 'contact@mapme.com'}
    )

    # 2. Créer des catégories
    cat_elec, _ = Category.objects.get_or_create(name='Électronique', enterprise=enterprise)
    cat_vet, _ = Category.objects.get_or_create(name='Vêtements', enterprise=enterprise)
    cat_alim, _ = Category.objects.get_or_create(name='Alimentation', enterprise=enterprise)

    # 3. Créer des produits
    products_data = [
        {
            'name': 'Laptop Pro 15',
            'sku': 'LAP-001',
            'category': cat_elec,
            'purchase_price': Decimal('800.00'),
            'sale_price': Decimal('1200.00'),
            'stock_quantity': 10,
            'min_stock_threshold': 2
        },
        {
            'name': 'Smartphone X',
            'sku': 'PHO-002',
            'category': cat_elec,
            'purchase_price': Decimal('400.00'),
            'sale_price': Decimal('650.00'),
            'stock_quantity': 15,
            'min_stock_threshold': 5
        },
        {
            'name': 'T-shirt Cotton Noir',
            'sku': 'TSH-003',
            'category': cat_vet,
            'purchase_price': Decimal('10.00'),
            'sale_price': Decimal('25.00'),
            'stock_quantity': 100,
            'min_stock_threshold': 10
        },
        {
            'name': 'Café Arabica 500g',
            'sku': 'CAF-004',
            'category': cat_alim,
            'purchase_price': Decimal('8.00'),
            'sale_price': Decimal('15.00'),
            'stock_quantity': 50,
            'min_stock_threshold': 5
        }
    ]

    for p_data in products_data:
        Product.objects.get_or_create(
            sku=p_data['sku'],
            enterprise=enterprise,
            defaults=p_data
        )

    # 4. Créer des fournisseurs
    Supplier.objects.get_or_create(name='Grossiste Tech SARL', enterprise=enterprise, defaults={'phone': '0102030405'})
    Supplier.objects.get_or_create(name='Textile Plus', enterprise=enterprise, defaults={'email': 'contact@textileplus.com'})

    # 5. Créer des clients
    Customer.objects.get_or_create(name='Jean Dupont', enterprise=enterprise, defaults={'phone': '0607080910'})
    Customer.objects.get_or_create(name='Marie Claire', enterprise=enterprise, defaults={'email': 'marie@gmail.com'})

    print("Seeding terminé avec succès !")

if __name__ == "__main__":
    seed()

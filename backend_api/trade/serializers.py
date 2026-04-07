from rest_framework import serializers
from django.db import transaction
from .models import Supplier, Customer, Purchase, PurchaseItem, Sale, SaleItem
from catalog.models import Product, StockMovement
from finance.models import Revenue, Expense, Receivable, Debt

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ('enterprise',)

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('enterprise',)

class PurchaseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseItem
        fields = '__all__'

class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True, read_only=True)
    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ('enterprise',)

    @transaction.atomic
    def create(self, validated_data):
        items_data = self.initial_data.get('items', [])
        purchase = Purchase.objects.create(**validated_data)
        total_amount = 0
        
        for item in items_data:
            product = Product.objects.get(id=item['product'])
            qty = int(item['quantity'])
            unit_price = float(item['unit_price'])
            
            PurchaseItem.objects.create(
                purchase=purchase, product=product,
                quantity=qty, unit_price=unit_price
            )
            
            # Mise à jour Stock
            product.stock_quantity += qty
            product.save()
            
            # Journaliser le mouvement
            StockMovement.objects.create(
                product=product,
                movement_type='IN',
                quantity=qty,
                notes=f"Achat #{purchase.id}"
            )
            
            total_amount += unit_price * qty
            
        purchase.total_amount = total_amount
        purchase.save()

        # Générer une Dépense automatique
        Expense.objects.create(
            enterprise=purchase.enterprise,
            amount=total_amount,
            category='Achat Marchandise',
            description=f"Achat #{purchase.id}"
        )

        # Si achat à crédit → créer une Dette
        if purchase.is_credit:
            debt = Debt.objects.create(
                enterprise=purchase.enterprise,
                amount_total=total_amount,
                description=f"Achat à crédit #{purchase.id}"
            )
            purchase.debt = debt
            purchase.save()
        
        return purchase


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = SaleItem
        fields = '__all__'


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = ('enterprise',)

    @transaction.atomic
    def create(self, validated_data):
        items_data = self.initial_data.get('items', [])
        sale = Sale.objects.create(**validated_data)
        total_margin = 0
        total_amount = 0
        
        for item in items_data:
            product = Product.objects.get(id=item['product'])
            qty = int(item['quantity'])
            unit_price = float(item['unit_price'])
            
            # Validation Stock
            if product.stock_quantity < qty:
                raise serializers.ValidationError(f"Stock insuffisant pour {product.name} ({product.stock_quantity} dispo)")
            
            margin = (unit_price - float(product.purchase_price)) * qty
            SaleItem.objects.create(
                sale=sale, product=product,
                quantity=qty, unit_price=unit_price, margin=margin
            )
            
            # Mise à jour Stock
            product.stock_quantity -= qty
            product.save()
            
            # Journaliser le mouvement
            StockMovement.objects.create(
                product=product,
                movement_type='OUT',
                quantity=qty,
                notes=f"Vente #{sale.id}"
            )
            
            total_amount += unit_price * qty
            total_margin += margin
            
        sale.total_amount = total_amount
        sale.total_margin = total_margin
        sale.save()

        # Générer un Revenu automatique
        Revenue.objects.create(
            enterprise=sale.enterprise,
            amount=total_amount,
            category='Vente',
            description=f"Vente #{sale.id}"
        )

        # Si vente à crédit → créer une Créance automatiquement
        if sale.is_credit:
            customer_name = sale.customer.name if sale.customer else "Client inconnu"
            receivable = Receivable.objects.create(
                enterprise=sale.enterprise,
                amount_total=total_amount,
                description=f"Créance client: {customer_name} — Vente #{sale.id}"
            )
            sale.receivable = receivable
            sale.save()
        
        return sale

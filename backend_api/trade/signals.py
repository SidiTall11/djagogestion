from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import PurchaseItem, SaleItem
from catalog.models import StockMovement

@receiver(post_save, sender=PurchaseItem)
def update_stock_on_purchase(sender, instance, created, **kwargs):
    if created:
        product = instance.product
        # Update stock quantity
        product.stock_quantity += instance.quantity
        product.save()
        
        # Log movement
        StockMovement.objects.create(
            product=product,
            movement_type='IN',
            quantity=instance.quantity,
            notes=f"Achat #{instance.purchase.id}"
        )

@receiver(post_save, sender=SaleItem)
def update_stock_on_sale(sender, instance, created, **kwargs):
    if created:
        product = instance.product
        # Update stock quantity
        product.stock_quantity -= instance.quantity
        product.save()
        
        # Log movement
        StockMovement.objects.create(
            product=product,
            movement_type='OUT',
            quantity=instance.quantity,
            notes=f"Vente #{instance.sale.id}"
        )

from django.db import models
from users.models import Enterprise

class Category(models.Model):
    name = models.CharField(max_length=150)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='categories')
    
    def __str__(self):
        return f"{self.name} - {self.enterprise.name}"
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = "Categories"

class Product(models.Model):
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50, blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='products')
    
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    stock_quantity = models.IntegerField(default=0)
    min_stock_threshold = models.IntegerField(default=5)
    
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    image_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} (Stock: {self.stock_quantity})"
    
    class Meta:
        db_table = 'produits'

class StockMovement(models.Model):
    MOVEMENT_TYPES = (
        ('IN', 'Entrée (Achat)'),
        ('OUT', 'Sortie (Vente)'),
        ('ADJ', 'Ajustement'),
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=3, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField()
    date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.movement_type} - {self.quantity} - {self.product.name}"
    
    class Meta:
        db_table = 'mouvements_stock'

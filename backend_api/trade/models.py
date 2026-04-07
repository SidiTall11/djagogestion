from django.db import models
from users.models import Enterprise
from catalog.models import Product
from finance.models import Debt, Receivable

class Supplier(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='suppliers')
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'fournisseurs'

class Customer(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='customers')

    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'clients'

class Purchase(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='purchases')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_credit = models.BooleanField(default=False)
    debt = models.OneToOneField(Debt, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Achat #{self.id} - {self.total_amount}"
    
    class Meta:
        db_table = 'achats'

class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    
    class Meta:
        db_table = 'articles_achat'

class Sale(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='sales')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_margin = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_credit = models.BooleanField(default=False)
    receivable = models.OneToOneField(Receivable, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Vente #{self.id} - {self.total_amount}"
    
    class Meta:
        db_table = 'ventes'

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    margin = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'articles_vente'

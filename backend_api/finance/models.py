from django.db import models
from users.models import Enterprise

class Revenue(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='revenues')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100, default='Vente')
    description = models.TextField(blank=True, null=True)
    date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Revenu: {self.amount} - {self.category}"
    
    class Meta:
        db_table = 'revenus'

class Expense(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='expenses')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100, default='Achat')
    description = models.TextField(blank=True, null=True)
    is_recurring = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dépense: {self.amount} - {self.category}"
    
    class Meta:
        db_table = 'depenses'

class Debt(models.Model):
    # Dette envers un fournisseur
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='debts')
    description = models.CharField(max_length=255, blank=True, null=True)
    amount_total = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_date = models.DateField(blank=True, null=True)
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dette: {self.description or 'N/A'} - {self.amount_total}"
    
    class Meta:
        db_table = 'dettes'

class Receivable(models.Model):
    # Créance d'un client
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='receivables')
    description = models.CharField(max_length=255, blank=True, null=True)
    amount_total = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_date = models.DateField(blank=True, null=True)
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Créance: {self.description or 'N/A'} - {self.amount_total}"
    
    class Meta:
        db_table = 'creances'

class Budget(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='budgets')
    category = models.CharField(max_length=100)
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    month = models.IntegerField()
    year = models.IntegerField()
    
    def __str__(self):
        return f"Budget {self.category} ({self.month}/{self.year}): {self.limit_amount}"
    
    class Meta:
        db_table = 'budgets'

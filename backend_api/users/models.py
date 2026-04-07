from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN_PME', 'Administrateur PME'),
        ('COMMERCANT', 'Commerçant'),
        ('AGENT_CAISSIER', 'Agent Caissier'),
        ('AGENT_DETTE', 'Agent Dette'),
        ('COMPTABLE', 'Comptable'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='COMMERCANT')
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    class Meta:
        db_table = 'utilisateurs'

class Enterprise(models.Model):
    name = models.CharField(max_length=200)
    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name='enterprise')
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    rccm = models.CharField(max_length=150, blank=True, null=True, help_text="NIF / STAT / RCCM")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'entreprises'

class Agent(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent_profile')
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='agents')
    custom_role = models.CharField(max_length=150, blank=True, null=True, help_text="Titre du poste")
    allowed_modules = models.JSONField(default=list, blank=True, help_text="Liste des modules autorisés (ex: ['ventes', 'stock'])")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Agent {self.user.username} - {self.enterprise.name}"
    
    class Meta:
        db_table = 'agents'

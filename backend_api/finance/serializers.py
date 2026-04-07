from rest_framework import serializers
from .models import Revenue, Expense, Debt, Receivable, Budget

class RevenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Revenue
        fields = '__all__'
        read_only_fields = ('enterprise',)

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('enterprise',)

class DebtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Debt
        fields = '__all__'
        read_only_fields = ('enterprise',)

class ReceivableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receivable
        fields = '__all__'
        read_only_fields = ('enterprise',)

class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = '__all__'
        read_only_fields = ('enterprise',)

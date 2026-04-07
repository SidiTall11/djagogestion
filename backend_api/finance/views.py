from rest_framework import viewsets, views
from rest_framework.response import Response
from django.db.models import Sum
from rest_framework.permissions import IsAuthenticated
from .models import Revenue, Expense, Debt, Receivable, Budget
from .serializers import RevenueSerializer, ExpenseSerializer, DebtSerializer, ReceivableSerializer, BudgetSerializer

class RevenueViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RevenueSerializer
    queryset = Revenue.objects.none()

    def get_queryset(self):
        return Revenue.objects.filter(enterprise=self.request.user.enterprise).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class ExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExpenseSerializer
    queryset = Expense.objects.none()

    def get_queryset(self):
        return Expense.objects.filter(enterprise=self.request.user.enterprise).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class DebtViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DebtSerializer
    queryset = Debt.objects.none()

    def get_queryset(self):
        return Debt.objects.filter(enterprise=self.request.user.enterprise).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class ReceivableViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReceivableSerializer
    queryset = Receivable.objects.none()

    def get_queryset(self):
        return Receivable.objects.filter(enterprise=self.request.user.enterprise).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class BudgetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetSerializer
    queryset = Budget.objects.none()

    def get_queryset(self):
        return Budget.objects.filter(enterprise=self.request.user.enterprise).order_by('-year', '-month')

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class FinanceSummaryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        enterprise = request.user.enterprise
        
        total_revenues = Revenue.objects.filter(enterprise=enterprise).aggregate(total=Sum('amount'))['total'] or 0
        total_expenses = Expense.objects.filter(enterprise=enterprise).aggregate(total=Sum('amount'))['total'] or 0
        
        unpaid_debts = Debt.objects.filter(enterprise=enterprise, is_paid=False)
        total_debt_total = unpaid_debts.aggregate(total=Sum('amount_total'))['total'] or 0
        total_debt_paid = unpaid_debts.aggregate(total=Sum('amount_paid'))['total'] or 0
        remaining_debt = total_debt_total - total_debt_paid
        
        unpaid_rec = Receivable.objects.filter(enterprise=enterprise, is_paid=False)
        total_rec_total = unpaid_rec.aggregate(total=Sum('amount_total'))['total'] or 0
        total_rec_paid = unpaid_rec.aggregate(total=Sum('amount_paid'))['total'] or 0
        remaining_rec = total_rec_total - total_rec_paid
        
        return Response({
            'total_revenues': total_revenues,
            'total_expenses': total_expenses,
            'net_result': total_revenues - total_expenses,
            'total_debts': remaining_debt,
            'total_receivables': remaining_rec
        })

class AdvancedAnalyticsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        enterprise = request.user.enterprise
        from trade.models import Sale, Purchase
        from django.db.models.functions import TruncMonth
        from datetime import timedelta
        from django.utils import timezone

        # 1. Taux d'endettement (Dettes / Revenus Totaux)
        total_revenues = Revenue.objects.filter(enterprise=enterprise).aggregate(total=Sum('amount'))['total'] or 1 # Avoid div by zero
        unpaid_debts = Debt.objects.filter(enterprise=enterprise, is_paid=False)
        total_debt_total = unpaid_debts.aggregate(total=Sum('amount_total'))['total'] or 0
        total_debt_paid = unpaid_debts.aggregate(total=Sum('amount_paid'))['total'] or 0
        remaining_debt = total_debt_total - total_debt_paid
        debt_ratio = (remaining_debt / total_revenues) * 100

        # 2. Analyse de la marge globale (Historique par mois)
        margin_trends = Sale.objects.filter(enterprise=enterprise)\
            .annotate(month=TruncMonth('date'))\
            .values('month')\
            .annotate(revenue=Sum('total_amount'), margin=Sum('total_margin'))\
            .order_by('month')

        # 3. Prévisions financières (Moyenne des 3 derniers mois)
        three_months_ago = timezone.now() - timedelta(days=90)
        recent_sales = Sale.objects.filter(enterprise=enterprise, date__gte=three_months_ago)\
            .annotate(month=TruncMonth('date'))\
            .values('month')\
            .annotate(total=Sum('total_amount'))
        
        avg_monthly_revenue = 0
        if recent_sales.count() > 0:
            avg_monthly_revenue = sum(s['total'] for s in recent_sales) / recent_sales.count()
        
        forecast_next_month = avg_monthly_revenue * 1.05 # Conservative 5% growth projection

        return Response({
            'debt_ratio': round(debt_ratio, 2),
            'remaining_debt': remaining_debt,
            'total_revenues': total_revenues,
            'margin_trends': margin_trends,
            'forecast_next_month': round(forecast_next_month, 2),
            'avg_monthly_revenue': round(avg_monthly_revenue, 2)
        })

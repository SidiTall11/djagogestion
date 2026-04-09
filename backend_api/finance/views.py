from rest_framework import viewsets, views
from django.db import models
from rest_framework.response import Response
from django.db.models import Sum
from rest_framework.permissions import IsAuthenticated
from .models import Revenue, Expense, Debt, Receivable, Budget
from .serializers import RevenueSerializer, ExpenseSerializer, DebtSerializer, ReceivableSerializer, BudgetSerializer
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import TruncDay, TruncMonth
from trade.models import Sale, Purchase, SaleItem
from catalog.models import Product

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

class DashboardDataView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        enterprise = request.user.enterprise
        period = request.query_params.get('period', 'month')
        now = timezone.now()

        # 1. Déterminer la période actuelle et précédente
        if period == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            prev_start = start_date - timedelta(days=1)
            trunc_func = TruncDay
        elif period == 'week':
            start_date = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
            prev_start = start_date - timedelta(days=7)
            trunc_func = TruncDay
        elif period == 'year':
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            prev_start = start_date.replace(year=start_date.year - 1)
            trunc_func = TruncMonth
        else: # month
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            prev_start = (start_date - timedelta(days=1)).replace(day=1)
            trunc_func = TruncDay

        # 2. Calculer les KPIs de la période actuelle
        revenue_current = Revenue.objects.filter(enterprise=enterprise, date__gte=start_date).aggregate(total=Sum('amount'))['total'] or 0
        expense_current = Expense.objects.filter(enterprise=enterprise, date__gte=start_date).aggregate(total=Sum('amount'))['total'] or 0
        margin_current = Sale.objects.filter(enterprise=enterprise, date__gte=start_date).aggregate(total=Sum('total_margin'))['total'] or 0
        
        # 3. Calculer les KPIs de la période précédente (pour les tendances)
        revenue_prev = Revenue.objects.filter(enterprise=enterprise, date__gte=prev_start, date__lt=start_date).aggregate(total=Sum('amount'))['total'] or 0
        expense_prev = Expense.objects.filter(enterprise=enterprise, date__gte=prev_start, date__lt=start_date).aggregate(total=Sum('amount'))['total'] or 0
        
        def calculate_trend(current, prev):
            if prev == 0: return 0
            return round(((float(current) - float(prev)) / float(prev)) * 100, 1)

        trends = {
            'revenue': calculate_trend(revenue_current, revenue_prev),
            'expense': calculate_trend(expense_current, expense_prev),
        }

        # 4. Données pour le graphique (Grouping)
        chart_data_query = Sale.objects.filter(enterprise=enterprise, date__gte=start_date)\
            .annotate(label=trunc_func('date'))\
            .values('label')\
            .annotate(revenues=Sum('total_amount'))\
            .order_by('label')

        expense_chart_query = Expense.objects.filter(enterprise=enterprise, date__gte=start_date)\
            .annotate(label=trunc_func('date'))\
            .values('label')\
            .annotate(expenses=Sum('amount'))\
            .order_by('label')

        # Fusionner les données graphique
        chart_map = {}
        for entry in chart_data_query:
            key = entry['label'].strftime('%Y-%m-%d') if trunc_func == TruncDay else entry['label'].strftime('%b')
            chart_map[key] = {'label': key, 'Revenus': entry['revenues'], 'Dépenses': 0}
        
        for entry in expense_chart_query:
            key = entry['label'].strftime('%Y-%m-%d') if trunc_func == TruncDay else entry['label'].strftime('%b')
            if key in chart_map:
                chart_map[key]['Dépenses'] = entry['expenses']
            else:
                chart_map[key] = {'label': key, 'Revenus': 0, 'Dépenses': entry['expenses']}
        
        # 5. Top 5 Produits
        top_products = SaleItem.objects.filter(sale__enterprise=enterprise, sale__date__gte=start_date)\
            .values('product__name')\
            .annotate(revenue=Sum(models.F('quantity') * models.F('unit_price')))\
            .order_by('-revenue')[:5]
        
        top_products_formatted = [{'name': p['product__name'], 'revenue': p['revenue']} for p in top_products]

        # 6. Dernières Transactions (Mélange Ventes & Achats)
        recent_sales = Sale.objects.filter(enterprise=enterprise).order_by('-date')[:5]
        recent_purchases = Purchase.objects.filter(enterprise=enterprise).order_by('-date')[:5]
        
        transactions = []
        for s in recent_sales:
            transactions.append({
                'type': 'vente', 'amount': s.total_amount, 'date': s.date,
                'label': s.customer.name if s.customer else 'Client de passage', 'is_credit': s.is_credit
            })
        for p in recent_purchases:
            transactions.append({
                'type': 'achat', 'amount': p.total_amount, 'date': p.date,
                'label': p.supplier.name if p.supplier else 'Fournisseur', 'is_credit': p.is_credit
            })
        transactions.sort(key=lambda x: x['date'], reverse=True)
        transactions = transactions[:7]

        # 7. Créances & Dettes globales (indépendant de la période choisie)
        unpaid_debts = Debt.objects.filter(enterprise=enterprise, is_paid=False)
        total_debts = sum(d.amount_total - d.amount_paid for d in unpaid_debts)
        
        unpaid_recs = Receivable.objects.filter(enterprise=enterprise, is_paid=False)
        total_recs = sum(r.amount_total - r.amount_paid for r in unpaid_recs)

        # 8. Alertes Stock
        critical_stock = Product.objects.filter(enterprise=enterprise, stock_quantity__lte=models.F('min_stock_threshold'))\
            .values('id', 'name', 'stock_quantity', 'min_stock_threshold')

        return Response({
            'summary': {
                'total_revenues': revenue_current,
                'total_expenses': expense_current,
                'net_profit': revenue_current - expense_current,
                'total_margin': margin_current,
                'total_debts': total_debts,
                'total_receivables': total_recs,
                'unpaid_debts_count': unpaid_debts.count(),
                'unpaid_recs_count': unpaid_recs.count(),
            },
            'trends': trends,
            'chart_data': sorted(chart_map.values(), key=lambda x: x['label']),
            'top_products': top_products_formatted,
            'recent_transactions': transactions,
            'critical_stock': list(critical_stock),
        })


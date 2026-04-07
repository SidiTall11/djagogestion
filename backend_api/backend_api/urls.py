from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from users.views import RegisterView, AgentViewSet, UserMeView, EnterpriseUpdateView
from catalog.views import CategoryViewSet, ProductViewSet, StockMovementViewSet
from trade.views import SupplierViewSet, CustomerViewSet, PurchaseViewSet, SaleViewSet
from finance.views import RevenueViewSet, ExpenseViewSet, DebtViewSet, ReceivableViewSet, BudgetViewSet, FinanceSummaryView, AdvancedAnalyticsView

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'stock-movements', StockMovementViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'purchases', PurchaseViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'revenues', RevenueViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'debts', DebtViewSet)
router.register(r'receivables', ReceivableViewSet)
router.register(r'agents', AgentViewSet)
router.register(r'budgets', BudgetViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
    path('api/users/me/', UserMeView.as_view(), name='user_me'),
    path('api/users/me/enterprise/', EnterpriseUpdateView.as_view(), name='enterprise_update'),
    path('api/finance/summary/', FinanceSummaryView.as_view(), name='finance_summary'),
    path('api/finance/analytics/', AdvancedAnalyticsView.as_view(), name='finance_analytics'),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

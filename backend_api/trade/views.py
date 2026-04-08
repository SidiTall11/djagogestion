from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Supplier, Customer, Purchase, Sale
from .serializers import SupplierSerializer, CustomerSerializer, PurchaseSerializer, SaleSerializer

class SupplierViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SupplierSerializer
    queryset = Supplier.objects.none()

    def get_queryset(self):
        return Supplier.objects.filter(enterprise=self.request.user.enterprise)

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomerSerializer
    queryset = Customer.objects.none()

    def get_queryset(self):
        return Customer.objects.filter(enterprise=self.request.user.enterprise)

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class PurchaseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PurchaseSerializer
    queryset = Purchase.objects.none()

    def get_queryset(self):
        qs = Purchase.objects.filter(enterprise=self.request.user.enterprise)\
            .select_related('supplier')\
            .prefetch_related('items__product')\
            .order_by('-date')
        
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class SaleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SaleSerializer
    queryset = Sale.objects.none()

    def get_queryset(self):
        qs = Sale.objects.filter(enterprise=self.request.user.enterprise)\
            .select_related('customer')\
            .prefetch_related('items__product')\
            .order_by('-date')
            
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

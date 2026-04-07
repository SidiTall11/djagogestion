from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Category, Product, StockMovement
from .serializers import CategorySerializer, ProductSerializer, StockMovementSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer
    queryset = Category.objects.none()

    def get_queryset(self):
        return Category.objects.filter(enterprise=self.request.user.enterprise)

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer
    queryset = Product.objects.none()

    def get_queryset(self):
        return Product.objects.filter(enterprise=self.request.user.enterprise).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        product = self.get_object()
        quantity_diff = request.data.get('quantity_diff')
        notes = request.data.get('notes', 'Ajustement manuel')

        if quantity_diff is None:
            return Response({"error": "quantity_diff is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity_diff = int(quantity_diff)
        except ValueError:
            return Response({"error": "quantity_diff must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        product.stock_quantity += quantity_diff
        product.save()

        StockMovement.objects.create(
            product=product,
            movement_type='ADJ',
            quantity=abs(quantity_diff), # on enregistre la valeur absolue ou la variation selon les préférences. Typiquement variation dans "quantity" field qui n'a pas de contrainte positive. Wait! The quantity logic in signals passes positive for IN/OUT. For ADJ, let's just pass quantity_diff directly.
            notes=f"{notes} ({'+' if quantity_diff > 0 else ''}{quantity_diff})"
        )

        return Response(ProductSerializer(product).data)

class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = StockMovementSerializer
    queryset = StockMovement.objects.none()

    def get_queryset(self):
        return StockMovement.objects.filter(product__enterprise=self.request.user.enterprise).order_by('-date')

from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import RegisterSerializer, AgentSerializer, UserMeSerializer, EnterpriseSerializer
from .models import Agent, Enterprise

class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "message": "Entreprise et compte créés avec succès !",
            "username": user.username,
            "enterprise": user.enterprise.name
        }, status=status.HTTP_201_CREATED)


class AgentViewSet(viewsets.ModelViewSet):
    """
    Gestion des agents subordonnés d'une entreprise.
    Limite : 3 agents max par entreprise.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AgentSerializer
    pagination_class = None
    queryset = Agent.objects.none()

    def get_queryset(self):
        return Agent.objects.filter(enterprise=self.request.user.enterprise)

    def create(self, request, *args, **kwargs):
        enterprise = request.user.enterprise
        if Agent.objects.filter(enterprise=enterprise).count() >= 3:
            return Response(
                {"error": "Limite atteinte : vous ne pouvez pas créer plus de 3 agents."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user.enterprise)

class UserMeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserMeSerializer

    def get_object(self):
        return self.request.user

class EnterpriseUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EnterpriseSerializer
    
    def get_object(self):
        return self.request.user.enterprise

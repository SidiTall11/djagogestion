from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import User, Enterprise, Agent

class RegisterSerializer(serializers.Serializer):
    enterprise_name = serializers.CharField(max_length=255)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[('ADMIN_PME', 'Administrateur PME'), ('COMMERCANT', 'Commerçant Indépendant')], default='ADMIN_PME')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'ADMIN_PME')
        )
        Enterprise.objects.create(
            name=validated_data['enterprise_name'],
            owner=user
        )
        return user


class AgentSerializer(serializers.ModelSerializer):
    # Champs pour créer l'utilisateur agent
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=[('AGENT_CAISSIER', 'Agent Caissier'), ('AGENT_DETTE', 'Agent Dette')],
        write_only=True,
        default='AGENT_CAISSIER'
    )

    # Champs en lecture seule pour afficher les infos de l'agent
    agent_username = serializers.CharField(source='user.username', read_only=True)
    agent_role = serializers.CharField(source='user.get_role_display', read_only=True)
    agent_phone = serializers.CharField(source='user.phone', read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Agent
        fields = ['id', 'username', 'password', 'role', 'agent_username', 'agent_role', 'agent_phone', 'custom_role', 'allowed_modules', 'created_at', 'enterprise']
        read_only_fields = ('enterprise',)

    def create(self, validated_data):
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        role = validated_data.pop('role', 'AGENT_CAISSIER')
        enterprise = validated_data.get('enterprise')
        custom_role = validated_data.pop('custom_role', '')
        allowed_modules = validated_data.pop('allowed_modules', [])

        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "Ce nom d'utilisateur est déjà pris."})

        user = User.objects.create_user(username=username, password=password, role=role)
        agent = Agent.objects.create(user=user, enterprise=enterprise, custom_role=custom_role, allowed_modules=allowed_modules)
        return agent

class EnterpriseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enterprise
        fields = ['id', 'name', 'email', 'phone', 'address', 'rccm', 'created_at']

class UserMeSerializer(serializers.ModelSerializer):
    enterprise = EnterpriseSerializer()
    agent_modules = serializers.SerializerMethodField()
    agent_custom_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'enterprise', 'agent_modules', 'agent_custom_role']

    def get_agent_modules(self, obj):
        if hasattr(obj, 'agent_profile'):
            return obj.agent_profile.allowed_modules
        return []
        
    def get_agent_custom_role(self, obj):
        if hasattr(obj, 'agent_profile'):
            return obj.agent_profile.custom_role
        return None

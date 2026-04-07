from django.core.mail import EmailMultiAlternatives
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.urls import reverse
from django_rest_passwordreset.signals import reset_password_token_created

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    """
    Handles password reset tokens
    When a token is created, an e-mail needs to be sent to the user
    """
    # URL de votre frontend (React)
    frontend_url = "http://localhost:5173/reset-password"
    
    context = {
        'current_user': reset_password_token.user,
        'username': reset_password_token.user.username,
        'email': reset_password_token.user.email,
        'reset_password_url': f"{frontend_url}?token={reset_password_token.key}"
    }

    # Création du message
    email_html_message = f"""
    Bonjour {context['username']},
    
    Vous avez demandé la réinitialisation de votre mot de passe pour FinTrade PME.
    Veuillez cliquer sur le lien ci-dessous pour choisir un nouveau mot de passe :
    
    {context['reset_password_url']}
    
    Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.
    """
    email_plaintext_message = email_html_message

    msg = EmailMultiAlternatives(
        # title:
        "Réinitialisation de votre mot de passe - FinTrade PME",
        # message:
        email_plaintext_message,
        # from:
        "noreply@fintrade.com",
        # to:
        [reset_password_token.user.email]
    )
    msg.send()

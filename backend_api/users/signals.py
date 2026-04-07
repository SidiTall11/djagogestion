from django.core.mail import EmailMultiAlternatives
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.urls import reverse
from django_rest_passwordreset.signals import reset_password_token_created
from django.conf import settings

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    """
    Handles password reset tokens
    When a token is created, an e-mail needs to be sent to the user
    """
    # L'URL de votre site frontend Vercel (déployé) ou localhost en dév
    # En production, vous pouvez utiliser une variable d'environnement FRONTEND_URL
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://djagogestion.vercel.app')
    
    reset_url = f"{frontend_url}/reset-password?token={reset_password_token.key}"

    context = {
        'current_user': reset_password_token.user,
        'username': reset_password_token.user.username,
        'email': reset_password_token.user.email,
        'reset_password_url': reset_url
    }

    # Création du contenu de l'e-mail (Texte Brut et HTML)
    email_html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4f46e5;">Djago Gestion - Réinitialisation du mot de passe</h2>
        <p>Bonjour {reset_password_token.user.username},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Djago Gestion.</p>
        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Réinitialiser mon mot de passe
            </a>
        </div>
        <p>Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
        <a href="{reset_url}">{reset_url}</a></p>
        <p style="color: #666; font-size: 0.9em; margin-top: 40px;">
            Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.
        </p>
    </body>
    </html>
    """
    
    email_plaintext_message = f"Bonjour {reset_password_token.user.username},\n\nVous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien suivant :\n{reset_url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message."

    msg = EmailMultiAlternatives(
        # Titre
        "Réinitialisation de votre mot de passe - Djago Gestion",
        # Message brut
        email_plaintext_message,
        # Expéditeur
        settings.DEFAULT_FROM_EMAIL,
        # Destinataire
        [reset_password_token.user.email]
    )
    msg.attach_alternative(email_html_message, "text/html")
    msg.send()

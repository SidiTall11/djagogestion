import os
import subprocess
import json

# Script pour créer un backup complet de vos données actuelles (MySQL)
# Ce fichier 'data_dump.json' servira à restaurer vos produits/ventes sur le serveur Cloud.

def export_django_data():
    print("--- Preparation de l'exportation des donnees ---")
    
    # On se place dans le dossier du backend
    backend_dir = os.path.join(os.getcwd(), 'backend_api')
    
    try:
        # Commande dumpdata pour extraire toutes les données SAUF les permissions/contenttypes (gérés par Django)
        # On exclut les types de contenu pour éviter les erreurs d'ID lors de l'import Postgres
        cmd = [
            'python', 'manage.py', 'dumpdata', 
            '--exclude', 'auth.permission', 
            '--exclude', 'contenttypes', 
            '--indent', '2', 
            '--output', 'data_dump.json'
        ]
        
        print(f"--- Execution de : {' '.join(cmd)} ---")
        subprocess.run(cmd, cwd=backend_dir, check=True)
        
        print("\n--- Succes ! Vos donnees sont sauvegardees dans 'backend_api/data_dump.json' ---")
        print("--- IMPORTANT : Gardez ce fichier precieusement, c'est votre sauvegarde ---")
        
    except Exception as e:
        print(f"--- Erreur lors de l'exportation : {e} ---")

if __name__ == "__main__":
    export_django_data()

# Guide de Déploiement : La Présidente

Ce guide explique comment lancer le jeu en environnement de développement (local) et en production (VPS).

## 1. Déploiement en Local (Développement)

### Prérequis
- Node.js (version 16+ recommandée)
- npm (installé avec Node.js)

### Étapes
1. Cloner ou télécharger le dépôt.
2. Ouvrir un terminal dans le dossier du projet.
3. Installer les dépendances :
   ```bash
   npm install
   ```
4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```
   *(ou `npm start` pour le lancer sans nodemon)*
5. Ouvrir un navigateur et aller à l'adresse : `http://localhost:3000`

---

## 2. Déploiement en Production sur un VPS

### Prérequis sur le VPS
- Un serveur VPS sous Linux (Ubuntu/Debian recommandé).
- Node.js et npm installés.
- PM2 installé globalement pour gérer le processus en arrière-plan :
  ```bash
  sudo npm install -g pm2
  ```
- Un reverse proxy (Nginx) configuré pour exposer l'application (optionnel mais recommandé).

### Étapes
1. Transférer les fichiers du projet sur le VPS (via `git clone`, `scp`, ou FTP).
2. Dans le dossier du projet sur le VPS, installer les dépendances pour la production :
   ```bash
   npm install --production
   ```
3. Lancer l'application avec PM2 :
   ```bash
   pm2 start server.js --name "presidente-app"
   ```
4. Sauvegarder la configuration PM2 pour que l'application redémarre automatiquement au boot du VPS :
   ```bash
   pm2 save
   pm2 startup
   ```

### Commandes utiles PM2
- Voir les logs : `pm2 logs presidente-app`
- Redémarrer l'application : `pm2 restart presidente-app`
- Arrêter l'application : `pm2 stop presidente-app`
- Voir le statut : `pm2 status`

### Configuration Nginx (Exemple basique avec WebSocket supporté)
Si vous utilisez Nginx en frontal, voici un exemple de configuration du `server block` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```
N'oubliez pas de redémarrer Nginx après modification (`sudo systemctl restart nginx`).

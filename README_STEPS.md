# Étapes de Développement : La Présidente

- [x] **Étape 1 : Initialisation du projet**
  - [x] Création du `package.json`
  - [x] Installation des dépendances (Express, Socket.io)
  - [x] Configuration de la structure des dossiers

- [x] **Étape 2 : Serveur et Système de Rooms**
  - [x] Configuration du serveur Express
  - [x] Initialisation de Socket.io
  - [x] Logique de création de room (code unique)
  - [x] Logique pour rejoindre une room
  - [x] Gestion des déconnexions
  - [x] Lobby d'attente

- [x] **Étape 3 : Logique Métier du Jeu**
  - [x] Création du deck de 52 cartes et mélange
  - [x] Distribution des cartes
  - [x] Hiérarchie des cartes et validation des coups
  - [x] Gestion du tour par tour
  - [x] Détection de fin de manche et attribution des rôles
  - [x] Logique d'échange de cartes en début de manche (base préparée)

- [x] **Étape 4 : Frontend (Interface Utilisateur)**
  - [x] Structure HTML de base (Lobby / Table de jeu)
  - [x] Styles CSS pour l'interface (cartes, tapis, avatars)
  - [x] Script client Socket.io pour interagir avec le serveur
  - [x] Rendu dynamique de la main du joueur
  - [x] Sélection et action de jeu (Jouer, Passer)
  - [x] Affichage de l'état du jeu (tour, dernières cartes, scores)

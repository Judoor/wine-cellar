# Installer Wine Cellar sur son serveur (Dockge / TrueNAS)

## 1. Créer la stack dans Dockge

1. Dans Dockge : **+ Compose**, nom de la stack : `winecellar`.
2. Coller le contenu de [`docker-compose.yml`](../docker-compose.yml).
3. Adapter si besoin :
   - **Port** : `"3000:3000"` → changer le premier nombre si 3000 est déjà pris (ex. `"3080:3000"`).
   - **PUID / PGID** : propriétaire du dossier `data`. Sur **TrueNAS**, mettre `568` / `568` (utilisateur *apps*).
   - **TZ** : votre fuseau horaire.
4. **Déployer**. Le dossier `data` est créé automatiquement à côté du compose (dans le dossier de la stack Dockge).
5. Ouvrir `http://IP-DU-SERVEUR:3000` : **le premier compte créé devient administrateur**.
6. Dans *Administration*, désactiver les inscriptions si vous êtes seul (ou après avoir créé les comptes de la famille).

## 2. Mettre à jour

Dans Dockge, bouton **Mettre à jour** (*Update*) de la stack : la nouvelle image est téléchargée et le conteneur
redémarré. Les données (`data/`) sont conservées et la base est migrée automatiquement.

## 3. Sauvegarder

Tout est dans le dossier `data/` de la stack : `winecellar.db` (la base) et `uploads/` (les photos).
Arrêter la stack puis copier le dossier, ou l'inclure dans les snapshots / tâches de réplication TrueNAS du dataset.

## 4. Installer l'app sur le téléphone (PWA)

Le navigateur n'autorise l'installation en « vraie application » (plein écran, icône, raccourcis) **qu'en HTTPS**.
En `http://192.168.x.x`, l'app fonctionne parfaitement dans le navigateur, mais l'installation se limite à un raccourci.

Solutions pour avoir le HTTPS :

- **Tailscale** (le plus simple, aussi pour y accéder hors de chez soi) : installer Tailscale sur le serveur et le
  téléphone, puis `tailscale serve --bg 3000` sur le serveur → l'app est accessible en `https://nom-du-serveur.xxx.ts.net`.
- **Reverse proxy** (Nginx Proxy Manager, Caddy, Traefik) avec un certificat Let's Encrypt et un nom de domaine.

Dans les deux cas, passer `SECURE_COOKIES=true` dans le compose, puis redéployer.

Ensuite, sur Android (Chrome) : ouvrir l'adresse HTTPS → menu ⋮ → **Installer l'application**.
Sur iPhone (Safari) : bouton Partager → **Sur l'écran d'accueil**.

> Le scan de code-barres et les photos d'étiquettes fonctionnent aussi en HTTP simple (ils passent par l'appareil photo
> du téléphone via une photo, pas par un flux vidéo en direct).

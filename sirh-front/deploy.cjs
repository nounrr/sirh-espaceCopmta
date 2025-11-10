#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const config = {
  buildDir: 'dist',
  backupDir: 'backup',
  versionFile: 'public/version.json'
};

// Fonction pour exécuter une commande
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Fonction principale de déploiement
async function deploy() {
  try {
    console.log('🚀 Démarrage du processus de déploiement...\n');

    // 1. Vérification des prérequis
    console.log('📋 Vérification des prérequis...');
    if (!fs.existsSync('package.json')) {
      throw new Error('package.json non trouvé');
    }

    // 2. Mise à jour de la version
    console.log('📈 Mise à jour de la version...');
    const { updateVersion } = require('./update-version.cjs');
    await updateVersion();

    // 3. Nettoyage des anciens builds
    console.log('🧹 Nettoyage des fichiers temporaires...');
    try {
      await runCommand('rm -rf dist node_modules/.vite .vite');
    } catch (e) {
      // Ignorer les erreurs sur Windows
      try {
        await runCommand('rmdir /s /q dist & rmdir /s /q node_modules\\.vite & rmdir /s /q .vite');
      } catch (e2) {
        console.log('⚠️  Impossible de nettoyer automatiquement, continuons...');
      }
    }

    // 4. Installation des dépendances
    console.log('📦 Vérification des dépendances...');
    await runCommand('npm install');

    // 5. Construction du projet
    console.log('🔨 Construction du projet...');
    const buildResult = await runCommand('npm run build');
    console.log('✅ Build terminé avec succès');

    // 6. Optimisation des fichiers
    console.log('⚡ Optimisation des fichiers...');
    
    // Copier le fichier .htaccess
    if (fs.existsSync('public/.htaccess')) {
      fs.copyFileSync('public/.htaccess', path.join(config.buildDir, '.htaccess'));
      console.log('✅ .htaccess copié depuis public/');
    } else {
      // Créer le fichier .htaccess pour Apache
      const htaccessContent = `
# Configuration Apache pour SMART RH PWA

# Activer la compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# Headers de sécurité et cache
<IfModule mod_headers.c>
    # PWA Manifest
    <FilesMatch "manifest\\.json$">
        Header set Content-Type "application/manifest+json"
        Header set Cache-Control "public, max-age=31536000"
    </FilesMatch>
    
    # Service Worker - Pas de cache
    <FilesMatch "sw\\.js$">
        Header set Content-Type "application/javascript"
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires 0
    </FilesMatch>
    
    # Version.json - Pas de cache
    <Files "version.json">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires 0
    </Files>
    
    # CSS et JS - Cache long terme
    <FilesMatch "\\.(css|js)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
    
    # Images - Cache long terme
    <FilesMatch "\\.(png|jpg|jpeg|gif|ico|svg|webp)$">
        Header set Cache-Control "public, max-age=31536000"
    </FilesMatch>
</IfModule>

# Types MIME pour CSS
<IfModule mod_mime.c>
    AddType text/css .css
    AddType application/javascript .js
    AddType application/manifest+json .webmanifest
</IfModule>

# Réécriture d'URL pour SPA
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/assets/
    RewriteRule ^(.*)$ index.html [QSA,L]
</IfModule>

ErrorDocument 404 /index.html
Options -Indexes +FollowSymLinks
`;

      fs.writeFileSync(path.join(config.buildDir, '.htaccess'), htaccessContent.trim());
      console.log('✅ .htaccess créé automatiquement');
    }

    // 7. Génération du rapport de déploiement
    const versionData = JSON.parse(fs.readFileSync(config.versionFile, 'utf8'));
    const deployReport = {
      version: versionData.version,
      buildTime: new Date().toISOString(),
      deployTime: new Date().toISOString(),
      status: 'success',
      files: []
    };

    if (fs.existsSync(config.buildDir)) {
      const files = fs.readdirSync(config.buildDir, { recursive: true });
      deployReport.files = files.filter(file => !file.includes('node_modules'));
    }

    fs.writeFileSync(
      path.join(config.buildDir || '.', 'deploy-report.json'), 
      JSON.stringify(deployReport, null, 2)
    );

    // 8. Résumé
    console.log('\n🎉 Déploiement terminé avec succès!');
    console.log(`📊 Version: ${versionData.version}`);
    console.log(`📁 Fichiers générés dans: ${config.buildDir}/`);
    console.log(`⏰ Temps de build: ${new Date().toLocaleString('fr-FR')}`);
    console.log('\n📋 Étapes suivantes:');
    console.log('   1. Tester le build: npm run preview');
    console.log('   2. Déployer les fichiers du dossier dist/ sur votre serveur');
    console.log('   3. Vérifier que version.json est accessible');
    console.log('   4. Tester la PWA sur mobile\n');

  } catch (error) {
    console.error('\n❌ Erreur lors du déploiement:');
    console.error(error.message);
    
    if (error.stdout) {
      console.log('\n📤 Sortie standard:');
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      console.log('\n📥 Erreurs:');
      console.log(error.stderr);
    }
    
    process.exit(1);
  }
}

// Exécuter si lancé directement
if (require.main === module) {
  deploy();
}

module.exports = { deploy };

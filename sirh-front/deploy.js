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
    const { updateVersion } = require('./update-version.js');
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
    
    // Créer le fichier .htaccess pour Apache
    const htaccessContent = `
# Cache busting pour les mises à jour PWA
<Files "version.json">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</Files>

# Cache pour les assets statiques
<FilesMatch "\\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    Header set Cache-Control "public, max-age=31536000"
</FilesMatch>

# Headers PWA
<Files "manifest.json">
    Header set Content-Type "application/manifest+json"
</Files>

# Service Worker
<Files "sw.js">
    Header set Cache-Control "no-cache"
    Header set Content-Type "application/javascript"
</Files>

# Fallback pour SPA
RewriteEngine On
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
`;

    if (fs.existsSync(config.buildDir)) {
      fs.writeFileSync(path.join(config.buildDir, '.htaccess'), htaccessContent.trim());
      console.log('✅ .htaccess créé');
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

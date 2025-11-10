#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Chemins des fichiers à mettre à jour
const versionFilePath = path.join(__dirname, 'public', 'version.json');
const viteConfigPath = path.join(__dirname, 'vite.config.js');
const packageJsonPath = path.join(__dirname, 'package.json');

// Fonction pour incrémenter la version
function incrementVersion(version, type = 'patch') {
  const parts = version.split('.');
  let major = parseInt(parts[0], 10);
  let minor = parseInt(parts[1], 10);
  let patch = parseInt(parts[2], 10);

  switch (type) {
    case 'major':
      major++;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor++;
      patch = 0;
      break;
    case 'patch':
    default:
      patch++;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

// Fonction principale
async function updateVersion() {
  try {
    // Lire le type d'incrémentation depuis les arguments
    const incrementType = process.argv[2] || 'patch';
    
    console.log(`🚀 Mise à jour de version (${incrementType})...`);

    // 1. Lire la version actuelle
    let currentVersion = '3.1.3'; // Version par défaut
    
    if (fs.existsSync(versionFilePath)) {
      const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
      currentVersion = versionData.version;
    }

    // 2. Calculer la nouvelle version
    const newVersion = incrementVersion(currentVersion, incrementType);
    console.log(`📊 Version: ${currentVersion} → ${newVersion}`);

    // 3. Mettre à jour version.json
    const versionData = {
      version: newVersion,
      buildTime: new Date().toISOString(),
      cacheBuster: Date.now(),
      features: [
        "🚀 Système de mise à jour automatique",
        "🔧 Détection de nouvelles versions",
        "✨ Interface de notification améliorée",
        "🔒 Cache busting automatique"
      ]
    };

    fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
    console.log('✅ version.json mis à jour');

    // 4. Mettre à jour vite.config.js
    if (fs.existsSync(viteConfigPath)) {
      let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
      const versionRegex = /version:\s*['"]([\d.]+)['"]/;
      
      if (versionRegex.test(viteConfig)) {
        viteConfig = viteConfig.replace(versionRegex, `version: '${newVersion}'`);
        fs.writeFileSync(viteConfigPath, viteConfig);
        console.log('✅ vite.config.js mis à jour');
      }
    }

    // 5. Mettre à jour package.json
    if (fs.existsSync(packageJsonPath)) {
      const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageData.version = newVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));
      console.log('✅ package.json mis à jour');
    }

    console.log(`🎉 Mise à jour terminée! Nouvelle version: ${newVersion}`);
    console.log(`📝 Pour déployer: npm run build`);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error.message);
    process.exit(1);
  }
}

// Exécuter si lancé directement
if (require.main === module) {
  updateVersion();
}

module.exports = { updateVersion, incrementVersion };

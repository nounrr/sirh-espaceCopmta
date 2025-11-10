/**
 * Fichier de démonstration du système de congés
 * Pour tester les fonctionnalités depuis la console du navigateur
 */

window.LeaveSystemDemo = {
  // Données de test
  testUser: {
    id: 1,
    name: 'Jean',
    prenom: 'Dupont',
    dateEmbauche: '2020-01-15',
    email: 'jean.dupont@example.com'
  },

  testAbsenceRequests: [
    {
      id: 1,
      type: 'Congé',
      dateDebut: '2023-07-01',
      dateFin: '2023-07-07',
      statut: 'validé',
      user_id: 1
    },
    {
      id: 2,
      type: 'Congé',
      dateDebut: '2023-12-20',
      dateFin: '2023-12-22',
      statut: 'validé',
      user_id: 1
    },
    {
      id: 3,
      type: 'maladie',
      dateDebut: '2023-09-15',
      dateFin: '2023-09-16',
      statut: 'validé',
      user_id: 1
    }
  ],

  // Fonction de test des calculs
  runCalculationTests() {
    console.log('=== DÉMONSTRATION DU SYSTÈME DE CONGÉS ===\n');
    
    const { testUser, testAbsenceRequests } = this;
    
    console.log('👤 Employé:', `${testUser.name} ${testUser.prenom}`);
    console.log('📅 Date d\'embauche:', testUser.dateEmbauche);
    console.log('📧 Email:', testUser.email);
    console.log('');

    // Simulation des calculs (à remplacer par les vraies fonctions)
    const today = new Date();
    const hireDate = new Date(testUser.dateEmbauche);
    const yearsOfService = (today - hireDate) / (365.25 * 24 * 60 * 60 * 1000);
    
    const annualLeave = yearsOfService < 1 ? 18 : yearsOfService < 5 ? 25 : 30;
    const monthsWorked = Math.floor((today - hireDate) / (30.44 * 24 * 60 * 60 * 1000));
    const acquiredLeave = Math.min(monthsWorked * 2.5, annualLeave);
    
    const consumedDays = testAbsenceRequests
      .filter(req => req.type === 'Congé' && req.statut === 'validé')
      .reduce((total, req) => {
        const start = new Date(req.dateDebut);
        const end = new Date(req.dateFin);
        const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
        return total + days;
      }, 0);

    const remainingLeave = acquiredLeave - consumedDays;

    console.log('📊 CALCULS DES CONGÉS:');
    console.log(`   Ancienneté: ${yearsOfService.toFixed(1)} ans`);
    console.log(`   Congés annuels: ${annualLeave} jours`);
    console.log(`   Congés acquis: ${acquiredLeave.toFixed(1)} jours`);
    console.log(`   Congés consommés: ${consumedDays} jours`);
    console.log(`   Congés restants: ${remainingLeave.toFixed(1)} jours`);
    console.log('');

    console.log('📋 HISTORIQUE DES DEMANDES:');
    testAbsenceRequests.forEach((req, index) => {
      const start = new Date(req.dateDebut);
      const end = new Date(req.dateFin);
      const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
      const statusIcon = req.statut === 'validé' ? '✅' : req.statut === 'en_attente' ? '⏳' : '❌';
      
      console.log(`   ${index + 1}. ${req.type} - ${req.dateDebut} à ${req.dateFin} (${days} jour${days > 1 ? 's' : ''}) ${statusIcon}`);
    });
    console.log('');

    // Test de validation d'une nouvelle demande
    const newRequestStart = '2024-02-01';
    const newRequestEnd = '2024-02-05';
    const newRequestDays = Math.ceil((new Date(newRequestEnd) - new Date(newRequestStart)) / (24 * 60 * 60 * 1000)) + 1;
    
    console.log('🔍 TEST DE VALIDATION:');
    console.log(`   Nouvelle demande: ${newRequestStart} à ${newRequestEnd} (${newRequestDays} jours)`);
    
    if (newRequestDays <= remainingLeave) {
      console.log('   ✅ Demande valide - Solde suffisant');
    } else {
      console.log('   ❌ Demande invalide - Solde insuffisant');
      console.log(`   Manque: ${newRequestDays - remainingLeave} jour${newRequestDays - remainingLeave > 1 ? 's' : ''}`);
    }
    
    console.log('\n🎉 Démonstration terminée!');
    console.log('💡 Conseil: Utilisez LeaveSystemDemo.simulateYear() pour voir l\'évolution sur une année');
  },

  // Simulation de l'évolution des congés sur une année
  simulateYear() {
    console.log('=== SIMULATION ÉVOLUTION ANNUELLE ===\n');
    
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    let acquiredLeave = 0;
    let consumedLeave = 0;
    
    months.forEach((month, index) => {
      acquiredLeave += 2.5; // 2.5 jours par mois
      
      // Simulation de consommation (plus en été)
      let monthlyConsumption = 0;
      if (index === 6 || index === 7) { // Juillet, Août
        monthlyConsumption = Math.random() * 10; // 0-10 jours en été
      } else if (index === 11) { // Décembre
        monthlyConsumption = Math.random() * 5; // 0-5 jours en hiver
      } else {
        monthlyConsumption = Math.random() * 2; // 0-2 jours autres mois
      }
      
      consumedLeave += monthlyConsumption;
      const balance = acquiredLeave - consumedLeave;
      
      console.log(`${month}: +${2.5}j acquis, -${monthlyConsumption.toFixed(1)}j consommés → Solde: ${balance.toFixed(1)}j`);
    });
    
    console.log(`\n📊 Bilan annuel:`);
    console.log(`   Total acquis: ${acquiredLeave}j`);
    console.log(`   Total consommé: ${consumedLeave.toFixed(1)}j`);
    console.log(`   Solde final: ${(acquiredLeave - consumedLeave).toFixed(1)}j`);
  },

  // Affichage des informations d'utilisation
  showUsage() {
    console.log('=== GUIDE D\'UTILISATION ===\n');
    console.log('Commandes disponibles dans la console:');
    console.log('• LeaveSystemDemo.runCalculationTests() - Démonstration complète');
    console.log('• LeaveSystemDemo.simulateYear() - Simulation évolution annuelle');
    console.log('• LeaveSystemDemo.testUser - Données utilisateur test');
    console.log('• LeaveSystemDemo.testAbsenceRequests - Demandes test');
    console.log('\nℹ️  Ce système calcule automatiquement:');
    console.log('  - Les congés annuels selon l\'ancienneté (18-30 jours)');
    console.log('  - L\'acquisition mensuelle (2.5 jours/mois)');
    console.log('  - La consommation basée sur les demandes validées');
    console.log('  - La validation des nouvelles demandes');
  }
};

// Affichage automatique du guide
console.log('🎯 Système de Gestion des Congés - Mode Démonstration');
console.log('Tapez LeaveSystemDemo.showUsage() pour voir les commandes disponibles');

export default window.LeaveSystemDemo;

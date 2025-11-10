/**
 * Script de test pour vérifier les calculs de congés
 * Exécutez ce fichier pour tester la logique de calcul
 */

import { 
  calculateSeniority, 
  calculateTotalAnnualLeave, 
  calculateAcquiredLeave, 
  calculateConsumedLeave,
  calculateRemainingLeave,
  validateLeaveRequest 
} from '../services/leaveCalculationService';

// Données de test
const testCases = [
  {
    name: "Employé récent (6 mois)",
    dateEmbauche: "2023-06-01",
    absenceRequests: [
      { type: "Congé", dateDebut: "2023-09-01", dateFin: "2023-09-03", statut: "validé" }
    ]
  },
  {
    name: "Employé expérimenté (3 ans)",
    dateEmbauche: "2021-01-01", 
    absenceRequests: [
      { type: "Congé", dateDebut: "2023-07-01", dateFin: "2023-07-07", statut: "validé" },
      { type: "Congé", dateDebut: "2023-12-20", dateFin: "2023-12-24", statut: "validé" }
    ]
  },
  {
    name: "Employé senior (8 ans)",
    dateEmbauche: "2016-03-15",
    absenceRequests: [
      { type: "Congé", dateDebut: "2023-06-01", dateFin: "2023-06-14", statut: "validé" },
      { type: "Congé", dateDebut: "2023-08-15", dateFin: "2023-08-21", statut: "en_attente" }
    ]
  }
];

console.log("=== TEST DU SYSTÈME DE CALCUL DES CONGÉS ===\n");

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Date d'embauche: ${testCase.dateEmbauche}`);
  
  const seniority = calculateSeniority(testCase.dateEmbauche);
  const totalAnnualLeave = calculateTotalAnnualLeave(testCase.dateEmbauche);
  const acquiredLeave = calculateAcquiredLeave(testCase.dateEmbauche);
  const consumedLeave = calculateConsumedLeave(testCase.absenceRequests);
  const remainingLeave = calculateRemainingLeave(testCase.dateEmbauche, testCase.absenceRequests);
  
  console.log(`   Ancienneté: ${seniority.years} ans, ${seniority.months} mois`);
  console.log(`   Congés annuels: ${totalAnnualLeave} jours`);
  console.log(`   Congés acquis: ${acquiredLeave} jours`);
  console.log(`   Congés consommés: ${consumedLeave} jours`);
  console.log(`   Congés restants: ${remainingLeave} jours`);
  
  // Test de validation d'une nouvelle demande
  const newRequest = {
    startDate: "2024-01-15",
    endDate: "2024-01-19",
    leaveType: "Congé"
  };
  
  const validation = validateLeaveRequest(
    testCase.dateEmbauche,
    testCase.absenceRequests,
    newRequest.startDate,
    newRequest.endDate,
    newRequest.leaveType
  );
  
  console.log(`   Validation nouvelle demande (${newRequest.startDate} à ${newRequest.endDate}):`);
  console.log(`   - Valide: ${validation.isValid ? "✅" : "❌"}`);
  if (!validation.isValid) {
    console.log(`   - Erreurs: ${validation.errors.join(", ")}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`   - Avertissements: ${validation.warnings.join(", ")}`);
  }
  
  console.log("-".repeat(60));
});

// Test des cas limites
console.log("\n=== TESTS DES CAS LIMITES ===\n");

const edgeCases = [
  {
    name: "Employé très récent (1 mois)",
    dateEmbauche: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  {
    name: "Employé ancien (15 ans)",
    dateEmbauche: new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
];

edgeCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Date d'embauche: ${testCase.dateEmbauche}`);
  
  const seniority = calculateSeniority(testCase.dateEmbauche);
  const totalAnnualLeave = calculateTotalAnnualLeave(testCase.dateEmbauche);
  const acquiredLeave = calculateAcquiredLeave(testCase.dateEmbauche);
  
  console.log(`   Ancienneté: ${seniority.years} ans, ${seniority.months} mois`);
  console.log(`   Congés annuels: ${totalAnnualLeave} jours`);
  console.log(`   Congés acquis: ${acquiredLeave} jours`);
  console.log("-".repeat(40));
});

console.log("\n✅ Tests terminés!");

export { testCases, edgeCases };

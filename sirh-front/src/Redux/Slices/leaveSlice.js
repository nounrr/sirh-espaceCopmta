import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { generateLeaveReport, calculateTeamLeaveStats } from '../../services/leaveCalculationService';

// Async thunks
export const calculateUserLeave = createAsyncThunk(
  'leave/calculateUserLeave',
  async ({ userId, absenceRequests, users }, { rejectWithValue }) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      
      const report = generateLeaveReport(user, absenceRequests);
      return { userId, report };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const calculateTeamLeave = createAsyncThunk(
  'leave/calculateTeamLeave',
  async ({ users, absenceRequests }, { rejectWithValue }) => {
    try {
      const reports = users.map(user => generateLeaveReport(user, absenceRequests))
        .filter(Boolean);
      
      const teamStats = calculateTeamLeaveStats(users, absenceRequests);
      
      return { reports, teamStats };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const validateLeaveRequest = createAsyncThunk(
  'leave/validateLeaveRequest',
  async ({ employee, absenceRequests, startDate, endDate }, { rejectWithValue }) => {
    try {
      const { validateLeaveRequest } = require('../../services/leaveCalculationService');
      const validation = validateLeaveRequest(employee, absenceRequests, startDate, endDate);
      
      return {
        employeeId: employee.id,
        validation,
        requestDetails: {
          startDate,
          endDate,
          employeeName: `${employee.name} ${employee.prenom}`
        }
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  // Calculs individuels
  userReports: {}, // { userId: report }
  
  // Calculs d'équipe
  teamReports: [],
  teamStats: null,
  
  // Validations
  lastValidation: null,
  
  // États de chargement
  status: 'idle', // idle | loading | succeeded | failed
  teamStatus: 'idle',
  validationStatus: 'idle',
  
  // Erreurs
  error: null,
  teamError: null,
  validationError: null,
  
  // Cache et performances
  lastCalculationTimestamp: null,
  cacheExpiry: 5 * 60 * 1000 // 5 minutes en millisecondes
};

const leaveSlice = createSlice({
  name: 'leave',
  initialState,
  reducers: {
    clearUserReport: (state, action) => {
      const { userId } = action.payload;
      delete state.userReports[userId];
    },
    
    clearTeamReports: (state) => {
      state.teamReports = [];
      state.teamStats = null;
    },
    
    clearValidation: (state) => {
      state.lastValidation = null;
      state.validationError = null;
      state.validationStatus = 'idle';
    },
    
    clearAllData: (state) => {
      state.userReports = {};
      state.teamReports = [];
      state.teamStats = null;
      state.lastValidation = null;
      state.error = null;
      state.teamError = null;
      state.validationError = null;
      state.status = 'idle';
      state.teamStatus = 'idle';
      state.validationStatus = 'idle';
    },
    
    updateCacheTimestamp: (state) => {
      state.lastCalculationTimestamp = Date.now();
    },
    
    // Action pour mise à jour en temps réel quand une demande change
    invalidateUserCache: (state, action) => {
      const { userId } = action.payload;
      if (userId && state.userReports[userId]) {
        delete state.userReports[userId];
      }
      // Invalider aussi le cache d'équipe
      state.teamReports = [];
      state.teamStats = null;
      state.teamStatus = 'idle';
    },
    
    // Setter pour données pré-calculées (optimisation)
    setUserReport: (state, action) => {
      const { userId, report } = action.payload;
      state.userReports[userId] = report;
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Calculate user leave
      .addCase(calculateUserLeave.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(calculateUserLeave.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { userId, report } = action.payload;
        state.userReports[userId] = report;
        state.lastCalculationTimestamp = Date.now();
      })
      .addCase(calculateUserLeave.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Calculate team leave
      .addCase(calculateTeamLeave.pending, (state) => {
        state.teamStatus = 'loading';
        state.teamError = null;
      })
      .addCase(calculateTeamLeave.fulfilled, (state, action) => {
        state.teamStatus = 'succeeded';
        const { reports, teamStats } = action.payload;
        state.teamReports = reports;
        state.teamStats = teamStats;
        
        // Mettre à jour aussi les rapports individuels
        reports.forEach(report => {
          state.userReports[report.employee.id] = report;
        });
        
        state.lastCalculationTimestamp = Date.now();
      })
      .addCase(calculateTeamLeave.rejected, (state, action) => {
        state.teamStatus = 'failed';
        state.teamError = action.payload;
      })
      
      // Validate leave request
      .addCase(validateLeaveRequest.pending, (state) => {
        state.validationStatus = 'loading';
        state.validationError = null;
      })
      .addCase(validateLeaveRequest.fulfilled, (state, action) => {
        state.validationStatus = 'succeeded';
        state.lastValidation = action.payload;
      })
      .addCase(validateLeaveRequest.rejected, (state, action) => {
        state.validationStatus = 'failed';
        state.validationError = action.payload;
      });
  }
});

// Actions
export const {
  clearUserReport,
  clearTeamReports,
  clearValidation,
  clearAllData,
  updateCacheTimestamp,
  invalidateUserCache,
  setUserReport
} = leaveSlice.actions;

// Selectors
export const selectUserReport = (state, userId) => state.leave.userReports[userId];
export const selectTeamReports = (state) => state.leave.teamReports;
export const selectTeamStats = (state) => state.leave.teamStats;
export const selectLastValidation = (state) => state.leave.lastValidation;
export const selectLeaveStatus = (state) => state.leave.status;
export const selectTeamStatus = (state) => state.leave.teamStatus;
export const selectValidationStatus = (state) => state.leave.validationStatus;
export const selectLeaveErrors = (state) => ({
  general: state.leave.error,
  team: state.leave.teamError,
  validation: state.leave.validationError
});

// Selector pour vérifier si le cache est valide
export const selectIsCacheValid = (state) => {
  if (!state.leave.lastCalculationTimestamp) return false;
  return (Date.now() - state.leave.lastCalculationTimestamp) < state.leave.cacheExpiry;
};

// Selector complexe pour obtenir un rapport utilisateur avec cache
export const selectUserReportWithCache = (state, userId) => {
  const report = state.leave.userReports[userId];
  const isCacheValid = selectIsCacheValid(state);
  
  return {
    report,
    isValid: !!report && isCacheValid,
    needsRefresh: !report || !isCacheValid
  };
};

// Selector pour les alertes importantes
export const selectLeaveAlerts = (state) => {
  const teamReports = state.leave.teamReports;
  if (!teamReports.length) return [];
  
  const alerts = [];
  
  // Employés avec quota dépassé
  const overusedEmployees = teamReports.filter(report => report.status.isOverused);
  if (overusedEmployees.length > 0) {
    alerts.push({
      type: 'danger',
      message: `${overusedEmployees.length} employé(s) ont dépassé leur quota de congés`,
      employees: overusedEmployees.map(r => r.employee.name),
      count: overusedEmployees.length
    });
  }
  
  // Employés avec forte utilisation
  const highUsageEmployees = teamReports.filter(report => 
    report.status.warningLevel === 'high' && !report.status.isOverused
  );
  if (highUsageEmployees.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${highUsageEmployees.length} employé(s) ont une forte utilisation de congés (>80%)`,
      employees: highUsageEmployees.map(r => r.employee.name),
      count: highUsageEmployees.length
    });
  }
  
  // Employés avec peu de congés restants
  const lowRemainingEmployees = teamReports.filter(report => 
    report.leave.remainingLeave < 2 && report.leave.remainingLeave > 0
  );
  if (lowRemainingEmployees.length > 0) {
    alerts.push({
      type: 'info',
      message: `${lowRemainingEmployees.length} employé(s) ont moins de 2 jours de congés restants`,
      employees: lowRemainingEmployees.map(r => r.employee.name),
      count: lowRemainingEmployees.length
    });
  }
  
  return alerts;
};

export default leaveSlice.reducer;

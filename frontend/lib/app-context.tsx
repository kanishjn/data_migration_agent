'use client';

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Incident, Signal, AgentLoop, SystemHealth } from '@/types';
import { useApiContext } from './api-context';

interface AppState {
  incidents: Incident[];
  selectedIncident: Incident | null;
  agentLoop: AgentLoop;
  systemHealth: SystemHealth;
  sidebarCollapsed: boolean;
  isLoading: boolean;
}

type AppAction =
  | { type: 'SET_INCIDENTS'; payload: Incident[] }
  | { type: 'SELECT_INCIDENT'; payload: Incident | null }
  | { type: 'UPDATE_AGENT_LOOP'; payload: Partial<AgentLoop> }
  | { type: 'UPDATE_SYSTEM_HEALTH'; payload: SystemHealth }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_SIGNAL'; payload: { incidentId: string; signal: Signal } };

const initialState: AppState = {
  incidents: [],
  selectedIncident: null,
  agentLoop: {
    currentState: 'idle',
    lastStateChange: new Date().toISOString(),
    observationsCount: 0,
    reasoningCycles: 0,
    decisionsToday: 0,
    actionsToday: 0,
    autoHealRate: 0,
    pendingApprovals: 0,
  },
  systemHealth: {
  overall: 'degraded',
  apiHealth: 100,
  webhookHealth: 100,
  checkoutFailureRate: 0,
  migrationProgress: 0,
  activeIncidents: 0,
  affectedMerchants: 0,
  currentMigrationPhase: 'mid_migration',
  resolvedToday: 0,
  },
  sidebarCollapsed: false,
  isLoading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_INCIDENTS':
      return { ...state, incidents: action.payload };
    case 'SELECT_INCIDENT':
      return { ...state, selectedIncident: action.payload };
    case 'UPDATE_AGENT_LOOP':
      return { ...state, agentLoop: { ...state.agentLoop, ...action.payload } };
    case 'UPDATE_SYSTEM_HEALTH':
      return { ...state, systemHealth: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'ADD_SIGNAL': {
      const incidents = state.incidents.map((inc) =>
        inc.id === action.payload.incidentId
          ? { ...inc, signals: [...inc.signals, action.payload.signal] }
          : inc
      );
      return { ...state, incidents };
    }
    default:
      return state;
  }
}

interface AppContextValue extends AppState {
  dispatch: React.Dispatch<AppAction>;
  selectIncident: (incident: Incident | null) => void;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const apiCtx = useApiContext();
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    if (apiCtx.useApi) {
      dispatch({ type: 'SET_INCIDENTS', payload: apiCtx.incidents });
      dispatch({ type: 'UPDATE_AGENT_LOOP', payload: apiCtx.agentLoop });
      dispatch({ type: 'UPDATE_SYSTEM_HEALTH', payload: apiCtx.systemHealth });
    }
    dispatch({ type: 'SET_LOADING', payload: apiCtx.loading });
  }, [apiCtx.useApi, apiCtx.incidents, apiCtx.agentLoop, apiCtx.systemHealth, apiCtx.loading]);

  const selectIncident = useCallback((incident: Incident | null) => {
    dispatch({ type: 'SELECT_INCIDENT', payload: incident });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  return (
    <AppContext.Provider value={{ ...state, dispatch, selectIncident, toggleSidebar }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

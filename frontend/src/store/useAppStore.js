import { create } from 'zustand';

// --- Anti-CSRF Cookie Extraction Helper ---
const getCsrfToken = () => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)kneeaxis_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

// --- Auth Store (HttpOnly Cookie-backed, zero localStorage token storage) ---

const getStoredAuth = () => {
  if (typeof window === 'undefined') return { user: null, isAuthenticated: false };
  try {
    const userStr = localStorage.getItem('kneeaxis_user') || localStorage.getItem('clinical_atlas_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { user, isAuthenticated: Boolean(user) };
  } catch {
    return { user: null, isAuthenticated: false };
  }
};

const initialAuth = getStoredAuth();

export const useAuthStore = create((set, get) => ({
  isAuthenticated: initialAuth.isAuthenticated,
  user: initialAuth.user,
  token: null, // Tokens stored in secure HttpOnly cookies, not exposed to browser JS
  isLoading: false,
  error: null,

  /**
   * Authenticate user against PostgreSQL database
   */
  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true, error: null });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Automatically stores HttpOnly session cookie
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const { user, token } = data.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('kneeaxis_user', JSON.stringify(user));
          if (token) {
            localStorage.setItem('kneeaxis_token', token);
            localStorage.setItem('clinical_atlas_token', token);
          }
        }
        set({ isAuthenticated: true, user, token: token || null, isLoading: false, error: null });
        return { success: true, user };
      } else {
        const errMsg = data.message || data.error || 'Invalid email or password.';
        set({ isLoading: false, error: errMsg });
        return { success: false, error: errMsg };
      }
    } catch (err) {
      const errMsg = 'Unable to connect to the authentication service. Please check your network or server.';
      set({ isLoading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  /**
   * Register new account in PostgreSQL database
   */
  register: async ({ email, password, fullName, role = 'researcher', department }) => {
    set({ isLoading: true, error: null });

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, fullName, role, department }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const { user, token } = data.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('kneeaxis_user', JSON.stringify(user));
          if (token) {
            localStorage.setItem('kneeaxis_token', token);
            localStorage.setItem('clinical_atlas_token', token);
          }
        }
        set({ isAuthenticated: true, user, token: token || null, isLoading: false, error: null });
        return { success: true, user };
      } else {
        const errMsg = data.message || data.error || 'Registration failed. Please check your inputs.';
        set({ isLoading: false, error: errMsg });
        return { success: false, error: errMsg };
      }
    } catch (err) {
      const errMsg = 'Network error while attempting registration. Please try again.';
      set({ isLoading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  /**
   * Check and verify current session against PostgreSQL via HttpOnly cookie
   */
  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.user) {
          const freshUser = data.data.user;
          if (typeof window !== 'undefined') {
            localStorage.setItem('kneeaxis_user', JSON.stringify(freshUser));
          }
          set({ user: freshUser, isAuthenticated: true });
        }
      } else if (res.status === 401 || res.status === 403) {
        // Session expired or revoked
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kneeaxis_user');
          localStorage.removeItem('clinical_atlas_user');
          localStorage.removeItem('kneeaxis_token');
          localStorage.removeItem('clinical_atlas_token');
        }
        set({ isAuthenticated: false, user: null, token: null });
      }
    } catch {
      // Keep cached state if transient network issue
    }
  },

  /**
   * Update local user state after profile edit
   */
  setUser: (updatedUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kneeaxis_user', JSON.stringify(updatedUser));
    }
    set({ user: updatedUser });
  },

  /**
   * Terminate active session locally and on PostgreSQL
   */
  logout: async () => {
    try {
      const csrf = getCsrfToken();
      const headers = { 'Content-Type': 'application/json' };
      if (csrf) headers['X-CSRF-Token'] = csrf;

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      }).catch(() => {});
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem('kneeaxis_user');
      localStorage.removeItem('clinical_atlas_user');
      localStorage.removeItem('kneeaxis_token');
      localStorage.removeItem('clinical_atlas_token');
    }
    set({ isAuthenticated: false, user: null, token: null, error: null, isLoading: false });
  },
}));

// Automatically verify session integrity on client load via HttpOnly cookie
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useAuthStore.getState().checkAuth();
  }, 50);
}

// --- Patient Store ---

export const usePatientStore = create((set) => ({
  selectedPatientId: null,
  setSelectedPatient: (id) => set({ selectedPatientId: id }),
}));

// --- Viewer Store ---

const defaultViewerSettings = {
  activeView: '3d', // '3d' | 'axial' | 'coronal' | 'sagittal'
  colorMap: 'bone', // 'bone' | 'grayscale' | 'rainbow' | 'hot'
  windowLevel: { center: 300, width: 1500 },
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  activeTool: 'pointer',
  crosshairEnabled: true,
  opacity: {
    femur: 1.0,
    tibia: 1.0,
    patella: 0.8,
    cartilage: 0.7,
    implants: 1.0,
  },
  visibility: {
    femur: true,
    tibia: true,
    patella: true,
    cartilage: true,
    implants: true,
    axes: true,
    jointLine: true,
    resectionPlanes: true,
  },
  measurements: [],
  sliceIndices: { axial: 100, coronal: 100, sagittal: 100 },
};

export const useViewerStore = create((set) => ({
  // Flat properties for Reconstruction & KneeViewer
  opacity: 0.9,
  wireframe: false,
  showFemur: true,
  showTibia: true,
  showPatella: true,
  showMechanicalAxis: false,
  showTEA: false,
  showJointLine: false,
  selectedBone: null,
  cameraPreset: null,

  setOpacity: (layerOrVal, maybeVal) =>
    set((state) => {
      if (typeof layerOrVal === 'number') {
        return { opacity: layerOrVal };
      }
      return {
        settings: {
          ...state.settings,
          opacity: { ...state.settings.opacity, [layerOrVal]: maybeVal },
        },
      };
    }),
  setWireframe: (wireframe) => set({ wireframe }),
  setShowFemur: (showFemur) => set({ showFemur }),
  setShowTibia: (showTibia) => set({ showTibia }),
  setShowPatella: (showPatella) => set({ showPatella }),
  setShowMechanicalAxis: (showMechanicalAxis) => set({ showMechanicalAxis }),
  setShowTEA: (showTEA) => set({ showTEA }),
  setShowJointLine: (showJointLine) => set({ showJointLine }),
  setSelectedBone: (selectedBone) => set({ selectedBone }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  resetViewer: () =>
    set({
      opacity: 0.9,
      wireframe: false,
      showFemur: true,
      showTibia: true,
      showPatella: true,
      showMechanicalAxis: false,
      showTEA: false,
      showJointLine: false,
      selectedBone: null,
      cameraPreset: 'anterior',
    }),

  // Legacy settings object
  settings: defaultViewerSettings,
  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),
  toggleVisibility: (layer) =>
    set((state) => ({
      settings: {
        ...state.settings,
        visibility: {
          ...state.settings.visibility,
          [layer]: !state.settings.visibility[layer],
        },
      },
    })),
  setSliceIndex: (plane, index) =>
    set((state) => ({
      settings: {
        ...state.settings,
        sliceIndices: { ...state.settings.sliceIndices, [plane]: index },
      },
    })),
  resetView: () =>
    set((state) => ({
      settings: { ...state.settings, zoom: 1.0, pan: { x: 0, y: 0 } },
    })),
}));

// --- Sidebar Store (YouTube-style Click-to-Toggle Desktop + Mobile Drawer) ---
const getStoredCollapsed = () => {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem('kneeaxis_sidebar_collapsed');
    return val !== null ? JSON.parse(val) : false; // default expanded or false
  } catch {
    return false;
  }
};

export const useSidebarStore = create((set, get) => ({
  collapsed: getStoredCollapsed(),
  mobileOpen: false,

  toggle: () => {
    // If on mobile viewport (< 768px), toggle mobile drawer
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      set((state) => ({ mobileOpen: !state.mobileOpen }));
      return;
    }
    // Desktop: toggle collapsed state and persist
    set((state) => {
      const next = !state.collapsed;
      if (typeof window !== 'undefined') {
        localStorage.setItem('kneeaxis_sidebar_collapsed', JSON.stringify(next));
      }
      return { collapsed: next };
    });
  },

  setCollapsed: (val) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kneeaxis_sidebar_collapsed', JSON.stringify(val));
    }
    set({ collapsed: val });
  },

  toggleMobile: () => set((state) => ({ mobileOpen: !state.mobileOpen })),
  closeMobile: () => set({ mobileOpen: false }),
  openMobile: () => set({ mobileOpen: true }),
}));

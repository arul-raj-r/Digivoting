import { create } from 'zustand';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'VOTER';
  first_name: string;
  last_name: string;
  phone_number?: string;
  full_name: string;
  is_voter: boolean;
  is_admin: boolean;
}

export interface VoterIDCard {
  card_number: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  constituency_name: string;
  photo_url: string | null;
  qr_code_data?: string | null;
  status: string;
  issued_date?: string | null;
}

export interface VoterProfile {
  voter_id_number: string;
  is_verified: boolean;
  constituency_name: string;
  constituency_id: string;
  face_photo_url?: string;
  voter_id_card?: VoterIDCard | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  voterProfile: VoterProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (token: string, refreshToken: string, user: UserProfile, voterProfile: VoterProfile | null) => void;
  logout: () => void;
  updateVoterProfile: (profile: Partial<VoterProfile>) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  voterProfile: null,
  isAuthenticated: false,
  isLoading: true,

  login: (token, refreshToken, user, voterProfile) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    if (voterProfile) {
      localStorage.setItem('voterProfile', JSON.stringify(voterProfile));
    } else {
      localStorage.removeItem('voterProfile');
    }
    
    set({
      token,
      refreshToken,
      user,
      voterProfile,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('voterProfile');
    
    set({
      token: null,
      refreshToken: null,
      user: null,
      voterProfile: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateVoterProfile: (profile) => {
    set((state) => {
      const updatedProfile = state.voterProfile 
        ? { ...state.voterProfile, ...profile } 
        : null;
        
      if (updatedProfile) {
        localStorage.setItem('voterProfile', JSON.stringify(updatedProfile));
      }
      return { voterProfile: updatedProfile };
    });
  },

  initialize: () => {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');
    const voterProfileStr = localStorage.getItem('voterProfile');

    if (token && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr) as UserProfile;
        const voterProfile = voterProfileStr ? JSON.parse(voterProfileStr) as VoterProfile : null;
        
        set({
          token,
          refreshToken,
          user,
          voterProfile,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (e) {
        // Corrupted localStorage data, clear it
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('voterProfile');
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  }
}));

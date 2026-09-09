// Unified Reactive In-Memory & Session-Backed Mock Store
import { useState, useEffect } from 'react';
import { initialElections } from './elections';
import { initialCandidates } from './candidates';
import { initialVoters } from './voters';
import { initialAuditLogs } from './auditLogs';
import { initialResults } from './results';

const STORAGE_KEY = 'digivote_mock_store_v1';

// Load or initialize state
function loadState() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not read mock state from sessionStorage', e);
  }

  return {
    activeRole: 'VOTER', // 'VOTER' | 'ELECTION_CREATOR'
    simulatedState: 'default', // 'default' | 'loading' | 'success' | 'error' | 'empty' | 'disabled'
    elections: [...initialElections],
    candidates: { ...initialCandidates },
    voters: { ...initialVoters },
    auditLogs: { ...initialAuditLogs },
    results: { ...initialResults },
    currentUser: {
      id: 'usr-voter-001',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@gov.in',
      mobile: '+91 98765 43210',
      is_verified: true,
      email_verified: true,
      role: 'VOTER',
      date_joined: '2026-01-15T10:00:00Z',
      active_session: {
        device: 'Chrome 128 on Windows 11 (Desktop)',
        ip_address: '103.21.144.12',
        location: 'New Delhi, India',
        last_active: 'Just now',
        is_current: true
      }
    }
  };
}

let store = loadState();
const listeners = new Set();

function notify() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Could not write mock state to sessionStorage', e);
  }
  listeners.forEach(listener => listener());
}

export const mockStore = {
  getSnapshot() {
    return store;
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Role Switcher (Dev-only)
  setActiveRole(role) {
    store = {
      ...store,
      activeRole: role,
      currentUser: {
        ...store.currentUser,
        role: role,
        name: role === 'ELECTION_CREATOR' ? 'Dr. Priya Nambiar (Returning Officer)' : 'Aarav Sharma',
        email: role === 'ELECTION_CREATOR' ? 'priya.nambiar@eci.gov.in' : 'aarav.sharma@gov.in'
      }
    };
    notify();
  },

  // 5-State Simulator (Dev-only)
  setSimulatedState(state) {
    store = { ...store, simulatedState: state };
    notify();
  },

  resetToInitial() {
    sessionStorage.removeItem(STORAGE_KEY);
    store = {
      activeRole: 'VOTER',
      simulatedState: 'default',
      elections: [...initialElections],
      candidates: { ...initialCandidates },
      voters: { ...initialVoters },
      auditLogs: { ...initialAuditLogs },
      results: { ...initialResults },
      currentUser: {
        id: 'usr-voter-001',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@gov.in',
        mobile: '+91 98765 43210',
        is_verified: true,
        email_verified: true,
        role: 'VOTER',
        date_joined: '2026-01-15T10:00:00Z',
        active_session: {
          device: 'Chrome 128 on Windows 11 (Desktop)',
          ip_address: '103.21.144.12',
          location: 'New Delhi, India',
          last_active: 'Just now',
          is_current: true
        }
      }
    };
    notify();
  },

  // Elections
  getElections() {
    return store.elections;
  },

  getElection(id) {
    return store.elections.find(e => e.id === id);
  },

  createElection(data) {
    const id = 'elec-' + Date.now().toString(36);
    const newElection = {
      id,
      title: data.title,
      description: data.description || '',
      election_type: data.election_type || 'general',
      status: 'draft',
      is_locked: false,
      start_datetime: null,
      end_datetime: null,
      actual_start_at: null,
      require_email_otp: true,
      require_webcam_verification: false,
      require_biometric_verification: false,
      results_visibility: 'manual',
      results_visible_at: null,
      allow_vote_change: false,
      created_at: new Date().toISOString(),
      total_eligible_voters: 0,
      voters_participated: 0,
      already_voted: false
    };

    const newLogs = [
      {
        id: 'log-' + Date.now(),
        actor: store.currentUser.email,
        action: 'Election Draft Created',
        details: `Election created in draft state: "${data.title}"`,
        timestamp: new Date().toISOString(),
        severity: 'INFO'
      }
    ];

    store = {
      ...store,
      elections: [newElection, ...store.elections],
      candidates: { ...store.candidates, [id]: [] },
      voters: { ...store.voters, [id]: [] },
      auditLogs: { ...store.auditLogs, [id]: newLogs }
    };
    notify();
    return newElection;
  },

  updateElection(id, updates) {
    const election = store.elections.find(e => e.id === id);
    if (!election) return null;

    const updated = { ...election, ...updates };

    // Record audit log
    const currentLogs = store.auditLogs[id] || [];
    const newLog = {
      id: 'log-' + Date.now(),
      actor: store.currentUser.email,
      action: 'Election Settings Modified',
      details: `Updated attributes: ${Object.keys(updates).join(', ')}`,
      timestamp: new Date().toISOString(),
      severity: 'INFO'
    };

    store = {
      ...store,
      elections: store.elections.map(e => e.id === id ? updated : e),
      auditLogs: {
        ...store.auditLogs,
        [id]: [newLog, ...currentLogs]
      }
    };
    notify();
    return updated;
  },

  deleteElection(id) {
    const election = store.elections.find(e => e.id === id);
    if (!election || election.is_locked) return false;

    const nextElections = store.elections.filter(e => e.id !== id);
    const nextCandidates = { ...store.candidates };
    delete nextCandidates[id];
    const nextVoters = { ...store.voters };
    delete nextVoters[id];
    const nextAuditLogs = { ...store.auditLogs };
    delete nextAuditLogs[id];

    store = {
      ...store,
      elections: nextElections,
      candidates: nextCandidates,
      voters: nextVoters,
      auditLogs: nextAuditLogs
    };
    notify();
    return true;
  },

  // Candidates
  getCandidates(electionId) {
    return store.candidates[electionId] || [];
  },

  addCandidate(electionId, candidate) {
    const current = store.candidates[electionId] || [];
    const newCand = {
      id: 'cand-' + Date.now().toString(36),
      name: candidate.name,
      party: candidate.party || 'Independent',
      bio: candidate.bio || '',
      photo_url: candidate.photo_url || null,
      order: current.length + 1
    };

    const updated = [...current, newCand];
    const updatedElection = store.elections.find(e => e.id === electionId);
    let nextStatus = updatedElection?.status;
    if (nextStatus === 'draft' && updated.length >= 2) {
      nextStatus = 'configured';
    }

    const currentLogs = store.auditLogs[electionId] || [];
    const newLog = {
      id: 'log-' + Date.now(),
      actor: store.currentUser.email,
      action: 'Candidate Added',
      details: `Added candidate "${newCand.name}" (${newCand.party})`,
      timestamp: new Date().toISOString(),
      severity: 'INFO'
    };

    store = {
      ...store,
      candidates: { ...store.candidates, [electionId]: updated },
      elections: store.elections.map(e => e.id === electionId ? { ...e, status: nextStatus } : e),
      auditLogs: { ...store.auditLogs, [electionId]: [newLog, ...currentLogs] }
    };
    notify();
    return newCand;
  },

  updateCandidate(electionId, candidateId, updates) {
    const current = store.candidates[electionId] || [];
    const updated = current.map(c => c.id === candidateId ? { ...c, ...updates } : c);

    store = {
      ...store,
      candidates: { ...store.candidates, [electionId]: updated }
    };
    notify();
    return true;
  },

  deleteCandidate(electionId, candidateId) {
    const current = store.candidates[electionId] || [];
    const updated = current.filter(c => c.id !== candidateId).map((c, i) => ({ ...c, order: i + 1 }));

    store = {
      ...store,
      candidates: { ...store.candidates, [electionId]: updated }
    };
    notify();
    return true;
  },

  reorderCandidates(electionId, candidateIds) {
    const current = store.candidates[electionId] || [];
    const map = new Map(current.map(c => [c.id, c]));
    const updated = candidateIds.map((id, index) => ({
      ...map.get(id),
      order: index + 1
    }));

    store = {
      ...store,
      candidates: { ...store.candidates, [electionId]: updated }
    };
    notify();
    return updated;
  },

  // Voters
  getVoters(electionId) {
    return store.voters[electionId] || [];
  },

  addVoter(electionId, voter) {
    const current = store.voters[electionId] || [];
    // Check duplicate email
    if (current.some(v => v.email.toLowerCase() === voter.email.toLowerCase())) {
      throw new Error('A voter with this email address already exists on this roll.');
    }

    const newVoter = {
      id: 'vtr-' + Date.now().toString(36),
      name: voter.name,
      email: voter.email.toLowerCase(),
      status: 'active',
      has_voted: false,
      citizen_account_linked: false,
      registered_at: new Date().toISOString()
    };

    const updated = [...current, newVoter];
    const election = store.elections.find(e => e.id === electionId);

    store = {
      ...store,
      voters: { ...store.voters, [electionId]: updated },
      elections: store.elections.map(e => e.id === electionId ? { ...e, total_eligible_voters: updated.length } : e)
    };
    notify();
    return newVoter;
  },

  bulkAddVoters(electionId, rawRows) {
    const current = store.voters[electionId] || [];
    const existingEmails = new Set(current.map(v => v.email.toLowerCase()));

    let added = 0;
    let skipped = 0;
    let failed = 0;
    const failures = [];
    const toAdd = [];

    rawRows.forEach((row, index) => {
      const lineNum = index + 1;
      const name = (row.name || row.Name || '').trim();
      const email = (row.email || row.Email || '').trim().toLowerCase();

      if (!email || !email.includes('@')) {
        failed++;
        failures.push({ line: lineNum, reason: 'Invalid or missing email address', email });
        return;
      }

      if (existingEmails.has(email)) {
        skipped++;
        return;
      }

      existingEmails.add(email);
      added++;
      toAdd.push({
        id: 'vtr-' + Date.now().toString(36) + '-' + added,
        name: name || email.split('@')[0],
        email: email,
        status: 'active',
        has_voted: false,
        citizen_account_linked: false,
        registered_at: new Date().toISOString()
      });
    });

    const updated = [...current, ...toAdd];
    store = {
      ...store,
      voters: { ...store.voters, [electionId]: updated },
      elections: store.elections.map(e => e.id === electionId ? { ...e, total_eligible_voters: updated.length } : e)
    };
    notify();

    return { added, skipped, failed, failures };
  },

  deleteVoter(electionId, voterId) {
    const current = store.voters[electionId] || [];
    const updated = current.filter(v => v.id !== voterId);
    store = {
      ...store,
      voters: { ...store.voters, [electionId]: updated },
      elections: store.elections.map(e => e.id === electionId ? { ...e, total_eligible_voters: updated.length } : e)
    };
    notify();
    return true;
  },

  // Lifecycle Operations
  startElection(electionId) {
    const election = store.elections.find(e => e.id === electionId);
    if (!election) return null;

    const currentLogs = store.auditLogs[electionId] || [];
    const newLog = {
      id: 'log-' + Date.now(),
      actor: store.currentUser.email,
      action: 'Election Transitioned to ACTIVE',
      details: 'Ballots opened for voting. All configurations permanently locked.',
      timestamp: new Date().toISOString(),
      severity: 'WARNING'
    };

    const updated = {
      ...election,
      status: 'active',
      is_locked: true,
      actual_start_at: new Date().toISOString()
    };

    store = {
      ...store,
      elections: store.elections.map(e => e.id === electionId ? updated : e),
      auditLogs: { ...store.auditLogs, [electionId]: [newLog, ...currentLogs] }
    };
    notify();
    return updated;
  },

  stopElection(electionId, reason) {
    const election = store.elections.find(e => e.id === electionId);
    if (!election) return null;

    const currentLogs = store.auditLogs[electionId] || [];
    const newLog = {
      id: 'log-' + Date.now(),
      actor: store.currentUser.email,
      action: 'EMERGENCY STOP EXECUTED',
      details: `Terminated by Returning Officer. Stated reason: ${reason}`,
      timestamp: new Date().toISOString(),
      severity: 'DANGER'
    };

    const updated = {
      ...election,
      status: 'cancelled',
      is_locked: true,
      stopped_at: new Date().toISOString(),
      stop_reason: reason
    };

    store = {
      ...store,
      elections: store.elections.map(e => e.id === electionId ? updated : e),
      auditLogs: { ...store.auditLogs, [electionId]: [newLog, ...currentLogs] }
    };
    notify();
    return updated;
  },

  publishResults(electionId) {
    const election = store.elections.find(e => e.id === electionId);
    if (!election) return null;

    const currentLogs = store.auditLogs[electionId] || [];
    const newLog = {
      id: 'log-' + Date.now(),
      actor: store.currentUser.email,
      action: 'Results Published',
      details: 'Certified results made public to all eligible citizens.',
      timestamp: new Date().toISOString(),
      severity: 'SUCCESS'
    };

    // Mark results published
    let currentResult = store.results[electionId];
    if (!currentResult) {
      // Auto-generate if missing
      const candidates = store.candidates[electionId] || [];
      currentResult = {
        election_id: electionId,
        title: election.title,
        total_eligible: election.total_eligible_voters || 100,
        total_votes_cast: election.voters_participated || 65,
        turnout_percentage: Math.round(((election.voters_participated || 65) / (election.total_eligible_voters || 100)) * 100),
        is_published: true,
        published_at: new Date().toISOString(),
        is_tied: false,
        small_electorate: (election.voters_participated || 65) < 10,
        winner: candidates[0] ? {
          candidate_id: candidates[0].id,
          name: candidates[0].name,
          party: candidates[0].party,
          votes: 40,
          percentage: 61.5
        } : null,
        candidates: candidates.map((c, i) => ({
          candidate_id: c.id,
          name: c.name,
          party: c.party,
          votes: i === 0 ? 40 : 25,
          percentage: i === 0 ? 61.5 : 38.5,
          is_winner: i === 0
        }))
      };
    } else {
      currentResult = {
        ...currentResult,
        is_published: true,
        published_at: new Date().toISOString()
      };
    }

    const updatedElection = {
      ...election,
      status: 'completed',
      is_published: true
    };

    store = {
      ...store,
      elections: store.elections.map(e => e.id === electionId ? updatedElection : e),
      results: { ...store.results, [electionId]: currentResult },
      auditLogs: { ...store.auditLogs, [electionId]: [newLog, ...currentLogs] }
    };
    notify();
    return currentResult;
  },

  // Voter Submitting Ballot
  recordVote(electionId, candidateId) {
    const election = store.elections.find(e => e.id === electionId);
    if (!election) throw new Error('Election not found');

    if (election.already_voted) {
      throw new Error('You have already submitted your ballot for this election.');
    }

    const updatedElection = {
      ...election,
      voters_participated: (election.voters_participated || 0) + 1,
      already_voted: true
    };

    // Update account log
    const newAccountLog = {
      id: 'log-acc-' + Date.now(),
      event: 'Ballot Submitted',
      details: `Encrypted ballot recorded for ${election.title}`,
      ip_address: store.currentUser.active_session.ip_address,
      timestamp: new Date().toISOString(),
      category: 'VOTING'
    };

    // Update election audit log (without revealing candidate!)
    const currentElectionLogs = store.auditLogs[electionId] || [];
    const newElectionLog = {
      id: 'log-' + Date.now(),
      actor: 'citizen@electorate',
      action: 'Ballot Recorded',
      details: 'Anonymous encrypted vote recorded into ballot store.',
      timestamp: new Date().toISOString(),
      severity: 'INFO'
    };

    store = {
      ...store,
      elections: store.elections.map(e => e.id === electionId ? updatedElection : e),
      auditLogs: {
        ...store.auditLogs,
        voterAccountLogs: [newAccountLog, ...(store.auditLogs.voterAccountLogs || [])],
        [electionId]: [newElectionLog, ...currentElectionLogs]
      }
    };
    notify();
    return true;
  },

  getResults(electionId) {
    return store.results[electionId] || null;
  },

  getAuditLogs(electionId) {
    return store.auditLogs[electionId] || [];
  },

  getVoterAccountLogs() {
    return store.auditLogs.voterAccountLogs || [];
  }
};

// React hook for consuming mockStore
export function useMockStore(selector) {
  const [state, setState] = useState(() => selector ? selector(mockStore.getSnapshot()) : mockStore.getSnapshot());

  useEffect(() => {
    return mockStore.subscribe(() => {
      const snap = mockStore.getSnapshot();
      setState(selector ? selector(snap) : snap);
    });
  }, [selector]);

  return state;
}

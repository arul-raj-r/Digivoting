import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  Users, 
  Calendar, 
  UserCheck, 
  PlusCircle, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2, 
  Settings, 
  Landmark, 
  AlertCircle 
} from 'lucide-react';

interface Voter {
  id: string;
  user: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  };
  voter_id_number: string;
  constituency_name: string;
  is_verified: boolean;
  face_photo_url: string | null;
  date_of_birth?: string;
  gender?: string;
  voter_id_card?: {
    card_number: string;
    full_name: string;
    date_of_birth: string | null;
    gender: string | null;
    constituency_name: string;
    photo_url: string | null;
    qr_code_data: string | null;
    status: 'ACTIVE' | 'SUSPENDED';
  } | null;
}

interface Election {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
}

interface Candidate {
  id: string;
  name: string;
  party_name: string;
  election_title: string;
  constituency_name: string;
  is_approved: boolean;
}

interface AuditLog {
  id: string;
  username: string;
  action: string;
  ip_address: string;
  timestamp: string;
  details: any;
}

interface Constituency {
  id: string;
  name: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'VOTERS' | 'ELECTIONS' | 'CANDIDATES' | 'AUDIT'>('VOTERS');
  
  // Data lists
  const [pendingVoters, setPendingVoters] = useState<Voter[]>([]);
  const [allVoters, setAllVoters] = useState<Voter[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  
  // Loading & status
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_voters: 0,
    pending_voters: 0,
    active_elections: 0,
    pending_candidates: 0,
  });

  // Election form
  const [elTitle, setElTitle] = useState('');
  const [elDesc, setElDesc] = useState('');
  const [elStart, setElStart] = useState('');
  const [elEnd, setElEnd] = useState('');
  const [elStatus, setElStatus] = useState<'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED'>('DRAFT');

  // Candidate form
  const [candName, setCandName] = useState('');
  const [candParty, setCandParty] = useState('');
  const [candBio, setCandBio] = useState('');
  const [candElectionId, setCandElectionId] = useState('');
  const [candConstituencyId, setCandConstituencyId] = useState('');

  // Fetch admin summary & tabs data
  const fetchSummary = async () => {
    try {
      const summaryRes = await api.get('/elections/admin-summary/');
      setSummary({
        total_voters: summaryRes.data.total_voters,
        pending_voters: summaryRes.data.pending_voters,
        active_elections: summaryRes.data.active_elections,
        pending_candidates: summaryRes.data.pending_candidates,
      });
      setAuditLogs(summaryRes.data.recent_logs);
    } catch (err) {
      console.error('Failed to fetch admin summary:', err);
    }
  };

  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'VOTERS') {
        const votersRes = await api.get('/voters/pending/');
        setPendingVoters(votersRes.data);
        const allRes = await api.get('/voters/all/');
        setAllVoters(allRes.data);
      } else if (activeTab === 'ELECTIONS') {
        const electionsRes = await api.get('/elections/');
        setElections(electionsRes.data);
      } else if (activeTab === 'CANDIDATES') {
        const candsRes = await api.get('/elections/candidates/');
        setCandidates(candsRes.data);
        
        // Fetch dropdown options if they are empty
        if (elections.length === 0) {
          const elRes = await api.get('/elections/');
          setElections(elRes.data);
        }
        if (constituencies.length === 0) {
          const conRes = await api.get('/voters/constituencies/');
          setConstituencies(conRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to load tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchTabData();
  }, [activeTab]);

  // Actions
  const handleVerifyVoter = async (voterId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/voters/${voterId}/verify/`);
      alert('Voter approved successfully and Digital Voter ID Card generated.');
      setPendingVoters(pendingVoters.filter(v => v.id !== voterId));
      fetchSummary();
      fetchTabData();
    } catch (err) {
      alert('Failed to verify voter.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveCandidate = async (candId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/elections/candidates/${candId}/approve/`);
      alert('Candidate approved.');
      setCandidates(candidates.map(c => c.id === candId ? { ...c, is_approved: true } : c));
      fetchSummary();
    } catch (err) {
      alert('Failed to approve candidate.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elTitle || !elStart || !elEnd) {
      alert('Please fill out election title and dates.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        title: elTitle,
        description: elDesc,
        start_date: new Date(elStart).toISOString(),
        end_date: new Date(elEnd).toISOString(),
        status: elStatus
      };
      await api.post('/elections/', payload);
      alert('Election created successfully.');
      
      // Reset form
      setElTitle('');
      setElDesc('');
      setElStart('');
      setElEnd('');
      setElStatus('DRAFT');
      
      // Refresh
      fetchTabData();
      fetchSummary();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create election.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateElectionStatus = async (electionId: string, status: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/elections/${electionId}/`, { status });
      alert('Election status updated.');
      setElections(elections.map(el => el.id === electionId ? { ...el, status: status as any } : el));
      fetchSummary();
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName || !candParty || !candElectionId || !candConstituencyId) {
      alert('All candidate fields are required.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        name: candName,
        party_name: candParty,
        bio: candBio,
        election: candElectionId,
        constituency: candConstituencyId,
        photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(candName)}`,
        party_logo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(candParty)}`
      };
      await api.post('/elections/candidates/', payload);
      alert('Candidate registered successfully. Awaiting approval.');
      
      // Reset form
      setCandName('');
      setCandParty('');
      setCandBio('');
      
      fetchTabData();
      fetchSummary();
    } catch (err) {
      alert('Failed to register candidate.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Title Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm flex items-center gap-3">
        <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-2.5 rounded-lg">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white leading-tight">Administrative Console</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Election system CRUD configurations, credentials review, and security audit log trails.
          </p>
        </div>
      </div>

      {/* Aggregate Indicators */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registered Voters</span>
          <span className="text-2xl font-extrabold text-slate-950 dark:text-white">{summary.total_voters}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Voter Approvals Queue</span>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{summary.pending_voters}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Elections</span>
          <span className="text-2xl font-extrabold text-slate-950 dark:text-white">{summary.active_elections}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <span className="block text-[10px] text-slate-450 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Candidate Approvals Queue</span>
          <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{summary.pending_candidates}</span>
        </div>
      </section>

      {/* Main Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-4 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('VOTERS')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'VOTERS' ? 'border-gov-blue dark:border-gov-gold text-gov-blue dark:text-gov-gold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'}`}
        >
          <Users className="h-4.5 w-4.5" />
          Voter Approvals ({summary.pending_voters})
        </button>
        <button
          onClick={() => setActiveTab('ELECTIONS')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'ELECTIONS' ? 'border-gov-blue dark:border-gov-gold text-gov-blue dark:text-gov-gold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'}`}
        >
          <Calendar className="h-4.5 w-4.5" />
          Elections CRUD
        </button>
        <button
          onClick={() => setActiveTab('CANDIDATES')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'CANDIDATES' ? 'border-gov-blue dark:border-gov-gold text-gov-blue dark:text-gov-gold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'}`}
        >
          <Landmark className="h-4.5 w-4.5" />
          Candidates approvals ({summary.pending_candidates})
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'AUDIT' ? 'border-gov-blue dark:border-gov-gold text-gov-blue dark:text-gov-gold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'}`}
        >
          <ShieldAlert className="h-4.5 w-4.5" />
          Audit Trails
        </button>
      </div>

      {/* Tab Contents */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
        
        {loading && activeTab !== 'AUDIT' ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
          </div>
        ) : (
          <>
            {/* TAB: Voter Approvals */}
            {activeTab === 'VOTERS' && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Pending Voter Approvals</h3>
                  {pendingVoters.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">No pending voter registration applications.</div>
                  ) : (
                    <div className="space-y-4">
                      {pendingVoters.map(v => (
                        <div 
                          key={v.id} 
                          className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                        >
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            {/* Face image thumbnail */}
                            <div className="w-[80px] h-[60px] rounded border border-slate-350 dark:border-slate-850 overflow-hidden shrink-0 bg-slate-950 flex items-center justify-center">
                              {v.face_photo_url ? (
                                <img src={v.face_photo_url} alt="Biometric Profile" className="w-full h-full object-cover scale-x-[-1]" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-slate-500" />
                              )}
                            </div>

                            <div className="text-xs space-y-1">
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                {v.user.first_name} {v.user.last_name} ({v.user.username})
                              </h4>
                              <p className="text-slate-550 dark:text-slate-400">
                                Voter ID: <span className="font-mono font-bold tracking-wider text-slate-700 dark:text-slate-200 uppercase">{v.voter_id_number}</span> • Constituency: <span className="font-bold">{v.constituency_name}</span>
                              </p>
                              <p className="text-slate-500">Email: {v.user.email} {v.user.phone_number ? `• Phone: ${v.user.phone_number}` : ''}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleVerifyVoter(v.id)}
                            disabled={actionLoading}
                            className="py-1.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                          >
                            Approve & Verify
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verified Voters Registry */}
                <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Verified Voters Registry
                  </h3>
                  {allVoters.filter(v => v.is_verified).length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">No verified voters found in the database.</div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {allVoters.filter(v => v.is_verified).map(v => (
                        <div 
                          key={v.id} 
                          className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                        >
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
                            {/* Face image thumbnail */}
                            <div className="w-[60px] h-[80px] rounded border border-slate-350 dark:border-slate-850 overflow-hidden shrink-0 bg-slate-950 flex items-center justify-center">
                              {v.face_photo_url ? (
                                <img src={v.face_photo_url} alt="Biometric Profile" className="w-full h-full object-cover scale-x-[-1]" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-slate-500" />
                              )}
                            </div>

                            <div className="text-xs space-y-1 flex-grow">
                              <h4 className="font-bold text-slate-950 dark:text-white text-sm">
                                {v.user.first_name} {v.user.last_name} ({v.user.username})
                              </h4>
                              <p className="text-slate-550 dark:text-slate-400">
                                Voter ID: <span className="font-mono font-bold tracking-wider text-slate-700 dark:text-slate-200 uppercase">{v.voter_id_number}</span> • Constituency: <span className="font-bold">{v.constituency_name}</span>
                              </p>
                              {v.voter_id_card ? (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded flex items-center justify-between gap-2 mt-1">
                                  <div>
                                    <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Digital Card Number</span>
                                    <span className="font-mono font-bold text-gov-blue dark:text-gov-saffron tracking-widest text-[10px] uppercase">
                                      {v.voter_id_card.card_number}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      alert(`MOCK ECI VOTER IDENTITY CARD DETAILS:\nCard Number: ${v.voter_id_card?.card_number}\nName: ${v.voter_id_card?.full_name}\nGender: ${v.voter_id_card?.gender}\nDate of Birth: ${v.voter_id_card?.date_of_birth}\nConstituency: ${v.voter_id_card?.constituency_name}\nCard Status: ${v.voter_id_card?.status}`);
                                    }}
                                    className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-750 rounded text-[9px] font-bold text-slate-650 dark:text-slate-300 cursor-pointer"
                                  >
                                    Inspect Card
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-red-500 font-bold block mt-1">⚠️ Error: Card not generated</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Elections CRUD */}
            {activeTab === 'ELECTIONS' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Election Creator Form */}
                <div className="space-y-4 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-850 pb-6 lg:pb-0 lg:pr-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
                    <PlusCircle className="h-4.5 w-4.5 text-gov-blue dark:text-gov-gold" /> Create Election
                  </h3>
                  
                  <form onSubmit={handleCreateElection} className="space-y-4 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">Title</label>
                      <input 
                        type="text" 
                        value={elTitle} 
                        onChange={(e) => setElTitle(e.target.value)} 
                        placeholder="e.g. General Election 2026"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">Description</label>
                      <textarea 
                        value={elDesc} 
                        onChange={(e) => setElDesc(e.target.value)} 
                        placeholder="Provide details..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg h-20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">Start Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={elStart} 
                        onChange={(e) => setElStart(e.target.value)} 
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">End Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={elEnd} 
                        onChange={(e) => setElEnd(e.target.value)} 
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">Status</label>
                      <select 
                        value={elStatus} 
                        onChange={(e) => setElStatus(e.target.value as any)} 
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="ACTIVE">Active</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>

                    <button 
                      type="submit" 
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg font-bold shadow-md shadow-gov-blue/10 transition-all"
                    >
                      Save Election
                    </button>
                  </form>
                </div>

                {/* Elections List */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Elections Administration</h3>
                  {elections.length === 0 ? (
                    <div className="text-center py-12 text-slate-555">No elections configured.</div>
                  ) : (
                    <div className="space-y-4">
                      {elections.map(el => (
                        <div 
                          key={el.id} 
                          className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs"
                        >
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-slate-950 dark:text-white text-sm">{el.title}</h4>
                            <p className="text-slate-500">{el.description || 'No description.'}</p>
                            <p className="text-[10px] text-slate-450">
                              Start: {new Date(el.start_date).toLocaleString()} • End: {new Date(el.end_date).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                              value={el.status}
                              onChange={(e) => handleUpdateElectionStatus(el.id, e.target.value)}
                              disabled={actionLoading}
                              className="py-1 px-2.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded font-semibold text-[11px]"
                            >
                              <option value="DRAFT">Draft</option>
                              <option value="SCHEDULED">Scheduled</option>
                              <option value="ACTIVE">Active</option>
                              <option value="COMPLETED">Completed</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB: Candidates approvals & Registration */}
            {activeTab === 'CANDIDATES' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Candidate Register Form */}
                <div className="space-y-4 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-850 pb-6 lg:pb-0 lg:pr-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
                    <PlusCircle className="h-4.5 w-4.5 text-gov-blue dark:text-gov-gold" /> Register Candidate
                  </h3>
                  
                  <form onSubmit={handleCreateCandidate} className="space-y-4 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">Candidate Name</label>
                      <input 
                        type="text" 
                        value={candName} 
                        onChange={(e) => setCandName(e.target.value)} 
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">Party Affiliation</label>
                      <input 
                        type="text" 
                        value={candParty} 
                        onChange={(e) => setCandParty(e.target.value)} 
                        placeholder="e.g. Independent, National Party"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">Candidate Bio</label>
                      <textarea 
                        value={candBio} 
                        onChange={(e) => setCandBio(e.target.value)} 
                        placeholder="Bio information..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg h-20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">Target Election</label>
                      <select
                        value={candElectionId}
                        onChange={(e) => setCandElectionId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold"
                        required
                      >
                        <option value="">Select Election</option>
                        {elections.map(el => (
                          <option key={el.id} value={el.id}>{el.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 dark:text-slate-350 uppercase">Constituency</label>
                      <select
                        value={candConstituencyId}
                        onChange={(e) => setCandConstituencyId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold"
                        required
                      >
                        <option value="">Select Constituency</option>
                        {constituencies.map(con => (
                          <option key={con.id} value={con.id}>{con.name}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      type="submit" 
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg font-bold shadow-md shadow-gov-blue/10 transition-all"
                    >
                      Register Candidate
                    </button>
                  </form>
                </div>

                {/* Candidates List */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Candidates Approvals Queue</h3>
                  {candidates.length === 0 ? (
                    <div className="text-center py-12 text-slate-555">No candidates registered.</div>
                  ) : (
                    <div className="space-y-4">
                      {candidates.map(c => (
                        <div 
                          key={c.id} 
                          className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-lg border border-slate-200 dark:border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs"
                        >
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-slate-950 dark:text-white text-sm">
                              {c.name} • <span className="text-gov-blue dark:text-gov-gold">{c.party_name}</span>
                            </h4>
                            <p className="text-slate-500">
                              Election: <span className="font-bold">{c.election_title}</span> • Constituency: <span className="font-bold">{c.constituency_name}</span>
                            </p>
                            <div>
                              {c.is_approved ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-green-150 text-green-800 dark:bg-green-950/40 dark:text-green-400 font-bold px-1.5 py-0.5 rounded">
                                  Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded">
                                  Pending Approval
                                </span>
                              )}
                            </div>
                          </div>

                          {!c.is_approved && (
                            <button
                              onClick={() => handleApproveCandidate(c.id)}
                              disabled={actionLoading}
                              className="py-1.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB: Audit Logs Trail */}
            {activeTab === 'AUDIT' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="h-4.5 w-4.5 text-red-600 dark:text-red-400" /> Security Audit Log Ledger
                </h3>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">User</th>
                        <th className="p-3">Security Event Action</th>
                        <th className="p-3">IP Address</th>
                        <th className="p-3">Details (JSON)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-850 font-medium">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                          <td className="p-3 font-mono whitespace-nowrap text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{log.username}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action.includes('FAILURE') || log.action.includes('ALERT')
                                ? 'bg-red-100 text-red-850 dark:bg-red-950/40 dark:text-red-400'
                                : log.action.includes('SUCCESS') || log.action.includes('CAST') || log.action.includes('VERIFIED')
                                ? 'bg-green-100 text-green-850 dark:bg-green-950/40 dark:text-green-400'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-600 dark:text-slate-400 max-w-xs truncate" title={JSON.stringify(log.details)}>
                            {JSON.stringify(log.details)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { UserCheck, ShieldAlert, Award, FileText, CheckCircle2, Calendar, ClipboardList, Landmark } from 'lucide-react';
import { VoterIDCard } from '../components/VoterIDCard';

interface Election {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
  already_voted: boolean;
  receipt_number: string | null;
  is_verified_voter: boolean;
}

export const VoterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, voterProfile, updateVoterProfile } = useAuthStore();
  
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state for receipt details
  const [activeReceipt, setActiveReceipt] = useState<{
    receiptNumber: string;
    electionTitle: string;
    timestamp?: string;
  } | null>(null);

  const fetchVoterDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch latest profile state (sync verification check)
      const profileResponse = await api.get('/auth/me/');
      if (profileResponse.data.voter_profile) {
        updateVoterProfile(profileResponse.data.voter_profile);
      }

      // Fetch elections
      const electionsResponse = await api.get('/elections/voter-overview/');
      setElections(electionsResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoterDashboardData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-8">
      {/* Voter Profile Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Voter Identity Account
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>Voter Card: <strong className="text-slate-900 dark:text-white font-mono tracking-wider uppercase">{voterProfile?.voter_id_number}</strong></p>
            <p>Assigned Constituency: <strong className="text-slate-900 dark:text-white">{voterProfile?.constituency_name}</strong></p>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div>
          {voterProfile?.is_verified ? (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wide">
              <UserCheck className="h-4.5 w-4.5 shrink-0" />
              Verified & Eligible to Vote
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-250 dark:border-amber-900/30 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wide">
              <ShieldAlert className="h-4.5 w-4.5 shrink-0 animate-pulse" />
              Pending Admin Verification
            </div>
          )}
        </div>
      </section>

      {/* Account Pending Alert */}
      {!voterProfile?.is_verified && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-400/90 leading-relaxed">
          <strong>Notice</strong>: Your account details are currently undergoing visual verification check by portal administrators. Once the admin cross-checks your registration details and biometric capture frame, your status will change to verified and you will be unlocked to cast ballots.
        </div>
      )}

      {/* Voter ID Card Display */}
      {voterProfile?.is_verified && voterProfile.voter_id_card && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Landmark className="h-4 w-4 text-gov-blue dark:text-gov-gold" />
            My Digital Voter ID Card
          </h3>
          <VoterIDCard card={voterProfile.voter_id_card} />
        </section>
      )}

      {/* Elections Overview Section */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2">
          <ClipboardList className="h-4 w-4 text-gov-blue dark:text-gov-gold" /> Available Elections
        </h3>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-xs text-red-600 bg-red-50 rounded-lg">{error}</div>
        ) : elections.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-350 dark:border-slate-800 rounded-xl text-slate-500">
            <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-400" />
            <span className="text-xs">No active or scheduled elections found.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {elections.map((election) => (
              <div 
                key={election.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Status header */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      election.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' 
                        : election.status === 'COMPLETED'
                        ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                    }`}>
                      {election.status}
                    </span>

                    {/* Voting status for voter */}
                    {election.already_voted && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 font-bold border border-green-200/55 px-1.5 py-0.5 rounded uppercase">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ballot Cast
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-950 dark:text-white text-base">
                      {election.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {election.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="text-[10px] text-slate-450 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-100 dark:border-slate-850">
                    <p>Start Date: <span className="font-semibold text-slate-700 dark:text-slate-350">{formatDate(election.start_date)}</span></p>
                    <p>End Date: <span className="font-semibold text-slate-700 dark:text-slate-350">{formatDate(election.end_date)}</span></p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-850 flex gap-2">
                  {election.status === 'ACTIVE' && !election.already_voted && (
                    <button
                      onClick={() => navigate(`/vote/${election.id}`)}
                      disabled={!voterProfile?.is_verified}
                      className="w-full py-2 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-xs font-bold shadow-md shadow-gov-blue/10 transition-all disabled:opacity-40 disabled:hover:bg-gov-blue"
                    >
                      Access Voting Terminal
                    </button>
                  )}

                  {election.already_voted && election.receipt_number && (
                    <button
                      onClick={() => setActiveReceipt({
                        receiptNumber: election.receipt_number!,
                        electionTitle: election.title,
                      })}
                      className="w-full py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <FileText className="h-4 w-4" />
                      View Vote Receipt
                    </button>
                  )}

                  {election.status === 'COMPLETED' && (
                    <button
                      onClick={() => navigate(`/results?election_id=${election.id}`)}
                      className="w-full py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-all"
                    >
                      View Election Results
                    </button>
                  )}

                  {election.status === 'SCHEDULED' && (
                    <button
                      disabled
                      className="w-full py-2 bg-slate-100 dark:bg-slate-950 text-slate-400 border border-slate-200 dark:border-slate-850 rounded-lg text-xs font-bold cursor-not-allowed"
                    >
                      Awaiting Poll Start
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vote Receipt Verification Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl max-w-md w-full p-6 shadow-xl space-y-6 relative animate-in fade-in zoom-in duration-200">
            
            <div className="text-center space-y-2">
              <Award className="h-10 w-10 text-green-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                Official Digital Vote Receipt
              </h3>
              <p className="text-[10px] text-slate-450 uppercase tracking-wide font-bold">
                Verification Ledger Copy
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-850 space-y-3 font-mono text-xs">
              <div>
                <span className="block text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">Election Event</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{activeReceipt.electionTitle}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">Receipt Hash (Reference ID)</span>
                <span className="font-bold text-gov-blue dark:text-gov-gold break-all uppercase text-sm select-all">
                  {activeReceipt.receiptNumber}
                </span>
              </div>
              <div className="border-t border-slate-250 dark:border-slate-800 pt-2 text-[10px] text-slate-450 font-sans space-y-1">
                <p>✓ Receipt code generated on database transaction lock.</p>
                <p className="text-green-600 dark:text-green-400 font-bold">✓ Vote completely decoupled from identity (Private Ballot).</p>
              </div>
            </div>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-all"
            >
              Close Receipt Window
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

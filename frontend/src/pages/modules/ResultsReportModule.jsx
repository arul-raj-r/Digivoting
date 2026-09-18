import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import electionApi from '../../services/electionApi';
import resultsApi from '../../services/resultsApi';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  BarChart2, 
  Award, 
  Download, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle, 
  FileSpreadsheet, 
  Layers, 
  ArrowRight, 
  Vote,
  Printer,
  Share2,
  Check
} from 'lucide-react';

export default function ResultsReportModule() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const electionParam = searchParams.get('election');

  const role = user?.role || 'VOTER';
  const isOrganizer = role === 'ELECTION_CREATOR' || role === 'ADMIN' || user?.is_staff || user?.is_superuser;

  // Active Elections List
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(electionParam || '');
  const [loadingElections, setLoadingElections] = useState(true);

  // Results & Reports State
  const [results, setResults] = useState(null);
  const [participation, setParticipation] = useState(null);
  const [candidatesReport, setCandidatesReport] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tally'); // 'tally' | 'participation' | 'candidates'
  const [isExporting, setIsExporting] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const url = window.location.origin + `/results?election=${selectedElectionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    });
  };

  // Fetch elections list
  useEffect(() => {
    const fetchElections = async () => {
      setLoadingElections(true);
      try {
        const data = await electionApi.getElections();
        const list = Array.isArray(data) ? data : (data.results || []);
        setElections(list);
        if (!selectedElectionId && list.length > 0) {
          // Prefer completed or active election
          const pref = list.find(e => e.status === 'completed') || list[0];
          setSelectedElectionId(pref.id);
        }
      } catch (err) {
        console.error('Failed to load elections:', err);
      } finally {
        setLoadingElections(false);
      }
    };
    fetchElections();
  }, []);

  // Fetch results and reports for selected election
  const loadElectionResults = async (eId) => {
    if (!eId) return;
    setLoadingData(true);
    setError(null);
    try {
      const [resultsRes, partRes, candRes] = await Promise.all([
        resultsApi.getResults(eId).catch(err => {
          return { available: false, message: err.response?.data?.error || 'Results are not yet certified or published.' };
        }),
        isOrganizer ? resultsApi.getParticipationReport(eId).catch(() => null) : Promise.resolve(null),
        isOrganizer ? resultsApi.getCandidatesReport(eId).catch(() => null) : Promise.resolve(null),
      ]);

      setResults(resultsRes);
      setParticipation(partRes);
      setCandidatesReport(candRes);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err.response?.data?.error || err.message || 'Unable to retrieve election results.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedElectionId) {
      loadElectionResults(selectedElectionId);
    }
  }, [selectedElectionId, isOrganizer]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    if (!selectedElectionId) return;
    setIsExporting(true);
    try {
      const blob = await resultsApi.exportReportCsv(selectedElectionId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `election_${selectedElectionId}_certified_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('CSV export failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsExporting(false);
    }
  };

  const selectedElection = elections.find(e => e.id === selectedElectionId);

  // Compute Winner or Tie
  const candidateResults = results?.candidate_results || results?.results || [];
  const sortedCandidates = [...candidateResults].sort((a, b) => (b.votes_count || b.votes || 0) - (a.votes_count || a.votes || 0));
  
  const isAvailable = results?.available !== false && candidateResults.length > 0;
  const isConcluded = selectedElection?.status === 'completed';

  const highestVotes = sortedCandidates[0]?.votes_count ?? sortedCandidates[0]?.votes ?? 0;
  const topCandidates = sortedCandidates.filter(c => (c.votes_count ?? c.votes ?? 0) === highestVotes && highestVotes > 0);
  const isTie = topCandidates.length > 1;
  const winner = !isTie && topCandidates.length === 1 ? topCandidates[0] : null;

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              MODULE 6: CERTIFIED RESULTS & AUDIT
            </span>
            <span className="text-xs text-slate-400">
              Real-Time Tallies
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Results & Reports Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Review certified vote tallies, participation statistics, and cryptographic ballot verification reports.
          </p>
        </div>

        {/* Election Selector & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedElectionId}
            onChange={(e) => setSelectedElectionId(e.target.value)}
            disabled={loadingElections}
            className="px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {elections.map(el => (
              <option key={el.id} value={el.id}>
                {el.title} ({el.status.toUpperCase()})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleShare}
            disabled={!selectedElectionId}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            title="Share certified results link"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedShare ? 'Link Copied' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!isAvailable}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            title="Print official certified results summary"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          {isOrganizer && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting || !isAvailable}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}
        </div>
      </div>

      {loadingData ? (
        <div className="space-y-6">
          <LoadingSkeleton variant="header" />
          <LoadingSkeleton variant="metrics" count={4} />
          <LoadingSkeleton variant="table" count={3} />
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to Load Results</h3>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadElectionResults(selectedElectionId)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : !isAvailable ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Results Not Yet Tabulated
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {results?.message || 'Official tallies will be certified and released once voting concludes.'}
            </p>
          </div>
          <Link
            to="/voting"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all"
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Go to Voting Booth</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Winner or Tie Banner */}
          {isConcluded && (
            <div>
              {winner ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                      <Award className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        OFFICIAL CONTEST WINNER
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {winner.candidate_name || winner.name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Secured victory with <span className="font-bold text-slate-800 dark:text-slate-200">{winner.votes_count || winner.votes} votes</span> ({winner.percentage || ((winner.votes_count / (results.total_votes || 1)) * 100).toFixed(1)}%).
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-mono shrink-0">
                    <span className="text-[10px] text-slate-400 block">FINAL STATUS</span>
                    <span className="text-xs font-bold text-emerald-600">CERTIFIED</span>
                  </div>
                </div>
              ) : isTie ? (
                <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-8 h-8 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold">TIE DETECTED</h3>
                    <p className="text-xs">
                      Multiple candidates share the highest vote count ({highestVotes} votes). Runoff election or committee rules apply.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Turnout KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm depth-card">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eligible Voters</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2">
                {results.total_eligible_voters || results.eligible_voters || 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm depth-card">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ballots Cast</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-2">
                {results.total_votes || results.votes_cast || 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm depth-card">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turnout Percentage</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
                {results.turnout_percentage ? `${Number(results.turnout_percentage).toFixed(1)}%` : '0.0%'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm depth-card">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contest Status</span>
              <p className="text-sm font-bold uppercase mt-3 text-slate-700 dark:text-slate-300">
                {selectedElection?.status || 'Active'}
              </p>
            </div>
          </div>

          {/* Vote Distribution Bar Chart */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Vote Distribution by Candidate
                </h3>
                <p className="text-xs text-slate-500">
                  Total valid votes: {results.total_votes || 0}
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                AUDITED TALLY
              </span>
            </div>

            <div className="space-y-4">
              {sortedCandidates.map((cand, idx) => {
                const votes = cand.votes_count ?? cand.votes ?? 0;
                const total = results.total_votes || 1;
                const pct = cand.percentage ? Number(cand.percentage).toFixed(1) : ((votes / total) * 100).toFixed(1);

                return (
                  <div key={cand.candidate_id || cand.id || idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {cand.candidate_name || cand.name}
                      </span>
                      <span className="font-mono text-slate-500">
                        <span className="font-bold text-slate-900 dark:text-white">{votes} votes</span> ({pct}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

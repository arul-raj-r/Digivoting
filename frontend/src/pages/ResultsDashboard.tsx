import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { BarChart3, Landmark, LandmarkIcon, AlertCircle, Percent, Vote, Users } from 'lucide-react';

interface Election {
  id: string;
  title: string;
  status: string;
}

interface CandidateStanding {
  id: string;
  name: string;
  party_name: string;
  constituency_name: string;
  votes: number;
}

interface ConstituencyTurnout {
  constituency_name: string;
  registered_voters: number;
  votes_cast: number;
  turnout_percentage: number;
}

interface ResultsData {
  election_id: string;
  election_title: string;
  status: string;
  total_votes: number;
  total_voters: number;
  turnout_percentage: number;
  candidates: CandidateStanding[];
  constituency_turnout: ConstituencyTurnout[];
}

const PIE_COLORS = ['#0B3C5D', '#D9B310', '#328CC1', '#1D2731', '#85C1E9', '#F4D03F', '#58D68D'];

export const ResultsDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryElectionId = searchParams.get('election_id');

  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const [results, setResults] = useState<ResultsData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!selectedElectionId) return;
    setExporting(true);
    try {
      const response = await api.get(`/elections/${selectedElectionId}/export/`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'election_report.xlsx';
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          fileName = matches[1];
        }
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      alert('Failed to export report. Please ensure you are signed in.');
    } finally {
      setExporting(false);
    }
  };

  // Fetch list of elections first
  useEffect(() => {
    const fetchElectionsList = async () => {
      try {
        const response = await api.get('/elections/');
        setElections(response.data);
        
        // Pick election: query parameter first, then default to first, else empty
        if (queryElectionId) {
          setSelectedElectionId(queryElectionId);
        } else if (response.data.length > 0) {
          setSelectedElectionId(response.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load elections:', err);
      }
    };
    fetchElectionsList();
  }, [queryElectionId]);

  // Fetch results when selected election changes
  useEffect(() => {
    const fetchResultsData = async () => {
      if (!selectedElectionId) return;
      
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/elections/${selectedElectionId}/results/`);
        setResults(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch results analytics.');
        setResults(null);
      } finally {
        setLoading(false);
      }
    };
    fetchResultsData();
  }, [selectedElectionId]);

  // Handle dropdown change
  const handleElectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedElectionId(e.target.value);
  };

  return (
    <div className="space-y-8">
      {/* Selection Control bar */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5.5 w-5.5 text-gov-blue dark:text-gov-gold" />
            Election Results & Analytical Turnout
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time aggregate data for finished and active voting events.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              Choose Election Event
            </label>
            <select
              value={selectedElectionId}
              onChange={handleElectionChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-xs font-semibold"
            >
              <option value="" disabled>Select election...</option>
              {elections.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.title} ({el.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={exporting || !selectedElectionId}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-40 whitespace-nowrap h-[38px] w-full sm:w-auto cursor-pointer"
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
        </div>
      ) : error ? (
        <div className="p-4 text-xs bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 rounded-lg font-semibold flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5" />
          <span>{error}</span>
        </div>
      ) : !results ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          Select an election to view analysis statistics.
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Key metrics cards */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-gov-blue/10 dark:bg-gov-gold/10 text-gov-blue dark:text-gov-gold rounded-lg">
                <Vote className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Ballots Cast</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{results.total_votes}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-gov-blue/10 dark:bg-gov-gold/10 text-gov-blue dark:text-gov-gold rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Eligible Voters</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{results.total_voters}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-gov-blue/10 dark:bg-gov-gold/10 text-gov-blue dark:text-gov-gold rounded-lg">
                <Percent className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Turnout Rate</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{results.turnout_percentage}%</span>
              </div>
            </div>
          </section>

          {/* Visual Charts section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Candidate Standings Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate Standing Breakdown</h3>
              {results.candidates.length === 0 ? (
                <div className="text-center py-20 text-xs text-slate-500">No candidates registered.</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.candidates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                      <Legend wrapperStyle={{ fontSize: 10, marginTop: 10 }} />
                      <Bar name="Ballots Cast" dataKey="votes" fill="#0B3C5D" radius={[4, 4, 0, 0]}>
                        {results.candidates.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Constituency Turnout Comparative Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Constituency Turnout Analysis</h3>
              {results.constituency_turnout.length === 0 ? (
                <div className="text-center py-20 text-xs text-slate-500">No constituency data available.</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.constituency_turnout} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="constituency_name" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                      <Bar name="Turnout Rate (%)" dataKey="turnout_percentage" fill="#D9B310" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </section>

          {/* Standings Leaderboard Table */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Standing standings table</h3>
            
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold uppercase text-slate-700 dark:text-slate-350 border-b border-slate-200 dark:border-slate-850">
                  <tr>
                    <th className="p-3">Standing Rank</th>
                    <th className="p-3">Candidate Name</th>
                    <th className="p-3">Party Name</th>
                    <th className="p-3">Constituency</th>
                    <th className="p-3">Total Ballots</th>
                    <th className="p-3">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                  {results.candidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500">No candidates available.</td>
                    </tr>
                  ) : (
                    results.candidates.map((c, index) => {
                      const share = results.total_votes > 0 
                        ? ((c.votes / results.total_votes) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20 font-medium">
                          <td className="p-3 font-bold text-slate-500">#{index + 1}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{c.name}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                              <LandmarkIcon className="h-3 w-3 text-slate-550" />
                              {c.party_name}
                            </span>
                          </td>
                          <td className="p-3">{c.constituency_name}</td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-250">{c.votes}</td>
                          <td className="p-3 font-bold text-gov-blue dark:text-gov-gold">{share}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      )}

    </div>
  );
};

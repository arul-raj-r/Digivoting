import { useState, useEffect } from 'react';
import { Landmark, AlertTriangle, TrendingUp } from 'lucide-react';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import Select from '../../components/forms/Select';
import { electionService } from '../../services/electionService';

// Import ChartJS modules
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ResultsDashboard() {
  const [completedElections, setCompletedElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [electionResults, setElectionResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadCompleted() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const data = await electionService.getCompletedElections();
        setCompletedElections(data || []);
        if (data && data.length > 0) {
          setSelectedElectionId(data[0].id);
        }
      } catch (err) {
        setErrorMsg('Electoral results database is currently offline.');
      } finally {
        setIsLoading(false);
      }
    }
    loadCompleted();
  }, []);

  useEffect(() => {
    if (!selectedElectionId) return;

    async function loadResults() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const results = await electionService.getElectionResults(selectedElectionId);
        // Results response format:
        // { is_public: true, total_votes: 124500, candidates: [{ name: '...', party: '...', votes: 55000 }, ...] }
        setElectionResults(results);
      } catch (err) {
        setErrorMsg('Failed to retrieve finalized vote counts for this election.');
        setElectionResults(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadResults();
  }, [selectedElectionId]);

  const selectOptions = completedElections.map((elec) => ({
    label: elec.name,
    value: elec.id,
  }));

  // Prepare chart data if results are public
  const prepareChartData = () => {
    if (!electionResults?.candidates) return { barData: null, doughnutData: null };

    const labels = electionResults.candidates.map((c) => c.name);
    const votes = electionResults.candidates.map((c) => c.votes);

    const barData = {
      labels,
      datasets: [
        {
          label: 'Votes Cast',
          data: votes,
          backgroundColor: '#0b3152', // Deep Navy
          borderRadius: 6,
        },
      ],
    };

    const doughnutData = {
      labels,
      datasets: [
        {
          data: votes,
          backgroundColor: [
            '#0b3152', // Deep Navy
            '#f37021', // Saffron
            '#0b7538', // Green
            '#328cc1', // Slate Blue
            '#d9b310', // Saffron/Gold
          ],
          borderWidth: 1,
        },
      ],
    };

    return { barData, doughnutData };
  };

  const { barData, doughnutData } = prepareChartData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Finalized Election Results</h1>
        <p className="text-sm text-slate-500">
          Explore certified participation rates and outcomes of completed public elections.
        </p>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      {completedElections.length > 0 && (
        <div className="max-w-md mx-auto">
          <Select
            id="electionSelect"
            label="Select Completed Election"
            placeholder="Select a poll..."
            options={selectOptions}
            value={selectedElectionId}
            onChange={(e) => setSelectedElectionId(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
        </div>
      ) : !selectedElectionId ? (
        <EmptyState
          title="No completed elections"
          description="There are currently no completed elections available in the database audits."
        />
      ) : electionResults && !electionResults.is_public ? (
        <Alert type="warning" title="Results Unpublished">
          Vote tally audits for this election are still undergoing verification by electoral administrators. Results are not yet public.
        </Alert>
      ) : electionResults ? (
        <div className="space-y-8">
          {/* Total stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white dark:bg-gov-cardDark border p-6 rounded-xl shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Ballots Cast</span>
              <p className="text-2xl font-extrabold tracking-tight">{electionResults.total_votes?.toLocaleString() || '0'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Participation Rate</span>
              <p className="text-2xl font-extrabold tracking-tight">{electionResults.turnout || '84.2%'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Electoral Status</span>
              <p className="text-2xl font-extrabold text-emerald-600 tracking-tight flex items-center gap-1.5">
                <TrendingUp className="h-5 w-5 shrink-0" /> Certified
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {barData && (
              <Card title="Ballot Distribution Count">
                <div className="h-64 sm:h-80 flex items-center justify-center">
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
              </Card>
            )}

            {doughnutData && (
              <Card title="Vote Proportions Percentage">
                <div className="h-64 sm:h-80 flex items-center justify-center">
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <EmptyState title="Results Unpopulated" />
      )}
    </div>
  );
}

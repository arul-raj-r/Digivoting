import { useState, useEffect } from 'react';
import { Landmark, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import Select from '../../components/forms/Select';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

import { Bar, Doughnut } from 'react-chartjs-2';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function AdminResults() {
  const { showSuccess, showError } = useToast();
  const [completedElections, setCompletedElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadCompleted = async () => {
    try {
      const data = await adminService.getElectionsList();
      const completed = data?.filter((e) => e.status === 'COMPLETED') || [];
      setCompletedElections(completed);
      if (completed.length > 0) {
        setSelectedElectionId(completed[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCompleted();
  }, []);

  const loadResults = async () => {
    if (!selectedElectionId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await adminService.getElectionResults(selectedElectionId);
      setResults(data);
    } catch (e) {
      setErrorMsg('Tally records for this completed election are offline.');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [selectedElectionId]);

  const handleTogglePublish = async () => {
    try {
      const targetState = !results.is_public;
      await adminService.toggleResultsPublish(selectedElectionId, targetState);
      showSuccess(targetState ? 'Results published to citizen portal.' : 'Results retracted to admin only.');
      loadResults();
    } catch (e) {
      showError('Action failed.');
    }
  };

  const selectOptions = completedElections.map((e) => ({
    label: e.name,
    value: e.id,
  }));

  const prepareChartData = () => {
    if (!results?.candidates) return { barData: null };
    const labels = results.candidates.map((c) => c.name);
    const votes = results.candidates.map((c) => c.votes);

    return {
      barData: {
        labels,
        datasets: [
          {
            label: 'Certified Votes',
            data: votes,
            backgroundColor: '#0b3152',
            borderRadius: 4,
          },
        ],
      },
    };
  };

  const { barData } = prepareChartData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Final Tally Auditing</h1>
          <p className="text-xs text-slate-500 mt-1">Review finalized participation metrics and publish outcomes.</p>
        </div>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      {completedElections.length > 0 && (
        <div className="max-w-md">
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-blue border-t-transparent"></div>
        </div>
      ) : !selectedElectionId ? (
        <EmptyState
          title="No completed elections"
          description="There are currently no elections marked as COMPLETED to review results."
        />
      ) : results ? (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white dark:bg-gov-cardDark border p-6 rounded-xl shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Ballots Counted</span>
              <p className="text-2xl font-extrabold tracking-tight">{results.total_votes?.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Outcomes status</span>
              <p className={`text-2xl font-extrabold tracking-tight ${results.is_public ? 'text-emerald-600' : 'text-amber-500'}`}>
                {results.is_public ? 'Publicly Published' : 'Internal Audit Only'}
              </p>
            </div>
            <div className="flex items-center shrink-0">
              <Button
                variant={results.is_public ? 'outline' : 'primary'}
                className="w-full"
                onClick={handleTogglePublish}
              >
                {results.is_public ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" /> Retract Results
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" /> Publish Results
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Chart */}
          {barData && (
            <Card title="Nominee Ballot Distribution Outcomes">
              <div className="h-72 flex items-center justify-center">
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              </div>
            </Card>
          )}
        </div>
      ) : (
        <EmptyState title="Results tally empty" />
      )}
    </div>
  );
}

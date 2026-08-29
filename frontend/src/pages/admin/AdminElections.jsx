import { useState, useEffect } from 'react';
import { Calendar, Plus, Pause, Play, Archive, CheckSquare } from 'lucide-react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import Input from '../../components/forms/Input';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import StatusBadge from '../../components/common/StatusBadge';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function AdminElections() {
  const { showSuccess, showError } = useToast();
  const [elections, setElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Modals / Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, electionId, title, message }
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    constituency_id: '',
    constituency_name: '',
    start_date: '',
    end_date: '',
  });

  const loadElections = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await adminService.getElectionsList();
      setElections(data || []);
    } catch (e) {
      setErrorMsg('Election management service is currently offline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadElections();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.createElection(formData);
      showSuccess('Election scheduled and created successfully.');
      setIsCreateOpen(false);
      loadElections();
      setFormData({ name: '', description: '', constituency_id: '', constituency_name: '', start_date: '', end_date: '' });
    } catch (err) {
      showError('Failed to create election.');
    }
  };

  const handleExecuteAction = async () => {
    const { type, electionId } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === 'pause') {
        await adminService.pauseElection(electionId);
        showSuccess('Election paused.');
      } else if (type === 'activate') {
        await adminService.activateElection(electionId);
        showSuccess('Election activated.');
      } else if (type === 'complete') {
        await adminService.completeElection(electionId);
        showSuccess('Election closed and tally certified.');
      } else if (type === 'archive') {
        await adminService.archiveElection(electionId);
        showSuccess('Election records archived.');
      }
      loadElections();
    } catch (e) {
      showError('Failed to execute administrative action.');
    }
  };

  const headers = ['Election details', 'Constituency', 'Duration', 'Status', 'Actions'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Elections Operations Panel</h1>
          <p className="text-xs text-slate-500 mt-1">Configure polls, set timelines, and review active states.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4.5 w-4.5 mr-1" /> Create Election
        </Button>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      <Table
        headers={headers}
        data={elections}
        isLoading={isLoading}
        renderRow={(elec) => (
          <tr key={elec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-805/30 transition-colors">
            <td className="px-6 py-4">
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-slate-805 dark:text-slate-205">{elec.name}</span>
                <span className="text-[10px] text-slate-450 truncate max-w-xs">{elec.description}</span>
              </div>
            </td>
            <td className="px-6 py-4">
              <span className="text-xs font-semibold">{elec.constituency_name}</span>
            </td>
            <td className="px-6 py-4 text-xs text-slate-500">
              {elec.start_date} - {elec.end_date}
            </td>
            <td className="px-6 py-4">
              <StatusBadge status={elec.status} />
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                {elec.status === 'PAUSED' && (
                  <button
                    onClick={() => setConfirmAction({
                      type: 'activate',
                      electionId: elec.id,
                      title: 'Activate Election Session',
                      message: `Are you sure you want to activate the election: ${elec.name}? This opens ballot casting for citizens.`
                    })}
                    className="p-1.5 rounded text-slate-400 hover:text-emerald-650 hover:bg-emerald-50"
                    title="Activate poll"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                {elec.status === 'ACTIVE' && (
                  <button
                    onClick={() => setConfirmAction({
                      type: 'pause',
                      electionId: elec.id,
                      title: 'Pause Active Poll',
                      message: `Confirm suspension of ballot casts for ${elec.name}. Voters will see this poll as temporarily locked.`
                    })}
                    className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                    title="Pause poll"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                )}
                {elec.status !== 'COMPLETED' && elec.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => setConfirmAction({
                      type: 'complete',
                      electionId: elec.id,
                      title: 'Certify & Close Polls',
                      message: `This will finalize vote tallies for: ${elec.name}. Once completed, ballot casting terminates forever and results compile.`
                    })}
                    className="p-1.5 rounded text-slate-400 hover:text-gov-blue hover:bg-slate-100"
                    title="Finalize & Complete"
                  >
                    <CheckSquare className="h-4 w-4" />
                  </button>
                )}
                {elec.status === 'COMPLETED' && (
                  <button
                    onClick={() => setConfirmAction({
                      type: 'archive',
                      electionId: elec.id,
                      title: 'Archive Election Records',
                      message: `Confirm archiving of: ${elec.name}. This moves results out of the active registry into cold storage audit logs.`
                    })}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-650 hover:bg-rose-50"
                    title="Archive Poll"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        )}
      />

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Schedule New Election">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Election Name"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. 2026 Constituency Assembly Election"
            required
          />
          <div className="flex flex-col gap-1.5 text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-350">Description</label>
            <textarea
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-750 dark:bg-gov-cardDark text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-blue dark:focus:ring-gov-gold min-h-[80px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the context or candidates eligibility parameters..."
              required
            ></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Constituency ID"
              id="constId"
              value={formData.constituency_id}
              onChange={(e) => setFormData({ ...formData, constituency_id: e.target.value })}
              placeholder="e.g. C-101"
              required
            />
            <Input
              label="Constituency Name"
              id="constName"
              value={formData.constituency_name}
              onChange={(e) => setFormData({ ...formData, constituency_name: e.target.value })}
              placeholder="e.g. New Delhi Central"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              id="start"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              id="end"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            Schedule Poll
          </Button>
        </form>
      </Modal>

      {/* Confirmation dialog for operations */}
      {confirmAction && (
        <ConfirmationDialog
          isOpen={!!confirmAction}
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={handleExecuteAction}
          onCancel={() => setConfirmAction(null)}
          confirmText="Confirm Operation"
        />
      )}
    </div>
  );
}

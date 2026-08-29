import { useState, useEffect } from 'react';
import { Plus, User, FileText, CheckCircle2 } from 'lucide-react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/forms/Input';
import Select from '../../components/forms/Select';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function AdminCandidates() {
  const { showSuccess, showError } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    party_name: '',
    party_symbol: '',
    biography: '',
    election_id: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const cands = await adminService.getCandidatesList();
      setCandidates(cands || []);
      
      const elecs = await adminService.getElectionsList();
      setElections(elecs || []);
    } catch (e) {
      setErrorMsg('Candidate services are currently offline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.createCandidate(formData);
      showSuccess('Nominee registered successfully.');
      setIsAddOpen(false);
      loadData();
      setFormData({ name: '', party_name: '', party_symbol: '', biography: '', election_id: '' });
    } catch (err) {
      showError('Failed to register nominee.');
    }
  };

  const electionOptions = elections.map((e) => ({
    label: e.name,
    value: e.id,
  }));

  const headers = ['Nominee', 'Party affiliation', 'Symbol', 'Assigned Election'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Candidates & Nominees Registry</h1>
          <p className="text-xs text-slate-500 mt-1">Manage contesting nominees, party allocations, and biographies.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4.5 w-4.5 mr-1" /> Add Nominee
        </Button>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      <Table
        headers={headers}
        data={candidates}
        isLoading={isLoading}
        renderRow={(cand) => (
          <tr key={cand.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-805/30 transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <span className="font-semibold text-xs text-slate-805 dark:text-slate-205">{cand.name}</span>
              </div>
            </td>
            <td className="px-6 py-4 text-xs font-semibold">
              {cand.party_name}
            </td>
            <td className="px-6 py-4 text-xs font-mono">
              {cand.party_symbol}
            </td>
            <td className="px-6 py-4 text-xs font-medium">
              {cand.election_name || 'Unassigned'}
            </td>
          </tr>
        )}
      />

      {/* Add nominee Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register Contesting Nominee">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nominee Name"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter full name"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Party Name"
              id="partyName"
              value={formData.party_name}
              onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
              placeholder="e.g. Citizen Alliance"
              required
            />
            <Input
              label="Party Symbol Tag"
              id="partySymbol"
              value={formData.party_symbol}
              onChange={(e) => setFormData({ ...formData, party_symbol: e.target.value.toUpperCase() })}
              placeholder="e.g. CAP"
              required
            />
          </div>
          
          <Select
            id="electionId"
            label="Assign to Election Session"
            placeholder="Select election..."
            options={electionOptions}
            value={formData.election_id}
            onChange={(e) => setFormData({ ...formData, election_id: e.target.value })}
            required
          />

          <div className="flex flex-col gap-1.5 text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-350">Biography & Credentials</label>
            <textarea
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-750 dark:bg-gov-cardDark text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-blue dark:focus:ring-gov-gold min-h-[80px]"
              value={formData.biography}
              onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
              placeholder="Nominee education, background, achievements..."
              required
            ></textarea>
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Confirm Nominee
          </Button>
        </form>
      </Modal>
    </div>
  );
}

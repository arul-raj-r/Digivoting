import { useState, useEffect } from 'react';
import { Search, Eye, CheckCircle2, AlertOctagon, UserX } from 'lucide-react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import Select from '../../components/forms/Select';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function AdminVoters() {
  const { showSuccess, showError } = useToast();
  const [voters, setVoters] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadVoters = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await adminService.getVotersList({
        page,
        search,
        status: statusFilter,
      });
      // Expected structure: { results: [{ id, full_name, email, verification_status, identity_status, constituency_name, account_status, created_at }, ...], total_pages }
      setVoters(data.results || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setErrorMsg('Voter operations API currently offline.');
      setVoters([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVoters();
  }, [page, search, statusFilter]);

  const handleVerify = async (userId) => {
    try {
      await adminService.verifyVoter(userId);
      showSuccess('Voter profile certified successfully.');
      loadVoters();
    } catch (e) {
      showError('Action failed. Verify administrative permissions.');
    }
  };

  const handleSuspend = async (userId) => {
    try {
      await adminService.suspendVoter(userId);
      showSuccess('Voter profile suspended.');
      loadVoters();
    } catch (e) {
      showError('Action failed.');
    }
  };

  const headers = [
    'User Profile',
    'Verification Status',
    'Identity Link',
    'Constituency',
    'Account Status',
    'Registration Date',
    'Actions',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Citizen Voters Directory</h1>
        <p className="text-xs text-slate-500 mt-1">Review registrations, manage eligibility rolls, and moderate accounts.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          onClear={() => setSearch('')}
          placeholder="Search by name, email, or voter card..."
          className="max-w-md"
        />

        <Select
          id="statusFilter"
          placeholder="All Statuses"
          options={[
            { label: 'All Statuses', value: '' },
            { label: 'Verified Only', value: 'verified' },
            { label: 'Unverified', value: 'unverified' },
            { label: 'Suspended', value: 'suspended' },
          ]}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-48"
        />
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      <Table
        headers={headers}
        data={voters}
        isLoading={isLoading}
        renderRow={(voter) => (
          <tr key={voter.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-805/30 transition-colors">
            <td className="px-6 py-4">
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-slate-850 dark:text-slate-200">{voter.full_name}</span>
                <span className="text-[10px] text-slate-450">{voter.email}</span>
              </div>
            </td>
            <td className="px-6 py-4">
              <StatusBadge status={voter.verification_status} />
            </td>
            <td className="px-6 py-4">
              <span className="text-xs font-semibold">{voter.identity_status || 'NOT LINKED'}</span>
            </td>
            <td className="px-6 py-4">
              <span className="text-xs font-medium">{voter.constituency_name || 'Unassigned'}</span>
            </td>
            <td className="px-6 py-4">
              <StatusBadge status={voter.account_status} />
            </td>
            <td className="px-6 py-4 text-xs text-slate-450">
              {voter.created_at}
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                {voter.verification_status !== 'VERIFIED' && (
                  <button
                    onClick={() => handleVerify(voter.id)}
                    className="p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                    title="Certify Voter"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
                {voter.account_status !== 'SUSPENDED' && (
                  <button
                    onClick={() => handleSuspend(voter.id)}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    title="Suspend Profile"
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        )}
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}

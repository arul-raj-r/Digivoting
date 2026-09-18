import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { electionsApi } from '../../api/elections';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { 
  Users, 
  UserPlus, 
  UploadCloud, 
  Trash2, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Lock,
  FileSpreadsheet,
  Download,
  Loader2,
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function VoterConfiguration() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [voters, setVoters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const [singleError, setSingleError] = useState(null);
  const [singleSuccess, setSingleSuccess] = useState(null);

  // Bulk Upload state
  const [bulkFile, setBulkFile] = useState(null);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState(null);

  // Delete state
  const [voterToDelete, setVoterToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [elData, voterData] = await Promise.all([
        electionsApi.getElection(id),
        electionsApi.getEligibleVoters(id)
      ]);
      setElection(elData);
      setVoters(Array.isArray(voterData?.results) ? voterData.results : (Array.isArray(voterData) ? voterData : []));
    } catch (err) {
      console.error('Error loading voter configuration:', err);
      setError(err.message || 'Could not load voter roll from the server.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isLocked = election?.is_locked || ['active', 'completed', 'cancelled'].includes(election?.status);

  // Single Voter Add
  const handleSingleAdd = async (e) => {
    e.preventDefault();
    setSingleError(null);
    setSingleSuccess(null);

    if (isLocked) {
      setSingleError('Voter roster is locked and cannot be modified.');
      return;
    }

    const email = singleEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setSingleError('Please enter a valid member email address.');
      return;
    }

    setIsAddingSingle(true);
    try {
      const newVoter = await electionsApi.addEligibleVoter(id, { email });
      setVoters(prev => [newVoter, ...prev]);
      setSingleSuccess(`Member "${email}" successfully added.`);
      setSingleEmail('');
    } catch (err) {
      const msg = err.response?.data?.email?.[0] || err.response?.data?.error || err.message || 'Failed to add voter.';
      setSingleError(msg);
    } finally {
      setIsAddingSingle(false);
    }
  };

  // Bulk CSV Upload
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    setBulkError(null);
    setBulkResult(null);

    if (isLocked) {
      setBulkError('Voter roster is locked and cannot be modified.');
      return;
    }

    if (!bulkFile) {
      setBulkError('Please choose a .csv file to upload.');
      return;
    }

    setIsUploadingBulk(true);
    const formData = new FormData();
    formData.append('file', bulkFile);

    try {
      const result = await electionsApi.bulkUploadVoters(id, formData);
      setBulkResult(result);
      setBulkFile(null);
      // Reload voter list
      const updatedVoters = await electionsApi.getEligibleVoters(id);
      setVoters(Array.isArray(updatedVoters?.results) ? updatedVoters.results : []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to process CSV upload.';
      setBulkError(msg);
    } finally {
      setIsUploadingBulk(false);
    }
  };

  // Delete Voter
  const confirmDeleteVoter = async () => {
    if (!voterToDelete) return;
    setIsDeleting(true);
    try {
      await electionsApi.deleteEligibleVoter(id, voterToDelete.id);
      setVoters(prev => prev.filter(v => v.id !== voterToDelete.id));
      setVoterToDelete(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove voter.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sample CSV Download helper
  const downloadSampleCsv = () => {
    const csvContent = 'student_id,full_name,email,mobile\nSTU-2026-001,Aarav Sharma,aarav.sharma@institution.edu,+919876543210\nSTU-2026-002,Priya Patel,priya.patel@institution.edu,+919876543211\nSTU-2026-003,Rohan Mehta,rohan.mehta@institution.edu,+919876543212\nSTU-2026-004,Sneha Rao,sneha.rao@institution.edu,+919876543213';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_voters.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="table" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState 
          title="Unable to Load Voter Roster"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  const filteredVoters = voters.filter(v => {
    const email = (v.email || '').toLowerCase();
    return email.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Back Link */}
      <div>
        <Link 
          to={`/creator/elections/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Election Hub</span>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Eligible Members Roster
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Election: <span className="font-semibold text-slate-700 dark:text-slate-300">{election?.title}</span> • {voters.length} registered members
          </p>
        </div>

        {isLocked && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <Lock className="w-4 h-4" />
            <span>Roster Locked</span>
          </div>
        )}
      </div>

      {/* Add Voters Section (Single + CSV Bulk) */}
      {!isLocked && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Add Single Member */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Add Member by Email</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the member's email address. They will be authorized to cast one ballot.
            </p>

            {singleError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{singleError}</span>
              </div>
            )}

            {singleSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{singleSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSingleAdd} className="space-y-3">
              <input
                type="email"
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                placeholder="member.email@campus.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:text-white"
              />
              <button
                type="submit"
                disabled={isAddingSingle}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAddingSingle ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>Add Member to Roster</span>
              </button>
            </form>
          </div>

          {/* 2. Bulk Upload via CSV */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Bulk Upload via CSV</span>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Sample CSV</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Upload a spreadsheet with an <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">email</code> column. Duplicates will be safely skipped.
              </p>
            </div>

            {bulkError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            <form onSubmit={handleBulkUpload} className="space-y-3">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/40 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
              />
              <button
                type="submit"
                disabled={isUploadingBulk || !bulkFile}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploadingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                <span>Process CSV Upload</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Result Banner */}
      {bulkResult && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>CSV Batch Processing Report</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
              <p className="text-base font-black">{bulkResult.total_rows_processed ?? ((bulkResult.valid_count || 0) + (bulkResult.duplicate_count || 0) + (bulkResult.invalid_count || 0))}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Total Rows</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/40">
              <p className="text-base font-black">{bulkResult.valid_count ?? bulkResult.success_count ?? 0}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Valid Rows</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40">
              <p className="text-base font-black">{bulkResult.duplicate_count ?? bulkResult.skipped_count ?? 0}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Duplicate Rows</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/40">
              <p className="text-base font-black">{bulkResult.invalid_count ?? bulkResult.failed_count ?? 0}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Invalid Rows</p>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800/40 col-span-2 sm:col-span-1">
              <p className="text-base font-black">{bulkResult.imported_count ?? bulkResult.success_count ?? 0}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">Imported Rows</p>
            </div>
          </div>

          {Array.isArray(bulkResult.error_rows) && bulkResult.error_rows.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-rose-600 mb-1">Failed Row Details:</p>
              <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-slate-500 font-mono">
                {bulkResult.error_rows.map((err, idx) => (
                  <p key={idx}>Row {err.row}: {err.email || 'Empty'} — {err.reason}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roster Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter members by email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:text-white"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing {filteredVoters.length} of {voters.length} members
          </div>
        </div>

        {filteredVoters.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={searchQuery ? "No members match your filter" : "No eligible members added"}
              description={searchQuery ? "Try searching with a different keyword." : "Add members using the form or CSV uploader above."}
              actionLabel={searchQuery ? "Clear search" : null}
              onAction={searchQuery ? () => setSearchQuery('') : null}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-3 px-4">Member Email</th>
                  <th className="py-3 px-4">Voting Status</th>
                  <th className="py-3 px-4">Registered Date</th>
                  {!isLocked && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredVoters.map((voter) => (
                  <tr key={voter.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {voter.email}
                    </td>
                    <td className="py-3 px-4">
                      {voter.has_voted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ballot Cast</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <span>Not Voted Yet</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {voter.added_at ? new Date(voter.added_at).toLocaleDateString() : '—'}
                    </td>
                    {!isLocked && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setVoterToDelete(voter)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove from roster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {voterToDelete && (
        <ConfirmDialog
          isOpen={!!voterToDelete}
          title="Remove Member from Roster"
          message={`Are you sure you want to remove "${voterToDelete.email}" from the eligible voter list? They will no longer be able to cast a ballot.`}
          confirmLabel="Remove Member"
          cancelLabel="Cancel"
          onConfirm={confirmDeleteVoter}
          onCancel={() => setVoterToDelete(null)}
          isLoading={isDeleting}
          variant="danger"
        />
      )}
    </div>
  );
}

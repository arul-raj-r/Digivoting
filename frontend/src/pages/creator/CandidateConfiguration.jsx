import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { electionsApi } from '../../api/elections';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { 
  UserCheck, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Edit, 
  ArrowLeft, 
  Lock, 
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';

export default function CandidateConfiguration() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    party_or_affiliation: '',
    bio: '',
    photo: null
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formError, setFormError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [elData, candsData] = await Promise.all([
        electionsApi.getElection(id),
        electionsApi.getCandidates(id)
      ]);
      setElection(elData);
      setCandidates(Array.isArray(candsData) ? candsData : (candsData?.results || []));
    } catch (err) {
      console.error('Error loading candidates:', err);
      setError(err.message || 'Could not load candidates from the server.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isLocked = election?.is_locked || ['active', 'completed', 'cancelled'].includes(election?.status);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCandidate(null);
    setFormData({ full_name: '', party_or_affiliation: '', bio: '', photo: null });
    setPhotoPreview(null);
    setFormError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cand) => {
    setEditingCandidate(cand);
    setFormData({
      full_name: cand.full_name || cand.name || '',
      party_or_affiliation: cand.party_or_affiliation || '',
      bio: cand.bio || '',
      photo: null
    });
    setPhotoPreview(cand.photo_url || cand.photo || null);
    setFormError(null);
    setModalOpen(true);
  };

  // Submit Candidate Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (isLocked) {
      setFormError('Candidate roster is locked and cannot be modified.');
      return;
    }

    if (!formData.full_name.trim()) {
      setFormError('Candidate full name is required.');
      return;
    }

    setIsSaving(true);
    const dataToSend = new FormData();
    dataToSend.append('full_name', formData.full_name.trim());
    dataToSend.append('party_or_affiliation', formData.party_or_affiliation.trim());
    dataToSend.append('bio', formData.bio.trim());
    if (formData.photo) {
      dataToSend.append('photo', formData.photo);
    }

    try {
      if (editingCandidate) {
        const updated = await electionsApi.updateCandidate(id, editingCandidate.id, dataToSend);
        setCandidates(prev => prev.map(c => c.id === editingCandidate.id ? updated : c));
      } else {
        const created = await electionsApi.createCandidate(id, dataToSend);
        setCandidates(prev => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.full_name?.[0] || err.response?.data?.photo?.[0] || err.message || 'Failed to save candidate.';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Candidate
  const confirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    setIsDeleting(true);
    try {
      await electionsApi.deleteCandidate(id, candidateToDelete.id);
      setCandidates(prev => prev.filter(c => c.id !== candidateToDelete.id));
      setCandidateToDelete(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove candidate.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Move Candidate Up / Down
  const handleMove = async (index, direction) => {
    if (isLocked) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= candidates.length) return;

    const newCandidates = [...candidates];
    const temp = newCandidates[index];
    newCandidates[index] = newCandidates[targetIndex];
    newCandidates[targetIndex] = temp;

    setCandidates(newCandidates);

    try {
      const candidateIds = newCandidates.map(c => c.id);
      await electionsApi.reorderCandidates(id, candidateIds);
    } catch (err) {
      console.error('Failed to persist candidate reorder:', err);
      // Revert if API failed
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState 
          title="Unable to Load Candidates"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Back link */}
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
              <UserCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Nominees / Candidates
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure contestants and ballot display order for <span className="font-semibold text-slate-700 dark:text-slate-300">{election?.title}</span>.
          </p>
        </div>

        {!isLocked ? (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Nominee</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <Lock className="w-4 h-4" />
            <span>Roster Locked</span>
          </div>
        )}
      </div>

      {/* Candidate Cards */}
      {candidates.length === 0 ? (
        <EmptyState
          title="No Candidates Added Yet"
          description="Add nominees who will appear on the ballot for voters to select."
          actionLabel={isLocked ? null : "Add Candidate"}
          onAction={isLocked ? null : handleOpenAdd}
        />
      ) : (
        <div className="space-y-3">
          {candidates.map((cand, idx) => (
            <div
              key={cand.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-start gap-4">
                {/* Order indicator */}
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                  #{idx + 1}
                </div>

                {/* Photo or Initials */}
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0 flex items-center justify-center font-bold text-base border border-indigo-100 dark:border-indigo-900">
                  {cand.photo_url || cand.photo ? (
                    <img src={cand.photo_url || cand.photo} alt={cand.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(cand.full_name || cand.name || 'C').charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {cand.full_name || cand.name}
                    </h3>
                    {cand.party_or_affiliation && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {cand.party_or_affiliation}
                      </span>
                    )}
                  </div>

                  {cand.bio && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed max-w-xl">
                      {cand.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {!isLocked && (
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {/* Reorder Buttons */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === candidates.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cand)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit Candidate"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setCandidateToDelete(cand)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Remove Candidate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Candidate Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCandidate ? 'Edit Nominee Details' : 'Add New Nominee'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Sarah Chen"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Affiliation / Department / Slate
                </label>
                <input
                  type="text"
                  value={formData.party_or_affiliation}
                  onChange={(e) => setFormData({ ...formData, party_or_affiliation: e.target.value })}
                  placeholder="e.g. Computer Science Dept, Marketing Team, Independent"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Biography & Platform Statement
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Briefly state key goals, background, or qualifications for voters..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Photo Upload (JPG / PNG, max 5MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({ ...formData, photo: file });
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/40 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                />
                {photoPreview && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-xl object-cover border" />
                    <span className="text-[11px] text-slate-400">Photo preview</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{editingCandidate ? 'Save Changes' : 'Add Nominee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {candidateToDelete && (
        <ConfirmDialog
          isOpen={!!candidateToDelete}
          title="Remove Nominee from Ballot"
          message={`Are you sure you want to remove "${candidateToDelete.full_name || candidateToDelete.name}" from the ballot?`}
          confirmLabel="Remove Nominee"
          cancelLabel="Cancel"
          onConfirm={confirmDeleteCandidate}
          onCancel={() => setCandidateToDelete(null)}
          isLoading={isDeleting}
          variant="danger"
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import electionsApi from '../../api/elections';
import votingApi from '../../api/voting';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { 
  Trophy, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Scale, 
  ShieldCheck, 
  Eye, 
  Send,
  Clock,
  RefreshCw,
  User,
  Printer,
  RotateCcw,
  EyeOff
} from 'lucide-react';

export default function ElectionResultsCreator() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [electionData, resultsData] = await Promise.all([
        electionsApi.getElection(id),
        votingApi.getResults(id).catch(err => {
          // If 404 or preview response indicating not available yet
          return err.response?.data || { available: false, message: 'Results are not yet tabulated.' };
        }),
      ]);
      setElection(electionData);
      setResults(resultsData);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load election results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="metrics" count={3} />
        <LoadingSkeleton variant="table" count={4} />
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState 
          title="Results tabulation unavailable"
          message={error || 'Could not load results for this election.'}
          onRetry={fetchData}
        />
      </div>
    );
  }

  const isAvailable = results?.available !== false && (results?.results || results?.candidate_results);
  const isPublished = election.is_published || results?.is_published;
  const isPreview = results?.preview || !isPublished;

  const handlePublishResults = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      await votingApi.publishResults(id);
      setShowPublishDialog(false);
      setPublishSuccess('Results successfully certified and published to all voters.');
      await fetchData();
      setTimeout(() => setPublishSuccess(false), 5000);
    } catch (err) {
      setPublishError(err.response?.data?.error || err.message || 'Failed to publish election results.');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublishResults = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      await votingApi.unpublishResults(id);
      setShowUnpublishDialog(false);
      setPublishSuccess('Results unpublished. They are now in staged organizer preview.');
      await fetchData();
      setTimeout(() => setPublishSuccess(false), 5000);
    } catch (err) {
      setPublishError(err.response?.data?.error || err.message || 'Failed to unpublish results.');
    } finally {
      setPublishing(false);
    }
  };

  const handleRecalculateTally = async () => {
    setRecalculating(true);
    setPublishError(null);
    try {
      await votingApi.generateResults(id);
      setPublishSuccess('Tally successfully recalculated from cryptographic ballots.');
      await fetchData();
      setTimeout(() => setPublishSuccess(false), 5000);
    } catch (err) {
      setPublishError(err.response?.data?.error || err.message || 'Failed to recalculate results.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      await votingApi.downloadResultsCsv(id);
    } catch (err) {
      alert('Failed to download results CSV: ' + (err.response?.data?.error || err.message));
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleOpenPdf = async () => {
    setOpeningPdf(true);
    try {
      await votingApi.openResultsPdf(id);
    } catch (err) {
      alert('Failed to open PDF report: ' + (err.response?.data?.error || err.message));
    } finally {
      setOpeningPdf(false);
    }
  };

  const turnout = results?.turnout || {
    total_eligible_voters: election.total_eligible_voters || 0,
    total_ballots_cast: results?.total_ballots_cast || 0,
    turnout_percentage: 0,
  };

  const candidateList = results?.results || [];
  const winner = results?.winner;
  const isTied = !!results?.tie;
  const tiedCandidates = results?.tied_candidates || [];
  const smallElectorateDisclaimer = results?.small_electorate_disclaimer;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Back to Hub */}
      <div>
        <Link 
          to={`/creator/elections/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Election Command Center</span>
        </Link>
      </div>

      {/* Preview / Staged Banner (If Not Yet Published) */}
      {isAvailable && isPreview && (
        <div className="bg-amber-500/10 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
              <Eye className="w-5 h-5" />
              <span>Organizer Preview Mode — Not Yet Published to Members</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Tabulated totals are displayed for administrative review. Results remain hidden from organization members until you certify and publish them.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPublishDialog(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-md flex items-center gap-2 shrink-0 transition-all hover:scale-[1.01]"
          >
            <Send className="w-4 h-4" />
            <span>Publish Results</span>
          </button>
        </div>
      )}

      {publishSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Results successfully published! Members can now view certified outcomes in their portal.</span>
        </div>
      )}

      {publishError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{publishError}</span>
        </div>
      )}

      {/* Results Header */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Module 8 of 8
              </span>
              {isPublished ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Official Certified Publication
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  Staged / Pre-Publication
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Official Certified Results
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Candidate ballot tallies and certified breakdown for <span className="font-semibold text-slate-800 dark:text-slate-200">"{election.title}"</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRecalculateTally}
              disabled={recalculating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
              title="Recalculate tally from anonymous cryptographic ballots"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              <span>{recalculating ? 'Recalculating...' : 'Recalculate Tally'}</span>
            </button>
            <button
              type="button"
              disabled={!isAvailable || openingPdf}
              onClick={handleOpenPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{openingPdf ? 'Opening...' : 'Print / PDF'}</span>
            </button>
            <button
              type="button"
              disabled={!isAvailable || downloadingCsv}
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingCsv ? 'Exporting...' : 'CSV'}</span>
            </button>
            {isPublished && (
              <button
                type="button"
                onClick={() => setShowUnpublishDialog(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors"
                title="Unpublish results back to organizer preview"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Unpublish</span>
              </button>
            )}
          </div>
        </div>

        {/* Turnout Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[11px]">Total Ballots Cast</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {turnout.total_ballots_cast}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[11px]">Eligible Members</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {turnout.total_eligible_voters}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[11px]">Final Turnout Rate</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {turnout.turnout_percentage}%
            </span>
          </div>
        </div>
      </div>

      {!isAvailable ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center space-y-3">
          <Clock className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Results Tabulation In Progress or Awaiting Close
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {results?.message || 'Candidate vote counts are strictly sealed while polling is active. Tally calculation occurs automatically once the official closing time is reached or upon election conclusion.'}
          </p>
        </div>
      ) : (
        <>
          {/* Small Electorate Notice */}
          {smallElectorateDisclaimer && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Small Electorate Privacy Notice (&lt;10 Ballots Cast)</p>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  {smallElectorateDisclaimer}
                </p>
              </div>
            </div>
          )}

          {/* Winner / Tied Card */}
          {isTied ? (
            <div className="bg-amber-500/10 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                <Scale className="w-5 h-5" />
                <span>Election Ended in a Tie (Equality of Votes)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                The certified tally produced exact vote parity between the leading candidates. Organizational tie-breaking bylaws apply.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {tiedCandidates.map(c => (
                  <div key={c.candidate_id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-700">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">{c.full_name}</span>
                    <span className="text-[11px] text-slate-500 block">{c.party_or_affiliation || 'Independent'}</span>
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
                      {c.vote_count} votes ({c.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : winner ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Elected / Certified Winner
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {winner.full_name}
                  </h2>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {winner.party_or_affiliation || 'Independent'}
                  </p>
                </div>
              </div>
              <div className="sm:text-right shrink-0">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
                  {winner.percentage}%
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {winner.vote_count} total votes
                </span>
              </div>
            </div>
          ) : null}

          {/* Candidate Breakdown Roster */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5 transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Complete Candidate Vote Tally
            </h2>

            <div className="space-y-4">
              {candidateList.map(candidate => {
                const isCandidateWinner = winner?.candidate_id === candidate.candidate_id;
                const isCandidateTied = tiedCandidates.some(t => t.candidate_id === candidate.candidate_id);

                return (
                  <div key={candidate.candidate_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {candidate.photo_url ? (
                          <img src={candidate.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {candidate.full_name}
                        </span>
                        <span className="text-slate-400 font-normal">
                          ({candidate.party_or_affiliation || 'Independent'})
                        </span>
                        {isCandidateWinner && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            Winner
                          </span>
                        )}
                        {isCandidateTied && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                            Tied
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {candidate.vote_count} votes
                        </span>
                        <span className="text-slate-400 ml-1.5 font-medium">
                          ({candidate.percentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCandidateWinner
                            ? 'bg-emerald-500'
                            : isCandidateTied
                            ? 'bg-amber-500'
                            : 'bg-sky-600 dark:bg-sky-500'
                        }`}
                        style={{ width: `${Math.max(candidate.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishDialog && (
        <ConfirmDialog
          isOpen={showPublishDialog}
          title="Publish Certified Results?"
          message="Publishing results makes the certified candidate totals visible to all organization members on the voting portal. This action is recorded in the election audit trail."
          confirmLabel={publishing ? "Publishing..." : "Certify & Publish Now"}
          variant="primary"
          onConfirm={handlePublishResults}
          onCancel={() => setShowPublishDialog(false)}
        />
      )}

      {/* Unpublish Confirmation Modal */}
      {showUnpublishDialog && (
        <ConfirmDialog
          isOpen={showUnpublishDialog}
          title="Unpublish Results?"
          message="Unpublishing will retract certified totals from public member view and return the contest to staged organizer review mode. You can certify and publish again at any time."
          confirmLabel={publishing ? "Unpublishing..." : "Unpublish Results"}
          variant="danger"
          onConfirm={handleUnpublishResults}
          onCancel={() => setShowUnpublishDialog(false)}
        />
      )}

    </div>
  );
}

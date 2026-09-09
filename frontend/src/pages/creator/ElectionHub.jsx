import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { electionsApi } from '../../api/elections';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Vote, 
  Users, 
  UserCheck, 
  Shield, 
  Calendar, 
  PlayCircle, 
  Activity, 
  FileText, 
  BarChart3, 
  Clock, 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function ElectionHub() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [voterCount, setVoterCount] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchElectionDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [elData, votersData, candsData] = await Promise.all([
        electionsApi.getElection(id),
        electionsApi.getEligibleVoters(id).catch(() => ({ count: 0, results: [] })),
        electionsApi.getCandidates(id).catch(() => [])
      ]);
      setElection(elData);
      setVoterCount(votersData?.count ?? (Array.isArray(votersData?.results) ? votersData.results.length : 0));
      setCandidateCount(Array.isArray(candsData) ? candsData.length : (candsData?.count || 0));
    } catch (err) {
      console.error('Error fetching election hub data:', err);
      setError(err.message || 'Failed to load election details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchElectionDetails();
  }, [fetchElectionDetails]);

  // Live countdown timer for scheduled elections
  useEffect(() => {
    if (election?.status === 'scheduled' && election?.start_datetime) {
      const updateCountdown = () => {
        const diff = new Date(election.start_datetime) - new Date();
        if (diff <= 0) {
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setCountdown({ days, hours, minutes, seconds });
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [election?.status, election?.start_datetime]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="cards" count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState 
          title="Election Hub Unavailable"
          message={error}
          onRetry={fetchElectionDetails}
        />
      </div>
    );
  }

  if (!election) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Election Not Found</h2>
        <Link to="/creator/elections" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          Return to Elections Directory
        </Link>
      </div>
    );
  }

  const isLocked = election.is_locked;
  const isDraft = election.status === 'draft';
  const isConfigured = election.status === 'configured';
  const isScheduled = election.status === 'scheduled';
  const isActive = election.status === 'active';
  const isCompleted = election.status === 'completed';
  const isCancelled = election.status === 'cancelled';

  const canEditConfig = (isDraft || isConfigured) && !isLocked;
  const canEditSchedule = (isDraft || isConfigured || isScheduled) && !isLocked;

  const modules = [
    {
      id: 'voters',
      title: '1. Eligible Members Roll',
      description: 'Add members individually by email or in bulk via CSV spreadsheet.',
      icon: Users,
      countBadge: `${voterCount} registered`,
      path: `/creator/elections/${id}/voters`,
      enabled: canEditConfig,
      disabledReason: isLocked || isActive || isCompleted || isCancelled
        ? 'Locked: voter roll is locked while election is active or completed.'
        : null
    },
    {
      id: 'candidates',
      title: '2. Nominees / Candidates',
      description: 'Configure running candidates with photos, bios, department/affiliation, and display order.',
      icon: UserCheck,
      countBadge: `${candidateCount} candidates`,
      path: `/creator/elections/${id}/candidates`,
      enabled: canEditConfig,
      disabledReason: isLocked || isActive || isCompleted || isCancelled
        ? 'Locked: candidate roster cannot be modified after launch.'
        : null
    },
    {
      id: 'verification',
      title: '3. Verification Settings',
      description: 'Configure voter verification checks such as Email OTP verification.',
      icon: Shield,
      path: `/creator/elections/${id}/verification`,
      enabled: canEditConfig,
      disabledReason: isLocked || isActive || isCompleted || isCancelled
        ? 'Locked: security policies are permanently locked once scheduled/active.'
        : null
    },
    {
      id: 'schedule',
      title: '4. Schedule & Rules',
      description: 'Set voting start and end times, and configure results reveal timing.',
      icon: Calendar,
      path: `/creator/elections/${id}/schedule`,
      enabled: canEditSchedule,
      disabledReason: isActive || isCompleted || isCancelled
        ? 'Locked: schedule cannot be modified once voting has begun.'
        : null
    },
    {
      id: 'control',
      title: '5. Launch & Emergency Control',
      description: 'Manually launch scheduled elections or execute an emergency stop with reason.',
      icon: PlayCircle,
      path: `/creator/elections/${id}/control`,
      enabled: isScheduled || isActive,
      disabledReason: isDraft || isConfigured
        ? 'Complete configuration and set schedule before launch.'
        : (isCompleted || isCancelled ? 'Election has concluded.' : null)
    },
    {
      id: 'monitoring',
      title: '6. Live Turnout Monitoring',
      description: 'View real-time participation rates, total ballots cast, and countdown clock.',
      icon: Activity,
      path: `/creator/elections/${id}/monitoring`,
      enabled: isActive || isCompleted,
      disabledReason: 'Turnout monitoring activates once voting starts.'
    },
    {
      id: 'audit',
      title: '7. Audit Trail',
      description: 'Review timestamped log of configuration edits, launches, and operations.',
      icon: FileText,
      path: `/creator/elections/${id}/audit-log`,
      enabled: true
    },
    {
      id: 'results',
      title: '8. Certified Results & Reports',
      description: 'Review decrypted tallies, verify vote counts, publish results, and export CSV.',
      icon: BarChart3,
      path: `/creator/elections/${id}/results`,
      enabled: isCompleted,
      disabledReason: 'Results become available once voting is completed.'
    }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Back Link */}
      <div>
        <Link 
          to="/creator/elections"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Elections Directory</span>
        </Link>
      </div>

      {/* Main Command Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {election.title || election.name}
              </h1>
              <StatusBadge status={election.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ID: <span className="font-mono text-[11px]">{election.id}</span> • Type: <span className="font-semibold capitalize">{election.election_type}</span>
            </p>
          </div>

          {/* Quick Actions depending on status */}
          <div className="flex items-center gap-2">
            {isScheduled && (
              <Link
                to={`/creator/elections/${id}/control`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Launch Election</span>
              </Link>
            )}

            {isActive && (
              <Link
                to={`/creator/elections/${id}/monitoring`}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 animate-pulse"
              >
                <Activity className="w-4 h-4" />
                <span>Live Monitoring</span>
              </Link>
            )}

            {isCompleted && (
              <Link
                to={`/creator/elections/${id}/results`}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                <BarChart3 className="w-4 h-4" />
                <span>View Results</span>
              </Link>
            )}
          </div>
        </div>

        {/* Description */}
        {election.description && (
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
            {election.description}
          </p>
        )}

        {/* Live Countdown Banner for Scheduled elections */}
        {isScheduled && (
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-xs font-bold">Scheduled to Start Automatically</p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  {new Date(election.start_datetime).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs font-bold">
              <span className="px-2 py-1 rounded bg-white dark:bg-slate-800 shadow-sm">{countdown.days}d</span>:
              <span className="px-2 py-1 rounded bg-white dark:bg-slate-800 shadow-sm">{countdown.hours}h</span>:
              <span className="px-2 py-1 rounded bg-white dark:bg-slate-800 shadow-sm">{countdown.minutes}m</span>:
              <span className="px-2 py-1 rounded bg-white dark:bg-slate-800 shadow-sm">{countdown.seconds}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid of 8 Hub Management Modules */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
          Election Management Modules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map(mod => {
            const Icon = mod.icon;
            const content = (
              <div
                className={`p-5 rounded-2xl border transition-all h-full flex flex-col justify-between ${
                  mod.enabled
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:shadow-md cursor-pointer group'
                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      mod.enabled 
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {mod.countBadge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {mod.countBadge}
                      </span>
                    )}

                    {!mod.enabled && (
                      <Lock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <h3 className={`text-sm font-bold mb-1.5 ${
                    mod.enabled 
                      ? 'text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {mod.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                  {mod.enabled ? (
                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <span>Open Configuration</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      {mod.disabledReason || 'Unavailable in current status'}
                    </span>
                  )}
                </div>
              </div>
            );

            return mod.enabled ? (
              <Link key={mod.id} to={mod.path}>
                {content}
              </Link>
            ) : (
              <div key={mod.id}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

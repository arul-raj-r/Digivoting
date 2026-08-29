import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, ShieldAlert, Award, FileText, ChevronLeft } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import Select from '../../components/forms/Select';
import { candidateService } from '../../services/candidateService';

export default function CandidateList() {
  const { id } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadCandidates() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const data = await candidateService.getCandidatesByElection(id);
        setCandidates(data || []);
      } catch (err) {
        setErrorMsg('Candidates data is currently offline. Verify connection to backend REST API.');
      } finally {
        setIsLoading(false);
      }
    }
    loadCandidates();
  }, [id]);

  // Client side sorting & filtering
  const filteredCandidates = candidates
    .filter((cand) => {
      const matchesSearch = cand.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesParty = partyFilter ? cand.party_name === partyFilter : true;
      return matchesSearch && matchesParty;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'party') {
        return a.party_name.localeCompare(b.party_name);
      }
      return 0;
    });

  // Extract unique parties for the filter select
  const parties = [
    { label: 'All Parties', value: '' },
    ...Array.from(new Set(candidates.map((c) => c.party_name)))
      .filter(Boolean)
      .map((p) => ({ label: p, value: p })),
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Link
          to={`/elections/${id}`}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Candidates Registry</h1>
          <p className="text-xs text-slate-500 mt-1">Review candidates and operational manifestos contesting this election.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search by candidate name..."
          className="max-w-md"
        />
        
        <div className="flex gap-3 w-full sm:w-auto">
          <Select
            id="partyFilter"
            placeholder="All Parties"
            options={parties}
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            className="w-full sm:w-40"
          />
          <Select
            id="sortBy"
            placeholder="Sort by"
            options={[
              { label: 'Name (A-Z)', value: 'name' },
              { label: 'Party', value: 'party' },
            ]}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <Alert type="info">No candidates match your filters.</Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((cand) => (
            <Card key={cand.id} title={cand.name} subtitle={`Party: ${cand.party_name}`}>
              <div className="flex gap-4 items-start mb-4">
                <div className="h-16 w-16 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                  {cand.photo_url ? (
                    <img src={cand.photo_url} alt={cand.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Party Symbol</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{cand.party_symbol || 'N/A'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                {cand.biography}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelectedCandidate(cand)}
              >
                View Full Dossier
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Candidate Profile Dossier Modal */}
      <Modal
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title="Candidate Dossier Profile"
        size="lg"
      >
        {selectedCandidate && (
          <div className="space-y-6">
            <div className="flex gap-4 items-center">
              <div className="h-20 w-20 rounded-xl bg-slate-100 dark:bg-slate-800 border flex items-center justify-center text-slate-400 overflow-hidden">
                {selectedCandidate.photo_url ? (
                  <img src={selectedCandidate.photo_url} alt={selectedCandidate.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedCandidate.name}</h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold mt-0.5">
                  Party: {selectedCandidate.party_name} ({selectedCandidate.party_symbol})
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Biography</span>
                <p className="text-slate-650 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg">
                  {selectedCandidate.biography}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" /> Educational Background
                  </span>
                  <p className="font-semibold">{selectedCandidate.education || 'Graduate Degree'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> Manifestos Statement
                  </span>
                  <p className="font-semibold">{selectedCandidate.manifesto || 'Details available via ECI Registry.'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button variant="primary" onClick={() => setSelectedCandidate(null)}>
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

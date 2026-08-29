import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Calendar, Search, ArrowRight } from 'lucide-react';
import Card from '../../components/common/Card';
import Tabs from '../../components/common/Tabs';
import SearchBar from '../../components/common/SearchBar';
import Select from '../../components/forms/Select';
import EmptyState from '../../components/common/EmptyState';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { electionService } from '../../services/electionService';

export default function ElectionList() {
  const [elections, setElections] = useState([]);
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'UPCOMING' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadElections() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        let data = [];
        if (activeTab === 'ACTIVE') {
          data = await electionService.getActiveElections();
        } else if (activeTab === 'UPCOMING') {
          data = await electionService.getUpcomingElections();
        } else {
          data = await electionService.getCompletedElections();
        }
        setElections(data || []);
      } catch (err) {
        setErrorMsg('The election registry is currently unavailable. Please verify connection to the Django API.');
        setElections([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadElections();
  }, [activeTab]);

  const tabs = [
    { label: 'Active Polls', value: 'ACTIVE' },
    { label: 'Scheduled / Upcoming', value: 'UPCOMING' },
    { label: 'Completed Polls', value: 'COMPLETED' },
  ];

  // Client side filtering for demo data or API returned records
  const filteredElections = elections.filter((elec) => {
    const matchesSearch =
      elec.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      elec.constituency_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType ? elec.election_type === filterType : true;
    return matchesSearch && matchesType;
  });

  const electionTypes = [
    { label: 'All Types', value: '' },
    { label: 'General Assembly', value: 'GENERAL' },
    { label: 'Municipal Elections', value: 'MUNICIPAL' },
    { label: 'By-Election', value: 'BY_ELECTION' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Electoral Voting Hub</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, explore, and cast your ballot in constituency-bound elections.
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Filters Area */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search by election name or constituency..."
          className="max-w-md"
        />

        <Select
          id="filterType"
          placeholder="All Types"
          options={electionTypes}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
        </div>
      ) : filteredElections.length === 0 ? (
        <EmptyState
          title="No elections found"
          description="We couldn't retrieve any elections matching your active filters or constituency rolls."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredElections.map((elec) => (
            <Card
              key={elec.id}
              title={elec.name}
              subtitle={`Constituency: ${elec.constituency_name || 'N/A'}`}
              actions={<StatusBadge status={elec.status} />}
            >
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed truncate">
                  {elec.description}
                </p>

                <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    Duration: {elec.start_date} - {elec.end_date}
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  <Link to={`/elections/${elec.id}`} className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full">
                      Details
                    </Button>
                  </Link>
                  {activeTab === 'ACTIVE' && (
                    <Link to={`/elections/${elec.id}/vote`} className="w-full sm:w-auto">
                      <Button variant="primary" size="sm" className="w-full">
                        Proceed to Vote
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Mock Tabulated Results for Elections

export const initialResults = {
  // elec-cmp-5: Normal completed election with clear winner
  'elec-cmp-5': {
    election_id: 'elec-cmp-5',
    title: 'Federation Officers Presidential Ballot 2025',
    total_eligible: 150,
    total_votes_cast: 138,
    turnout_percentage: 92.0,
    is_published: true,
    published_at: '2025-11-03T18:30:00Z',
    is_tied: false,
    small_electorate: false,
    winner: {
      candidate_id: 'cand-cmp-1',
      name: 'Dr. Evelyn Reed',
      party: 'Progressive Alliance',
      votes: 76,
      percentage: 55.07
    },
    candidates: [
      {
        candidate_id: 'cand-cmp-1',
        name: 'Dr. Evelyn Reed',
        party: 'Progressive Alliance',
        votes: 76,
        percentage: 55.07,
        is_winner: true
      },
      {
        candidate_id: 'cand-cmp-2',
        name: 'Marcus Vance',
        party: 'Democratic Coalition',
        votes: 48,
        percentage: 34.78,
        is_winner: false
      },
      {
        candidate_id: 'cand-cmp-3',
        name: 'Sonia Alvarez',
        party: 'Civic Reform Forum',
        votes: 14,
        percentage: 10.15,
        is_winner: false
      }
    ]
  },

  // elec-edge-small: Small Electorate (<10 votes)
  'elec-edge-small': {
    election_id: 'elec-edge-small',
    title: 'Executive Committee Special Resolution Ballot',
    total_eligible: 9,
    total_votes_cast: 8,
    turnout_percentage: 88.89,
    is_published: true,
    published_at: '2026-08-11T18:05:00Z',
    is_tied: false,
    small_electorate: true, // < 10 total ballots cast
    disclaimer: 'Notice: This contest had fewer than 10 ballots cast. Individual voter privacy may be reduced in small electorates.',
    winner: {
      candidate_id: 'cand-sml-1',
      name: 'Adoption of Resolution A-102 (Unanimous Framework)',
      party: 'Executive Resolution',
      votes: 5,
      percentage: 62.5
    },
    candidates: [
      {
        candidate_id: 'cand-sml-1',
        name: 'Adoption of Resolution A-102 (Unanimous Framework)',
        party: 'Executive Resolution',
        votes: 5,
        percentage: 62.5,
        is_winner: true
      },
      {
        candidate_id: 'cand-sml-2',
        name: 'Referral to Standing Legal Sub-Committee',
        party: 'Counter Proposal',
        votes: 3,
        percentage: 37.5,
        is_winner: false
      }
    ]
  },

  // elec-edge-tie: Tied Contest
  'elec-edge-tie': {
    election_id: 'elec-edge-tie',
    title: 'Public Utility Oversight Council Poll',
    total_eligible: 50,
    total_votes_cast: 40,
    turnout_percentage: 80.0,
    is_published: true,
    published_at: '2026-08-07T18:15:00Z',
    is_tied: true,
    tie_candidates: [
      {
        candidate_id: 'cand-tie-1',
        name: 'Ananya Roy',
        party: 'Independent Citizens Group',
        votes: 17,
        percentage: 42.5
      },
      {
        candidate_id: 'cand-tie-2',
        name: 'Kavita Subramanian',
        party: 'Civic Renewal Union',
        votes: 17,
        percentage: 42.5
      }
    ],
    winner: null,
    small_electorate: false,
    candidates: [
      {
        candidate_id: 'cand-tie-1',
        name: 'Ananya Roy',
        party: 'Independent Citizens Group',
        votes: 17,
        percentage: 42.5,
        is_winner: false,
        is_tied: true
      },
      {
        candidate_id: 'cand-tie-2',
        name: 'Kavita Subramanian',
        party: 'Civic Renewal Union',
        votes: 17,
        percentage: 42.5,
        is_winner: false,
        is_tied: true
      },
      {
        candidate_id: 'cand-tie-3',
        name: 'Rohan Deshmukh',
        party: 'Urban Transparency Party',
        votes: 6,
        percentage: 15.0,
        is_winner: false,
        is_tied: false
      }
    ]
  }
};

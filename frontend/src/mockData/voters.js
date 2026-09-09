export const initialVoters = {
  // Active Parliamentary General Election 2026
  'elec-act-1': [
    {
      id: 'vtr-1',
      email: 'voter1@mail.com',
      user_full_name: 'Verified Citizen Voter',
      is_registered_user: true,
      has_voted: false,
      added_at: '2026-08-20T10:30:00Z'
    },
    {
      id: 'vtr-2',
      email: 'arun.kumar@gov.in',
      user_full_name: 'Arun Kumar',
      is_registered_user: true,
      has_voted: true,
      added_at: '2026-08-20T10:35:00Z'
    },
    {
      id: 'vtr-3',
      email: 'priya.nair@citizen.in',
      user_full_name: 'Priya Nair',
      is_registered_user: true,
      has_voted: true,
      added_at: '2026-08-20T10:40:00Z'
    },
    {
      id: 'vtr-4',
      email: 'suresh.raina@mail.com',
      user_full_name: null,
      is_registered_user: false,
      has_voted: false,
      added_at: '2026-08-21T14:15:00Z'
    },
    {
      id: 'vtr-5',
      email: 'neha.singh@outlook.com',
      user_full_name: 'Neha Singh',
      is_registered_user: true,
      has_voted: false,
      added_at: '2026-08-21T14:20:00Z'
    }
  ],

  // Municipal Council Leadership Election
  'elec-cfg-3': [
    {
      id: 'vtr-301',
      email: 'voter1@mail.com',
      user_full_name: 'Verified Citizen Voter',
      is_registered_user: true,
      has_voted: false,
      added_at: '2026-08-26T09:00:00Z'
    },
    {
      id: 'vtr-302',
      email: 'council.member1@city.gov',
      user_full_name: 'Ramesh Sen',
      is_registered_user: true,
      has_voted: false,
      added_at: '2026-08-26T09:05:00Z'
    },
    {
      id: 'vtr-303',
      email: 'council.member2@city.gov',
      user_full_name: null,
      is_registered_user: false,
      has_voted: false,
      added_at: '2026-08-26T09:10:00Z'
    }
  ],

  // Small Electorate (<10 voters)
  'elec-edge-small': [
    { id: 'vtr-s1', email: 'voter1@mail.com', user_full_name: 'Verified Citizen Voter', is_registered_user: true, has_voted: true, added_at: '2026-08-01T10:00:00Z' },
    { id: 'vtr-s2', email: 'exec1@board.org', user_full_name: 'Member 1', is_registered_user: true, has_voted: true, added_at: '2026-08-01T10:00:00Z' },
    { id: 'vtr-s3', email: 'exec2@board.org', user_full_name: 'Member 2', is_registered_user: true, has_voted: true, added_at: '2026-08-01T10:00:00Z' },
    { id: 'vtr-s4', email: 'exec3@board.org', user_full_name: 'Member 3', is_registered_user: true, has_voted: true, added_at: '2026-08-01T10:00:00Z' },
    { id: 'vtr-s5', email: 'exec4@board.org', user_full_name: 'Member 4', is_registered_user: true, has_voted: true, added_at: '2026-08-01T10:00:00Z' },
    { id: 'vtr-s6', email: 'exec5@board.org', user_full_name: 'Member 5', is_registered_user: true, has_voted: true, added_at: '2026-08-01T10:00:00Z' },
    { id: 'vtr-s7', email: 'exec6@board.org', user_full_name: 'Member 6', is_registered_user: true, has_voted: true, added_at: '2026-08-01T10:00:00Z' },
    { id: 'vtr-s8', email: 'exec7@board.org', user_full_name: 'Member 7', is_registered_user: true, has_voted: true, added_at: '2026-08-01T10:00:00Z' },
    { id: 'vtr-s9', email: 'exec8@board.org', user_full_name: 'Member 8', is_registered_user: false, has_voted: false, added_at: '2026-08-01T10:00:00Z' }
  ],

  // Webcam-Blocked Election
  'elec-edge-webcam': [
    {
      id: 'vtr-w1',
      email: 'voter1@mail.com',
      user_full_name: 'Verified Citizen Voter',
      is_registered_user: true,
      has_voted: false,
      added_at: '2026-08-19T10:00:00Z'
    },
    {
      id: 'vtr-w2',
      email: 'bar.delegate1@court.gov.in',
      user_full_name: 'Advocate Sharma',
      is_registered_user: true,
      has_voted: false,
      added_at: '2026-08-19T10:00:00Z'
    }
  ]
};

export const initialCandidates = {
  // Active Parliamentary General Election 2026
  'elec-act-1': [
    {
      id: 'cand-101',
      election_id: 'elec-act-1',
      full_name: 'Aditi Sharma',
      party_or_affiliation: 'Democratic Citizen Coalition',
      bio: 'Former municipal commissioner focused on transparent public budgeting and digital administrative services.',
      photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
      display_order: 1
    },
    {
      id: 'cand-102',
      election_id: 'elec-act-1',
      full_name: 'Rajesh K. Patel',
      party_or_affiliation: 'National Progress Union',
      bio: 'Senior technology governance analyst advancing civic infrastructure and renewable energy legislation.',
      photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
      display_order: 2
    },
    {
      id: 'cand-103',
      election_id: 'elec-act-1',
      full_name: 'Dr. Meera Nambiar',
      party_or_affiliation: 'Independent Alliance',
      bio: 'Public health researcher and education advocate championing constitutional transparency standards.',
      photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=256',
      display_order: 3
    }
  ],

  // State Legislative Assembly By-Election 2026
  'elec-sch-2': [
    {
      id: 'cand-201',
      election_id: 'elec-sch-2',
      full_name: 'Sunil Verma',
      party_or_affiliation: 'Civic Renewal Forum',
      bio: 'Electoral reform activist and civil engineer.',
      photo_url: '',
      display_order: 1
    },
    {
      id: 'cand-202',
      election_id: 'elec-sch-2',
      full_name: 'Kavita Menon',
      party_or_affiliation: 'State Development Party',
      bio: 'Community legal counsel specializing in municipal rights.',
      photo_url: '',
      display_order: 2
    }
  ],

  // Municipal Council Leadership Election
  'elec-cfg-3': [
    {
      id: 'cand-301',
      election_id: 'elec-cfg-3',
      full_name: 'Vikram Joshi',
      party_or_affiliation: 'Independent',
      bio: 'Urban planner and transit sustainability expert.',
      photo_url: '',
      display_order: 1
    },
    {
      id: 'cand-302',
      election_id: 'elec-cfg-3',
      full_name: 'Ananya Deshmukh',
      party_or_affiliation: 'Green Urban Initiative',
      bio: 'Civic environmental organizer and economist.',
      photo_url: '',
      display_order: 2
    }
  ],

  // Federation Officers Presidential Ballot 2025 (Completed)
  'elec-cmp-5': [
    {
      id: 'cand-501',
      election_id: 'elec-cmp-5',
      full_name: 'Rohit Kulkarni',
      party_or_affiliation: 'United Union Caucus',
      bio: 'Incumbent federation vice president.',
      photo_url: '',
      display_order: 1
    },
    {
      id: 'cand-502',
      election_id: 'elec-cmp-5',
      full_name: 'Pooja Bhattacharya',
      party_or_affiliation: 'Workers Action Slate',
      bio: 'General secretary and labor rights delegate.',
      photo_url: '',
      display_order: 2
    }
  ],

  // Edge Case 1: Webcam / Biometric Blocked Election
  'elec-edge-webcam': [
    {
      id: 'cand-web-1',
      election_id: 'elec-edge-webcam',
      full_name: 'Justice H. R. Reddy (Retd.)',
      party_or_affiliation: 'Independent Judicial Council',
      bio: 'Retired high court judge running for bar oversight council president.',
      photo_url: '',
      display_order: 1
    },
    {
      id: 'cand-web-2',
      election_id: 'elec-edge-webcam',
      full_name: 'Senior Counsel V. Ramanathan',
      party_or_affiliation: 'Bar Association Union',
      bio: 'Senior advocate advocating for court digitization and legal aid funding.',
      photo_url: '',
      display_order: 2
    }
  ],

  // Edge Case 2: Small Electorate (<10 voters)
  'elec-edge-small': [
    {
      id: 'cand-sml-1',
      election_id: 'elec-edge-small',
      full_name: 'Anita Roy',
      party_or_affiliation: 'Committee Leadership',
      bio: 'Chairperson nominee for budget authorization committee.',
      photo_url: '',
      display_order: 1
    },
    {
      id: 'cand-sml-2',
      election_id: 'elec-edge-small',
      full_name: 'Tariq Hussain',
      party_or_affiliation: 'Independent Delegate',
      bio: 'Audit liaison officer.',
      photo_url: '',
      display_order: 2
    }
  ],

  // Edge Case 3: Tied Contest
  'elec-edge-tie': [
    {
      id: 'cand-tie-1',
      election_id: 'elec-edge-tie',
      full_name: 'Bhavna Iyer',
      party_or_affiliation: 'Consumer Protection Board',
      bio: 'Ratepayer representative and public auditor.',
      photo_url: '',
      display_order: 1
    },
    {
      id: 'cand-tie-2',
      election_id: 'elec-edge-tie',
      full_name: 'Deepak Choudhary',
      party_or_affiliation: 'Grid Modernization Council',
      bio: 'Energy engineer and infrastructure economist.',
      photo_url: '',
      display_order: 2
    },
    {
      id: 'cand-tie-3',
      election_id: 'elec-edge-tie',
      full_name: 'Nitin Roy',
      party_or_affiliation: 'Independent Citizen Action',
      bio: 'Municipal safety advocate.',
      photo_url: '',
      display_order: 3
    }
  ]
};

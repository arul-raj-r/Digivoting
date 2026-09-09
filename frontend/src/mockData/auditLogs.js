// Mock Audit Logs for Election Management and Voter Portal Security Feed

export const initialAuditLogs = {
  // General citizen account security & activity feed for Voter Dashboard
  voterAccountLogs: [
    {
      id: 'log-acc-1',
      event: 'Successful Citizen Authentication',
      details: 'Logged in via secure password verification from Chrome 128 / Windows 11',
      ip_address: '103.21.144.12',
      timestamp: '2026-09-06T14:45:00Z',
      category: 'AUTH'
    },
    {
      id: 'log-acc-2',
      event: 'Session Renewal & Integrity Check',
      details: 'Valid device fingerprint validated; refresh token issued',
      ip_address: '103.21.144.12',
      timestamp: '2026-09-06T10:12:00Z',
      category: 'SECURITY'
    },
    {
      id: 'log-acc-3',
      event: 'Ballot Submitted',
      details: 'Encrypted vote recorded for Executive Committee Special Resolution Ballot',
      ip_address: '103.21.144.12',
      timestamp: '2026-08-10T11:24:00Z',
      category: 'VOTING'
    },
    {
      id: 'log-acc-4',
      event: 'Citizen Account Registered',
      details: 'Identity profile created and initial security credentials established',
      ip_address: '103.21.144.10',
      timestamp: '2026-07-15T09:30:00Z',
      category: 'AUTH'
    }
  ],

  // Election-specific operational audit logs
  'elec-act-1': [
    {
      id: 'log-act-101',
      actor: 'election.officer@eci.gov.in',
      action: 'Election Transitioned to ACTIVE',
      details: 'Scheduled start reached. Ballots opened for voting. Voter rolls and candidate roster locked.',
      timestamp: '2026-09-01T08:00:00Z',
      severity: 'INFO'
    },
    {
      id: 'log-act-102',
      actor: 'election.officer@eci.gov.in',
      action: 'Election Transitioned to SCHEDULED',
      details: 'Start and end windows verified. Auto-activation timer configured.',
      timestamp: '2026-08-28T16:00:00Z',
      severity: 'INFO'
    },
    {
      id: 'log-act-103',
      actor: 'election.officer@eci.gov.in',
      action: 'Voter Roll Certified',
      details: '120 eligible citizen voter entries loaded and verified against canonical roll.',
      timestamp: '2026-08-27T14:30:00Z',
      severity: 'INFO'
    },
    {
      id: 'log-act-104',
      actor: 'election.officer@eci.gov.in',
      action: 'Candidate Roster Finalized',
      details: '4 parliamentary candidates registered with manifestos and verified assets.',
      timestamp: '2026-08-25T11:00:00Z',
      severity: 'INFO'
    },
    {
      id: 'log-act-105',
      actor: 'election.officer@eci.gov.in',
      action: 'Election Draft Created',
      details: 'Initial metadata drafted for National Parliamentary General Election 2026.',
      timestamp: '2026-08-15T10:00:00Z',
      severity: 'INFO'
    }
  ],

  'elec-sch-2': [
    {
      id: 'log-sch-201',
      actor: 'returning.officer@state.gov.in',
      action: 'Election Scheduled',
      details: 'Start window set to 2026-10-15 09:00:00Z. Pre-poll countdown initialized.',
      timestamp: '2026-08-30T10:00:00Z',
      severity: 'INFO'
    },
    {
      id: 'log-sch-202',
      actor: 'returning.officer@state.gov.in',
      action: 'Voter Roll Configured',
      details: '85 electors approved from legislative constituency register.',
      timestamp: '2026-08-26T15:00:00Z',
      severity: 'INFO'
    }
  ],

  'elec-cfg-3': [
    {
      id: 'log-cfg-301',
      actor: 'commissioner@municipal.gov.in',
      action: 'Candidate List Updated',
      details: 'Added 3 municipal council candidates.',
      timestamp: '2026-08-26T14:00:00Z',
      severity: 'INFO'
    },
    {
      id: 'log-cfg-302',
      actor: 'commissioner@municipal.gov.in',
      action: 'Voter Roll Seeded',
      details: '45 municipal ward representatives loaded into eligible roll.',
      timestamp: '2026-08-25T14:00:00Z',
      severity: 'INFO'
    }
  ],

  'elec-drf-4': [
    {
      id: 'log-drf-401',
      actor: 'admin@civic.gov.in',
      action: 'Draft Created',
      details: 'Constitutional Policy Advisory Referendum created in draft status.',
      timestamp: '2026-09-02T09:15:00Z',
      severity: 'INFO'
    }
  ],

  'elec-cmp-5': [
    {
      id: 'log-cmp-501',
      actor: 'chief.scrutineer@federation.org',
      action: 'Results Published',
      details: 'Election results published and visible to all registered voters and audit observers.',
      timestamp: '2025-11-03T18:30:00Z',
      severity: 'SUCCESS'
    },
    {
      id: 'log-cmp-502',
      actor: 'system.daemon@federation.org',
      action: 'Polls Closed',
      details: 'Official end time reached. 138 ballots sealed and tallied.',
      timestamp: '2025-11-03T18:00:00Z',
      severity: 'INFO'
    }
  ],

  'elec-can-6': [
    {
      id: 'log-can-601',
      actor: 'director.operations@transit.gov.in',
      action: 'EMERGENCY STOP EXECUTED',
      details: 'Reason: Unforeseen infrastructure emergency caused network disruption in District 4. Terminated per election protocol.',
      timestamp: '2026-08-02T11:45:00Z',
      severity: 'DANGER'
    },
    {
      id: 'log-can-602',
      actor: 'director.operations@transit.gov.in',
      action: 'Election Started',
      details: 'Early commencement invoked under executive directive.',
      timestamp: '2026-08-01T08:00:00Z',
      severity: 'WARNING'
    }
  ],

  'elec-edge-webcam': [
    {
      id: 'log-wbc-701',
      actor: 'bar.presiding@judiciary.gov.in',
      action: 'Hardware Verification Flag Configured',
      details: 'Webcam and biometric hardware verification flags set to mandatory.',
      timestamp: '2026-08-19T09:00:00Z',
      severity: 'WARNING'
    }
  ],

  'elec-edge-small': [
    {
      id: 'log-sml-801',
      actor: 'secretary@board.org',
      action: 'Results Certified (Small Electorate)',
      details: '8 ballots counted out of 9 eligible voters (<10 small electorate disclosure applied).',
      timestamp: '2026-08-11T18:05:00Z',
      severity: 'SUCCESS'
    }
  ],

  'elec-edge-tie': [
    {
      id: 'log-tie-901',
      actor: 'returning.officer@utility.gov.in',
      action: 'Results Certified with Tie Contest',
      details: 'Top two candidates received exact parity (17 votes each). Tie protocol invoked.',
      timestamp: '2026-08-07T18:15:00Z',
      severity: 'WARNING'
    }
  ]
};

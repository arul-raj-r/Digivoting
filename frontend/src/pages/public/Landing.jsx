import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  CheckCircle,
  HelpCircle,
  Landmark,
  ArrowRight,
  UserCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import { electionService } from '../../services/electionService';

export default function Landing() {
  const [activeElections, setActiveElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchElections() {
      try {
        const data = await electionService.getActiveElections();
        setActiveElections(data || []);
      } catch (err) {
        setError('Election service currently unavailable.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchElections();
  }, []);

  const steps = [
    { num: '1', title: 'Create Account', desc: 'Sign up with your verified email and mobile number.' },
    { num: '2', title: 'Verify Identity', desc: 'Securely verify your voter status via authorized providers.' },
    { num: '3', title: 'Verify Eligibility', desc: 'Backend systems verify your registered constituency.' },
    { num: '4', title: 'Face & Biometric Setup', desc: 'Register device biometrics and face profiles for secure access.' },
    { num: '5', title: 'Cast Vote', desc: 'Select candidates securely in a protected, private browser session.' },
    { num: '6', title: 'Download Receipt', desc: 'Obtain an auditable receipt reference for verification.' },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="bg-slate-905 bg-slate-900 text-white relative py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gov-blue/30 via-slate-900 to-slate-900"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-gov-slate">
              <Sparkles className="h-4 w-4 text-gov-slate" />
              <span>DigiVote Platform Live Demonstration</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
              Your Vote. <br className="sm:hidden" />
              Your Identity. <br className="sm:hidden" />
              Your Choice.
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl">
              DigiVote is a high-security citizen portal for public decision-making. Verify your voting credentials, explore candidate panels, and vote securely using device-level encryption.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/register">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Create Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-slate-700 hover:bg-slate-800 text-white">
                  Citizen Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How DigiVote Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight">How DigiVote Works</h2>
          <p className="text-sm text-slate-500">
            A step-by-step walkthrough of our high-assurance digital voting pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step) => (
            <Card key={step.num} className="relative">
              <div className="h-10 w-10 rounded-lg bg-gov-blue/10 dark:bg-gov-slate/10 flex items-center justify-center font-bold text-gov-blue dark:text-gov-slate text-sm mb-4">
                {step.num}
              </div>
              <h4 className="text-base font-bold mb-2">{step.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Current Elections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight">Active Elections</h2>
          <p className="text-sm text-slate-500">
            Current public elections open for certified citizens in registered constituencies.
          </p>
        </div>

        <div>
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
            </div>
          ) : error ? (
            <Alert type="warning" title="Elections Unavailable">
              {error} The Django REST API must be connected to populate active elections.
            </Alert>
          ) : activeElections.length === 0 ? (
            <EmptyState
              title="No active elections"
              description="There are currently no active public elections running. Check back during scheduled operational periods."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeElections.map((elec) => (
                <Card key={elec.id} title={elec.name} subtitle={`Constituency: ${elec.constituency}`}>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mb-4">{elec.description}</p>
                  <Link to={`/elections/${elec.id}`}>
                    <Button variant="outline" size="sm">View Election Details</Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-slate-100 dark:bg-slate-900/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight">Enterprise Banking-Grade Security</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              DigiVote implements rigorous digital protocols to ensure complete voter confidentiality and election auditability.
            </p>
            
            <div className="space-y-4">
              {[
                { title: 'Secure Authentication', desc: 'Secure sessions protected by temporary OTP keys.' },
                { title: 'Identity Verification', desc: 'Authentication checks with legal government registries (Aadhaar / DigiLocker).' },
                { title: 'Biometric Access Control', desc: 'Verification processes using Face Verification and WebAuthn.' },
                { title: 'Immutable Audit Logging', desc: 'Strict backend event monitoring that logs actions without tying voter profiles to cast votes.' },
                { title: 'One-Person-One-Vote', desc: 'Database constraints preventing duplicates.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-550 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-205">{item.title}</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gov-cardDark p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-gov-slate" />
              Citizen Trust Agreement
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We pledge absolute anonymity in candidate selection. The backend stores voter verification profiles and cast hashes separately, ensuring nobody—not even system administrators—can map your identity to your vote.
            </p>
            <Alert type="info">
              <span className="text-xs">
                To inspect our security specifications, visit our open-source audit logs in the Admin Dashboard.
              </span>
            </Alert>
          </div>
        </div>
      </section>

      {/* Transparency Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight">Transparency & Auditability</h2>
          <p className="text-sm text-slate-500">
            Our platform guarantees integrity through transparent validation pathways.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h4 className="font-bold text-sm">Vote Confirmation</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Verify your secure receipt reference against the public ledger to confirm your ballot has been counted.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-sm">Zero-Knowledge Casts</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Individual vote choices remain encrypted in the database, while election totals compile under public audits.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-sm">Continuous Security Audits</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Automated logging and anomaly monitors detect duplicate attempts or credential modifications instantly.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-center">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          {[
            { q: 'Is my vote completely private?', a: 'Yes. DigiVote uses cryptographic separation. Your identity is verified to check eligibility, but the link between your personal details and candidate choice is completely severed when writing to the database.' },
            { q: 'Can I change my vote after submitting?', a: 'No. To maintain audit integrity, once a vote is cast and a cryptographic receipt is generated, it cannot be changed or recalled.' },
            { q: 'Do I need biometric enrollment to vote?', a: 'Yes. Face Verification and Device Biometric / WebAuthn are required to authenticate your identity during the final voting step.' },
            { q: 'What is the vote receipt used for?', a: 'The receipt contains a transaction reference. You can input this reference in the verification page to confirm that your vote is cataloged in the audit logs.' }
          ].map((faq, idx) => (
            <div key={idx} className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                <HelpCircle className="h-4 w-4 text-gov-slate shrink-0" />
                {faq.q}
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

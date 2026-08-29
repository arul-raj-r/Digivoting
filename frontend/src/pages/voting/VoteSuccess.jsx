import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, FileText, ArrowRight, Download, Printer } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { useToast } from '../../context/ToastContext';

export default function VoteSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const receiptId = location.state?.receiptId;
  const { showSuccess } = useToast();

  useEffect(() => {
    if (!receiptId) {
      navigate('/dashboard', { replace: true });
    }
  }, [receiptId, navigate]);

  if (!receiptId) return null;

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-8">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-650 dark:text-emerald-450 animate-bounce shadow-md">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-800 dark:text-emerald-400">
            Ballot Sealed Successfully
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Your vote has been cryptographically recorded in the election database audits.
          </p>
        </div>
      </div>

      <Card title="Cast Vote Receipt Reference">
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-lg border border-slate-100 dark:border-slate-850 space-y-2 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Receipt Audit Reference Hash
            </span>
            <p className="text-sm sm:text-base font-mono font-bold text-slate-800 dark:text-slate-200 select-all break-all bg-white dark:bg-gov-cardDark p-3 rounded border border-slate-200 dark:border-slate-800">
              {receiptId}
            </p>
            <p className="text-[10px] text-slate-450">
              Double-click to select and copy this reference.
            </p>
          </div>

          <Alert type="info" title="Privacy Commitment Notice">
            <span className="text-xs">
              This reference matches your ballot write transaction but contains no references to your chosen nominee. Your vote remain completely private.
            </span>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={`/receipt/${receiptId}`} className="flex-grow">
              <Button variant="outline" className="w-full">
                <FileText className="h-4.5 w-4.5 mr-2" />
                View Detailed Receipt
              </Button>
            </Link>
            
            <Button
              variant="primary"
              className="flex-grow sm:flex-grow-0"
              onClick={() => {
                showSuccess('Receipt downloaded to device.');
              }}
            >
              <Download className="h-4.5 w-4.5 mr-2" />
              Download Audit File
            </Button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-gov-blue dark:text-gov-slate hover:underline flex items-center justify-center gap-1.5"
            >
              Return to dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

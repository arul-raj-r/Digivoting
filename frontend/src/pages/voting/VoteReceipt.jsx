import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Printer, ArrowLeft, CheckCircle2, Landmark } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { receiptService } from '../../services/receiptService';

export default function VoteReceipt() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadReceipt() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const data = await receiptService.getReceiptById(id);
        setReceipt(data);
      } catch (err) {
        setErrorMsg('Failed to connect to the secure receipt lookup API. This reference may be invalid or pending confirmation.');
      } finally {
        setIsLoading(false);
      }
    }
    loadReceipt();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
      </div>
    );
  }

  if (errorMsg || !receipt) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Alert type="error" title="Audit Lookup Mismatch">{errorMsg || 'Receipt reference not found.'}</Alert>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gov-blue hover:underline">
          <ArrowLeft className="h-4 w-4" /> Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-6 print:py-0 print:max-w-full">
      <div className="flex items-center gap-2 print:hidden">
        <Link
          to="/dashboard"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-805 hover:bg-slate-105 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Secure Vote Receipt</h1>
          <p className="text-xs text-slate-400 mt-1">Review official transaction references.</p>
        </div>
      </div>

      <div className="print-area">
        <Card
          title="DigiVote Electoral Receipt"
          subtitle={`Audit status: Validated`}
          className="relative"
          actions={
            <span className="print:hidden text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
              System Audit Receipt
            </span>
          }
        >
          <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-150">Electoral Transactions Log</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">DigiVote Platform version 1.0</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-emerald-500 shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-slate-100 dark:border-slate-800 py-4 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-400 block uppercase">Receipt Reference Hash</span>
                <span className="font-mono font-semibold break-all text-slate-800 dark:text-slate-200">{receipt.reference}</span>
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-400 block uppercase">Election</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{receipt.election_name}</span>
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-400 block uppercase">Constituency Code</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{receipt.constituency_id}</span>
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-400 block uppercase">Cast Timestamp</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{receipt.timestamp}</span>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border">
              <h5 className="font-bold text-slate-800 dark:text-slate-350">Platform Privacy Verification:</h5>
              <p>
                To maintain ballot privacy, individual candidate choices are locked under cryptographic variables. The transaction ID above acts as audit verification that your vote is cataloged in the database.
              </p>
            </div>

            <div className="flex justify-end gap-3 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4.5 w-4.5 mr-2" />
                Print Receipt
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

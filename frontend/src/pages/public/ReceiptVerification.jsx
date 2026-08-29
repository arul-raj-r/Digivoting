import { useState } from 'react';
import { Search, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import Card from '../../components/common/Card';
import Input from '../../components/forms/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { receiptService } from '../../services/receiptService';

export default function ReceiptVerification() {
  const [reference, setReference] = useState('');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResult(null);

    if (!reference.trim()) {
      setErrorMsg('Please input a valid receipt reference hash.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await receiptService.verifyReceipt(reference);
      setResult(res); // Expected response contract: { status: 'VALID' | 'EXPIRED' | 'INVALID', timestamp: '...', election: '...' }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        'The verification API is currently unavailable. Integrations will be linked in later phases.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Receipt Verification Center</h1>
        <p className="text-sm text-slate-500">
          Verify cryptographic vote receipts against the official election logs.
        </p>
      </div>

      <Card title="Receipt Reference Query">
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            label="Transaction Receipt Hash"
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. e4d909c290d0fb1ca068ffaddf22cbd0"
            required
          />
          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Verify Receipt
          </Button>
        </form>
      </Card>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      {result && (
        <Card title="Verification Result" className="animate-fade-in">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs border">
              <span className="font-semibold">Ledger Registration:</span>
              <StatusBadge status={result.status} />
            </div>

            {result.status === 'VALID' && (
              <div className="space-y-4 text-xs">
                <div className="flex gap-2 text-emerald-600 font-semibold items-center">
                  <ShieldCheck className="h-5 w-5" />
                  <span>Ballot is confirmed and recorded.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <span className="font-bold text-slate-400 block uppercase">Election</span>
                    <span>{result.election_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block uppercase">Log Time</span>
                    <span>{result.timestamp || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {result.status === 'EXPIRED' && (
              <div className="flex gap-2 text-xs text-amber-600 font-semibold items-center">
                <Clock className="h-5 w-5 animate-pulse" />
                <span>The audit timeline for this transaction hash has expired.</span>
              </div>
            )}

            {result.status === 'INVALID' && (
              <div className="flex gap-2 text-xs text-rose-600 font-semibold items-center">
                <AlertCircle className="h-5 w-5" />
                <span>No matching transaction hash found in the election records.</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

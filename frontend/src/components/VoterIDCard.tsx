import React from 'react';
import { ShieldCheck, Printer, Calendar, User, Landmark, HelpCircle } from 'lucide-react';
import type { VoterIDCard as VoterIDCardType } from '../store/authStore';

interface VoterIDCardProps {
  card: VoterIDCardType;
  showPrintButton?: boolean;
}

export const VoterIDCard: React.FC<VoterIDCardProps> = ({ card, showPrintButton = true }) => {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto">
      {/* CSS injection to handle page print scoping */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #voter-id-card-print-target, #voter-id-card-print-target * {
            visibility: visible;
          }
          #voter-id-card-print-target {
            position: absolute;
            left: 0;
            top: 20px;
            width: 100%;
            border: 2px solid #0b3152 !important;
            box-shadow: none !important;
            border-radius: 8px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Physical-style Voter ID Card */}
      <div 
        id="voter-id-card-print-target"
        className="w-full bg-white text-slate-900 border-3 border-gov-blue rounded-2xl shadow-md overflow-hidden relative font-sans flex flex-col justify-between select-none"
        style={{ aspectRatio: '1.586 / 1' }} /* Standard ID-1 card aspect ratio (85.6mm x 53.98mm) */
      >
        {/* Saffron Tricolor Accent Strip */}
        <div className="h-1.5 w-full bg-gov-saffron" />

        {/* Card Header */}
        <div className="bg-gov-blue text-white px-4 py-2.5 flex items-center justify-between border-b border-gov-blue">
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-1 rounded">
              <Landmark className="h-4.5 w-4.5 text-gov-gold" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wider uppercase">National Digital Election Portal</h3>
              <p className="text-[7.5px] uppercase tracking-widest text-slate-300 font-bold -mt-0.5">Government of India • Ministry of Elections</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-0.5 bg-gov-green text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
              <ShieldCheck className="h-2.5 w-2.5" />
              {card.status}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex-grow p-4 flex gap-4">
          
          {/* Left Column: Photo & QR Code */}
          <div className="w-[105px] flex flex-col justify-between items-center gap-2 shrink-0">
            {/* Photo slot */}
            <div className="w-[90px] h-[115px] bg-slate-50 border border-slate-300 rounded overflow-hidden flex items-center justify-center relative shadow-sm">
              {card.photo_url ? (
                <img 
                  src={card.photo_url} 
                  alt={card.full_name} 
                  className="w-full h-full object-cover scale-x-[-1]" 
                />
              ) : (
                <User className="h-10 w-10 text-slate-400" />
              )}
            </div>
            
            {/* Micro QR Code Box */}
            <div className="w-[45px] h-[45px] bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1 relative shadow-inner">
              {/* Dummy QR Code Vector */}
              <svg className="w-full h-full text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="2" width="6" height="6" />
                <rect x="16" y="2" width="6" height="6" />
                <rect x="2" y="16" width="6" height="6" />
                <path d="M6 10h2M10 6h2M14 10h4M10 14h2M16 16h2M10 18v2M18 10v4" />
              </svg>
              <span className="absolute -bottom-1 -right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
            </div>
          </div>

          {/* Right Column: Voter details */}
          <div className="flex-grow flex flex-col justify-between text-[10px] text-slate-700 space-y-1">
            <div className="space-y-1.5">
              <div>
                <span className="block text-[7.5px] uppercase font-bold text-slate-400 tracking-wider">Voter Card Number</span>
                <span className="text-sm font-black text-gov-blue tracking-widest font-mono uppercase">
                  {card.card_number}
                </span>
              </div>

              <div>
                <span className="block text-[7.5px] uppercase font-bold text-slate-400 tracking-wider">Full Name</span>
                <span className="font-extrabold text-slate-950 text-xs uppercase">{card.full_name}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[7.5px] uppercase font-bold text-slate-400 tracking-wider">Date of Birth</span>
                  <span className="font-bold text-slate-900">{formatDate(card.date_of_birth)}</span>
                </div>
                <div>
                  <span className="block text-[7.5px] uppercase font-bold text-slate-400 tracking-wider">Gender</span>
                  <span className="font-bold text-slate-900 uppercase">{card.gender || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="block text-[7.5px] uppercase font-bold text-slate-400 tracking-wider">Assigned Constituency</span>
                <span className="font-extrabold text-gov-green uppercase">{card.constituency_name}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-1 flex justify-between items-center text-[7px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Issued: {formatDate(card.issued_date)}</span>
              <span className="text-gov-blue">ECI Inspired Identity Card</span>
            </div>
          </div>
        </div>

        {/* Green Tricolor Accent Strip */}
        <div className="h-1.5 w-full bg-gov-green" />
      </div>

      {/* Card Actions */}
      {showPrintButton && (
        <button
          onClick={handlePrint}
          className="no-print mt-2 flex items-center gap-1.5 py-2 px-5 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-xs font-bold shadow-md shadow-gov-blue/10 transition-all cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          Print / Download ID Card (PDF)
        </button>
      )}
    </div>
  );
};

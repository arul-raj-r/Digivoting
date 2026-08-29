import { Mail, Phone, Landmark } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/forms/Input';

export default function Contact() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Contact Election Support</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          If you have questions regarding your voter registration, eligibility updates, or encountered issues during face capture or biometric verification, contact our support team.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-5 w-5 text-gov-blue dark:text-gov-slate" />
            <span>National Citizen Toll-Free: 1800-345-1950 (9 AM - 6 PM)</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-5 w-5 text-gov-blue dark:text-gov-slate" />
            <span>support@digivote.gov.in</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Landmark className="h-5 w-5 text-gov-blue dark:text-gov-slate" />
            <span>Electoral Operations Center, Central Secretariat, New Delhi</span>
          </div>
        </div>
      </div>

      <Card title="Send a Support Inquiry">
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Input label="Full Name" id="name" required placeholder="Enter your full name" />
          <Input label="Email Address" id="email" type="email" required placeholder="Enter email address" />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Message / Issue Details</label>
            <textarea
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-750 dark:bg-gov-cardDark text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-blue dark:focus:ring-gov-gold min-h-[100px]"
              placeholder="Describe your issue or question in detail..."
              required
            ></textarea>
          </div>
          <Button type="submit" variant="primary" className="w-full">
            Submit Inquiry
          </Button>
        </form>
      </Card>
    </div>
  );
}

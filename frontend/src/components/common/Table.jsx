export default function Table({
  headers = [],
  data = [],
  renderRow,
  isLoading = false,
  emptyMessage = 'No records found.',
}) {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-gov-cardDark shadow-xs">
      <table className="w-full border-collapse text-left text-sm text-slate-700 dark:text-slate-250">
        <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-6 py-3.5 font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {isLoading ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                <div className="flex justify-center items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gov-blue dark:border-gov-gold border-t-transparent"></div>
                  <span>Loading records...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => renderRow(item, index))
          )}
        </tbody>
      </table>
    </div>
  );
}

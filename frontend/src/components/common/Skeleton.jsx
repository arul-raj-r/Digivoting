export default function Skeleton({
  variant = 'text', // 'text' | 'rect' | 'circle'
  className = '',
}) {
  const styles = {
    text: 'h-4 w-full rounded',
    rect: 'h-24 w-full rounded-xl',
    circle: 'h-10 w-10 rounded-full',
  };

  return (
    <div
      className={`bg-slate-200 dark:bg-slate-800 animate-pulse ${styles[variant]} ${className}`}
    />
  );
}

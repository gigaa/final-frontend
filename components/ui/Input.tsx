import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-300">{label}</label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-xl bg-gray-800/60 border px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-200',
            'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20',
            error ? 'border-red-500/70' : 'border-gray-700',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
export default Input;

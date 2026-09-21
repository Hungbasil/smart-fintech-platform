import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, children, className, ...props }, ref) => {
    const baseStyles = `
      font-bold rounded-xl 
      transition-all duration-200 
      disabled:opacity-50 disabled:cursor-not-allowed 
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f74] focus-visible:ring-offset-2
      transform hover:scale-105 active:scale-95
      hover:shadow-lg hover:-translate-y-0.5
    `;
    
    const variantStyles = {
      primary: 'bg-[#087f74] text-white hover:bg-[#075c57] shadow-sm',
      secondary: 'bg-[#edf4f2] text-[#075c57] hover:bg-[#dcefeb]',
      danger: 'bg-[#fff1ef] text-[#c25344] hover:bg-[#ffe3df]',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ''}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

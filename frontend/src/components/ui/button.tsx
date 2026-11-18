import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[background,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-white shadow-[0_6px_18px_rgba(17,19,23,.18)] hover:bg-forest-700',
        accent: 'bg-brand text-white shadow-[0_6px_18px_rgba(255,90,31,.28)] hover:bg-brand-600',
        dark: 'bg-ink text-white shadow-[0_6px_18px_rgba(17,19,23,.18)] hover:bg-forest-700',
        secondary: 'bg-mint text-brand-700 hover:bg-[#ffdccb]',
        outline: 'border border-line bg-white/80 text-ink backdrop-blur hover:border-line-strong hover:bg-white',
        ghost: 'text-ink-soft hover:bg-ink/5 hover:text-ink',
        danger: 'bg-danger text-white hover:bg-[#a82d24]',
        'danger-outline': 'border border-[#ecc7c3] bg-white text-danger hover:bg-danger-50',
        saffron: 'bg-brand text-white hover:bg-brand-600',
        link: 'h-auto px-0 text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-[15px] font-bold',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? children : (
          <>
            {loading && <Loader2 className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

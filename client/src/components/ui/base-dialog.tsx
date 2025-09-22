import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface BaseDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreenOnMobile?: boolean;
  footer?: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
  children: ReactNode;
  disableOverlayClose?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl'
};

export function BaseDialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  fullScreenOnMobile = true,
  footer,
  initialFocusRef,
  children,
  disableOverlayClose = false
}: BaseDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus management and escape key handling
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleFocus = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleFocus);
    document.body.style.overflow = 'hidden';

    // Set initial focus
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleFocus);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;

  const portalRoot = document.getElementById('portal-root') || document.body;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={disableOverlayClose ? undefined : onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        className={cn(
          "relative bg-background border border-border shadow-lg rounded-lg",
          "flex flex-col max-h-[calc(100vh-2rem)]",
          // Desktop sizing
          sizeClasses[size],
          // Mobile handling
          fullScreenOnMobile && "max-sm:w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none"
        )}
        style={{
          '--header-height': '4rem',
          '--footer-height': footer ? '4rem' : '0rem'
        } as React.CSSProperties}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 md:p-6 rounded-t-lg flex items-center justify-between min-h-[4rem]">
          <div className="min-w-0 flex-1">
            <h2 id="dialog-title" className="text-lg font-semibold text-foreground truncate">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          <Button
            ref={firstFocusableRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-4 h-8 w-8 p-0 hover:bg-muted"
            aria-label="Close dialog"
            data-testid="close-dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div 
          className="flex-1 overflow-auto p-4 md:p-6"
          style={{
            maxHeight: 'calc(100vh - var(--header-height) - var(--footer-height) - 2rem)'
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="sticky bottom-0 bg-background border-t border-border p-4 md:p-6 rounded-b-lg flex justify-end space-x-2 min-h-[4rem] items-center">
            {footer}
          </div>
        )}
      </div>
    </div>,
    portalRoot
  );
}
"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
};

type ConfirmState = ConfirmOptions & { open: boolean };

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    setState((prev) => (prev ? { ...prev, open: false } : null));
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const isDestructive = state?.variant === "destructive";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={Boolean(state?.open)}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-brand-justice/15 bg-card p-6 shadow-lg duration-200",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-2xl"
            )}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{state?.title}</DialogTitle>
              {state?.description ? (
                <DialogDescription className="text-left leading-relaxed">
                  {state.description}
                </DialogDescription>
              ) : null}
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="border-brand-justice/20"
                onClick={() => close(false)}
              >
                {state?.cancelLabel ?? "Annuler"}
              </Button>
              <Button
                type="button"
                variant={isDestructive ? "destructive" : "default"}
                className={
                  isDestructive
                    ? undefined
                    : "bg-brand-justice text-primary-foreground hover:bg-brand-justice/90"
                }
                onClick={() => close(true)}
              >
                {state?.confirmLabel ?? "Confirmer"}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm doit être utilisé dans un ConfirmProvider.");
  }
  return ctx.confirm;
}

import type { ReactNode } from "react";
import { create } from "zustand";
import { Button } from "./Button";
import { Dialog, DialogActions } from "./Dialog";

type Req = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
};

const useConfirm = create<{ req: Req | null; open: boolean }>(() => ({ req: null, open: false }));

/** Promise-based confirmation dialog (replacement for window.confirm). */
export function confirmDialog(opts: Omit<Req, "resolve" | "cancelLabel"> & { cancelLabel?: string }): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirm.setState({ req: { cancelLabel: "Cancel", ...opts, resolve }, open: true });
  });
}

export function ConfirmHost() {
  const { req, open } = useConfirm();
  const close = (ok: boolean) => {
    req?.resolve(ok);
    useConfirm.setState({ open: false });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close(false)} title={req?.title} description={req?.description}>
      <DialogActions>
        <Button onClick={() => close(false)}>{req?.cancelLabel}</Button>
        <Button variant={req?.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus data-testid="confirm-ok">
          {req?.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

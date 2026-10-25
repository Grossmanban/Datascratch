import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, Copy, History, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { agentTokensApi } from "@/api/endpoints";
import { useWorkspace } from "@/domain/workspace";
import { formatDateTime, formatRelative } from "@/lib/dates";
import type { AgentPermission, AgentToken } from "@/lib/shared";
import { Button, cn, Dialog, DialogActions, EmptyState, Field, IconButton, Input, SegmentedControl, Spinner } from "@/ui";
import { Card, Row } from "./SettingsPage";

export function AgentsSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const tokens = useQuery({ queryKey: ["agent-tokens"], queryFn: agentTokensApi.list });
  const revoke = useMutation({
    mutationFn: agentTokensApi.revoke,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-tokens"] }),
  });
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const agentNbs = notebooks.filter((n) => n.mode === "agent");
  const [creating, setCreating] = useState(false);
  const [audit, setAudit] = useState<AgentToken | null>(null);

  return (
    <>
      <Card
        title={t("settings.agentTokens")}
        description={t("settings.agentTokensText")}
        action={
          <Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setCreating(true)} disabled={!agentNbs.length}>
            {t("settings.newToken")}
          </Button>
        }
      >
        {!agentNbs.length && <p className="mb-3 rounded-lg bg-ink/[0.04] px-3 py-2.5 text-[13px] text-ink-2">{t("settings.noAgentNotebooks")}</p>}
        {tokens.isLoading ? (
          <Spinner className="size-4 text-ink-3" />
        ) : tokens.isError ? (
          <p className="text-[13.5px] text-ink-3">{t("common.requiresOnline")}</p>
        ) : tokens.data?.length ? (
          tokens.data.map((tok) => (
            <Row
              key={tok.id}
              label={
                <span className="flex items-center gap-2">
                  <Bot className="size-4 text-ink-3" />
                  {tok.name}
                </span>
              }
              hint={[
                tok.permission === "read" ? t("settings.tokenRead") : t("settings.tokenReadWrite"),
                tok.notebookIds.map((id) => notebooks.find((n) => n.id === id)?.name ?? "—").join(", "),
                formatRelative(tok.createdAt),
              ].join(" · ")}
            >
              <div className="flex gap-1">
                <IconButton size="sm" label={t("settings.audit")} onClick={() => setAudit(tok)}>
                  <History className="size-3.5" />
                </IconButton>
                <IconButton size="sm" label={t("settings.tokenRevoke")} onClick={() => revoke.mutate(tok.id)} className="hover:text-danger">
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </Row>
          ))
        ) : (
          <p className="text-[13.5px] text-ink-3">{t("settings.noTokens")}</p>
        )}
      </Card>
      <NewTokenDialog open={creating} onOpenChange={setCreating} />
      <AuditDialog token={audit} onClose={() => setAudit(null)} />
    </>
  );
}

function NewTokenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const notebooks = useWorkspace((s) => s.account.notebooks).filter((n) => n.mode === "agent");
  const [name, setName] = useState("Claude");
  const [selected, setSelected] = useState<string[]>([]);
  const [permission, setPermission] = useState<AgentPermission>("read");
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const create = useMutation({
    mutationFn: () => agentTokensApi.create({ name, notebookIds: selected, permission, expiresAt: null }),
    onSuccess: (res) => {
      setToken(res.token);
      void qc.invalidateQueries({ queryKey: ["agent-tokens"] });
    },
  });
  const close = () => {
    onOpenChange(false);
    setTimeout(() => {
      setToken(null);
      setSelected([]);
      setName("Claude");
    }, 200);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (selected.length) create.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()} title={t("settings.newToken")}>
      {token ? (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-ink-2">{t("settings.tokenCreated")}</p>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas p-3">
            <code className="flex-1 break-all font-mono text-[12.5px] text-ink">{token}</code>
            <IconButton
              label={t("common.copy")}
              onClick={async () => {
                await navigator.clipboard?.writeText(token).catch(() => undefined);
                setCopied(true);
              }}
            >
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            </IconButton>
          </div>
          <DialogActions>
            <Button variant="primary" onClick={close}>
              {t("common.done")}
            </Button>
          </DialogActions>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t("settings.tokenName")}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-ink-2">{t("settings.tokenNotebooks")}</div>
            <div className="flex flex-wrap gap-1.5">
              {notebooks.map((nb) => {
                const on = selected.includes(nb.id);
                return (
                  <button
                    type="button"
                    key={nb.id}
                    onClick={() => setSelected((s) => (on ? s.filter((x) => x !== nb.id) : [...s, nb.id]))}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition",
                      on ? "border-accent/60 bg-accent/[0.08] text-ink" : "border-line text-ink-2 hover:border-ink/20",
                    )}
                  >
                    {nb.icon} {nb.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-ink-2">{t("settings.tokenPermission")}</div>
            <SegmentedControl
              value={permission}
              onChange={setPermission}
              options={[
                { value: "read", label: t("settings.tokenRead") },
                { value: "read_write", label: t("settings.tokenReadWrite") },
              ]}
            />
          </div>
          <DialogActions>
            <Button type="button" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={create.isPending} disabled={!selected.length || !name.trim()}>
              {t("common.create")}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}

function AuditDialog({ token, onClose }: { token: AgentToken | null; onClose: () => void }) {
  const { t } = useTranslation();
  const audit = useQuery({ queryKey: ["agent-audit", token?.id], queryFn: () => agentTokensApi.audit(token!.id), enabled: !!token });
  return (
    <Dialog open={!!token} onOpenChange={(o) => !o && onClose()} title={`${t("settings.audit")} · ${token?.name ?? ""}`} wide>
      {audit.isLoading ? (
        <Spinner className="size-4 text-ink-3" />
      ) : audit.data?.length ? (
        <ul className="scrollbar-thin max-h-[50vh] overflow-y-auto text-[13.5px]">
          {audit.data.map((a, i) => (
            <li key={i} className="flex gap-3 border-t border-line py-2 first:border-0">
              <span className="w-40 shrink-0 text-ink-3">{formatDateTime(a.at)}</span>
              <span className="font-medium text-ink">{a.action}</span>
              {a.detail && <span className="truncate text-ink-2">{a.detail}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t("settings.noAudit")} />
      )}
    </Dialog>
  );
}

import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, FolderOpen, Loader2, ShieldCheck, Wrench } from "lucide-react";
import { getCase } from "@/services/api";

const riskConfig = {
  Low: { color: "text-success bg-success/10 border-success/20", icon: CheckCircle2 },
  Medium: { color: "text-warning bg-warning/10 border-warning/20", icon: AlertTriangle },
  High: { color: "text-destructive bg-destructive/10 border-destructive/20", icon: AlertTriangle },
  Unknown: { color: "text-muted-foreground bg-muted border-border", icon: AlertTriangle },
};

const formatSavedAt = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const CaseDetailScreen = () => {
  const navigate = useNavigate();
  const { caseId } = useParams<{ caseId: string }>();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cases", caseId],
    queryFn: () => getCase(caseId || ""),
    enabled: Boolean(caseId),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background max-w-lg mx-auto items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono">Opening saved case...</span>
        </div>
      </div>
    );
  }

  if (isError || !data?.case) {
    return (
      <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto px-5 py-6">
        <button
          onClick={() => navigate("/cases")}
          className="w-11 h-11 rounded-full border border-border bg-card flex items-center justify-center mb-6"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full rounded-2xl border border-warning/30 bg-warning/10 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-warning/15 mx-auto mb-4 flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-warning" />
            </div>
            <p className="text-lg font-display font-semibold text-foreground mb-2">Saved case unavailable</p>
            <p className="text-sm text-muted-foreground mb-5">
              This record could not be loaded. It may have been removed or the backend storage is currently unavailable.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => refetch()}
                className="h-12 rounded-xl bg-primary text-primary-foreground font-display font-semibold"
              >
                Retry
              </button>
              <button
                onClick={() => navigate("/cases")}
                className="h-12 rounded-xl border border-border bg-card text-foreground font-display font-semibold"
              >
                Back to Saved Cases
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const entry = data.case;
  const risk = riskConfig[entry.diagnosis.risk];
  const RiskIcon = risk.icon;

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      <div className="relative h-56 overflow-hidden">
        <img src={entry.image} alt={entry.diagnosis.part} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/35 to-foreground/85" />
        <div className="absolute top-4 left-4">
          <button
            onClick={() => navigate("/cases")}
            className="w-11 h-11 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-background" />
          </button>
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-background/65 mb-1">Saved {formatSavedAt(entry.savedAt)}</p>
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold font-display text-background capitalize">{entry.diagnosis.part}</h1>
            <span className="text-sm font-mono text-primary-foreground/80 bg-primary/80 px-2 py-0.5 rounded">
              {Math.round(entry.diagnosis.confidence * 100)}%
            </span>
          </div>
          {entry.diagnosis.originalLabel && (
            <p className="text-xs font-mono text-background/75 mt-2">Detected as: {entry.diagnosis.originalLabel}</p>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="flex-1 px-5 pb-8 -mt-2">
        <div className="flex items-center justify-between mb-5">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${risk.color}`}>
            <RiskIcon className="w-4 h-4" />
            {entry.diagnosis.risk} Risk
          </div>
          <button
            onClick={() => navigate("/camera")}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Scan New
          </button>
        </div>

        <p className="text-sm text-muted-foreground italic mb-6">{entry.diagnosis.diagnosis}</p>

        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold font-display text-foreground uppercase tracking-wide">
              Suggested Solutions
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {entry.diagnosis.solutions.map((solution, index) => (
              <div key={`${entry.id}-solution-${index}`} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <p className="text-sm text-foreground leading-relaxed">{solution}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold font-display text-foreground uppercase tracking-wide">
              Tools Needed
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {entry.diagnosis.tools.map((tool) => (
              <span
                key={`${entry.id}-${tool}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm text-foreground font-medium capitalize"
              >
                <Wrench className="w-3 h-3 text-muted-foreground" />
                {tool}
              </span>
            ))}
          </div>
        </section>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/60 border border-border mb-6">
          <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This record preserves the AI guidance shown at save time. Re-check the vehicle before repair if the condition has changed.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/cases")}
            className="w-full h-14 rounded-xl border border-border bg-card text-foreground font-display font-semibold text-base"
          >
            Back to Saved Cases
          </button>
          <button
            onClick={() => navigate("/camera")}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-base flex items-center justify-center gap-2 shadow-lg"
          >
            <Camera className="w-5 h-5" />
            Scan Another Problem
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseDetailScreen;

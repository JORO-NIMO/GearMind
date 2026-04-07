import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, ChevronRight, FolderOpen, Loader2, RefreshCcw } from "lucide-react";
import { listCases } from "@/services/api";

const riskStyles: Record<string, string> = {
  Low: "text-success bg-success/10 border-success/20",
  Medium: "text-warning bg-warning/10 border-warning/20",
  High: "text-destructive bg-destructive/10 border-destructive/20",
  Unknown: "text-muted-foreground bg-muted border-border",
};

const formatSavedAt = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const CasesScreen = () => {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["cases"],
    queryFn: () => listCases(100),
  });

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/")}
          className="w-11 h-11 rounded-full border border-border bg-card flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="text-center">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Saved Cases</p>
          <h1 className="text-2xl font-display font-bold text-foreground">Workshop History</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="w-11 h-11 rounded-full border border-border bg-card flex items-center justify-center disabled:opacity-50"
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <RefreshCcw className="w-5 h-5 text-foreground" />}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          Review saved diagnoses, revisit recommended tools, and reopen earlier inspections without rescanning.
        </p>
        <button
          onClick={() => navigate("/camera")}
          className="mt-4 w-full h-12 rounded-xl bg-primary text-primary-foreground font-display font-semibold flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Scan New Problem
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-mono">Loading saved cases...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5">
          <p className="text-sm font-semibold text-foreground mb-2">Could not load saved cases</p>
          <p className="text-sm text-muted-foreground mb-4">
            The backend is reachable for diagnosis, but the saved case history could not be loaded right now.
          </p>
          <button
            onClick={() => refetch()}
            className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-medium"
          >
            Try Again
          </button>
        </div>
      ) : data && data.cases.length > 0 ? (
        <div className="flex flex-col gap-3 pb-8">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
            {data.total} saved {data.total === 1 ? "case" : "cases"}
          </p>
          {data.cases.map((entry) => (
            <button
              key={entry.id}
              onClick={() => navigate(`/cases/${entry.id}`)}
              className="w-full text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
            >
              <div className="flex">
                <img src={entry.image} alt={entry.diagnosis.part} className="w-24 h-24 object-cover shrink-0" />
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-display font-semibold text-foreground capitalize truncate">
                        {entry.diagnosis.part}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        {formatSavedAt(entry.savedAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${riskStyles[entry.diagnosis.risk]}`}>
                      {entry.diagnosis.risk}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {entry.diagnosis.diagnosis}
                  </p>
                </div>
                <div className="px-3 flex items-center">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center pb-12">
          <div className="w-full rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-display font-semibold text-foreground mb-2">No cases saved yet</p>
            <p className="text-sm text-muted-foreground mb-5">
              Save a diagnosis from the result screen and it will appear here with its photo, risk level, and repair guidance.
            </p>
            <button
              onClick={() => navigate("/camera")}
              className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-display font-semibold"
            >
              Capture First Case
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasesScreen;

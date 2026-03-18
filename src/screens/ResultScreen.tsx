import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Loader2,
  ShieldCheck,
  Save,
} from "lucide-react";
import { analyzeImage, saveCase, type AnalysisResponse } from "@/services/api";
import { toast } from "sonner";

const riskConfig = {
  Low: { color: "text-success bg-success/10 border-success/20", icon: CheckCircle2 },
  Medium: { color: "text-warning bg-warning/10 border-warning/20", icon: AlertTriangle },
  High: { color: "text-destructive bg-destructive/10 border-destructive/20", icon: AlertTriangle },
  Unknown: { color: "text-muted-foreground bg-muted border-border", icon: AlertTriangle },
};

const ResultScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const image = (location.state as { image?: string })?.image;
  const [diagnosis, setDiagnosis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (image) {
      analyzeImage(image)
        .then((d) => {
          setDiagnosis(d);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to analyze image");
          setLoading(false);
        });
    }
  }, [image]);

  const handleSaveCase = async () => {
    if (!diagnosis || !image) return;
    setSaving(true);
    try {
      const result = await saveCase({ diagnosis, image });
      toast.success(result.message || "Case saved successfully");
    } catch (error) {
      toast.error("Failed to save case");
    } finally {
      setSaving(false);
    }
  };

  if (!image) {
    navigate("/");
    return null;
  }

  const risk = diagnosis ? riskConfig[diagnosis.risk] : null;
  const RiskIcon = risk?.icon ?? AlertTriangle;

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      {/* Image header */}
      <div className="relative h-48 overflow-hidden">
        <img src={image} alt="Captured problem" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 to-foreground/80" />
        <div className="absolute bottom-4 left-5 right-5">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <Loader2 className="w-5 h-5 text-background animate-spin" />
                <span className="text-sm font-mono text-background/80">Initializing AI expert & analyzing...</span>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-xs font-mono text-background/60 mb-1">Identified Part</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-bold font-display text-background capitalize">
                    {diagnosis?.part}
                  </h2>
                  <span className="text-sm font-mono text-primary-foreground/70 bg-primary/80 px-2 py-0.5 rounded">
                    {Math.round((diagnosis?.confidence ?? 0) * 100)}%
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Content */}
      <AnimatePresence>
        {!loading && diagnosis && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 px-5 pb-8 -mt-2"
          >
            {/* Risk badge and Save button */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex flex-col gap-1">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${risk?.color}`}>
                  <RiskIcon className="w-4 h-4" />
                  {diagnosis.risk} Risk
                </div>
                {diagnosis.originalLabel && (
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight ml-1">
                    Detected as: {diagnosis.originalLabel}
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveCase}
                disabled={saving}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Case
              </button>
            </div>

            {/* Diagnosis Description */}
            <p className="text-sm text-muted-foreground italic mb-6">
              {diagnosis.diagnosis}
            </p>

            {/* solutions */}
            <section className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold font-display text-foreground uppercase tracking-wide">
                  Suggested Solutions
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {diagnosis.solutions.map((solution, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border"
                  >
                    <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">{solution}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Tools */}
            <section className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold font-display text-foreground uppercase tracking-wide">
                  Tools Needed
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {diagnosis.tools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm text-foreground font-medium capitalize"
                  >
                    <Wrench className="w-3 h-3 text-muted-foreground" />
                    {tool}
                  </span>
                ))}
              </div>
            </section>

            {/* Disclaimer */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/60 border border-border mb-6">
              <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                These are AI suggestions. Always apply your professional judgment before
                proceeding with any repair.
              </p>
            </div>

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/")}
              className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-base flex items-center justify-center gap-2 shadow-lg"
            >
              <Camera className="w-5 h-5" />
              Scan Another Problem
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResultScreen;

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Cpu, Wrench, ChevronRight } from "lucide-react";

const HomeScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background px-5 py-8 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
          v1.0
        </span>
      </motion.div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 mb-6"
      >
        <h1 className="text-4xl font-bold font-display tracking-tight text-foreground leading-tight">
          Gear<span className="text-primary">Mind</span>
        </h1>
        <p className="text-lg font-display text-foreground/80 mt-1">
          Scan. Diagnose. Decide.
        </p>
      </motion.div>

      {/* Workflow cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="flex flex-col gap-3 mb-8"
      >
        {[
          { icon: Camera, label: "Capture", desc: "Take a photo of the problem" },
          { icon: Cpu, label: "AI Analyzes", desc: "Get instant diagnosis" },
          { icon: Wrench, label: "You Decide", desc: "Apply your expertise" },
        ].map((step, i) => (
          <div
            key={step.label}
            className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
              <step.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                <span className="font-mono text-xs text-muted-foreground mr-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-center text-muted-foreground mb-5 font-mono"
      >
        AI gives suggestions. You make the final call.
      </motion.p>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/camera")}
        className="w-full h-16 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-lg flex items-center justify-center gap-3 shadow-lg active:shadow-md transition-shadow"
      >
        <Camera className="w-6 h-6" />
        Scan Problem
        <ChevronRight className="w-5 h-5 opacity-60" />
      </motion.button>
    </div>
  );
};

export default HomeScreen;

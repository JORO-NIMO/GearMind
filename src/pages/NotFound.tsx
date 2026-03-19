import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      
      <h1 className="mb-2 text-4xl font-extrabold tracking-tight lg:text-5xl">
        404 - Not Found
      </h1>
      
      <p className="mb-8 max-w-[500px] text-lg text-muted-foreground">
        Oops! It seems you've taken a wrong turn in the shop. This part doesn't exist in our catalog.
      </p>
      
      <Link to="/">
        <Button size="lg" className="gap-2">
          <Home className="h-4 w-4" />
          Back to Garage
        </Button>
      </Link>
      
      <div className="mt-12 text-sm text-muted-foreground italic">
        "Even the best mechanics get lost sometimes."
      </div>
    </div>
  );
};

export default NotFound;

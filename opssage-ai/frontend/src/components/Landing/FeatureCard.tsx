import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="card p-6 h-full flex flex-col">
      <div className="w-10 h-10 rounded-lg border border-border bg-muted flex items-center justify-center text-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        {description}
      </p>
    </div>
  );
}

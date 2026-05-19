'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  meta?: string;
  title: string;
  summary?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ meta, title, summary, children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-10 animate-fade-up", className)}>
      {meta && (
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2 block">
          {meta}
        </span>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="display-hero text-text-primary mb-4">
            {title}
          </h1>
          {summary && (
            <p className="body-large text-text-secondary leading-relaxed">
              {summary}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 shrink-0">
            {children}
          </div>
        )}
      </div>
      
      {/* Section Divider */}
      <div className="h-px w-full bg-border mt-8" />
    </div>
  );
}

interface PageSectionProps {
  id?: string;
  label?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  interpretation?: string;
  className?: string;
  noPadding?: boolean;
  fullHeight?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function PageSection({ 
  id,
  label, 
  title, 
  description, 
  children, 
  interpretation, 
  className,
  noPadding = false,
  fullHeight = false
}: PageSectionProps) {
  const sectionId = id || slugify(title);
  return (
    <section id={sectionId} className={cn("flex flex-col mb-12 scroll-mt-24", fullHeight && "h-full mb-0", className)}>
      <div className="mb-4">
        {label && (
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">
            {label}
          </span>
        )}
        <h2 className="h4 text-text-primary mb-1 tracking-tight">{title}</h2>
        {description && <p className="text-xs text-text-secondary opacity-70 leading-relaxed">{description}</p>}
      </div>
      
      <div className={cn(
        "surface bg-surface border border-border rounded-md flex-1",
        !noPadding && "p-6"
      )}>
        {children}
      </div>
      
      {interpretation && (
        <div className="mt-3 flex gap-3 p-4 bg-primary/5 border border-primary/10 rounded-md">
          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-primary">i</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-bold text-text-primary mr-1">Interpretation:</span>
            {interpretation}
          </p>
        </div>
      )}
    </section>
  );
}

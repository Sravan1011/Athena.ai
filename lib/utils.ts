import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as React from 'react';
import type { JSX } from 'react';
import { CheckCircle, XCircle, ArrowLeftRight, HelpCircle } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export type Verdict = 'True' | 'Mostly True' | 'Mixed' | 'Mostly False' | 'False' | 'Unverified';
export type ColorType = 'bg' | 'text';

export function getVerdictColor(
  verdict: Verdict, 
  type: ColorType = 'bg', 
  prefix: string = ''
): string {
  const colorMap: Record<Verdict, string> = {
    'True': 'green-600',
    'Mostly True': 'green-500',
    'Mixed': 'yellow-500',
    'Mostly False': 'red-500',
    'False': 'red-600',
    'Unverified': 'gray-500'
  };
  
  return `${prefix}${type}-${colorMap[verdict]}`;
}

export function getVerdictIcon(verdict: Verdict, className: string = '', variant: 'light' | 'dark' = 'dark'): JSX.Element {
  let icon: JSX.Element;
  const textColor = variant === 'light' ? 'text-slate-700' : 'text-white';
  
  switch (verdict) {
    case 'True':
    case 'Mostly True':
      icon = React.createElement(CheckCircle, { className: cn(className, textColor) });
      break;
    case 'False':
    case 'Mostly False':
      icon = React.createElement(XCircle, { className: cn(className, textColor) });
      break;
    case 'Mixed':
      icon = React.createElement(ArrowLeftRight, { className: cn(className, textColor) });
      break;
    case 'Unverified':
    default:
      icon = React.createElement(HelpCircle, { className: cn(className, textColor) });
  }
  
  return icon;
}

export function formatProcessingTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

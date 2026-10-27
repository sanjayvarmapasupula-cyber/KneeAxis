import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * Password Strength Indicator for KneeAxis
 * Evaluates password entropy locally and displays:
 * - Weak, Fair, Good, Strong states
 * - Visual bar with smooth progression
 * - Checklist for minimum requirements
 */
export default function PasswordStrength({ password = '' }) {
  if (!password) return null;

  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'Contains a number or symbol (0-9, !@#$)', met: /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];

  const metCount = checks.filter((c) => c.met).length;

  let strengthLabel = 'Weak';
  let strengthColor = '#E53E3E'; // Red
  let progressWidth = '25%';

  if (metCount === 2) {
    strengthLabel = 'Fair';
    strengthColor = '#DD6B20'; // Amber
    progressWidth = '50%';
  } else if (metCount === 3) {
    strengthLabel = 'Good';
    strengthColor = '#0082A6'; // KneeAxis Teal/Blue
    progressWidth = '75%';
  } else if (metCount === 4) {
    strengthLabel = 'Strong';
    strengthColor = '#2F855A'; // Green
    progressWidth = '100%';
  }

  return (
    <div className="w-full mt-2.5 p-3 rounded-[10px] bg-slate-50 border border-slate-100 text-[12px]">
      <div className="flex items-center justify-between mb-1.5 font-medium">
        <span style={{ color: 'var(--ka-muted, #64748B)' }}>Password strength</span>
        <span className="font-bold" style={{ color: strengthColor }}>
          {strengthLabel}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden mb-2.5">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: progressWidth, backgroundColor: strengthColor }}
        />
      </div>

      {/* Rules Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
        {checks.map((rule, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 transition-colors"
            style={{ color: rule.met ? '#2F855A' : '#94A3B8' }}
          >
            {rule.met ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

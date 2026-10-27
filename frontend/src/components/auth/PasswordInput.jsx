import React, { useState, useRef } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

/**
 * Reusable accessible Password Input for KneeAxis
 * Features:
 * - Working eye icon toggle (mouse and keyboard accessible)
 * - Retains input focus upon toggling
 * - Real-time Caps Lock detection alert
 * - Accessible labels (aria-label)
 * - AutoComplete support
 * - Matches KneeAxis clean clinical white UI
 */
export default function PasswordInput({
  id,
  name = 'password',
  value,
  onChange,
  placeholder = 'Enter password',
  autoComplete = 'current-password',
  required = false,
  disabled = false,
  className = '',
  label,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const inputRef = useRef(null);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
    // Keep focus on input for smooth typing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyUp = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleKeyDown = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id || name}
          className="block text-[12px] font-bold mb-[7px]"
          style={{ color: '#0B1E2E' }}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id || name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={`w-full min-h-[44px] rounded-[10px] pl-[14px] pr-[42px] py-[10px] text-[14px] border outline-none transition-colors ${className}`}
          style={{
            borderColor: error ? 'var(--ka-error, #dc3545)' : 'var(--ka-line, #E2E8F0)',
            background: '#ffffff',
            color: 'var(--ka-ink, #0B1E2E)',
          }}
        />

        <button
          type="button"
          onClick={toggleVisibility}
          tabIndex={0}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          title={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0082A6] transition-colors cursor-pointer flex items-center justify-center"
        >
          {showPassword ? (
            <EyeOff className="w-[18px] h-[18px]" aria-hidden="true" />
          ) : (
            <Eye className="w-[18px] h-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Subtle Caps Lock Warning */}
      {capsLockActive && (
        <div
          role="alert"
          className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium"
          style={{ color: '#B45309' }}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Caps Lock is on</span>
        </div>
      )}

      {/* Inline Field Error */}
      {error && (
        <p
          role="alert"
          className="text-[11px] font-medium mt-1.5"
          style={{ color: 'var(--ka-error, #dc3545)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

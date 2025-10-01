"use client";

import { FieldError, FieldErrorsImpl, Merge } from "react-hook-form";

interface PhoneInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
  disabled?: boolean;
}

export default function PhoneInput({ name, label, value, onChange, error, disabled = false }: PhoneInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative mt-1">
        <div className="flex">
          {/* Country Code */}
          <div className={`flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-md text-sm font-medium ${disabled ? "bg-gray-100 text-gray-400" : "bg-gray-50 text-gray-700"}`}>
            +1
          </div>

          {/* Phone Input */}
          <input
            type="tel"
            name={name}
            placeholder="(555) 123-4567"
            value={value}
            onChange={(e) => !disabled && onChange(e.target.value)}
            data-field={label}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            disabled={disabled}
            data-lpignore="true"
            data-form-type="other"
            className={`flex-1 py-2 px-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md focus:border-transparent ${
              disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
            }`}
          />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error.message?.toString()}</p>}
    </div>
  );
}

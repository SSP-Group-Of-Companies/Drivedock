"use client";

import { FieldError, FieldErrorsImpl, Merge } from "react-hook-form";

interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
}

export default function PhoneInput({
  label,
  value,
  onChange,
  error,
}: PhoneInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative mt-1">
        <div className="flex">
          {/* Country Code */}
          <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm font-medium text-gray-700">
            +1
          </div>

          {/* Phone Input */}
          <input
            type="tel"
            placeholder="(555) 123-4567"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-field={label}
            className="flex-1 py-2 px-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md focus:border-transparent"
          />
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message?.toString()}</p>
      )}
    </div>
  );
}

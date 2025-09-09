"use client";

import {
  FieldError,
  UseFormRegister,
  Merge,
  FieldErrorsImpl,
} from "react-hook-form";

interface TextInputProps {
  name: string;
  label: string;
  placeholder?: string;
  register: UseFormRegister<any>;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
  type?: string;
  autoComplete?: string;
}

export default function TextInput({
  name,
  label,
  placeholder,
  register,
  error,
  type = "text",
  autoComplete = "off",
}: TextInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...register(name)}
        name={name}
        type={type}
        placeholder={placeholder}
        data-field={name}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-lpignore="true"
        data-form-type="other"
        className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message?.toString()}</p>
      )}
    </div>
  );
}

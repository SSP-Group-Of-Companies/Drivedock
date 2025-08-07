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
}

export default function TextInput({
  name,
  label,
  placeholder,
  register,
  error,
  type = "text",
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
        className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message?.toString()}</p>
      )}
    </div>
  );
}

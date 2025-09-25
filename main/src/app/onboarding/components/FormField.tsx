import React from "react";
import { UseFormRegisterReturn } from "react-hook-form";

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  register?: UseFormRegisterReturn;
  error?: string;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

// Reusable form field component with automatic data-field attribute
export const FormField: React.FC<FormFieldProps> = ({ label, name, type = "text", placeholder, register, error, className = "", children, ...props }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children || (
        <input
          type={type}
          placeholder={placeholder}
          data-field={name}
          className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md ${className}`}
          {...register}
          {...props}
        />
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

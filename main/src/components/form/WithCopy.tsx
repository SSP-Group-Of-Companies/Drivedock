"use client";

import { PropsWithChildren } from "react";
import { FieldCopyAdornment } from "./FieldCopyAdornment";

type Props = PropsWithChildren<{
  value: unknown;
  label?: string;
  className?: string;
  disabled?: boolean;
}>;

export function WithCopy({ value, label, className, disabled, children }: Props) {
  return (
    <div className={["relative group", className ?? ""].join(" ")}>
      {children}
      <FieldCopyAdornment
        value={value}
        label={label}
        disabled={disabled}
      />
    </div>
  );
}

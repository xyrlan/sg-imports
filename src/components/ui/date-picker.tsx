"use client";

import {
  DateField,
  DateInputGroup,
  Label,
  type DateFieldProps,
} from "@heroui/react";
import { type ReactNode } from "react";
import { parseDate, type DateValue } from "@internationalized/date";

export interface AppDatePickerProps extends Omit<DateFieldProps<DateValue>, "children"> {
  label?: string;
  variant?: "primary" | "secondary";
  prefix?: ReactNode;
  suffix?: ReactNode;
  fullWidth?: boolean;
}

export function AppDatePicker({
  label,
  variant = "primary",
  prefix,
  suffix,
  fullWidth = false,
  ...props
}: AppDatePickerProps) {
  return (
    <DateField fullWidth={fullWidth} {...props}>
      {label && <Label>{label}</Label>}
      <DateInputGroup variant={variant} fullWidth={fullWidth}>
        {prefix && <DateInputGroup.Prefix>{prefix}</DateInputGroup.Prefix>}
        <DateInputGroup.Input>
          {(segment) => <DateInputGroup.Segment segment={segment} />}
        </DateInputGroup.Input>
        {suffix && <DateInputGroup.Suffix>{suffix}</DateInputGroup.Suffix>}
      </DateInputGroup>
    </DateField>
  );
}

// Helper para converter ISO string para DateValue do Hero UI
export function isoToDateValue(isoString: string | null | undefined) {
  if (!isoString) return null;
  
  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return parseDate(`${year}-${month}-${day}`);
  } catch {
    return null;
  }
}

// Helper para formatar data no padrão brasileiro DD/MM/YYYY
export function formatDateBR(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  
  try {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

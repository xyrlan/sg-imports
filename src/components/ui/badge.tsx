"use client";

import { Chip, type ChipProps } from "@heroui/react";
import {
  shipmentStatusColorMap,
  paymentStatusColorMap,
  quoteStatusColorMap,
  documentTypeColorMap,
  expenseTypeColorMap,
  type ShipmentStatus,
  type PaymentStatus,
  type QuoteStatus,
  type DocumentType,
  type ExpenseType,
} from "./types";

export interface StatusBadgeProps extends Omit<ChipProps, "color"> {
  status: ShipmentStatus;
}

export interface PaymentBadgeProps extends Omit<ChipProps, "color"> {
  status: PaymentStatus;
}

export interface QuoteBadgeProps extends Omit<ChipProps, "color"> {
  status: QuoteStatus;
}

export interface DocumentBadgeProps extends Omit<ChipProps, "color"> {
  type: DocumentType;
}

export interface ExpenseBadgeProps extends Omit<ChipProps, "color"> {
  type: ExpenseType;
}

export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const color = shipmentStatusColorMap[status];
  
  return (
    <Chip
      color={color}
      variant="secondary"
      size="sm"
      {...props}
    >
      {props.children || status}
    </Chip>
  );
}

export function PaymentBadge({ status, ...props }: PaymentBadgeProps) {
  const color = paymentStatusColorMap[status];
  
  return (
    <Chip
      color={color}
      variant="secondary"
      size="sm"
      {...props}
    >
      {props.children || status}
    </Chip>
  );
}

export function QuoteBadge({ status, ...props }: QuoteBadgeProps) {
  const color = quoteStatusColorMap[status];
  
  return (
    <Chip
      color={color}
      variant="secondary"
      size="sm"
      {...props}
    >
      {props.children || status}
    </Chip>
  );
}

export function DocumentBadge({ type, ...props }: DocumentBadgeProps) {
  const color = documentTypeColorMap[type];
  
  return (
    <Chip
      color={color}
      variant="secondary"
      size="sm"
      {...props}
    >
      {props.children || type}
    </Chip>
  );
}

export function ExpenseBadge({ type, ...props }: ExpenseBadgeProps) {
  const color = expenseTypeColorMap[type];
  
  return (
    <Chip
      color={color}
      variant="secondary"
      size="sm"
      {...props}
    >
      {props.children || type}
    </Chip>
  );
}

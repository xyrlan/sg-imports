"use client";

import { Chip, type ChipProps } from "@heroui/react";

export function AppChip({
  variant = "secondary",
  size = "md",
  color = "default",
  ...props
}: ChipProps) {
  return <Chip variant={variant} size={size} color={color} {...props} />;
}

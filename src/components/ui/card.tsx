"use client";

import { Card, type CardProps } from "@heroui/react";
import { type ReactNode } from "react";

export interface AppCardProps extends Omit<CardProps, "children"> {
  header?: ReactNode;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "transparent" | "default" | "secondary" | "tertiary";
}

export function AppCard({
  header,
  title,
  description,
  children,
  footer,
  variant = "default",
  className,
  ...props
}: AppCardProps) {
  return (
    <Card variant={variant} className={className} {...props}>
      {(header || title || description) && (
        <Card.Header>
          {header}
          {title && <Card.Title>{title}</Card.Title>}
          {description && <Card.Description>{description}</Card.Description>}
        </Card.Header>
      )}
      <Card.Content>{children}</Card.Content>
      {footer && <Card.Footer>{footer}</Card.Footer>}
    </Card>
  );
}

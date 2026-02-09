"use client";

import { Button } from "@heroui/react";
import { forwardRef, type ComponentProps } from "react";

// Use Hero UI v3 Button component props
type ButtonRootProps = ComponentProps<typeof Button>;

export interface AppButtonProps extends Omit<ButtonRootProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'outline' | 'ghost' | 'danger-soft';
  isLoading?: boolean;
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  (props, ref) => {
    const {
      variant = "primary",
      size = "md",
      isLoading,
      isDisabled,
      children,
      ...rest
    } = props;

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        isDisabled={isDisabled || isLoading}
        {...rest}
      >
        {isLoading ? "Carregando..." : children}
      </Button>
    );
  }
);

AppButton.displayName = "AppButton";

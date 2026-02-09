"use client";

import { Button, type ButtonProps } from "@heroui/react";
import { forwardRef } from "react";

export const AppButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = "primary",
      size = "md",
      ...rest
    } = props;

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        {...rest}
      />
    );
  }
);

AppButton.displayName = "AppButton";

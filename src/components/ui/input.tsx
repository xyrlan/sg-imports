"use client";

import { Input, type InputProps } from "@heroui/react";
import { forwardRef } from "react";

export const AppInput = forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const {
      variant = "primary",
      className,
      ...rest
    } = props;

    return (
      <Input
        ref={ref}
        variant={variant}
        className={className}
        {...rest}
      />
    );
  }
);

AppInput.displayName = "AppInput";

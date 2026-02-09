"use client";

import { TextField, Label, Input } from "@heroui/react";
import { forwardRef, type InputHTMLAttributes } from "react";

export interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  variant?: 'primary' | 'secondary';
  isDisabled?: boolean;
  isRequired?: boolean;
  classNames?: {
    base?: string;
    label?: string;
    input?: string;
  };
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  (props, ref) => {
    const {
      label,
      variant = "primary",
      className,
      classNames,
      isDisabled,
      isRequired,
      ...rest
    } = props;

    // Default classes
    const defaultBaseClass = "w-full";
    const defaultLabelClass = "text-gray-700 dark:text-gray-300";

    return (
      <TextField
        variant={variant}
        className={classNames?.base || className || defaultBaseClass}
        isDisabled={isDisabled}
        isRequired={isRequired}
      >
        {label && <Label className={classNames?.label || defaultLabelClass}>{label}</Label>}
        <Input
          ref={ref}
          className={classNames?.input}
          {...rest}
        />
      </TextField>
    );
  }
);

AppInput.displayName = "AppInput";

"use client";

import { TextArea, type TextAreaProps } from "@heroui/react";
import { forwardRef } from "react";

export const AppTextarea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (props, ref) => {
    const {
      variant = "primary",
      rows = 3,
      className,
      ...rest
    } = props;

    return (
      <TextArea
        ref={ref}
        variant={variant}
        rows={rows}
        className={className}
        {...rest}
      />
    );
  }
);

AppTextarea.displayName = "AppTextarea";

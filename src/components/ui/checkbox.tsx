"use client";

import { Checkbox, Label } from "@heroui/react";
import { forwardRef, type ComponentProps } from "react";

// Use Hero UI v3 Checkbox component props
type CheckboxRootProps = ComponentProps<typeof Checkbox>;

export interface AppCheckboxProps extends Omit<CheckboxRootProps, 'name' | 'onChange'> {
  name?: string;
  label?: string;
  description?: string;
  defaultSelected?: boolean;
  onChange?: (checked: boolean) => void;
  variant?: "primary" | "secondary";
}

/**
 * AppCheckbox - Custom Checkbox component that integrates with HTML forms
 * 
 * HeroUI v3 Checkbox Structure:
 * <Checkbox>
 *   <Checkbox.Control>
 *     <Checkbox.Indicator />
 *   </Checkbox.Control>
 *   <Checkbox.Content>  <-- Label deve estar aqui
 *     <Label>Text</Label>
 *   </Checkbox.Content>
 * </Checkbox>
 */
export const AppCheckbox = forwardRef<HTMLInputElement, AppCheckboxProps>(
  (props) => {
    const {
      name,
      label,
      description,
      defaultSelected = false,
      onChange,
      variant = "primary",
      ...rest
    } = props;

    const handleChange = (checked: boolean) => {
      onChange?.(checked);
    };

    return (
      <Checkbox
        defaultSelected={defaultSelected}
        id={name}
        name={name}
        variant={variant}
        onChange={handleChange}
        {...rest}
      >
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        {label && (
          <Checkbox.Content>
            <Label>{label}</Label>
            {description && (
              <span className="text-xs text-muted">{description}</span>
            )}
          </Checkbox.Content>
        )}
      </Checkbox>
    );
  }
);

AppCheckbox.displayName = "AppCheckbox";

"use client";

import { Checkbox } from "@heroui/react";
import { forwardRef, useState, type ComponentProps } from "react";

// Use Hero UI v3 Checkbox component props
type CheckboxRootProps = ComponentProps<typeof Checkbox>;

export interface AppCheckboxProps extends Omit<CheckboxRootProps, 'name' | 'onChange'> {
  name?: string;
  label?: string;
  defaultSelected?: boolean;
  onChange?: (checked: boolean) => void;
}

/**
 * AppCheckbox - Custom Checkbox component that integrates with HTML forms
 * 
 * HeroUI Checkbox doesn't natively integrate with HTML forms (FormData).
 * This component uses a hidden input to ensure the checkbox value is properly
 * submitted with the form as "true" or "false" string.
 */
export const AppCheckbox = forwardRef<HTMLInputElement, AppCheckboxProps>(
  (props, ref) => {
    const {
      name,
      label,
      children,
      defaultSelected = false,
      onChange,
      ...rest
    } = props;

    const [isChecked, setIsChecked] = useState(defaultSelected);

    const handleChange = (checked: boolean) => {
      setIsChecked(checked);
      onChange?.(checked);
    };

    return (
      <div>
        <Checkbox
          defaultSelected={defaultSelected}
          onChange={handleChange}
          {...rest}
        >
          {label || children}
        </Checkbox>
        
        {/* Hidden input to ensure form data is submitted correctly */}
        {name && (
          <input
            ref={ref}
            type="hidden"
            name={name}
            value={isChecked ? "true" : "false"}
          />
        )}
      </div>
    );
  }
);

AppCheckbox.displayName = "AppCheckbox";

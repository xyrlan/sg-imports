"use client";

import {
  Select,
  Label,
  ListBox,
} from "@heroui/react";
import { type ReactNode } from "react";

export interface SelectOption {
  id: string;
  label: string;
  description?: string;
}

export interface AppSelectProps<T = SelectOption> {
  label?: string;
  name?: string;
  items: T[];
  getKey?: (item: T) => string;
  getLabel?: (item: T) => string;
  getDescription?: (item: T) => string | undefined;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  renderItem?: (item: T) => ReactNode;
  placeholder?: string;
  value?: string | number | null;
  onChange?: (value: string | number | null) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  className?: string;
}

export function AppSelect<T = SelectOption>({
  label,
  name,
  items,
  getKey = (item: T) => (item as SelectOption).id,
  getLabel = (item: T) => (item as SelectOption).label,
  getDescription = (item: T) => (item as SelectOption).description,
  variant = "primary",
  fullWidth = false,
  renderItem,
  placeholder,
  value,
  onChange,
  isDisabled,
  isRequired,
  isInvalid,
  className,
}: AppSelectProps<T>) {
  return (
    <Select
      name={name}
      variant={variant}
      fullWidth={fullWidth}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
      className={className}
    >
      {label && <Label>{label}</Label>}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {items.map((item) => {
            const key = getKey(item);
            const itemLabel = getLabel(item);
            const description = getDescription(item);

            return (
              <ListBox.Item
                key={key}
                id={key}
                textValue={itemLabel}
              >
                {renderItem ? (
                  renderItem(item)
                ) : (
                  <div>
                    <div>{itemLabel}</div>
                    {description && (
                      <div className="text-xs text-zinc-500">
                        {description}
                      </div>
                    )}
                  </div>
                )}
              </ListBox.Item>
            );
          })}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

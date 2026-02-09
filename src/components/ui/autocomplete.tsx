"use client";

import {
  Autocomplete,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";
import { type ReactNode } from "react";

export interface AutocompleteOption {
  id: string;
  label: string;
  description?: string;
}

export interface AppAutocompleteProps<T = AutocompleteOption> {
  label?: string;
  items: T[];
  getKey?: (item: T) => string;
  getLabel?: (item: T) => string;
  getDescription?: (item: T) => string | undefined;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  placeholder?: string;
  renderItem?: (item: T) => ReactNode;
  value?: string | number | readonly (string | number)[] | null;
  onChange?: (value: string | number | (string | number)[] | null) => void;
  selectionMode?: "single" | "multiple";
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  className?: string;
}

export function AppAutocomplete<T = AutocompleteOption>({
  label,
  items,
  getKey = (item: T) => (item as AutocompleteOption).id,
  getLabel = (item: T) => (item as AutocompleteOption).label,
  getDescription = (item: T) => (item as AutocompleteOption).description,
  variant = "primary",
  fullWidth = false,
  placeholder = "Search...",
  renderItem,
  value,
  onChange,
  selectionMode = "single",
  isDisabled,
  isRequired,
  isInvalid,
  className,
}: AppAutocompleteProps<T>) {
  const { contains } = useFilter({ sensitivity: "base" });

  return (
    <Autocomplete
      variant={variant}
      fullWidth={fullWidth}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      selectionMode={selectionMode}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
      className={className}
    >
      {label && <Label>{label}</Label>}
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={placeholder} />
            </SearchField.Group>
          </SearchField>
          <ListBox>
            {items.map((item) => {
              const key = getKey(item);
              const itemLabel = getLabel(item);
              const description = getDescription(item);

              return (
                <ListBox.Item key={key} id={key} textValue={itemLabel}>
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
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}

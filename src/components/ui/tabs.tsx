"use client";

import { Tabs, type TabsProps } from "@heroui/react";
import { type ReactNode } from "react";

export interface TabItem {
  id: string;
  title: string | ReactNode;
  content: ReactNode;
  isDisabled?: boolean;
}

export interface AppTabsProps extends Omit<TabsProps, "children"> {
  items: TabItem[];
  variant?: "primary" | "secondary";
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function AppTabs({
  items,
  variant = "primary",
  orientation = "horizontal",
  className,
  ...props
}: AppTabsProps) {
  return (
    <Tabs
      variant={variant}
      orientation={orientation}
      className={className}
      {...props}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label="Tabs">
          {items.map((item) => (
            <Tabs.Tab key={item.id} id={item.id} isDisabled={item.isDisabled}>
              {item.title}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {items.map((item) => (
        <Tabs.Panel key={item.id} id={item.id}>
          {item.content}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

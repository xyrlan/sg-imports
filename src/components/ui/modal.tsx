"use client";

import { Modal, type ModalProps, Button } from "@heroui/react";
import { type ReactNode } from "react";

export interface AppModalProps extends Omit<ModalProps, "children"> {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  placement?: "auto" | "center" | "top" | "bottom";
  backdrop?: "opaque" | "blur" | "transparent";
}

export function AppModal({
  title,
  children,
  footer,
  isOpen,
  onClose,
  size = "md",
  placement = "auto",
  backdrop = "blur",
  ...props
}: AppModalProps) {
  return (
    <Modal {...props}>
      <Button onPress={onClose} className="hidden">
        Trigger
      </Button>
      <Modal.Backdrop
        variant={backdrop}
        isOpen={isOpen}
        onOpenChange={(open) => !open && onClose()}
      >
        <Modal.Container placement={placement} size={size}>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            {title && (
              <Modal.Header>
                <h3 className="text-lg font-semibold">{title}</h3>
              </Modal.Header>
            )}
            <Modal.Body>{children}</Modal.Body>
            {footer && <Modal.Footer>{footer}</Modal.Footer>}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

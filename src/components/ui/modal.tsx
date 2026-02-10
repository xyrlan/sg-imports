"use client";

import { Modal } from "@heroui/react";
import { type ReactNode } from "react";

export interface AppModalProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  trigger: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  placement?: "auto" | "center" | "top" | "bottom";
  backdrop?: "opaque" | "blur" | "transparent";
  isDismissable?: boolean;
  isKeyboardDismissDisabled?: boolean;
  className?: string;
}

/**
 * AppModal - Wrapper para Modal do HeroUI v3
 * 
 * API do HeroUI v3 usa compound pattern:
 * <Modal>
 *   <Button>Trigger</Button>
 *   <Modal.Backdrop>
 *     <Modal.Container>
 *       <Modal.Dialog>
 *         <Modal.Header />
 *         <Modal.Body />
 *         <Modal.Footer />
 *       </Modal.Dialog>
 *     </Modal.Container>
 *   </Modal.Backdrop>
 * </Modal>
 * 
 * Diferenças do v2:
 * - Não tem mais props isOpen/onClose no Modal root
 * - Button é o trigger direto (não precisa de state controlado)
 * - size e placement vão no Modal.Container
 * - backdrop variant vai no Modal.Backdrop
 */
export function AppModal({
  title,
  children,
  footer,
  trigger,
  size = "md",
  placement = "auto",
  backdrop = "blur",
  isDismissable = true,
  isKeyboardDismissDisabled = false,
  className,
}: AppModalProps) {
  return (
    <Modal>
      {trigger}
      <Modal.Backdrop
        variant={backdrop}
        isDismissable={isDismissable}
        isKeyboardDismissDisabled={isKeyboardDismissDisabled}
      >
        <Modal.Container placement={placement} size={size}>
          <Modal.Dialog className={className}>
            <Modal.CloseTrigger />
            {title && (
              <Modal.Header>
                <Modal.Heading>{title}</Modal.Heading>
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

/**
 * Hook de uso controlado (para casos avançados)
 * 
 * Para controle programático do modal, use o Dialog render props:
 * 
 * <Modal.Dialog>
 *   {(renderProps) => (
 *     <>
 *       <Modal.Body>Content</Modal.Body>
 *       <Modal.Footer>
 *         <Button onPress={() => renderProps.close()}>Close</Button>
 *       </Modal.Footer>
 *     </>
 *   )}
 * </Modal.Dialog>
 */

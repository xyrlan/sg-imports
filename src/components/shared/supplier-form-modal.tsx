'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Truck } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionModal } from '@/hooks/use-action-modal';

interface Supplier {
  id: string;
  name: string;
  taxId: string | null;
  countryCode: string | null;
  email: string | null;
  address: string | null;
}

interface SupplierFormModalLabels {
  heading: string;
  name: string;
  namePlaceholder: string;
  taxId: string;
  taxIdPlaceholder: string;
  countryCode: string;
  countryCodePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  address: string;
  addressPlaceholder: string;
  cancel: string;
  save: string;
  saving: string;
}

interface SupplierFormModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger?: React.ReactNode;
  action: (state: any, formData: FormData) => Promise<any>;
  supplier?: Supplier | null;
  organizationId?: string;
  labels: SupplierFormModalLabels;
}

export function SupplierFormModal({
  isOpen,
  onOpenChange,
  trigger,
  action,
  supplier,
  organizationId,
  labels,
}: SupplierFormModalProps) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [taxId, setTaxId] = useState(supplier?.taxId ?? '');
  const [countryCode, setCountryCode] = useState(supplier?.countryCode ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');

  const { state, formAction, isPending } = useActionModal({
    action,
    onSuccess: () => onOpenChange(false),
  });

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setName(supplier?.name ?? '');
        setTaxId(supplier?.taxId ?? '');
        setCountryCode(supplier?.countryCode ?? '');
        setEmail(supplier?.email ?? '');
        setAddress(supplier?.address ?? '');
      });
    }
  }, [isOpen, supplier]);

  return (
    <Modal>
      {trigger ?? null}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Icon className="bg-surface text-foreground">
                <Truck className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{labels.heading}</Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              {organizationId && (
                <input type="hidden" name="organizationId" value={organizationId} />
              )}
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{labels.name}</Label>
                    <Input
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={labels.namePlaceholder}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{labels.taxId}</Label>
                    <Input
                      name="taxId"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder={labels.taxIdPlaceholder}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{labels.countryCode}</Label>
                    <Input
                      name="countryCode"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      placeholder={labels.countryCodePlaceholder}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{labels.email}</Label>
                    <Input
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={labels.emailPlaceholder}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{labels.address}</Label>
                    <Input
                      name="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={labels.addressPlaceholder}
                    />
                  </TextField>
                  {state?.error && <FormError message={state.error} />}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close">
                  {labels.cancel}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {isPending ? labels.saving : labels.save}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

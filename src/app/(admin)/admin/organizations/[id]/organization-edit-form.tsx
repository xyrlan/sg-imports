'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  TextField,
  Input,
  Label,
  NumberField,
  Select,
  ListBox,
  Button,
  Card,
  Chip,
  Checkbox,
} from '@heroui/react';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Users,
  Upload,
  MapPin,
  Search,
  Receipt,
} from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { FileUpload } from '@/components/ui/file-upload';
import { useTranslations } from 'next-intl';
import { formatDate, formatCNPJ } from '@/lib/utils';
import type { OrganizationMember, OrganizationAddress, ServiceFeeConfig } from '@/services/admin';

import {
  updateOrganizationAdminAction,
  uploadSocialContractAdminAction,
  updateOrganizationAddressAdminAction,
  updateMemberRoleAdminAction,
  updateServiceFeeAdminAction,
  fetchCEPDataAdmin,
} from './actions';

// ============================================
// Types
// ============================================

interface OrganizationEditFormProps {
  organization: {
    id: string;
    name: string;
    tradeName: string | null;
    document: string;
    email: string | null;
    phone: string | null;
    taxRegime: string | null;
    stateRegistry: string | null;
    orderType: string;
    minOrderValue: string | null;
    socialContractUrl: string | null;
    billingAddressId: string | null;
    deliveryAddressId: string | null;
    billingAddress: OrganizationAddress | null;
    deliveryAddress: OrganizationAddress | null;
    createdAt: Date;
  };
  members: OrganizationMember[];
  feeConfig: ServiceFeeConfig | null;
}

const ORG_ROLES = ['OWNER', 'ADMIN', 'EMPLOYEE', 'SELLER', 'CUSTOMS_BROKER', 'VIEWER'] as const;

// ============================================
// Main Component
// ============================================

export function OrganizationEditForm({
  organization,
  members,
  feeConfig,
}: OrganizationEditFormProps) {
  const t = useTranslations('Admin.OrganizationEdit');
  const tOnboarding = useTranslations('Onboarding');
  const router = useRouter();

  // Org fields form
  const [state, formAction, isPending] = useActionState(
    updateOrganizationAdminAction.bind(null, organization.id),
    null,
  );

  // Social contract upload
  const [uploadState, uploadFormAction, isUploading] = useActionState(
    uploadSocialContractAdminAction.bind(null, organization.id),
    null,
  );

  // Address form
  const [addressState, addressFormAction, isAddressSaving] = useActionState(
    updateOrganizationAddressAdminAction.bind(null, organization.id),
    null,
  );

  // Service fee config form
  const [feeState, feeFormAction, isFeeSaving] = useActionState(
    updateServiceFeeAdminAction.bind(null, organization.id),
    null,
  );

  const [socialContractFile, setSocialContractFile] = useState<File | null>(null);
  const [applyToChina, setApplyToChina] = useState(feeConfig?.applyToChinaProducts ?? true);

  // "Same as billing" checkbox
  const isSameAddress = organization.billingAddressId === organization.deliveryAddressId && !!organization.billingAddressId;
  const [sameAsDelivery, setSameAsDelivery] = useState(isSameAddress);

  // CEP fetch state
  const [billingCepLoading, setBillingCepLoading] = useState(false);
  const [deliveryCepLoading, setDeliveryCepLoading] = useState(false);

  useEffect(() => {
    if (state?.success || uploadState?.success || addressState?.success || feeState?.success) {
      router.refresh();
    }
  }, [state?.success, uploadState?.success, addressState?.success, feeState?.success, router]);

  async function handleCepFetch(prefix: 'billing' | 'delivery', cep: string) {
    const setLoading = prefix === 'billing' ? setBillingCepLoading : setDeliveryCepLoading;
    setLoading(true);
    try {
      const data = await fetchCEPDataAdmin(cep);
      if (data) {
        // Fill form fields using DOM
        const form = document.getElementById('address-form') as HTMLFormElement;
        if (form) {
          const setVal = (name: string, value: string) => {
            const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
            if (input) {
              // Use native setter to trigger React state
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value',
              )?.set;
              nativeInputValueSetter?.call(input, value);
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          };
          setVal(`${prefix}_street`, data.logradouro ?? '');
          setVal(`${prefix}_neighborhood`, data.bairro ?? '');
          setVal(`${prefix}_city`, data.localidade ?? '');
          setVal(`${prefix}_state`, data.uf ?? '');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <NextLink
        href={`/admin/users-organizations?selectedTab=organizations`}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('backToManagement')}
      </NextLink>

      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Success messages */}
      {state?.success && (
        <div className="p-3 border rounded-lg bg-success/10 border-success text-success-foreground">
          <p className="text-sm">{t('success')}</p>
        </div>
      )}
      {uploadState?.success && (
        <div className="p-3 border rounded-lg bg-success/10 border-success text-success-foreground">
          <p className="text-sm">{t('uploadSuccess')}</p>
        </div>
      )}
      {addressState?.success && (
        <div className="p-3 border rounded-lg bg-success/10 border-success text-success-foreground">
          <p className="text-sm">{t('addressSuccess')}</p>
        </div>
      )}
      {feeState?.success && (
        <div className="p-3 border rounded-lg bg-success/10 border-success text-success-foreground">
          <p className="text-sm">{t('feeSuccess')}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Org fields + Address */}
        <div className="space-y-6">
          {/* Company data form */}
          <Card variant="default">
            <Card.Header>
              <Card.Title>{t('companyData')}</Card.Title>
            </Card.Header>
            <Card.Content>
              <form action={formAction} className="space-y-4">
                <FormError message={state?.error} variant="danger" />

                {/* Read-only: Name + CNPJ */}
                <div className="space-y-2 p-3 rounded-lg bg-default-100 border flex gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted">{t('name')}</p>
                    <p className="font-medium">{organization.name}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted">{t('document')}</p>
                    <p className="font-mono text-sm">{formatCNPJ(organization.document)}</p>
                  </div>
                </div>

                <TextField variant="primary" isDisabled={isPending} defaultValue={organization.tradeName ?? ''}>
                  <Label>{t('tradeName')}</Label>
                  <Input name="tradeName" placeholder={t('tradeNamePlaceholder')} />
                </TextField>

                <TextField variant="primary" isDisabled={isPending} defaultValue={organization.stateRegistry ?? ''}>
                  <Label>{t('stateRegistry')}</Label>
                  <Input name="stateRegistry" placeholder={t('stateRegistryPlaceholder')} />
                </TextField>

                <Select name="taxRegime" variant="primary" isDisabled={isPending} defaultValue={organization.taxRegime ?? undefined}>
                  <Label>{t('taxRegime')}</Label>
                  <Select.Trigger>
                    <Select.Value>{t('taxRegimePlaceholder')}</Select.Value>
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="SIMPLES_NACIONAL" id="SIMPLES_NACIONAL" textValue={tOnboarding('Step1.taxRegimes.SIMPLES_NACIONAL')}>
                        {tOnboarding('Step1.taxRegimes.SIMPLES_NACIONAL')}
                      </ListBox.Item>
                      <ListBox.Item key="LUCRO_PRESUMIDO" id="LUCRO_PRESUMIDO" textValue={tOnboarding('Step1.taxRegimes.LUCRO_PRESUMIDO')}>
                        {tOnboarding('Step1.taxRegimes.LUCRO_PRESUMIDO')}
                      </ListBox.Item>
                      <ListBox.Item key="LUCRO_REAL" id="LUCRO_REAL" textValue={tOnboarding('Step1.taxRegimes.LUCRO_REAL')}>
                        {tOnboarding('Step1.taxRegimes.LUCRO_REAL')}
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>

                <TextField variant="primary" isDisabled={isPending} defaultValue={organization.email ?? ''}>
                  <Label>{t('email')}</Label>
                  <Input name="email" type="email" placeholder={t('emailPlaceholder')} />
                </TextField>

                <TextField variant="primary" isDisabled={isPending} defaultValue={organization.phone ?? ''}>
                  <Label>{t('phone')}</Label>
                  <Input name="phone" placeholder={t('phonePlaceholder')} />
                </TextField>

                <Select name="orderType" variant="primary" isDisabled={isPending} defaultValue={organization.orderType}>
                  <Label>{t('orderType')}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="ORDER" id="ORDER" textValue={t('orderTypes.ORDER')}>
                        {t('orderTypes.ORDER')}
                      </ListBox.Item>
                      <ListBox.Item key="DIRECT_ORDER" id="DIRECT_ORDER" textValue={t('orderTypes.DIRECT_ORDER')}>
                        {t('orderTypes.DIRECT_ORDER')}
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>

                <TextField variant="primary" isDisabled={isPending} defaultValue={organization.minOrderValue ?? ''}>
                  <Label>{t('minOrderValue')}</Label>
                  <Input name="minOrderValue" placeholder={t('minOrderValuePlaceholder')} />
                </TextField>

                <div className="space-y-1">
                  <p className="text-sm text-muted">{t('createdAt')}</p>
                  <p className="text-sm">{formatDate(new Date(organization.createdAt))}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary" isDisabled={isPending}>
                    {isPending ? t('saving') : t('save')}
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>

          {/* Address form */}
          <Card variant="default">
            <Card.Header>
              <div className="flex items-center gap-2">
                <MapPin className="size-5" />
                <Card.Title>{t('addresses')}</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <form id="address-form" action={addressFormAction} className="space-y-6">
                <FormError message={addressState?.error} variant="danger" />

                <input type="hidden" name="sameAsDelivery" value={sameAsDelivery ? 'true' : 'false'} />

                {/* Billing Address */}
                <AddressBlock
                  prefix="billing"
                  title={t('billingAddress')}
                  address={organization.billingAddress}
                  isDisabled={isAddressSaving}
                  cepLoading={billingCepLoading}
                  onCepFetch={(cep) => handleCepFetch('billing', cep)}
                  t={tOnboarding}
                />

                {/* Same as delivery checkbox */}
                <Checkbox
                  isSelected={sameAsDelivery}
                  onChange={setSameAsDelivery}
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>{t('sameAsDelivery')}</Label>
                  </Checkbox.Content>
                </Checkbox>

                {/* Delivery Address */}
                {!sameAsDelivery && (
                  <AddressBlock
                    prefix="delivery"
                    title={t('deliveryAddress')}
                    address={
                      organization.deliveryAddressId !== organization.billingAddressId
                        ? organization.deliveryAddress
                        : null
                    }
                    isDisabled={isAddressSaving}
                    cepLoading={deliveryCepLoading}
                    onCepFetch={(cep) => handleCepFetch('delivery', cep)}
                    t={tOnboarding}
                  />
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="submit" variant="primary" isDisabled={isAddressSaving}>
                    {isAddressSaving ? t('saving') : t('saveAddress')}
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>
        </div>

        {/* Right column: Social Contract + Members */}
        <div className="space-y-6">
          {/* Social Contract upload */}
          <Card variant="default">
            <Card.Header>
              <Card.Title>{t('socialContract')}</Card.Title>
            </Card.Header>
            <Card.Content>
              {organization.socialContractUrl && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-default-100 border mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-muted" />
                    <div>
                      <p className="text-sm font-medium">{t('socialContract')}</p>
                      <a
                        href={organization.socialContractUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {t('viewDocument')}
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                  <Chip color="success" size="sm">OK</Chip>
                </div>
              )}

              <form action={uploadFormAction} className="space-y-4">
                <FormError message={uploadState?.error} variant="danger" />
                <FileUpload
                  label={organization.socialContractUrl ? t('replaceDocument') : t('uploadSocialContract')}
                  name="socialContract"
                  onFileSelect={setSocialContractFile}
                  disabled={isUploading}
                />
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={isUploading || !socialContractFile}
                >
                  <Upload className="size-4" />
                  {isUploading ? t('uploading') : t('uploadDocument')}
                </Button>
              </form>
            </Card.Content>
          </Card>

          {/* Service Fee Configuration */}
          <Card variant="default">
            <Card.Header>
              <div className="flex items-center gap-2">
                <Receipt className="size-5" />
                <Card.Title>{t('feeConfig')}</Card.Title>
              </div>
              {feeConfig && (
                <p className="text-xs text-muted mt-1">
                  {t('feeLastUpdated', { date: formatDate(new Date(feeConfig.updatedAt)) })}
                </p>
              )}
            </Card.Header>
            <Card.Content>
              <form action={feeFormAction} className="space-y-4">
                <FormError message={feeState?.error} variant="danger" />

                <input type="hidden" name="applyToChinaProducts" value={applyToChina ? 'true' : 'false'} />

                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    variant="primary"
                    isDisabled={isFeeSaving}
                    name="percentage"
                    defaultValue={parseFloat(feeConfig?.percentage ?? '2.5') / 100}
                    minValue={0}
                    maxValue={1}
                    step={0.001}
                    formatOptions={{ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }}
                  >
                    <Label>{t('feePercentage')}</Label>
                    <NumberField.Group>
                      <NumberField.DecrementButton />
                      <NumberField.Input className="min-w-0 flex-1" />
                      <NumberField.IncrementButton />
                    </NumberField.Group>
                  </NumberField>

                  <Select
                    name="minimumValueMultiplier"
                    variant="primary"
                    isDisabled={isFeeSaving}
                    defaultSelectedKey={String(feeConfig?.minimumValueMultiplier ?? 2)}
                  >
                    <Label>{t('feeMultiplier')}</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item key="2" id="2" textValue="2× salário mínimo">
                          2× salário mínimo
                        </ListBox.Item>
                        <ListBox.Item key="3" id="3" textValue="3× salário mínimo">
                          3× salário mínimo
                        </ListBox.Item>
                        <ListBox.Item key="4" id="4" textValue="4× salário mínimo">
                          4× salário mínimo
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                <Checkbox
                  isSelected={applyToChina}
                  onChange={setApplyToChina}
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>{t('feeApplyToChina')}</Label>
                  </Checkbox.Content>
                </Checkbox>

                {!feeConfig && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning text-sm text-warning-foreground">
                    {t('feeNotConfigured')}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="submit" variant="primary" isDisabled={isFeeSaving}>
                    {isFeeSaving ? t('saving') : (feeConfig ? t('feeUpdate') : t('feeCreate'))}
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>

          {/* Members list with role editing */}
          <Card variant="default">
            <Card.Header>
              <div className="flex items-center gap-2">
                <Users className="size-5" />
                <Card.Title>
                  {t('members')} ({t('membersCount', { count: members.length })})
                </Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              {members.length === 0 ? (
                <p className="text-sm text-muted">—</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <MemberRow
                      key={member.profileId}
                      member={member}
                      orgId={organization.id}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Address Block
// ============================================

function AddressBlock({
  prefix,
  title,
  address,
  isDisabled,
  cepLoading,
  onCepFetch,
  t,
}: {
  prefix: string;
  title: string;
  address: OrganizationAddress | null;
  isDisabled: boolean;
  cepLoading: boolean;
  onCepFetch: (cep: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [cep, setCep] = useState(address?.postalCode ?? '');

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>

      {/* CEP + Fetch button */}
      <div className="flex gap-2">
        <TextField
          variant="primary"
          isDisabled={isDisabled}
          defaultValue={address?.postalCode ?? ''}
          className="flex-1"
        >
          <Label>{t('Step2.postalCode')}</Label>
          <Input
            name={`${prefix}_postalCode`}
            placeholder={t('Step2.postalCodePlaceholder')}
            onChange={(e) => setCep(e.target.value)}
          />
        </TextField>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          isDisabled={isDisabled || cepLoading || cep.replace(/\D/g, '').length < 8}
          onPress={() => onCepFetch(cep)}
        >
          <Search className="size-4" />
          {cepLoading ? t('Step2.fetchingCEP') : t('Step2.fetchCEP')}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <TextField variant="primary" isDisabled={isDisabled} defaultValue={address?.street ?? ''} className="col-span-2">
          <Label>{t('Step2.street')}</Label>
          <Input name={`${prefix}_street`} placeholder={t('Step2.streetPlaceholder')} />
        </TextField>
        <TextField variant="primary" isDisabled={isDisabled} defaultValue={address?.number ?? ''}>
          <Label>{t('Step2.number')}</Label>
          <Input name={`${prefix}_number`} placeholder={t('Step2.numberPlaceholder')} />
        </TextField>
      </div>

      <TextField variant="primary" isDisabled={isDisabled} defaultValue={address?.complement ?? ''}>
        <Label>{t('Step2.complement')}</Label>
        <Input name={`${prefix}_complement`} placeholder={t('Step2.complementPlaceholder')} />
      </TextField>

      <TextField variant="primary" isDisabled={isDisabled} defaultValue={address?.neighborhood ?? ''}>
        <Label>{t('Step2.neighborhood')}</Label>
        <Input name={`${prefix}_neighborhood`} placeholder={t('Step2.neighborhoodPlaceholder')} />
      </TextField>

      <div className="grid grid-cols-2 gap-2">
        <TextField variant="primary" isDisabled={isDisabled} defaultValue={address?.city ?? ''}>
          <Label>{t('Step2.city')}</Label>
          <Input name={`${prefix}_city`} placeholder={t('Step2.cityPlaceholder')} />
        </TextField>
        <TextField variant="primary" isDisabled={isDisabled} defaultValue={address?.state ?? ''}>
          <Label>{t('Step2.state')}</Label>
          <Input name={`${prefix}_state`} placeholder={t('Step2.statePlaceholder')} maxLength={2} />
        </TextField>
      </div>
    </div>
  );
}

// ============================================
// Member Row with Role Select
// ============================================

function MemberRow({
  member,
  orgId,
  t,
}: {
  member: OrganizationMember;
  orgId: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [isUpdating, startTransition] = useTransition();

  function handleRoleChange(newRole: string) {
    startTransition(async () => {
      await updateMemberRoleAdminAction(orgId, member.profileId, newRole);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100 border">
      <NextLink
        href={`/admin/users/${member.profileId}`}
        className="min-w-0 flex-1 hover:opacity-80 transition-opacity"
      >
        <p className="text-sm font-medium truncate text-primary hover:underline">
          {member.fullName ?? member.email}
        </p>
        <p className="text-xs text-muted truncate">{member.email}</p>
      </NextLink>

      <Select
        name={`role_${member.profileId}`}
        variant="primary"
        isDisabled={isUpdating}
        defaultValue={member.role}
        onSelectionChange={(key) => {
          if (key && key !== member.role) {
            handleRoleChange(String(key));
          }
        }}
        className="w-48 shrink-0"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {ORG_ROLES.map((role) => (
              <ListBox.Item key={role} id={role} textValue={t(`roles.${role}`)}>
                {t(`roles.${role}`)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

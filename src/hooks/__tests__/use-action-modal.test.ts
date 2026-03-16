import { describe, it, expect } from 'bun:test';

import { useActionModal } from '../use-action-modal';

describe('useActionModal', () => {
  it('should be exported as a function', () => {
    expect(typeof useActionModal).toBe('function');
  });
});

import { describe, expect, it } from 'vitest';
import { OVERRIDE_ROLES } from '@/lib/conflicts/types';

describe('Override permissions', () => {
  it('ADMIN può forzare', () => {
    expect(OVERRIDE_ROLES).toContain('ADMIN');
  });
  it('SECRETARY può forzare', () => {
    expect(OVERRIDE_ROLES).toContain('SECRETARY');
  });
  it('THERAPIST NON può forzare', () => {
    expect(OVERRIDE_ROLES).not.toContain('THERAPIST');
  });
});

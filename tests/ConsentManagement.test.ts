import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_DATA_HASH = 101;
const ERR_INVALID_EXPIRATION = 102;
const ERR_CONSENT_NOT_FOUND = 103;
const ERR_CONSENT_INACTIVE = 104;
const ERR_PATIENT_NOT_REGISTERED = 105;
const ERR_PROVIDER_NOT_VERIFIED = 106;
const ERR_INVALID_CONSENT_ID = 107;
const ERR_ALREADY_ACTIVE = 108;

interface Consent {
  patient: string;
  provider: string;
  dataHash: string;
  expiration: number;
  active: boolean;
  createdAt: number;
  lastModified: number;
}

interface AuditLog {
  action: string;
  timestamp: number;
  initiator: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class ConsentManagementMock {
  state: {
    consentCounter: number;
    maxConsents: number;
    authorityContract: string | null;
    consents: Map<number, Consent>;
    consentByPatientProvider: Map<string, number>;
    auditLogs: Map<string, AuditLog>;
  } = {
    consentCounter: 0,
    maxConsents: 10000,
    authorityContract: null,
    consents: new Map(),
    consentByPatientProvider: new Map(),
    auditLogs: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1PATIENT";
  patients: Set<string> = new Set(["ST1PATIENT"]);
  providers: Set<string> = new Set(["ST2PROVIDER"]);

  reset(): void {
    this.state = {
      consentCounter: 0,
      maxConsents: 10000,
      authorityContract: null,
      consents: new Map(),
      consentByPatientProvider: new Map(),
      auditLogs: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1PATIENT";
    this.patients = new Set(["ST1PATIENT"]);
    this.providers = new Set(["ST2PROVIDER"]);
  }

  isPatientRegistered(principal: string): Result<boolean> {
    return { ok: true, value: this.patients.has(principal) };
  }

  isProviderVerified(principal: string): Result<boolean> {
    return { ok: true, value: this.providers.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78")
      return { ok: false, value: false };
    if (this.state.authorityContract !== null)
      return { ok: false, value: false };
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setMaxConsents(newMax: number): Result<boolean> {
    if (newMax <= 0) return { ok: false, value: false };
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.maxConsents = newMax;
    return { ok: true, value: true };
  }

  grantConsent(
    provider: string,
    dataHash: string,
    expiration: number
  ): Result<number> {
    if (this.state.consentCounter >= this.state.maxConsents)
      return { ok: false, value: ERR_INVALID_CONSENT_ID };
    if (!dataHash || dataHash.length > 64)
      return { ok: false, value: ERR_INVALID_DATA_HASH };
    if (expiration <= this.blockHeight)
      return { ok: false, value: ERR_INVALID_EXPIRATION };
    if (!this.isPatientRegistered(this.caller).value)
      return { ok: false, value: ERR_PATIENT_NOT_REGISTERED };
    if (!this.isProviderVerified(provider).value)
      return { ok: false, value: ERR_PROVIDER_NOT_VERIFIED };
    const key = `${this.caller}-${provider}-${dataHash}`;
    if (this.state.consentByPatientProvider.has(key))
      return { ok: false, value: ERR_ALREADY_ACTIVE };

    const id = this.state.consentCounter;
    const consent: Consent = {
      patient: this.caller,
      provider,
      dataHash,
      expiration,
      active: true,
      createdAt: this.blockHeight,
      lastModified: this.blockHeight,
    };
    this.state.consents.set(id, consent);
    this.state.consentByPatientProvider.set(key, id);
    this.state.auditLogs.set(`${id}-0`, {
      action: "grant",
      timestamp: this.blockHeight,
      initiator: this.caller,
    });
    this.state.consentCounter++;
    return { ok: true, value: id };
  }

  revokeConsent(consentId: number): Result<boolean> {
    const consent = this.state.consents.get(consentId);
    if (!consent) return { ok: false, value: false };
    if (consent.patient !== this.caller) return { ok: false, value: false };
    if (!consent.active) return { ok: false, value: false };
    this.state.consents.set(consentId, {
      ...consent,
      active: false,
      lastModified: this.blockHeight,
    });
    this.state.auditLogs.set(`${consentId}-${this.state.auditLogs.size + 1}`, {
      action: "revoke",
      timestamp: this.blockHeight,
      initiator: this.caller,
    });
    return { ok: true, value: true };
  }

  checkConsentStatus(
    consentId: number
  ): Result<{ status: string; details: Consent }> {
    const consent = this.state.consents.get(consentId);
    if (!consent)
      return { ok: false, value: { status: "", details: {} as Consent } };
    const status =
      consent.active && this.blockHeight <= consent.expiration
        ? "active"
        : "inactive";
    return { ok: true, value: { status, details: consent } };
  }

  getConsent(consentId: number): Consent | null {
    return this.state.consents.get(consentId) || null;
  }

  getConsentByPatientProvider(
    patient: string,
    provider: string,
    dataHash: string
  ): number | null {
    return (
      this.state.consentByPatientProvider.get(
        `${patient}-${provider}-${dataHash}`
      ) || null
    );
  }

  getAuditLog(consentId: number, logId: number): AuditLog | null {
    return this.state.auditLogs.get(`${consentId}-${logId}`) || null;
  }

  getConsentCount(): Result<number> {
    return { ok: true, value: this.state.consentCounter };
  }
}

describe("ConsentManagement", () => {
  let contract: ConsentManagementMock;

  beforeEach(() => {
    contract = new ConsentManagementMock();
    contract.reset();
  });

  it("grants consent successfully", () => {
    contract.setAuthorityContract("ST3AUTH");
    contract.blockHeight = 100;
    const result = contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const consent = contract.getConsent(0);
    expect(consent?.patient).toBe("ST1PATIENT");
    expect(consent?.provider).toBe("ST2PROVIDER");
    expect(consent?.dataHash).toBe("ipfs-hash-123");
    expect(consent?.expiration).toBe(200);
    expect(consent?.active).toBe(true);
    expect(consent?.createdAt).toBe(100);
    expect(consent?.lastModified).toBe(100);
    const auditLog = contract.getAuditLog(0, 0);
    expect(auditLog?.action).toBe("grant");
    expect(auditLog?.initiator).toBe("ST1PATIENT");
  });

  it("rejects duplicate consent", () => {
    contract.setAuthorityContract("ST3AUTH");
    contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 200);
    const result = contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ALREADY_ACTIVE);
  });

  it("rejects invalid data hash", () => {
    contract.setAuthorityContract("ST3AUTH");
    const longHash = "a".repeat(65);
    const result = contract.grantConsent("ST2PROVIDER", longHash, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DATA_HASH);
  });

  it("rejects invalid expiration", () => {
    contract.setAuthorityContract("ST3AUTH");
    contract.blockHeight = 100;
    const result = contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 50);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_EXPIRATION);
  });

  it("rejects unregistered patient", () => {
    contract.setAuthorityContract("ST3AUTH");
    contract.patients = new Set();
    const result = contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PATIENT_NOT_REGISTERED);
  });

  it("rejects unverified provider", () => {
    contract.setAuthorityContract("ST3AUTH");
    contract.providers = new Set();
    const result = contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROVIDER_NOT_VERIFIED);
  });

 

  it("rejects revoke by non-patient", () => {
    contract.setAuthorityContract("ST3AUTH");
    contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 200);
    contract.caller = "ST3FAKE";
    const result = contract.revokeConsent(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects revoke for inactive consent", () => {
    contract.setAuthorityContract("ST3AUTH");
    contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 200);
    contract.revokeConsent(0);
    const result = contract.revokeConsent(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("checks consent status correctly", () => {
    contract.setAuthorityContract("ST3AUTH");
    contract.blockHeight = 100;
    contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 200);
    const result = contract.checkConsentStatus(0);
    expect(result.ok).toBe(true);
    expect(result.value.status).toBe("active");
    contract.blockHeight = 201;
    const result2 = contract.checkConsentStatus(0);
    expect(result2.ok).toBe(true);
    expect(result2.value.status).toBe("inactive");
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST3AUTH");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST3AUTH");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract(
      "SP000000000000000000002Q6VF78"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct consent count", () => {
    contract.setAuthorityContract("ST3AUTH");
    contract.grantConsent("ST2PROVIDER", "ipfs-hash-123", 200);
    contract.grantConsent("ST2PROVIDER", "ipfs-hash-456", 300);
    const result = contract.getConsentCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });
});

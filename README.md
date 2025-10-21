# 🩺 Decentralized Patient Consent Platform

Welcome to the **Decentralized Patient Consent Platform**, a Web3 solution built on the Stacks blockchain to empower patients with full control over their medical data for remote consultations. Using Clarity smart contracts, this platform ensures secure, transparent, and decentralized management of patient consent, enabling seamless and privacy-focused telemedicine.

## ✨ Features

🔒 **Patient-Controlled Data Access**: Patients grant or revoke access to their medical data for specific providers or consultations.  
📜 **Immutable Consent Records**: All consent actions are recorded on-chain for transparency and auditability.  
🏥 **Provider Verification**: Only verified healthcare providers can request data access.  
🔐 **Encrypted Data References**: Store off-chain data references (e.g., IPFS hashes) securely on-chain.  
⏰ **Time-Bound Consents**: Set expiration dates for data access to ensure temporary permissions.  
✅ **Consent Verification**: Third parties (e.g., auditors) can verify consent history.  
🚫 **Revoke Access Anytime**: Patients can revoke provider access instantly.  
📊 **Consultation Logs**: Track consultation history linked to consent agreements.

## 🛠 How It Works

**For Patients**  
- Register as a patient and upload encrypted medical data references (e.g., IPFS hash).  
- Grant or revoke access to healthcare providers for specific consultations.  
- Set time-bound consents or revoke them at any time.  
- View consent and consultation history.

**For Healthcare Providers**  
- Register as a verified provider (requires admin approval).  
- Request access to patient data for consultations.  
- Access granted data references and log consultation details.  

**For Auditors/Verifiers**  
- Verify consent records and consultation logs on-chain for compliance or disputes.  

**Data Flow**  
1. Patients upload encrypted medical data off-chain (e.g., to IPFS) and store the hash on-chain.  
2. Patients grant providers access via smart contracts, specifying conditions (e.g., expiration).  
3. Providers access data references only if consent is valid.  
4. All actions (grants, revocations, consultations) are logged immutably.

## 📑 Smart Contracts (8 Total)

Below is an overview of the **8 Clarity smart contracts** that power the platform:

1. **PatientRegistry.clar**  
   - Manages patient registration and profiles.  
   - Stores patient details (e.g., principal, public key).  
   - Functions: `register-patient`, `update-patient-profile`, `get-patient-details`.  

2. **ProviderRegistry.clar**  
   - Handles provider registration and verification.  
   - Admins verify providers to ensure legitimacy.  
   - Functions: `register-provider`, `verify-provider`, `get-provider-details`.  

3. **ConsentManagement.clar**  
   - Core contract for granting and revoking data access.  
   - Tracks consent agreements (patient, provider, data hash, expiration).  
   - Functions: `grant-consent`, `revoke-consent`, `get-consent-status`.  

4. **DataRegistry.clar**  
   - Stores encrypted medical data references (e.g., IPFS hashes) on-chain.  
   - Links data to patients and ensures only authorized access.  
   - Functions: `add-data-reference`, `get-data-reference`, `delete-data-reference`.  

5. **ConsultationLog.clar**  
   - Logs consultation details (e.g., provider, patient, timestamp) tied to consents.  
   - Ensures immutable consultation history.  
   - Functions: `log-consultation`, `get-consultation-history`.  

6. **AccessControl.clar**  
   - Enforces access rules for data retrieval.  
   - Verifies consent and expiration before allowing provider access.  
   - Functions: `check-access`, `restrict-access`.  

7. **AdminControls.clar**  
   - Manages administrative tasks (e.g., provider verification, system settings).  
   - Restricted to authorized admins.  
   - Functions: `set-admin`, `verify-provider`, `update-system-settings`.  

8. **AuditTrail.clar**  
   - Provides immutable audit logs for all consent and consultation actions.  
   - Allows third-party verification of compliance.  
   - Functions: `get-audit-log`, `verify-consent-history`.  

## 🚀 Getting Started

### Prerequisites
- **Stacks Blockchain**: Deploy contracts on the Stacks network.  
- **Clarity SDK**: Install the Clarity development environment (`clarinet`).  
- **IPFS or Storage Solution**: For off-chain encrypted medical data storage.  
- **Stacks Wallet**: For interacting with the blockchain (e.g., Hiro Wallet).  

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/decentralized-patient-consent.git
   cd decentralized-patient-consent
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up a local Stacks devnet using Clarinet:
   ```bash
   clarinet integrate
   ```

### Deploying Contracts
1. Deploy the smart contracts to the Stacks blockchain:
   ```bash
   clarinet deploy
   ```
2. Configure IPFS or another storage solution for off-chain data.  
3. Update contract configurations (e.g., admin principals) in `settings/Devnet.toml`.

### Usage
**For Patients**  
1. Register using `PatientRegistry.clar`:
   ```clarity
   (contract-call? .PatientRegistry register-patient (tx-sender) "patient-public-key")
   ```
2. Upload data reference:
   ```clarity
   (contract-call? .DataRegistry add-data-reference "ipfs-hash" (tx-sender))
   ```
3. Grant consent to a provider:
   ```clarity
   (contract-call? .ConsentManagement grant-consent provider-principal "ipfs-hash" u168h)
   ```

**For Providers**  
1. Register and get verified:
   ```clarity
   (contract-call? .ProviderRegistry register-provider (tx-sender) "provider-details")
   ```
2. Request data access (after consent):
   ```clarity
   (contract-call? .AccessControl check-access patient-principal "ipfs-hash")
   ```
3. Log a consultation:
   ```clarity
   (contract-call? .ConsultationLog log-consultation patient-principal "consultation-details")
   ```

**For Auditors**  
1. Verify consent:
   ```clarity
   (contract-call? .AuditTrail verify-consent-history patient-principal provider-principal)
   ```

## 🛡️ Security Considerations
- **Encryption**: Medical data is encrypted off-chain; only hashes are stored on-chain.  
- **Access Control**: Only patients can grant/revoke consents; providers must be verified.  
- **Immutability**: Consent and consultation logs are tamper-proof on the Stacks blockchain.  
- **Privacy**: Patient identities are pseudonymous (tied to Stacks principals).  

## 🌟 Why This Matters
The Decentralized Patient Consent Platform solves critical issues in telemedicine:  
- **Privacy**: Patients control who accesses their sensitive medical data.  
- **Transparency**: Immutable logs ensure trust and compliance.  
- **Interoperability**: Providers can securely access data for remote consultations.  
- **Security**: Blockchain and encryption protect against unauthorized access.

## 📜 License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing
Contributions are welcome! Please submit pull requests or open issues on the [GitHub repository](https://github.com/your-repo/decentralized-patient-consent).

## 📬 Contact
For questions or support, reach out via [GitHub Issues](https://github.com/your-repo/decentralized-patient-consent/issues) or join our community on [X](https://x.com/your-profile).
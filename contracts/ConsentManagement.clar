;; ConsentManagement.clar
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-DATA-HASH u101)
(define-constant ERR-INVALID-EXPIRATION u102)
(define-constant ERR-CONSENT-NOT-FOUND u103)
(define-constant ERR-CONSENT-INACTIVE u104)
(define-constant ERR-PATIENT-NOT-REGISTERED u105)
(define-constant ERR-PROVIDER-NOT-VERIFIED u106)
(define-constant ERR-INVALID-CONSENT-ID u107)
(define-constant ERR-ALREADY-ACTIVE u108)
(define-constant ERR-INVALID-TIMESTAMP u109)
(define-constant ERR-AUDIT-LOG-FAILURE u110)

(define-data-var consent-counter uint u0)
(define-data-var max-consents uint u10000)
(define-data-var authority-contract (optional principal) none)

(define-map consents
  { consent-id: uint }
  {
    patient: principal,
    provider: principal,
    data-hash: (string-ascii 64),
    expiration: uint,
    active: bool,
    created-at: uint,
    last-modified: uint
  }
)

(define-map consent-by-patient-provider
  { patient: principal, provider: principal, data-hash: (string-ascii 64) }
  uint
)

(define-map audit-logs
  { consent-id: uint, log-id: uint }
  {
    action: (string-ascii 20),
    timestamp: uint,
    initiator: principal
  }
)

(define-read-only (get-consent (consent-id uint))
  (map-get? consents { consent-id: consent-id })
)

(define-read-only (get-consent-by-patient-provider (patient principal) (provider principal) (data-hash (string-ascii 64)))
  (map-get? consent-by-patient-provider { patient: patient, provider: provider, data-hash: data-hash })
)

(define-read-only (get-audit-log (consent-id uint) (log-id uint))
  (map-get? audit-logs { consent-id: consent-id, log-id: log-id })
)

(define-read-only (get-consent-count)
  (ok (var-get consent-counter))
)

(define-private (validate-data-hash (data-hash (string-ascii 64)))
  (if (and (> (len data-hash) u0) (<= (len data-hash) u64))
    (ok true)
    (err ERR-INVALID-DATA-HASH))
)

(define-private (validate-expiration (expiration uint))
  (if (> expiration block-height)
    (ok true)
    (err ERR-INVALID-EXPIRATION))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
    (ok true)
    (err ERR-INVALID-TIMESTAMP))
)

(define-private (assert-patient-registered (patient principal))
  (contract-call? .PatientRegistry is-patient-registered patient)
)

(define-private (assert-provider-verified (provider principal))
  (contract-call? .ProviderRegistry is-provider-verified provider)
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (not (is-eq contract-principal 'SP000000000000000000002Q6VF78)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-consents (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-CONSENT-ID))
    (asserts! (is-some (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set max-consents new-max)
    (ok true)
  )
)

(define-public (grant-consent (provider principal) (data-hash (string-ascii 64)) (expiration uint))
  (let
    (
      (consent-id (var-get consent-counter))
      (current-max (var-get max-consents))
    )
    (asserts! (< consent-id current-max) (err ERR-INVALID-CONSENT-ID))
    (try! (validate-data-hash data-hash))
    (try! (validate-expiration expiration))
    (try! (assert-patient-registered tx-sender))
    (try! (assert-provider-verified provider))
    (asserts! (is-none (map-get? consent-by-patient-provider { patient: tx-sender, provider: provider, data-hash: data-hash })) (err ERR-ALREADY-ACTIVE))
    (map-insert consents
      { consent-id: consent-id }
      {
        patient: tx-sender,
        provider: provider,
        data-hash: data-hash,
        expiration: expiration,
        active: true,
        created-at: block-height,
        last-modified: block-height
      }
    )
    (map-insert consent-by-patient-provider
      { patient: tx-sender, provider: provider, data-hash: data-hash }
      consent-id
    )
    (map-insert audit-logs
      { consent-id: consent-id, log-id: u0 }
      { action: "grant", timestamp: block-height, initiator: tx-sender }
    )
    (var-set consent-counter (+ consent-id u1))
    (print { event: "consent-granted", id: consent-id })
    (ok consent-id)
  )
)

(define-public (revoke-consent (consent-id uint))
  (let
    (
      (consent (unwrap! (map-get? consents { consent-id: consent-id }) (err ERR-CONSENT-NOT-FOUND)))
    )
    (asserts! (is-eq (get patient consent) tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (get active consent) (err ERR-CONSENT-INACTIVE))
    (map-set consents
      { consent-id: consent-id }
      (merge consent { active: false, last-modified: block-height })
    )
    (map-insert audit-logs
      { consent-id: consent-id, log-id: u1 }
      { action: "revoke", timestamp: block-height, initiator: tx-sender }
    )
    (print { event: "consent-revoked", id: consent-id })
    (ok true)
  )
)

(define-read-only (check-consent-status (consent-id uint))
  (match (map-get? consents { consent-id: consent-id })
    consent
    (if (and (get active consent) (<= block-height (get expiration consent)))
      (ok { status: "active", details: consent })
      (ok { status: "inactive", details: consent })
    )
    (err ERR-CONSENT-NOT-FOUND)
  )
)

(define-private (get-audit-logs (consent-id uint))
  (filter (lambda (x) (is-some x)) (map (lambda (i) (map-get? audit-logs { consent-id: consent-id, log-id: i })) (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9)))
)
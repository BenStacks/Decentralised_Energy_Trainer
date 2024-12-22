;; Decentralized Energy Trading Smart Contract

;; Data Maps
(define-map producers principal { energy-available: uint, energy-price: uint })
(define-map consumers principal { energy-consumed: uint, total-spent: uint })
(define-map energy-sold principal uint)
(define-map energy-purchased principal uint)
(define-map producer-ratings principal (list 10 uint)) 
(define-map producer-reputation principal uint) 
(define-map energy-refunds principal uint) 
(define-map producer-revenue principal uint) 

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-not-owner (err u100))
(define-constant err-invalid-amount (err u101))
(define-constant err-producer-not-found (err u102))
(define-constant err-insufficient-energy (err u103))
(define-constant err-insufficient-funds (err u104))
(define-constant err-stx-transfer-failed (err u105))
(define-constant err-invalid-rating (err u106)) 
(define-constant err-no-purchase-history (err u107)) 
(define-constant err-refund-exceeds-purchase (err u108))


;; Read-only functions
(define-read-only (get-producer-info (producer principal))
  (ok (default-to 
    { energy-available: u0, energy-price: u0 } 
    (map-get? producers producer))))

(define-read-only (get-consumer-info (consumer principal))
  (ok (default-to 
    { energy-consumed: u0, total-spent: u0 } 
    (map-get? consumers consumer))))

(define-read-only (get-energy-sold (producer principal))
  (ok (default-to u0 (map-get? energy-sold producer))))

(define-read-only (get-energy-purchased (consumer principal))
  (ok (default-to u0 (map-get? energy-purchased consumer))))

(define-read-only (get-producer-rating (producer principal))
  (ok (default-to u0 (map-get? producer-reputation producer))))

(define-read-only (get-producer-revenue (producer principal))
  (ok (default-to u0 (map-get? producer-revenue producer))))

(define-read-only (get-refund-amount (consumer principal))
  (ok (default-to u0 (map-get? energy-refunds consumer))))

;; Public functions
(define-public (register-producer (energy-amount uint) (price-per-unit uint))
  (begin
    (asserts! (> energy-amount u0) (err err-invalid-amount))
    (asserts! (> price-per-unit u0) (err err-invalid-amount))
    (map-set producers tx-sender 
      { energy-available: energy-amount, energy-price: price-per-unit })
    (print {event: "producer-registered", producer: tx-sender, energy: energy-amount, price: price-per-unit})
    (ok true)))

(define-public (register-consumer)
  (begin
    (map-set consumers tx-sender { energy-consumed: u0, total-spent: u0 })
    (print {event: "consumer-registered", consumer: tx-sender})
    (ok true)))


 (define-public (buy-energy (producer principal) (energy-amount uint))
  (let (
    (producer-data (unwrap! (map-get? producers producer) (err err-producer-not-found)))
    (energy-available (get energy-available producer-data))
    (energy-price (get energy-price producer-data))
    (total-cost (* energy-amount energy-price))
    (consumer-data (default-to { energy-consumed: u0, total-spent: u0 } (map-get? consumers tx-sender)))
  )
    (asserts! (>= energy-available energy-amount) (err err-insufficient-energy))
    (asserts! (>= (stx-get-balance tx-sender) total-cost) (err err-insufficient-funds))
    
    ;; Perform STX transfer
    (match (stx-transfer? total-cost tx-sender producer)
      success
        (begin
          ;; Update producer
          (map-set producers producer 
            { energy-available: (- energy-available energy-amount), energy-price: energy-price })
          
          ;; Update consumer
          (map-set consumers tx-sender 
            {
              energy-consumed: (+ (get energy-consumed consumer-data) energy-amount),
              total-spent: (+ (get total-spent consumer-data) total-cost)
            })
          
          ;; Update energy sold and purchased
          (map-set energy-sold producer 
            (+ (default-to u0 (map-get? energy-sold producer)) energy-amount))
          (map-set energy-purchased tx-sender 
            (+ (default-to u0 (map-get? energy-purchased tx-sender)) energy-amount))
          
          (print {event: "energy-purchased", producer: producer, consumer: tx-sender, amount: energy-amount, cost: total-cost})
          (ok true)
        )
      error (err err-stx-transfer-failed)
    )
  )
)


(define-public (update-energy (new-energy uint))
  (let (
    (producer-data (unwrap! (get-producer-info tx-sender) (err err-producer-not-found)))
    (current-energy (get energy-available producer-data))
    (energy-price (get energy-price producer-data))
  )
    (map-set producers tx-sender 
      { energy-available: (+ current-energy new-energy), energy-price: energy-price })
    (print {event: "energy-updated", producer: tx-sender, new-total: (+ current-energy new-energy)})
    (ok true)))


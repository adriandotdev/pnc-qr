# QR API Documentation

This document outlines the usage and endpoints of the QR API.

## Authentication

All endpoints except for `/qr/api/v1/qr/payments/:user_type/:payment_type` require authentication using a Basic Token.

---

## Endpoints

### 1. Get QR Rates

- **URL:** `/qr/api/v1/qr/rates/:evse_uid`
- **Method:** GET
- **Authentication:** Basic Token
- **Parameters:**
  - `:evse_uid` - EVSE (Electric Vehicle Supply Equipment) UID
- **Description:** Retrieves QR rates for a specific EVSE.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

### 2. Check EVSE Details

- **URL:** `/qr/api/v1/qr/:code/:evse_uid`
- **Method:** GET
- **Authentication:** Basic Token
- **Parameters:**
  - `:code` - QR code
  - `:evse_uid` - EVSE UID
- **Description:** Checks details of a specific EVSE.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

### 3. Make QR Payment

- **URL:** `/qr/api/v1/qr/payments/:user_type/:payment_type`
- **Method:** POST
- **Authentication:** None
- **Request Body:**
  - `user_type` - Type of user (guest/driver)
  - `payment_type` - Type of payment (GCash/Maya, etc.)
- **Description:** Initiates a QR payment transaction.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

### 4. Charge with QR

- **URL:** `/qr/api/v1/qr/charge`
- **Method:** POST
- **Authentication:** Basic Token
- **Request Body:** JSON object with the following properties:
  - `mobile_number`
  - `location_id`
  - `evse_uid`
  - `connector_id`
  - `current_time`
  - `current_date`
  - `paid_charge_mins`
  - `amount`
  - `homelink`
- **Description:** Charges with a QR code.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

### 5. GCash Payment

- **URL:** `/qr/api/v1/payments/guest/gcash/:token/:payment_id/:evse_uid/:connector_id`
- **Method:** GET
- **Authentication:** Basic Token
- **Parameters:**
  - `:token`
  - `:payment_id`
  - `:evse_uid`
  - `:connector_id`
- **Description:** Initiates a GCash payment transaction.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

### 6. Maya Payment

- **URL:** `/qr/api/v1/payments/guest/maya/:token/:transaction_id/:evse_uid/:connector_id`
- **Method:** GET
- **Authentication:** Basic Token
- **Parameters:**
  - `:token`
  - `:transaction_id`
  - `:evse_uid`
  - `:connector_id`
- **Description:** Initiates a Maya payment transaction.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

### 7. Verify OTP

- **URL:** `/qr/api/v1/qr/otp/verify/:guest_id`
- **Method:** POST
- **Authentication:** Basic Token
- **Parameters:**
  - `:guest_id`
- **Request Body:** JSON object with the following properties:
  - `otp`
  - `timeslot_id`
  - `next_timeslot_id` (optional)
- **Description:** Verifies OTP (One-Time Password) for a guest.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

### 8. Resend OTP

- **URL:** `/qr/api/v1/qr/otp/resend/:guest_id`
- **Method:** POST
- **Authentication:** Basic Token
- **Parameters:**
  - `:guest_id`
- **Request Body:** JSON object with the following properties:
  - `timeslot_id`
  - `next_timeslot_id` (optional)
- **Description:** Resends OTP (One-Time Password) for a guest.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

### 9. Check Mobile Number Status

- **URL:** `/qr/api/v1/qr/check-status/mobile_number/:mobile_number`
- **Method:** GET
- **Authentication:** Basic Token
- **Parameters:**
  - `:mobile_number`
- **Description:** Checks the status of a mobile number.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

### 10. Verify Payment

- **URL:** `/qr/api/v1/payments/guest/verify/:transaction_id`
- **Method:** GET
- **Authentication:** Basic Token
- **Parameters:**
  - `:transaction_id`
- **Description:** Verifies a payment transaction.
- **Response:**
  - `status` - HTTP status code
  - `data` - Result data
  - `message` - Success message

---

## Error Handling

All endpoints are equipped with error handling middleware. If an error occurs, it will be logged and an appropriate error response will be sent.

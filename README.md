# PNC-QR APIs

## APIs

### Check EVSE - `GET /api/v1/qr/:code/:evse_uid`

Check, and retrieve the status of the charger, connector, and rates.

**Authorization: Basic TOKEN**

**Sample Response**

```json
{
	"status": 200,
	"data": {
		"location_id": 1,
		"location": "Rufino Building",
		"location_address": "6784 Ayala Ave, Legazpi Village, Makati, 1200 Metro Manila, Philippines",
		"station": "QR-0002",
		"evse_status": "ONLINE",
		"meter_type": "AC",
		"STATUS": "SUCCESS",
		"connectors": [
			{
				"connector_id": 1,
				"connector_type": "TYPE_2",
				"energy_amount": "7 KW-H",
				"status": "AVAILABLE"
			}
		],
		"rates": [
			{
				"id": 1,
				"evse_uid": "3b505713-2902-48de-80db-7b0fad55d978",
				"number_mins": 60,
				"price": "0.00",
				"status": "ACTIVE"
			},
			{
				"id": 2,
				"evse_uid": "3b505713-2902-48de-80db-7b0fad55d978",
				"number_mins": 60,
				"price": "100.00",
				"status": "ACTIVE"
			},
			{
				"id": 3,
				"evse_uid": "3b505713-2902-48de-80db-7b0fad55d978",
				"number_mins": 120,
				"price": "150.00",
				"status": "ACTIVE"
			},
			{
				"id": 4,
				"evse_uid": "3b505713-2902-48de-80db-7b0fad55d978",
				"number_mins": 180,
				"price": "200.00",
				"status": "ACTIVE"
			},
			{
				"id": 5,
				"evse_uid": "3b505713-2902-48de-80db-7b0fad55d978",
				"number_mins": 220,
				"price": "250.00",
				"status": "ACTIVE"
			}
		]
	},
	"message": "Success"
}
```

---

### Check Mobile Number Status - `GET /api/v1/qr/check-status/mobile_number/:mobile_number`

Check the status of user charging session based on mobile number.

**Authorization: Basic TOKEN**

**Parameter**

- **mobile_number** - User's mobile number

**Sample Response**

```json
{
	"status": 200,
	"data": {
		"charging_status": "PAID"
	},
	"message": "SUCCESS"
}
```

---

### Charge through QR - `POST /api/v1/qr/charge`

Initialize charging session through QR.

**Authorization: Basic TOKEN**

**Request Body**

```json
{
	"is_free": 0, // Change this to 1 if you are accessing free charging.
	"mobile_number": "09356379078",
	"location_id": 1, // Can be retrieved from the Check EVSE API.
	"evse_uid": "3b505713-2902-48de-80db-7b0fad55d978", // Can be retrieved from the Check EVSE API.
	"connector_id": 1, // Can be retrieved from the Check EVSE API.
	"current_time": "13:30:00",
	"current_date": "2024-05-06",
	"paid_charge_mins": 100, // Provide the number_mins from the rates array in the response of Check EVSE API.
	"amount": 150.0, // Amount must be minimum of 100 pesos.
	"payment_type": "maya", // Provide a payment type. Valid types are GCash, and Maya.
	"homelink": "test home link" // URL of the requesting user.
}
```

**Sample Response**

If you are accessing free charging the result would be:

```json
{
	"status": 200,
	"data": {
		"user_driver_guest_id": 92,
		"timeslot_id": 1,
		"next_timeslot_id": 2, // This response will only visible once you charge in less than one (1) hour.
		"status": "SUCCESS"
	},
	"message": "Success"
}
```

If you are charging with payment:

```json
{
	"status": 200,
	"data": {
		"checkout_url": "https://test-sources.paymongo.com/sources?id=src_MPqfbtiFLnNochR2J3cKk6Vq" // This is a redirection url for payment
	},
	"message": "Success"
}
```

---

### Verify OTP - /api/v1/qr/otp/verify/:guest_id

Verify the OTP provided by the user. This API will be used once the user access a free charging session.

**Authorization: Basic TOKEN**

**Parameter**

- **guest_id** - Guest ID

**Request**

```json
{
	"otp": 7850, // This can be retrieved from the SMS sent by the API.
	"timeslot_id": 1, // This can be retrieved from the response of Charge through QR API.
	"next_timeslot_id": 2 // This can be retrieved from the response of Charge through QR API.
}
```

**Response**

```json
{
	"status": 200,
	"data": "SUCCESS",
	"message": "Success"
}
```

---

### Resend OTP - `POST /api/v1/qr/otp/resend/:guest_id`

Resend an OTP to the user based of guest_id

**Authorization: Basic TOKEN**

**Parameter**

- **guest_id** - Guest ID

**Request**

```json
{
	"timeslot_id": 1,
	"next_timeslot_id": 2
}
```

**Response**

```json
{
	"status": 200,
	"data": "SUCCESS",
	"message": "Success"
}
```

---

### QR GCash - `GET /api/v1/payments/guest/gcash/:token/:payment_id/:evse_uid/:connector_id`

GCash payment URL

**Authorization: Basic TOKEN**

**Parameters**

- **token** - Token from the checkout redirection URL
- **payment_id** - Payment ID from the checkout redirection URL
- **evse_uid** - EVSE UID that can be retrieved from the Check EVSE API
- **connector_id** - Connector ID that can be retrieved from the Check EVSE API

**Response**

```json
{
	"status": 200,
	"data": {
		"payment_status": "SUCCESS", // Other payment_status: FAILED
		"home_link": "" // URL for the redirection once the payment succeeds or failed.
	},
	"message": "Success"
}
```

---

### QR Maya - `GET /api/v1/payments/guest/maya/:token/:transaction_id/:evse_uid/:connector_id`

Maya payment URL

**Authorization: Basic TOKEN**

**Parameters**

- **token** - Token from the checkout redirection URL
- **transaction_id** - Transaction ID from the checkout redirection URL
- **evse_uid** - EVSE UID that can be retrieved from the Check EVSE API
- **connector_id** - Connector ID that can be retrieved from the Check EVSE API

**Response**

```json
{
	"status": 200,
	"data": {
		"payment_status": "SUCCESS", // Other payment_status: FAILED
		"home_link": "" // URL for the redirection once the payment succeeds or failed.
	},
	"message": "Success"
}
```

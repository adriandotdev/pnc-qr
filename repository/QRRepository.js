const mysql = require("../database/mysql");

const logger = require("../config/winston");

module.exports = class QRRepository {
	GetConnection() {
		return new Promise((resolve, reject) => {
			mysql.getConnection((err, connection) => {
				if (err) {
					reject(err);
				}

				connection.beginTransaction((err) => {
					if (err) {
						connection.release();
						reject(err);
					}

					resolve(connection);
				});
			});
		});
	}

	GetQRRates(evseUID) {
		const QUERY = `SELECT * FROM evse_qr_rates WHERE evse_uid = ?`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [evseUID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	AddGuest(data, connection) {
		const QUERY = `CALL WEB_QR_ADD_GUEST(?,?,?,?,?,?,?)`;

		return new Promise((resolve, reject) => {
			connection.query(
				QUERY,
				[
					data.is_free,
					data.mobile_number,
					data.timeslot_id,
					data.paid_hour,
					data.rfid,
					data.otp,
					data.homelink,
				],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	Reserve(
		{
			user_guest_id,
			timeslot_id,
			next_timeslot_id,
			current_time,
			current_date,
			timeslot_time,
			next_timeslot_date,
		},
		connection
	) {
		const QUERY = `CALL WEB_QR_RESERVE(?,?,?,?,?,?,?)`;

		return new Promise((resolve, reject) => {
			connection.query(
				QUERY,
				[
					user_guest_id,
					timeslot_id,
					next_timeslot_id,
					current_time,
					current_date,
					timeslot_time,
					next_timeslot_date,
				],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	ReserveWithPayment(
		{
			mobile_number,
			paid_hour,
			timeslot_id,
			next_timeslot_id,
			current_time,
			current_date,
			timeslot_time,
			next_timeslot_date,
			rfid,
			homelink,
		},
		connection
	) {
		const QUERY = `CALL WEB_QR_RESERVE_WITH_PAYMENT(?,?,?,?,?,?,?,?,?,?)`;

		return new Promise((resolve, reject) => {
			connection.query(
				QUERY,
				[
					mobile_number,
					timeslot_id,
					next_timeslot_id,
					paid_hour,
					current_time,
					current_date,
					timeslot_time,
					next_timeslot_date,
					rfid,
					homelink,
				],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	VerifyOTP(data) {
		const QUERY = `CALL WEB_QR_VERIFY_OTP(?,?,?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[
					data.user_driver_guest_id,
					data.otp,
					data.timeslot_id,
					data.next_timeslot_id,
				],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	ResendOTP(data) {
		const QUERY = `CALL WEB_QR_RESEND_OTP(?,?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[data.user_driver_guest_id, data.timeslot_id, data.next_timeslot_id],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	CheckEVSE(qrCode, evseUID) {
		const QUERY = `CALL WEB_QR_CHECK_EVSE(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [qrCode, evseUID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	AddGuestGCashPayment(
		{ guest_id, evse_qr_rate_id, amount, payment_type, payment_status },
		connection
	) {
		const QUERY = `
		INSERT INTO 
		user_driver_qr_payment_records
		(user_driver_guest_id, evse_qr_rate_id, amount, payment_type, payment_status, date_created, date_modified)
		VALUES (?,?,?,?,?, NOW(), NOW())`;

		return new Promise((resolve, reject) => {
			connection.query(
				QUERY,
				[guest_id, evse_qr_rate_id, amount, payment_type, payment_status],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	UpdateQRGuestGCashPayment({
		user_id,
		status,
		transaction_id,
		description,
		payment_id,
	}) {
		const QUERY = `CALL WEB_QR_UPDATE_GCASH_PAYMENT(?,?,?,?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[user_id, status, transaction_id, description, payment_id],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	UpdateQRGuestMayaPayment({ status, transaction_id }) {
		const QUERY = `CALL WEB_QR_UPDATE_MAYA_PAYMENT(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [status, transaction_id], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	UpdateGuestGCashPayment(
		{ topup_id, payment_status, transaction_id },
		connection
	) {
		const QUERY = `
			UPDATE user_driver_qr_payment_records
			SET payment_status = ?,
			transaction_id = ?,
			date_modified = NOW()
			WHERE id = ?
		`;

		return new Promise((resolve, reject) => {
			connection.query(
				QUERY,
				[payment_status, transaction_id, topup_id],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	AddGuestMayaPayment(
		{
			guest_id,
			evse_qr_rate_id,
			amount,
			payment_type,
			payment_status,
			transaction_id,
			client_key,
		},
		connection
	) {
		const QUERY = `
			INSERT INTO 
			user_driver_qr_payment_records
			(user_driver_guest_id, evse_qr_rate_id, amount, payment_type, payment_status, transaction_id, maya_client_key, date_created, date_modified)
			VALUES (?,?,?,?,?,?,?, NOW(), NOW())
		`;

		return new Promise((resolve, reject) => {
			connection.query(
				QUERY,
				[
					guest_id,
					evse_qr_rate_id,
					amount,
					payment_type,
					payment_status,
					transaction_id,
					client_key,
				],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	GetGuestGCashPaymentDetails(paymentID) {
		const QUERY = `
			SELECT
				user_driver_guest_id, amount, payment_type, payment_status, transaction_id
			FROM 
				user_driver_qr_payment_records
			WHERE
				id = ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [paymentID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	GetGuestMayaPaymentDetails(transactionID) {
		const QUERY = `
			SELECT
				user_driver_guest_id, amount, payment_type, payment_status, transaction_id, maya_client_key 
			FROM 
				user_driver_qr_payment_records
			WHERE
				transaction_id = ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [transactionID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	CheckAndUpdateConnectorStatus(evseUID, connectorID) {
		const QUERY = `CALL WEB_USER_CHECK_AND_UPDATE_CONNECTOR_STATUS(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [evseUID, connectorID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	CheckAndUpdateEVSEStatus(evseUID) {
		const query = `CALL WEB_USER_CHECK_AND_UPDATE_EVSE_STATUS(?)`;

		return new Promise((resolve, reject) => {
			mysql.query(query, evseUID, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
};

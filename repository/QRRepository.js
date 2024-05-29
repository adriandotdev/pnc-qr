const mysql = require("../database/mysql");

const logger = require("../config/winston");

module.exports = class QRRepository {
	/**
	 * Retrieves a database connection and begins a transaction.
	 *
	 * @async
	 * @function GetConnection
	 * @returns {Promise<object>} A Promise that resolves with a database connection.
	 * @throws {Error} If an error occurs while retrieving the connection or beginning the transaction.
	 */
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

	/**
	 * Retrieves QR rates for a specific EVSE (Electric Vehicle Supply Equipment).
	 *
	 * @async
	 * @function GetQRRates
	 * @param {string} evseUID - The unique identifier of the EVSE.
	 * @returns {Promise<Array>} A Promise that resolves with an array of QR rates.
	 * @throws {Error} If an error occurs while querying the database.
	 */
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

	/**
	 * Adds a guest to the system.
	 *
	 * @async
	 * @function AddGuest
	 * @param {Object} data - The guest data.
	 * @param {boolean} data.is_free - Indicates whether the guest parking is free.
	 * @param {string} data.mobile_number - The mobile number of the guest.
	 * @param {number} data.timeslot_id - The ID of the timeslot for the guest.
	 * @param {number} data.paid_hour - The number of hours the guest paid for.
	 * @param {string} data.rfid - The RFID tag of the guest.
	 * @param {string} data.otp - The OTP (One-Time Password) for authentication.
	 * @param {string} data.homelink - The homelink URL of the guest.
	 * @param {Object} connection - The database connection object.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the database operation.
	 * @throws {Error} If an error occurs while querying the database.
	 */
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

	/**
	 * Reserves a parking slot for a guest.
	 *
	 * @async
	 * @function Reserve
	 * @param {Object} data - The reservation data.
	 * @param {number} data.user_guest_id - The ID of the guest user.
	 * @param {number} data.timeslot_id - The ID of the current timeslot.
	 * @param {number} data.next_timeslot_id - The ID of the next timeslot.
	 * @param {string} data.current_time - The current time.
	 * @param {string} data.current_date - The current date.
	 * @param {string} data.timeslot_time - The end time of the current timeslot.
	 * @param {string} data.next_timeslot_date - The date of the next timeslot.
	 * @param {Object} connection - The database connection object.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the database operation.
	 * @throws {Error} If an error occurs while querying the database.
	 */
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

	/**
	 * Reserves a parking slot with payment for a guest.
	 *
	 * @async
	 * @function ReserveWithPayment
	 * @param {Object} data - The reservation data.
	 * @param {string} data.mobile_number - The mobile number of the guest.
	 * @param {number} data.paid_charge_mins - The number of minutes paid for charging.
	 * @param {number} data.timeslot_id - The ID of the current timeslot.
	 * @param {number} data.next_timeslot_id - The ID of the next timeslot.
	 * @param {string} data.current_time - The current time.
	 * @param {string} data.current_date - The current date.
	 * @param {string} data.timeslot_time - The end time of the current timeslot.
	 * @param {string} data.next_timeslot_date - The date of the next timeslot.
	 * @param {string} data.rfid - The RFID of the guest.
	 * @param {string} data.homelink - The homelink of the guest.
	 * @param {Object} connection - The database connection object.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the database operation.
	 * @throws {Error} If an error occurs while querying the database.
	 */
	ReserveWithPayment(
		{
			mobile_number,
			paid_charge_mins,
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
					paid_charge_mins,
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

	/**
	 * Verifies the OTP for a guest reservation.
	 *
	 * @async
	 * @function VerifyOTP
	 * @param {Object} data - The OTP verification data.
	 * @param {string} data.user_driver_guest_id - The ID of the guest.
	 * @param {string} data.otp - The OTP code to verify.
	 * @param {number} data.timeslot_id - The ID of the current timeslot.
	 * @param {number} data.next_timeslot_id - The ID of the next timeslot.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the database operation.
	 * @throws {Error} If an error occurs while querying the database.
	 */
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

	/**
	 * Resends the OTP for a guest reservation.
	 *
	 * @async
	 * @function ResendOTP
	 * @param {Object} data - The data for resending OTP.
	 * @param {string} data.user_driver_guest_id - The ID of the guest.
	 * @param {number} data.timeslot_id - The ID of the current timeslot.
	 * @param {number} data.next_timeslot_id - The ID of the next timeslot.
	 * @param {string} data.otp - The OTP code to resend.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the database operation.
	 * @throws {Error} If an error occurs while querying the database.
	 */
	ResendOTP(data) {
		const QUERY = `CALL WEB_QR_RESEND_OTP(?,?,?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[
					data.user_driver_guest_id,
					data.timeslot_id,
					data.next_timeslot_id,
					data.otp,
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

	/**
	 * Checks the EVSE (Electric Vehicle Supply Equipment) based on the QR code and EVSE UID.
	 *
	 * @async
	 * @function CheckEVSE
	 * @param {string} qrCode - The QR code associated with the EVSE.
	 * @param {string} evseUID - The unique identifier of the EVSE.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the EVSE check.
	 * @throws {Error} If an error occurs while querying the database or if the QR code format is invalid.
	 */
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

	/**
	 * Adds a GCash payment record for a guest.
	 *
	 * @async
	 * @function AddGuestGCashPayment
	 * @param {Object} data - The data of the GCash payment.
	 * @param {number} data.guest_id - The ID of the guest.
	 * @param {number} data.evse_qr_rate_id - The ID of the EVSE QR rate.
	 * @param {number} data.amount - The amount of the payment.
	 * @param {string} data.payment_type - The type of payment (e.g., 'gcash').
	 * @param {string} data.payment_status - The status of the payment.
	 * @param {Object} connection - The database connection.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the payment record insertion.
	 * @throws {Error} If an error occurs while inserting the payment record.
	 */
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

	/**
	 * Updates a GCash payment record for a guest.
	 *
	 * @async
	 * @function UpdateQRGuestGCashPayment
	 * @param {Object} data - The data to update the GCash payment record.
	 * @param {number} data.user_id - The ID of the guest.
	 * @param {string} data.status - The status of the payment.
	 * @param {string} data.transaction_id - The transaction ID of the payment.
	 * @param {string} data.description - The description of the payment.
	 * @param {number} data.payment_id - The ID of the payment.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the payment record update.
	 * @throws {Error} If an error occurs while updating the payment record.
	 */
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

	/**
	 * Updates a Maya payment record for a guest.
	 *
	 * @async
	 * @function UpdateQRGuestMayaPayment
	 * @param {Object} data - The data to update the Maya payment record.
	 * @param {string} data.status - The status of the payment.
	 * @param {string} data.transaction_id - The transaction ID of the payment.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the payment record update.
	 * @throws {Error} If an error occurs while updating the payment record.
	 */
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

	/**
	 * Updates a GCash payment record for a guest.
	 *
	 * @async
	 * @function UpdateGuestGCashPayment
	 * @param {Object} data - The data to update the GCash payment record.
	 * @param {string} data.topup_id - The ID of the payment record.
	 * @param {string} data.payment_status - The status of the payment.
	 * @param {string} data.transaction_id - The transaction ID of the payment.
	 * @param {Object} connection - The database connection.
	 * @returns {Promise<Array>} A Promise that resolves with the result of the GCash payment record update.
	 * @throws {Error} If an error occurs while updating the payment record.
	 */
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

	/**
	 * Adds a Maya payment record for a guest.
	 *
	 * @async
	 * @function AddGuestMayaPayment
	 * @param {Object} data - The data to add the Maya payment record.
	 * @param {string} data.guest_id - The ID of the guest.
	 * @param {string} data.evse_qr_rate_id - The ID of the EVSE QR rate.
	 * @param {number} data.amount - The amount of the payment.
	 * @param {string} data.payment_type - The type of payment.
	 * @param {string} data.payment_status - The status of the payment.
	 * @param {string} data.transaction_id - The transaction ID of the payment.
	 * @param {string} data.client_key - The client key for the Maya payment.
	 * @param {Object} connection - The database connection.
	 * @returns {Promise<Array>} A Promise that resolves with the result of adding the Maya payment record.
	 * @throws {Error} If an error occurs while adding the payment record.
	 */
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

	/**
	 * Retrieves details of a GCash payment for a guest.
	 *
	 * @async
	 * @function GetGuestGCashPaymentDetails
	 * @param {string} paymentID - The ID of the GCash payment.
	 * @returns {Promise<Array>} A Promise that resolves with the details of the GCash payment.
	 * @throws {Error} If an error occurs while retrieving the payment details.
	 */
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

	/**
	 * Retrieves details of a Maya payment for a guest.
	 *
	 * @async
	 * @function GetGuestMayaPaymentDetails
	 * @param {string} transactionID - The ID of the Maya transaction.
	 * @returns {Promise<Array>} A Promise that resolves with the details of the Maya payment.
	 * @throws {Error} If an error occurs while retrieving the payment details.
	 */
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

	/**
	 * Checks and updates the status of a connector associated with an EVSE.
	 *
	 * @async
	 * @function CheckAndUpdateConnectorStatus
	 * @param {string} evseUID - The unique identifier of the EVSE.
	 * @param {string} connectorID - The identifier of the connector.
	 * @returns {Promise<Array>} A Promise that resolves with the result of checking and updating the connector status.
	 * @throws {Error} If an error occurs while performing the operation.
	 */
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

	/**
	 * Checks and updates the status of an Electric Vehicle Supply Equipment (EVSE).
	 *
	 * @async
	 * @function CheckAndUpdateEVSEStatus
	 * @param {string} evseUID - The unique identifier of the EVSE.
	 * @returns {Promise<Array>} A Promise that resolves with the result of checking and updating the EVSE status.
	 * @throws {Error} If an error occurs while performing the operation.
	 */
	CheckAndUpdateEVSEStatus(evseUID) {
		const QUERY = `CALL WEB_USER_CHECK_AND_UPDATE_EVSE_STATUS(?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, evseUID, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Checks the charging status of a mobile number in the database.
	 *
	 * @function CheckMobileNumberStatus
	 * @param {string} mobileNumber - The mobile number to check the charging status for.
	 * @returns {Promise<Array>} A Promise that resolves with the charging status of the mobile number.
	 * @throws {Error} If an error occurs while querying the database.
	 */
	CheckMobileNumberStatus(mobileNumber) {
		const QUERY = `SELECT charging_status FROM user_driver_guests WHERE mobile_number = ?`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [mobileNumber], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves payment details for a given transaction ID from the database.
	 *
	 * @function VerifyPayment
	 * @param {string} transactionID - The transaction ID to verify payment for.
	 * @returns {Promise<Array>} A Promise that resolves with the payment details for the transaction ID.
	 * @throws {Error} If an error occurs while querying the database.
	 */
	VerifyPayment(transactionID) {
		const QUERY = `
			SELECT 
				amount,
				payment_type,
				payment_status,
				transaction_id,
				paid_charge_mins
			FROM 
				user_driver_qr_payment_records
			INNER JOIN
				user_driver_guests ON user_driver_guests.id = user_driver_qr_payment_records.user_driver_guest_id
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
};

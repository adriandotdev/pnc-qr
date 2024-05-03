const mysql = require("../database/mysql");

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
					data.qr_payment,
					data.rfid,
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

	ReserveWithPayment({
		mobile_number,
		paid_hour,
		timeslot_id,
		next_timeslot_id,
		current_time,
		current_date,
		timeslot_time,
		next_timeslot_date,
	}) {
		const QUERY = `CALL WEB_QR_RESERVE_WITH_PAYMENT(?,?,?,?,?,?,?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(
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
};

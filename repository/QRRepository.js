const mysql = require("../database/mysql");

module.exports = class QRRepository {
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

	AddGuest(data) {
		const QUERY = `CALL WEB_QR_ADD_GUEST(?,?,?,?,?,?,?)`;

		return new Promise((resolve, reject) => {
			mysql.getConnection((err, connection) => {
				if (err) {
					connection.release();
					reject(err);
				}

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
							reject({ err, connection });
						}

						resolve({ result, connection });
					}
				);
			});
		});
	}

	Reserve({
		user_guest_id,
		timeslot_id,
		next_timeslot_id,
		current_time,
		current_date,
		timeslot_time,
		connection,
	}) {
		const QUERY = `CALL WEB_QR_RESERVE(?,?,?,?,?)`;

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
				],
				(err, result) => {
					if (err) {
						reject({ err, connection });
					}

					resolve(result);
				}
			);
		});
	}
};

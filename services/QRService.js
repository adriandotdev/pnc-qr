const QRRepository = require("../repository/QRRepository");
const axios = require("axios");

const {
	HttpBadRequest,
	HttpInternalServerError,
} = require("../utils/HttpError");

const otpGenerator = require("otp-generator");
const { v4: uuidv4 } = require("uuid");

module.exports = class QRService {
	#repository;

	constructor() {
		this.#repository = new QRRepository();
	}

	async GetQRRates(evseUID) {
		const result = await this.#repository.GetQRRates(evseUID);

		return result;
	}

	async Reserve({
		is_free,
		mobile_number,
		location_id,
		evse_uid,
		connector_id,
		current_time,
		current_date,
		paid_hour,
		qr_payment,
	}) {
		let conn = null;

		try {
			conn = await this.#repository.GetConnection();

			const otp = otpGenerator.generate(4, {
				upperCaseAlphabets: false,
				specialChars: false,
				lowerCaseAlphabets: false,
				digits: true,
			});

			const rfid = uuidv4().replace(/-/g, "").substring(0, 12).toUpperCase();

			const timeArray = current_time.split(":");

			const currentHour = parseInt(timeArray[0], 10);
			const currentMinute = parseInt(timeArray[1], 10);
			const currentSecond = parseInt(timeArray[2], 10);

			const result = await this.#GetTimeslots(
				location_id,
				evse_uid,
				connector_id,
				currentHour
			);

			const timeslot = result.data.data[0];
			const nextTimeslot = result.data.data[1];

			const addGuestResponse = await this.#repository.AddGuest(
				{
					is_free,
					mobile_number,
					timeslot_id: timeslot.timeslot_id,
					paid_hour,
					qr_payment,
					rfid,
					otp,
				},
				conn
			);

			const addGuestStatus = addGuestResponse[0][0].STATUS;
			const user_driver_guest_id = addGuestResponse[0][0].user_driver_guest_id;

			if (addGuestStatus !== "SUCCESS") {
				conn.rollback();
				throw new HttpBadRequest(addGuestStatus, []);
			}

			const reserveResponse = await this.#repository.Reserve(
				{
					user_guest_id: user_driver_guest_id,
					timeslot_id: timeslot.timeslot_id,
					next_timeslot_id: nextTimeslot.timeslot_id,
					current_time,
					current_date,
					timeslot_time: timeslot.end,
				},
				conn
			);

			const reserveStatus = reserveResponse[0][0].STATUS;
			const timeslot_id = reserveResponse[0][0].timeslot_id;
			const next_timeslot_id = reserveResponse[0][0].next_timeslot_id;

			if (reserveStatus !== "SUCCESS") {
				conn.rollback();
				throw new HttpBadRequest(reserveStatus, []);
			}

			conn.commit();

			return {
				user_driver_guest_id,
				timeslot_id,
				next_timeslot_id,
				status: addGuestStatus,
			};
		} catch (err) {
			if (conn) conn.rollback();
			throw new HttpInternalServerError(err, []);
		} finally {
			if (conn) conn.release();
		}
	}

	async #GetTimeslots(locationID, evseUID, connectorID, currentHour) {
		let timeslots = null;

		try {
			timeslots = await axios.get(
				`${
					process.env.NODE_ENV === "dev"
						? "http://localhost:4002"
						: "https://services-parkncharge.sysnetph.com"
				}/booking_timeslot/api/v1/timeslots/${locationID}/${evseUID}/${connectorID}/${currentHour}`,
				{
					headers: {
						Authorization: "Basic cG5jOnBhc3N3b3Jk",
					},
				}
			);
		} catch (error) {
			if (error.response)
				throw new HttpBadRequest(error.response.data.message, []);
			else if (error.request) throw new HttpBadRequest(error.request, []);
			else throw new HttpBadRequest(error.message, []);
		}

		return timeslots;
	}
};

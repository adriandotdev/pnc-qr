const QRRepository = require("../repository/QRRepository");
const axios = require("axios");

const {
	HttpBadRequest,
	HttpConflict,
	HttpNotFound,
} = require("../utils/HttpError");

const otpGenerator = require("otp-generator");
const { v4: uuidv4 } = require("uuid");
const SMS = require("../utils/SMS");

const logger = require("../config/winston");

module.exports = class QRService {
	#repository;

	constructor() {
		this.#repository = new QRRepository();
	}

	async GetQRRates(evseUID) {
		const result = await this.#repository.GetQRRates(evseUID);

		return result;
	}

	/**
	 * Reserves a charging timeslot for a guest user.
	 *
	 * This function handles the reservation process for a charging timeslot, including generating an OTP,
	 * adding a guest to the database, reserving the timeslot, and sending an OTP via SMS.
	 *
	 * @async
	 * @function Reserve
	 * @param {Object} params - The reservation parameters.
	 * @param {boolean} params.is_free - Indicates if the charging is free.
	 * @param {string} params.mobile_number - The mobile number of the guest user.
	 * @param {number} params.location_id - The ID of the charging location.
	 * @param {string} params.evse_uid - The unique ID of the EVSE.
	 * @param {number} params.connector_id - The ID of the connector.
	 * @param {string} params.current_time - The current time in HH:MM:SS format.
	 * @param {string} params.current_date - The current date in YYYY-MM-DD format.
	 * @param {number} params.paid_charge_mins - The number of minutes for paid charging.
	 * @param {string} params.homelink - The homelink of the guest user.
	 * @returns {Promise<Object>} The reservation details including user_driver_guest_id, timeslot_id, next_timeslot_id, and status.
	 * @throws {Error} If an error occurs during the reservation process.
	 */
	async Reserve({
		is_free,
		mobile_number,
		location_id,
		evse_uid,
		connector_id,
		current_time,
		current_date,
		paid_charge_mins,
		homelink,
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
					paid_charge_mins,
					rfid,
					otp,
					homelink,
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
					next_timeslot_date: nextTimeslot.date,
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

			const message = `Hello, Guest User\n\nYour OTP for ParkNcharge free charging is ${otp}.\n\nUse it to authenticate. If you didn't request this, ignore it.\n\nThanks,\nParkNcharge`;

			let sms = new SMS({
				contact_number: mobile_number,
				message,
			});

			await sms.SendOTP();

			conn.commit();

			return {
				user_driver_guest_id,
				timeslot_id,
				next_timeslot_id,
				status: addGuestStatus,
			};
		} catch (err) {
			if (conn) conn.rollback();
			throw err;
		} finally {
			if (conn) conn.release();
		}
	}

	/**
	 * Reserves a charging timeslot for a guest user with payment processing.
	 *
	 * This function handles the reservation process for a charging timeslot, including generating an RFID tag,
	 * adding a guest to the database, reserving the timeslot, and processing the payment via GCash or Maya.
	 *
	 * @async
	 * @function ReserveWithPayment
	 * @param {Object} params - The reservation parameters.
	 * @param {string} params.mobile_number - The mobile number of the guest user.
	 * @param {number} params.location_id - The ID of the charging location.
	 * @param {string} params.evse_uid - The unique ID of the EVSE.
	 * @param {number} params.connector_id - The ID of the connector.
	 * @param {string} params.current_time - The current time in HH:MM:SS format.
	 * @param {string} params.current_date - The current date in YYYY-MM-DD format.
	 * @param {number} params.paid_charge_mins - The number of minutes for paid charging.
	 * @param {number} params.amount - The amount to be paid.
	 * @param {string} params.payment_type - The type of payment (gcash or maya).
	 * @param {string} params.homelink - The homelink of the guest user.
	 * @returns {Promise<Object>} The reservation details including the checkout URL for payment.
	 * @throws {Error} If an error occurs during the reservation process.
	 */
	async ReserveWithPayment({
		mobile_number,
		location_id,
		evse_uid,
		connector_id,
		current_time,
		current_date,
		paid_charge_mins,
		amount,
		payment_type,
		homelink,
	}) {
		function cleanAmountForTopup(amount) {
			const numberStr = amount.toString();

			let cleanedNumber = null;

			if (numberStr.includes(".")) {
				const cleanedStr = numberStr.replace(".", "");
				cleanedNumber = parseFloat(cleanedStr);
			} else {
				cleanedNumber = parseInt((amount += "00"));
			}

			return cleanedNumber;
		}

		let connection = null;

		try {
			if (!["gcash", "maya"].includes(payment_type))
				throw new HttpBadRequest("INVALID_PAYMENT_TYPE", {
					message: "Valid payment types are: gcash, and maya",
				});

			connection = await this.#repository.GetConnection();

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

			const reserveResponse = await this.#repository.ReserveWithPayment(
				{
					mobile_number,
					paid_charge_mins,
					timeslot_id: timeslot.timeslot_id,
					next_timeslot_id: nextTimeslot.timeslot_id,
					current_time,
					current_date,
					timeslot_time: timeslot.end,
					next_timeslot_date: nextTimeslot.date,
					rfid,
					homelink,
				},
				connection
			);

			const status = reserveResponse[0][0].STATUS;
			const status_type = reserveResponse[0][0].status_type;
			const guestID = reserveResponse[0][0].guest_id;
			const modifiedAmountValueForPaymongo = cleanAmountForTopup(amount);

			if (status_type === "conflict") throw new HttpConflict(status, []);

			// Payment Implementation
			const description = uuidv4();
			const authModuleData = await this.#RequestAuthmodule();

			if (payment_type === "gcash") {
				let lastInsertID = null;
				const initialPaymentResponse =
					await this.#repository.AddGuestGCashPayment(
						{
							guest_id: guestID,
							evse_qr_rate_id: 1,
							amount,
							payment_type: "gcash",
							payment_status: "pending",
						},
						connection
					);

				lastInsertID = initialPaymentResponse.insertId;

				const sourceResponse = await this.#RequestToGCashSourceURL({
					auth_token: authModuleData.data.access_token,
					user_id: guestID,
					amount: modifiedAmountValueForPaymongo,
					topup_id: lastInsertID,
					evse_uid,
					connector_id,
				});

				logger.info({
					LAST_INSERT_PAYMENT_ID: {
						id: lastInsertID,
					},
					GCASH_SOURCE_RESPONSE: {
						source_response: {
							...sourceResponse,
						},
					},
				});

				const checkout_url =
					sourceResponse.data.attributes.redirect.checkout_url; // checkout_url, failed, success
				const status = sourceResponse.data.attributes.status;
				const transaction_id = sourceResponse.data.id;

				await this.#repository.UpdateGuestGCashPayment(
					{
						topup_id: lastInsertID,
						payment_status: status,
						transaction_id,
					},
					connection
				);

				connection.commit();
				return { checkout_url };
			} else if (payment_type === "maya") {
				const sourceResponse = await this.#RequestToMayaSourceURL({
					auth_token: authModuleData.data.access_token,
					user_id: guestID,
					description,
					amount: modifiedAmountValueForPaymongo,
					evse_uid,
					connector_id,
				});

				logger.info({
					MAYA_SOURCE_RESPONSE: {
						source_response: {
							...sourceResponse,
						},
					},
				});
				let checkout_url = null;

				if (
					sourceResponse &&
					sourceResponse.data.attributes.status === "awaiting_next_action"
				) {
					await this.#repository.AddGuestMayaPayment(
						{
							guest_id: guestID,
							evse_qr_rate_id: 1,
							amount,
							payment_type: "maya",
							payment_status: "pending",
							transaction_id: sourceResponse.data.id,
							client_key: sourceResponse.data.attributes.client_key,
						},
						connection
					);

					checkout_url =
						sourceResponse.data.attributes.next_action.redirect.url;
				}

				connection.commit();
				return { checkout_url };
			}

			return { ...reserveResponse[0][0] };
		} catch (err) {
			if (connection) connection.rollback();
			throw err;
		} finally {
			if (connection) connection.release();
		}
	}

	/**
	 * Processes a GCash payment for a guest user.
	 *
	 * This function handles the payment process via GCash, including validating the payment token, updating the payment status,
	 * and checking the status of the EVSE connector.
	 *
	 * @async
	 * @function GCashPayment
	 * @param {Object} params - The payment parameters.
	 * @param {string} params.token - The GCash payment token.
	 * @param {number} params.payment_id - The ID of the payment.
	 * @param {string} params.evse_uid - The unique ID of the EVSE.
	 * @param {number} params.connector_id - The ID of the connector.
	 * @param {boolean} params.payment_token_valid - Indicates if the payment token is valid.
	 * @returns {Promise<Object>} The payment status and home link.
	 * @throws {HttpBadRequest} If an error occurs during the payment process.
	 */
	async GCashPayment({
		token,
		payment_id,
		evse_uid,
		connector_id,
		payment_token_valid,
	}) {
		logger.info({
			PAYMENT_METHOD: {
				class: "QRService",
				method: "GCashPayment",
			},
		});

		function cleanAmountForTopup(amount) {
			amount = amount.replace(" ", "");
			amount = amount.replace(".", "");
			amount = amount.replace(",", "");
			amount = amount.replace(/ /g, "");
			amount = amount.replace(/[^A-Za-z0-9\-]/, "");
			return amount;
		}

		let details = await this.#repository.GetGuestGCashPaymentDetails(
			payment_id
		);
		let status = token.substring(token.length - 1);
		let parsedToken = token.substring(0, token.length - 2);

		if (details[0]?.payment_status === "paid")
			throw new HttpBadRequest("ALREADY_PAID", []);

		if (details[0]?.payment_status === "failed")
			throw new HttpBadRequest("ALREADY_FAILED", []);

		if (status === "0") {
			logger.info({
				QR_PAYMENT_FAILED: {
					status,
					class: "QRService",
				},
			});

			const result = await this.#repository.UpdateQRGuestGCashPayment({
				status: "failed",
				user_id: details[0].user_driver_guest_id,
				payment_id,
				transaction_id: details[0].transaction_id,
			});

			logger.info({
				QR_PAYMENT_FAILED_EXIT: {
					message: "SUCCESS",
				},
			});

			return {
				payment_status: "FAILED",
				home_link: result[0][0].home_link,
				transaction_id: details[0].transaction_id,
			};
		}

		if (payment_token_valid) {
			if (details.length === 0)
				throw new HttpBadRequest("PAYMENT_ID_NOT_FOUND", []);

			if (details[0]?.payment_status === "paid")
				throw new HttpBadRequest("ALREADY_PAID", []);
			else if (details[0]?.payment_status === "failed")
				throw new HttpBadRequest("ALREADY_FAILED", []);
			else {
				const description = uuidv4();

				const result = await this.#RequestToGCashPaymentURL({
					amount: cleanAmountForTopup(String(details[0].amount)),
					description,
					id: details[0].transaction_id,
					token: parsedToken,
				});

				const paymentUpdateResult =
					await this.#repository.UpdateQRGuestGCashPayment({
						user_id: details[0].user_driver_guest_id,
						status: result.data.attributes.status,
						transaction_id: details[0].transaction_id,
						description,
						payment_id,
					});

				const status = paymentUpdateResult[0][0].STATUS;
				const status_type = paymentUpdateResult[0][0].status_type;

				if (status_type == "bad_request") throw new HttpBadRequest(status, []);

				if (result.data.attributes.status === "paid") {
					await this.#repository.CheckAndUpdateConnectorStatus(
						evse_uid,
						connector_id
					);
					await this.#repository.CheckAndUpdateEVSEStatus(evse_uid);

					return {
						payment_status: "SUCCESS",
						home_link: paymentUpdateResult[0][0].home_link,
						transaction_id: details[0].transaction_id,
					};
				}
			}
		}
	}

	/**
	 * Processes a Maya payment for a guest user.
	 *
	 * This function handles the payment process via Maya, including validating the payment token, updating the payment status,
	 * and checking the status of the EVSE connector.
	 *
	 * @async
	 * @function MayaPayment
	 * @param {Object} params - The payment parameters.
	 * @param {string} params.token - The Maya payment token.
	 * @param {string} params.transaction_id - The ID of the transaction.
	 * @param {string} params.evse_uid - The unique ID of the EVSE.
	 * @param {number} params.connector_id - The ID of the connector.
	 * @param {boolean} params.payment_token_valid - Indicates if the payment token is valid.
	 * @returns {Promise<Object>} The payment status and home link.
	 * @throws {HttpBadRequest} If an error occurs during the payment process.
	 */
	async MayaPayment({
		token,
		transaction_id,
		evse_uid,
		connector_id,
		payment_token_valid,
	}) {
		if (payment_token_valid) {
			let details = await this.#repository.GetGuestMayaPaymentDetails(
				transaction_id
			);

			if (details.length === 0)
				throw new HttpBadRequest("TRANSACTION_ID_NOT_FOUND", []);

			const currentPaymentStatus = details[0].payment_status;

			if (currentPaymentStatus === "paid")
				throw new HttpBadRequest("ALREADY_PAID", []);
			else if (currentPaymentStatus === "failed")
				throw new HttpBadRequest("ALREADY_FAILED", []);
			else {
				const result = await this.#RequestToMayaPaymentURL({
					token,
					transaction_id,
					client_key: details[0].maya_client_key,
				});

				let status =
					result === "succeeded"
						? "paid"
						: result === "awaiting_payment_method" && "failed";

				const updateMayaPaymentResult =
					await this.#repository.UpdateQRGuestMayaPayment({
						status,
						transaction_id,
					});

				if (status === "paid") {
					await this.#repository.CheckAndUpdateConnectorStatus(
						evse_uid,
						connector_id
					);

					await this.#repository.CheckAndUpdateEVSEStatus(evse_uid);
				}

				return status === "paid"
					? {
							payment_status: "SUCCESS",
							home_link: updateMayaPaymentResult[0][0].home_link,
							transaction_id,
					  }
					: {
							payment_status: "FAILED",
							home_link: updateMayaPaymentResult[0][0].home_link,
							transaction_id,
					  };
			}
		}
	}

	/**
	 * Verifies the OTP for a user.
	 *
	 * This function checks the provided OTP against the stored OTP in the repository. If the OTP is correct, it returns a success status.
	 * If the OTP verification fails, it throws an HttpBadRequest with the appropriate status message.
	 *
	 * @async
	 * @function VerifyOTP
	 * @param {Object} data - The data containing the user ID and OTP.
	 * @param {number} data.user_id - The ID of the user.
	 * @param {string} data.otp - The OTP to be verified.
	 * @returns {Promise<string>} The status of the OTP verification.
	 * @throws {HttpBadRequest} If the OTP verification fails.
	 */
	async VerifyOTP(data) {
		const result = await this.#repository.VerifyOTP(data);

		const status = result[0][0].STATUS;

		if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

		return status;
	}

	/**
	 * Resends an OTP to the user.
	 *
	 * This function generates a new OTP and updates it in the repository. It then sends the OTP to the user's mobile number via SMS.
	 * If the operation is not successful, it throws an HttpBadRequest with the appropriate status message.
	 *
	 * @async
	 * @function ResendOTP
	 * @param {Object} data - The data containing the user information.
	 * @param {number} data.user_id - The ID of the user.
	 * @returns {Promise<string>} The status of the OTP resend operation.
	 * @throws {HttpBadRequest} If the OTP resend operation fails.
	 */
	async ResendOTP(data) {
		const otp = otpGenerator.generate(4, {
			upperCaseAlphabets: false,
			specialChars: false,
			lowerCaseAlphabets: false,
			digits: true,
		});

		const result = await this.#repository.ResendOTP({ ...data, otp });

		const status = result[0][0].STATUS;
		const mobile_number = result[0][0].mobile_number;

		const message = `Hello, Guest User\n\nYour OTP for ParkNcharge free charging is ${otp}.\n\nUse it to authenticate. If you didn't request this, ignore it.\n\nThanks,\nParkNcharge`;

		let sms = new SMS({
			contact_number: mobile_number,
			message,
		});

		if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

		await sms.SendOTP();

		return status;
	}

	/**
	 * Checks the status of a mobile number.
	 *
	 * This function queries the repository to check the status of a given mobile number.
	 * If the mobile number is not found, it returns an empty object.
	 * If the mobile number is found, it returns the status information.
	 *
	 * @async
	 * @function CheckMobileNumberStatus
	 * @param {string} mobileNumber - The mobile number to be checked.
	 * @returns {Promise<Object>} The status of the mobile number. If the number is not found, returns an empty object.
	 */
	async CheckMobileNumberStatus(mobileNumber) {
		const result = await this.#repository.CheckMobileNumberStatus(mobileNumber);

		if (result.length === 0) return {};

		return result[0];
	}

	/**
	 * Requests an authentication token from the Authmodule service.
	 *
	 * This function sends a POST request to the Authmodule URL with the specified grant type.
	 * It includes the necessary headers for authorization and content type.
	 * The response from the Authmodule is logged and returned with the status and data.
	 *
	 * @async
	 * @function #RequestAuthmodule
	 * @returns {Promise<Object>} The response from the Authmodule service, including status and data.
	 * @throws {Error} If the request fails, an error is thrown.
	 */
	async #RequestAuthmodule() {
		logger.info({
			method: "RequestAuthmodule",
			class: "QRService",
		});

		const result = await axios.post(
			process.env.AUTHMODULE_URL,
			{
				grant_type: String(process.env.AUTHMODULE_GRANT_TYPE),
			},
			{
				headers: {
					Accept: "application/json",
					Authorization: "Basic " + process.env.AUTHMODULE_AUTHORIZATION,
					"Content-Type": "application/json",
				},
			}
		);

		return { status: result.status, data: result.data };
	}

	/**
	 * Requests the GCash source URL for guest top-up.
	 *
	 * This function sends a POST request to the GCash source URL with the provided authentication token,
	 * user ID, amount, top-up ID, EVSE UID, and connector ID.
	 * It includes the necessary headers for authorization and content type.
	 * The response from the GCash source URL is logged and returned with the status and data.
	 *
	 * @async
	 * @function #RequestToGCashSourceURL
	 * @param {string} auth_token The authentication token for accessing the GCash source URL.
	 * @param {string} user_id The ID of the user initiating the top-up.
	 * @param {number} amount The amount to be topped up.
	 * @param {string} topup_id The ID of the top-up transaction.
	 * @param {string} evse_uid The UID of the EVSE (Electric Vehicle Supply Equipment).
	 * @param {string} connector_id The ID of the connector.
	 * @returns {Promise<Object>} The response from the GCash source URL, including status and data.
	 * @throws {Error} If the request fails, an error is thrown.
	 */
	async #RequestToGCashSourceURL({
		auth_token,
		user_id,
		amount,
		topup_id,
		evse_uid,
		connector_id,
	}) {
		logger.info({
			data: {
				auth_token,
				user_id,
				amount,
				topup_id,
				evse_uid,
				connector_id,
			},
			method: "RequestToGCashSourceURL",
			class: "TopupService",
		});

		const result = await axios.post(
			process.env.GCASH_SOURCE_URL,
			{
				user_id,
				amount,
				topup_id,
				user_type: "guest",
				pnc_type: "pnc",
				evse_uid,
				connector_id,
			},
			{
				headers: {
					Accept: "application/json",
					Authorization: "Bearer " + auth_token,
					"Content-Type": "application/json",
				},
			}
		);

		return { status: result.status, data: result.data.result.data };
	}

	/**
	 * Requests the GCash payment URL for initiating a payment transaction.
	 *
	 * This function sends a POST request to the GCash payment URL with the provided amount,
	 * description, transaction ID, and authentication token.
	 * It includes the necessary headers for authorization and content type.
	 * The response from the GCash payment URL is returned.
	 *
	 * @async
	 * @function #RequestToGCashPaymentURL
	 * @param {number} amount - The amount of the payment transaction.
	 * @param {string} description - The description of the payment transaction.
	 * @param {string} id - The ID of the payment transaction.
	 * @param {string} token - The authentication token for accessing the GCash payment URL.
	 * @returns {Promise<Object>} The response from the GCash payment URL.
	 * @throws {Error} If the request fails, an error is thrown.
	 */
	async #RequestToGCashPaymentURL({ amount, description, id, token }) {
		const result = await axios.post(
			process.env.GCASH_PAYMENT_URL,
			{
				amount,
				description,
				currency: "PHP",
				statement_descriptor: "ParkNcharge",
				id,
				type: "source",
			},
			{
				headers: {
					Accept: "application/json",
					Authorization: "Bearer " + token,
					"Content-Type": "application/json",
				},
			}
		);

		return result.data;
	}

	/**
	 * Requests the Maya source URL for initiating a payment transaction.
	 *
	 * This function sends a POST request to the Maya payment URL with the provided user ID,
	 * payment description, amount, EVSE UID, connector ID, and authentication token.
	 * It includes the necessary headers for authorization and content type.
	 * The response from the Maya payment URL is returned.
	 *
	 * @async
	 * @function #RequestToMayaSourceURL
	 * @param {string} auth_token - The authentication token for accessing the Maya payment URL.
	 * @param {string} user_id - The ID of the user initiating the payment.
	 * @param {string} description - The description of the payment transaction.
	 * @param {number} amount - The amount of the payment transaction.
	 * @param {string} evse_uid - The UID of the EVSE (Electric Vehicle Supply Equipment).
	 * @param {string} connector_id - The ID of the connector.
	 * @returns {Promise<Object>} The response from the Maya payment URL.
	 * @throws {Error} If the request fails, an error is thrown.
	 */
	async #RequestToMayaSourceURL({
		auth_token,
		user_id,
		description,
		amount,
		evse_uid,
		connector_id,
	}) {
		const result = await axios.post(
			process.env.MAYA_PAYMENT_URL,
			{
				user_id,
				type: "paymaya",
				description,
				amount,
				payment_method_allowed: "paymaya",
				statement_descriptor: "ParkNcharge",
				user_type: "guest",
				pnc_type: "pnc",
				evse_uid,
				connector_id,
			},
			{
				headers: {
					Accept: "application/json",
					Authorization: "Bearer " + auth_token,
					"Content-Type": "application/json",
				},
			}
		);

		return result.data;
	}

	/**
	 * Requests the Maya payment URL for initiating a payment transaction.
	 *
	 * This function sends a POST request to the Maya get payment URL with the provided payment intent,
	 * and client key. It includes the necessary headers for authorization and content type.
	 * The response from the Maya get payment URL is returned.
	 *
	 * If the status of the payment transaction is "processing", the function recursively calls itself
	 * until the status changes. Once the status changes, it returns the final status.
	 *
	 * @async
	 * @function #RequestToMayaPaymentURL
	 * @param {string} token - The authentication token for accessing the Maya get payment URL.
	 * @param {string} transaction_id - The ID of the payment transaction.
	 * @param {string} client_key - The client key for the payment transaction.
	 * @returns {Promise<string>} The status of the payment transaction.
	 * @throws {Error} If the request fails, an error is thrown.
	 */
	async #RequestToMayaPaymentURL({ token, transaction_id, client_key }) {
		const result = await axios.post(
			process.env.MAYA_GET_PAYMENT_URL,
			{
				payment_intent: transaction_id,
				client_key,
			},
			{
				headers: {
					Accept: "application/json",
					Authorization: "Bearer " + token,
					"Content-Type": "application/json",
				},
			}
		);

		const status = result.data.data.attributes.status;

		if (status === "processing") {
			return await this.#RequestToMayaPaymentURL({
				token,
				transaction_id,
				client_key,
			});
		}

		return status;
	}

	/**
	 * Retrieves timeslots for booking based on location, EVSE UID, connector ID, and current hour.
	 *
	 * This function sends a GET request to the booking timeslot service to fetch timeslots available
	 * for booking at the specified location, EVSE UID, connector ID, and current hour. It includes
	 * the necessary headers for authorization.
	 *
	 * @async
	 * @function #GetTimeslots
	 * @param {string} locationID - The ID of the location where the EVSE is located.
	 * @param {string} evseUID - The UID of the EVSE (Electric Vehicle Supply Equipment).
	 * @param {string} connectorID - The ID of the connector within the EVSE.
	 * @param {number} currentHour - The current hour for which timeslots are requested.
	 * @returns {Promise<object>} Timeslots available for booking.
	 * @throws {HttpBadRequest} If the request fails, an HTTP bad request error is thrown.
	 */
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

	/**
	 * Checks the status and details of an Electric Vehicle Supply Equipment (EVSE) using a QR code and EVSE UID.
	 *
	 * This function parses the QR code and validates its format. Then, it checks the EVSE status and retrieves
	 * its details along with connector information and rates. If successful, it returns the EVSE details, connectors,
	 * and rates.
	 *
	 * @async
	 * @function CheckEVSE
	 * @param {string} qrCode - The QR code containing the EVSE information.
	 * @param {string} evseUID - The UID of the EVSE (Electric Vehicle Supply Equipment) to check.
	 * @returns {Promise<object>} Details of the EVSE, including connectors and rates.
	 * @throws {HttpBadRequest} If the QR code format is invalid or the EVSE check fails, an HTTP bad request error is thrown.
	 */
	async CheckEVSE(qrCode, evseUID) {
		try {
			const qr = qrCode.split("-");

			if (qr[0] !== "QR")
				throw new HttpBadRequest("INVALID_QR_CODE_FORMAT", [
					{ message: "Valid QR code format are QR-****" },
				]);

			const parseQRNumber = parseInt(qr[1], 10);

			const result = await this.#repository.CheckEVSE(parseQRNumber, evseUID);

			const evseDetails = result[0][0];
			const status = result[0][0].STATUS;
			const connectors = result[1];

			if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

			const rates = await this.#repository.GetQRRates(evseUID);

			return { ...evseDetails, connectors, rates };
		} catch (err) {
			throw err;
		}
	}

	/**
	 * Verifies the status of a payment transaction using its transaction ID.
	 *
	 * This function checks the status of a payment transaction based on its transaction ID.
	 * If the transaction ID is not found, an HTTP not found error is thrown. Otherwise, the
	 * details of the transaction are returned.
	 *
	 * @async
	 * @function VerifyPayment
	 * @param {string} transactionID - The ID of the payment transaction to verify.
	 * @returns {Promise<object>} Details of the payment transaction.
	 * @throws {HttpNotFound} If the transaction ID is not found, an HTTP not found error is thrown.
	 */
	async VerifyPayment(transactionID) {
		try {
			const result = await this.#repository.VerifyPayment(transactionID);

			if (result.length === 0)
				throw new HttpNotFound("TRANSACTION_ID_NOT_FOUND", []);

			return result[0];
		} catch (err) {
			throw err;
		}
	}
};

/**
 * @author Adrian Marcelo
 * @description This file contains all of the methods that directly interacts in the persistence layer.
 * All of the methods here can be used by the service layer.
 */
const mysql = require("../database/mysql");

module.exports = class AccountRepository {
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

	VerifyBasicToken(username, password) {
		const QUERY = `call WEB_USER_VERIFY_BASIC_TOKEN(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [username, password], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * @description This method directly access the 'users' table. The responsibility of this table is to get a record
	 * that matches username and password.
	 * @param {Object} parameter {username, password}
	 * @returns {Promise}
	 */
	Login({ username, password }, connection) {
		const QUERY = `
			SELECT 
				users.id, 
				users.username, 
				users.password, 
				users.role,
				rfid_cards.rfid_card_tag 
			FROM 
				users 
			INNER JOIN user_drivers ON users.id = user_drivers.user_id
			INNER JOIN rfid_cards ON rfid_cards.user_driver_id = user_drivers.id
			WHERE username = ? AND password = MD5(?)
		`;
		return new Promise((resolve, reject) => {
			connection.query(QUERY, [username, password], (err, result) => {
				if (err) reject(err);

				resolve(result);
			});
		});
	}

	GetUserPrivileges(id, connection) {
		const QUERY = `
			SELECT 
				* 
			FROM 
				user_privileges 
			WHERE user_id = ?
		`;

		return new Promise((resolve, reject) => {
			connection.query(QUERY, [id], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
	/**
	 * @definition This method uses 'authorization_tokens' table. The responsibility of this method is to retrieve a
	 * record that matches the provided access token.
	 * @param {String} accessToken
	 * @returns {Promise}
	 */
	FindAccessToken(accessToken) {
		const QUERY = `SELECT access_token FROM authorization_tokens WHERE access_token = ?`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [accessToken], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * @definition This method uses 'authorization_tokens' table. The responsibility of this method is to retrieve a
	 * record that matches the provided refresh token.
	 * @param {String} refreshToken
	 * @returns {Promise}
	 */
	FindRefreshToken(refreshToken) {
		const QUERY = `
			SELECT 
				refresh_token 
			FROM 
				authorization_tokens 
			WHERE refresh_token = ?`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [refreshToken], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * @definition This method uses 'authorization_tokens' table. The responsibility of this method is to remove
	 * a session/record from the table that matches the provided user id.
	 * @param {Number} userID
	 * @returns {Promise}
	 */
	DeleteRefreshTokenWithUserID(userID) {
		const QUERY = `
			DELETE FROM 
				authorization_tokens 
			WHERE user_id = ?`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [userID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * @definition This method uses 'authorization_tokens' table. The responsibility of this method is to remove
	 * the record/session from the table when it matches the user id, and access token.
	 * @param {Number} userID
	 * @param {String} accessToken
	 * @returns {Promise}
	 */
	Logout(userID, accessToken) {
		const QUERY = `
			DELETE FROM 
				authorization_tokens 
			WHERE user_id = ? 
				AND access_token = ?`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [userID, accessToken], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * @description This method uses 'authorization_tokens' table. The responsibility of this method is to add a new session
	 * in the table.
	 * @param {Object} parameter {access_token: String, refresh_token: String, user_id: Number, connection: MySQL Connection}
	 * @returns {Promise}
	 */
	SaveAuthorizationInfo({ access_token, refresh_token, user_id }, connection) {
		const QUERY = `
			INSERT INTO 
				authorization_tokens 
			(user_id, access_token, refresh_token) 
				VALUES(?,?,?)
		`;

		return new Promise((resolve, reject) => {
			connection.query(
				QUERY,
				[user_id, access_token, refresh_token],
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
	 * @description This method uses 'authorization_tokens' table. The responsibility of this method is to update a session/record
	 * detail that matches the user id, and refresh token.
	 * @param {Object} parameters {user_id: Number, new_access_token: String, new_refresh_token: String, prev_refresh_token: String}
	 * @returns {Promise}
	 */
	UpdateAuthorizationInfo({
		user_id,
		new_access_token,
		new_refresh_token,
		prev_refresh_token,
	}) {
		return new Promise((resolve, reject) => {
			const QUERY = `
				UPDATE 
					authorization_tokens 
				SET 
					access_token = ?, 
					refresh_token = ?, 
					date_modified = NOW() 
				WHERE 
					user_id = ? AND refresh_token = ?
			`;

			mysql.query(
				QUERY,
				[new_access_token, new_refresh_token, user_id, prev_refresh_token],
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
	 * @description This method uses Stored Procedures called CHECK_OTP_DAY. It is responsible for
	 * handling the OTP to be sent in users email.
	 * @param {Object} parameters {email: String, otp: Number, token: String, token_expiration: Number}
	 * @returns {Promise}
	 */
	SendOTP({ email, otp, token, token_expiration }) {
		const QUERY = `call WEB_USER_CHECK_USER_FORGOT_PASSWORD_PROFILES(?,?,?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[email, otp, token, token_expiration],
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
	 * @description This method uses Stored Procedure called CHECK_INPUT_OTP. It is responsible for
	 * verifying the OTP that the user is provided.
	 * @param {Object} parameters {user_id: Number, otp: Number}
	 * @returns {Promise}
	 */
	VerifyOTP({ user_id, otp }) {
		const QUERY = `call WEB_USER_CHECK_OTP(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [user_id, otp], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * @description This method uses Stored Procedure called CHANGE_PASSWORD. It is responsible for
	 * changing user's password.
	 * @param {Object} parameters {password: String, user_id: Number}
	 * @returns {Promise}
	 */
	ChangePassword({ password, user_id }) {
		const QUERY = `call WEB_USER_CHANGE_PASSWORD(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [user_id, password], (err, result) => {
				if (err) {
					reject(err);
				}
				resolve(result);
			});
		});
	}

	ChangeOldPassword({ user_id, old_password, new_password, confirm_password }) {
		const QUERY = `call WEB_USER_CHANGE_OLD_PASSWORD(?,?,?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[user_id, old_password, new_password, confirm_password],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	GetUserDetails(userID) {
		const QUERY = `
			SELECT 
				u.id AS user_id,
				ud.id AS user_driver_id,
				u.username,
				u.role,
				ud.name,
				ud.email,
				ud.address,
				ud.mobile_number,
				rc.rfid_card_tag,
				rc.balance
			FROM users AS u
			INNER JOIN user_drivers AS ud ON u.id = ud.user_id
			INNER JOIN rfid_cards AS rc ON ud.id = rc.user_driver_id
			WHERE u.id = ?`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [userID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
};

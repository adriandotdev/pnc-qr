const axios = require("axios");

module.exports = class SMS {
	constructor(data) {
		this.data = data;
	}

	async SendOTP() {
		const result = await axios.get(
			`https://messagingsuite.smart.com.ph//cgphttp/servlet/sendmsg?destination=${
				this.data.contact_number
			}&text=${encodeURIComponent(
				this.data.message
			)}&source=ParkNcharge&sourceNPI=0&sourceTON=5`,
			{
				headers: {
					Authorization: `Basic ${process.env.SMS_API_KEY}`,
				},
			}
		);

		return result;
	}
};

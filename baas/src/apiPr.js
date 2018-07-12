const axios = require('axios');

const host= 'skippdev.atlassian.net';

export default async event => {
  const { url } = event.data;
  const fullUrl = `https://${host}${url}`
  try {
    const response = await axios.get(
      fullUrl,
      {
        headers: {

          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization:
            'Basic dXN1bHByb0BnbWFpbC5jb206NzllRVRENjgzV2Yya0U2eUtNYVAxRURG',
        },
      },
    );
    const res = JSON.stringify(response.data);
    // console.log('axios:', res);


    return {
      data: {
        status: 'Ok',
        response: res,
      },
    };
  } catch (err) {
    return {
      data: {
        status: err.message,
        response: err,
      },
    };
  }
};

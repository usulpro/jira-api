const axios = require('axios');

const makeRequest = async () => {
  const response = await axios.get(
    'https://skippdev.atlassian.net/rest/api/2/project/10021',
    {
      headers: {
        // Host: 'skippdev.atlassian.net',
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization:
          'Basic dXN1bHByb0BnbWFpbC5jb206NzllRVRENjgzV2Yya0U2eUtNYVAxRURG',
        // 'Cache-Control': 'no-cache',
      },
    }
  );
  console.log(response.data);
}

makeRequest();

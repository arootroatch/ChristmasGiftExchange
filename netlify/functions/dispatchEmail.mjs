
import fetch from "node-fetch";

const handler = async (event) => {
  if (event.body === null) {
    return {
      statusCode: 400,
      body: JSON.stringify("Payload required"),
    };
  }

  let giver = JSON.parse(event.body);

  try {
    await fetch(
      `${process.env.URL}/.netlify/functions/emails/secret-santa`,
      {
        headers: {
          "netlify-emails-secret": process.env.NETLIFY_EMAILS_SECRET,
        },
        method: "POST",
        body: JSON.stringify({
          from: "alex@soundrootsproductions.com",
          to: giver.email,
          subject: "Your gift exchange recipient name has arrived!",
          parameters: {
            name: giver.name,
            recipient: giver.recipient
          },
        })
      }
    );
    return { statusCode: 200 };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };

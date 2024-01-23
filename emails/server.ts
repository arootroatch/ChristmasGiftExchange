import React from "react";
import { Resend } from "resend";
import secretSantaEmail from ".";
// import { givers } from "../scripts";

const resend = new Resend(process.env.RESEND_API_KEY);

const getErrorMessage = (error: unknown) => {
  let message: string;
  if (error instanceof Error) {
    message=String(error.message)
  } else if (error && typeof error === "object" && "message" in error) {
    message = String(error.message)
  } else if (typeof error === 'string'){
    message = error;
  } else {
    message = "Something went wrong";
  }
  return message;
};

const validateString = (value: unknown, maxLength: number) => {
  if (!value || typeof value !== "string" || value.length > maxLength) {
    return false;
  }
  return true;
};


export const sendSecretSantaEmail = async () => {
  console.log('clicked');
  // create batch of emails for single API call
  const emailBatchArr = givers.map(giver =>(
    {
      from: "Gift Exchange <onboarding@resend.dev>",
      to: giver.email,
      subject: "Here's who you're buying a present for!",      
      react: React.createElement(secretSantaEmail, {
        name: giver.name,
        recipient: giver.recipient
      })
    }
  ));
  console.log(emailBatchArr);

  // let data;

  // try {
  //   data = await resend.batch.send(emailBatchArr);
  // } catch (error: unknown) {
  //   return {
  //     error: getErrorMessage(error),
  //   }
  // }
  // return {
  //   data,
  // }
};





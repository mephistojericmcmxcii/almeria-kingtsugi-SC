import {setGlobalOptions} from "firebase-functions/v2";
import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({maxInstances: 10});

export const setAdminRole = onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new Error("Authentication required.");
  }

  if (auth.token.role !== "admin") {
    throw new Error("Only admins can assign roles.");
  }

  const uid = data.uid;

  await admin.auth().setCustomUserClaims(uid, {role: "admin"});

  return {message: "User is now admin!"};
});

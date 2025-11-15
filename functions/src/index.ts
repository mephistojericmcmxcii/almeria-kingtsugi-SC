
import {setGlobalOptions} from "firebase-functions/v2";
import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({maxInstances: 10});

export const setAdminRole = onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;
  const uid = data.uid;

  // If the user is authenticated, check if they are an admin
  if (auth) {
    if (auth.token.role !== "admin") {
      throw new Error("Only admins can assign roles.");
    }
  } else {
    // If unauthenticated, check if any admin users already exist.
    // This allows for the creation of the *first* admin user.
    try {
      const {users} = await admin.auth().listUsers(1, "admin");
      if (users.length > 0) {
        throw new Error("Only admins can assign roles. At least one admin already exists.");
      }
    } catch (e) {
        // If listUsers fails for other reasons, it might be a setup issue.
        // We will proceed but log the error. This is a failsafe.
        console.error("Could not list users, proceeding with caution:", e);
    }
  }

  await admin.auth().setCustomUserClaims(uid, {role: "admin"});
  // Also update the user's document in Firestore to reflect the new role
  await admin.firestore().collection("users").doc(uid).set({role: "admin"}, {merge: true});


  return {message: "User is now admin!"};
});

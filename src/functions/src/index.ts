import {setGlobalOptions} from "firebase-functions/v2";
import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {getFirestore} from "firebase-admin/firestore";

admin.initializeApp();
const db = getFirestore();

setGlobalOptions({maxInstances: 10});

export const setAdminRole = onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new Error("Authentication required.");
  }

  const uid = data.uid;
  if (!uid) {
    throw new Error("Missing UID.");
  }

  // Check if caller is admin
  const adminDoc = await db.collection("roles_admin").doc(auth.uid).get();

  if (!adminDoc.exists) {
    const existingAdmins =
      await db.collection("roles_admin").limit(1).get();

    if (!existingAdmins.empty) {
      throw new Error("Only admins can assign roles.");
    }
  }

  await admin.auth().setCustomUserClaims(uid, {admin: true});

  await db.collection("users").doc(uid).set(
    {role: "admin"},
    {merge: true},
  );

  await db.collection("roles_admin").doc(uid).set({isAdmin: true});

  // Force a refresh of the user's token on the client side.
  // This is not directly possible from the backend, but by revoking refresh tokens,
  // the client will be forced to re-authenticate and get a new ID token with the custom claims.
  await admin.auth().revokeRefreshTokens(uid);


  return {message: "User is now admin!"};
});

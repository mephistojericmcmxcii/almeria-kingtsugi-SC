
import {setGlobalOptions} from "firebase-functions/v2";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {getFirestore} from "firebase-admin/firestore";

admin.initializeApp();
const db = getFirestore();

setGlobalOptions({maxInstances: 10});

export const setAdminRole = onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = data.uid;
  if (!uid) {
    throw new HttpsError("invalid-argument", "Missing UID.");
  }

  // Check if the caller is an admin by verifying their custom claim.
  if (auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Only admins can assign roles.");
  }

  // Set the custom claim { admin: true } on the target user's token
  await admin.auth().setCustomUserClaims(uid, {admin: true});
  
  // After setting the claim, revoke the user's refresh tokens to force re-authentication
  // This is important to ensure the new custom claims are applied on the client-side quickly.
  await admin.auth().revokeRefreshTokens(uid);

  // Update the user's role in the Firestore 'users' collection for client-side checks
  await db.collection("users").doc(uid).set(
    {role: "admin"},
    {merge: true},
  );

  // Add the user to the 'roles_admin' collection for quick admin checks in rules
  await db.collection("roles_admin").doc(uid).set({isAdmin: true});

  return {message: "User is now admin! They must log out and log back in for changes to take effect."};
});

export const revokeAdminRole = onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  // Check if the caller is an admin.
  if (auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Only admins can revoke roles.");
  }

  const uid = data.uid;
  if (!uid) {
    throw new HttpsError("invalid-argument", "Missing UID.");
  }

  // Set the custom claim to null to remove it.
  await admin.auth().setCustomUserClaims(uid, { admin: null });
  
  // Revoke refresh tokens to force re-authentication with new claims.
  await admin.auth().revokeRefreshTokens(uid);

  // Update the user's role in Firestore.
  await db.collection("users").doc(uid).set(
    { role: "guest" },
    { merge: true }
  );

  // Remove the user from the 'roles_admin' collection.
  await db.collection("roles_admin").doc(uid).delete();

  return { message: "Admin role has been revoked. The user must log out and log back in." };
});

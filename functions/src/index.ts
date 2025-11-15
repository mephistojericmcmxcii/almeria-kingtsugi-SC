
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

  // Check if caller is admin, but allow the first admin to be created
  const adminDoc = await db.collection("roles_admin").doc(auth.uid).get();

  if (!adminDoc.exists) {
    const existingAdmins =
      await db.collection("roles_admin").limit(1).get();

    // If there are existing admins, but the caller is not one, deny access.
    // This logic allows the very first user to become an admin.
    if (!existingAdmins.empty) {
      throw new Error("Only admins can assign roles.");
    }
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

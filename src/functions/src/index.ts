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
    // Allow the very first user to become an admin
    const existingAdmins =
      await db.collection("roles_admin").limit(1).get();

    if (!existingAdmins.empty) {
      throw new Error("Only admins can assign roles.");
    }
  }

  // Set the custom claim { admin: true } on the target user's token
  await admin.auth().setCustomUserClaims(uid, {admin: true});

  // Update the user's role in the Firestore 'users' collection for client-side checks
  await db.collection("users").doc(uid).set(
    {role: "admin"},
    {merge: true},
  );

  // Add the user to the 'roles_admin' collection for quick admin checks in rules
  await db.collection("roles_admin").doc(uid).set({isAdmin: true});

  return {message: "User is now admin! They may need to log out and log back in to see the changes."};
});

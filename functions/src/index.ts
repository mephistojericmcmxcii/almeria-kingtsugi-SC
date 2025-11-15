
import {setGlobalOptions} from "firebase-functions/v2";
import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({maxInstances: 10});

export const setAdminRole = onCall(async (request) => {
  const data = request.data;
  const auth = request.auth;
  const uid = data.uid;

  if (!auth) {
    throw new Error("Authentication required.");
  }

  // Securely check if the calling user is an admin by checking the database.
  const adminDoc = await admin.firestore().collection("roles_admin").doc(auth.uid).get();
  if (!adminDoc.exists) {
    // For the very first admin, allow if no other admins exist.
    const adminUsers = await admin.firestore().collection("roles_admin").limit(1).get();
    if (adminUsers.empty) {
        // This is the first admin being created. Allow it.
    } else {
        throw new Error("Only admins can assign roles.");
    }
  }
  
  // Set the custom claim. This is useful for client-side UI checks.
  await admin.auth().setCustomUserClaims(uid, {role: "admin"});

  // Also update the user's document in Firestore to reflect the new role
  await admin.firestore().collection("users").doc(uid).set({role: "admin"}, {merge: true});

  // Add the user to the roles_admin collection for secure rule checking.
  await admin.firestore().collection("roles_admin").doc(uid).set({isAdmin: true});

  return {message: "User is now admin!"};
});

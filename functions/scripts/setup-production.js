
"use strict";

const {initializeApp, cert} = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");

const fs = require("node:fs");

const PROJECT_ID = "om-maruti-diamond";
const BUSINESS_ID = "om-maruti-diamond";
const BUSINESS_NAME = "OM MARUTI DIAMOND";
/**
 * Initializes the production business and owner records.
 * @return {Promise<void>} Resolves when setup is complete.
 */
async function main() {
  const uid = process.env.OMD_OWNER_UID;
  const confirmation = process.env.OMD_SETUP_CONFIRM;
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!uid || uid.includes("/")) {
    throw new Error("Set OMD_OWNER_UID to your production Auth UID.");
  }

  if (confirmation !== "om-maruti-diamond") {
    throw new Error("Production setup confirmation is missing.");
  }

  if (!keyPath || !fs.existsSync(keyPath)) {
    throw new Error("Service account credentials file not found.");
  }

  const serviceAccount = JSON.parse(
      fs.readFileSync(keyPath, "utf8"),
  );

  if (serviceAccount.project_id !== PROJECT_ID) {
    throw new Error("Service account belongs to the wrong project.");
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: PROJECT_ID,
  });

  const owner = await getAuth().getUser(uid);

  if (owner.disabled) {
    throw new Error("The selected owner account is disabled.");
  }

  if (!owner.email) {
    throw new Error("The owner must have an email address.");
  }

  console.log("Project:", PROJECT_ID);
  console.log("Owner email:", owner.email);
  console.log("Owner UID:", owner.uid);

  const db = getFirestore();

  const businessRef = db
      .collection("businesses")
      .doc(BUSINESS_ID);

  const memberRef = businessRef
      .collection("members")
      .doc(owner.uid);

  const businessSettingsRef = businessRef
      .collection("settings")
      .doc("business");

  const invoiceSettingsRef = businessRef
      .collection("settings")
      .doc("invoice");

  const auditRef = businessRef
      .collection("auditLogs")
      .doc();

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(businessRef);

    if (existing.exists) {
      throw new Error(
          "Business already exists. Setup stopped without changes.",
      );
    }

    const now = FieldValue.serverTimestamp();

    transaction.create(businessRef, {
      name: BUSINESS_NAME,
      active: true,
      currency: "INR",
      timezone: "Asia/Kolkata",
      schemaVersion: 2,
      createdBy: owner.uid,
      createdAt: now,
      updatedAt: now,
    });

    transaction.create(memberRef, {
      role: "owner",
      active: true,
      email: owner.email,
      createdAt: now,
      updatedAt: now,
    });

    transaction.create(businessSettingsRef, {
      businessName: BUSINESS_NAME,
      logoUrl: "",
      address: "",
      mobile: "",
      email: owner.email,
      gstin: "",
      currency: "INR",
      timezone: "Asia/Kolkata",
      updatedAt: now,
    });

    transaction.create(invoiceSettingsRef, {
      customerPrefix: "OMD-C",
      nextCustomerNumber: 1,
      supplierPrefix: "OMD-SUP",
      nextSupplierNumber: 1,
      salePrefix: "OMD-S",
      nextSaleNumber: 1,
      purchasePrefix: "OMD-B",
      nextPurchaseNumber: 1,
      defaultGstRate: 0,
      defaultNotes: "",
      updatedAt: now,
    });

    transaction.create(auditRef, {
      action: "BUSINESS_BOOTSTRAPPED",
      actorUid: owner.uid,
      actorEmail: owner.email,
      businessId: BUSINESS_ID,
      schemaVersion: 2,
      createdAt: now,
    });
  });

  console.log("Production business initialized successfully.");
}

main().catch((error) => {
  console.error("Setup failed:", error.message);
  process.exitCode = 1;
});

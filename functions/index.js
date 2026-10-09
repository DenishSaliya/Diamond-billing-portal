const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();

/* ============================================================
   CONSTANTS
   ============================================================ */

const BUSINESS_ID = "om-maruti-diamond";
const BUSINESS_NAME = "OM MARUTI DIAMOND";

const MAX_NAME_LENGTH = 120;
const MAX_MOBILE_LENGTH = 20;
const MAX_EMAIL_LENGTH = 254;
const MAX_ADDRESS_LENGTH = 500;
const MAX_GSTIN_LENGTH = 15;

const MAX_PAYMENT_REFERENCE_LENGTH = 120;
const MAX_PAYMENT_NOTE_LENGTH = 500;

const MAX_SALE_ITEMS = 100;
const MAX_ITEM_MATERIAL_LENGTH = 120;
const MAX_ITEM_DESCRIPTION_LENGTH = 300;
const MAX_ITEM_REMARKS_LENGTH = 300;
const MAX_HSN_LENGTH = 20;
const MAX_SALE_NOTES_LENGTH = 2000;
const MAX_DECLARATION_LENGTH = 2000;
const MAX_BROKER_LENGTH = 120;

const ALLOWED_SALE_PAYMENT_METHODS = new Set([
  "cash",
  "bank",
  "upi",
  "cheque",
  "other",
]);

/* ============================================================
   BASIC HELPERS
   ============================================================ */

function cleanString(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, maxLength);
}

function normalizeEmail(value) {
  return cleanString(value, MAX_EMAIL_LENGTH).toLowerCase();
}

function normalizeMobile(value) {
  const mobile = cleanString(value, MAX_MOBILE_LENGTH);

  const hasPlus = mobile.startsWith("+");

  const digits = mobile.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return hasPlus ?
    `+${digits}` :
    digits;
}

function normalizeGstin(value) {
  return cleanString(value, MAX_GSTIN_LENGTH).toUpperCase();
}

function normalizeSearchValue(value) {
  return String(value || "")
      .trim()
      .toLowerCase();
}

/* ============================================================
   PARTY VALIDATION
   ============================================================ */

function validateName(name, label) {
  if (!name) {
    throw new HttpsError(
        "invalid-argument",
        `${label} name is required.`,
    );
  }

  if (name.length < 2) {
    throw new HttpsError(
        "invalid-argument",
        `${label} name is too short.`,
    );
  }
}

function validateEmail(email) {
  if (!email) {
    return;
  }

  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!pattern.test(email)) {
    throw new HttpsError(
        "invalid-argument",
        "Enter a valid email address.",
    );
  }
}

function validateMobile(mobile) {
  if (!mobile) {
    return;
  }

  const digits = mobile.replace(/\D/g, "");

  if (
    digits.length < 7 ||
    digits.length > 15
  ) {
    throw new HttpsError(
        "invalid-argument",
        "Enter a valid mobile number.",
    );
  }
}

function validateGstin(gstin) {
  if (!gstin) {
    return;
  }

  const pattern =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  if (!pattern.test(gstin)) {
    throw new HttpsError(
        "invalid-argument",
        "Enter a valid GSTIN.",
    );
  }
}

function preparePartyData(data, label) {
  const input =
    data &&
    typeof data === "object" &&
    !Array.isArray(data) ?
      data :
      {};

  const name =
    cleanString(
        input.name,
        MAX_NAME_LENGTH,
    );

  const mobile =
    normalizeMobile(
        input.mobile,
    );

  const email =
    normalizeEmail(
        input.email,
    );

  const address =
    cleanString(
        input.address,
        MAX_ADDRESS_LENGTH,
    );

  const gstin =
    normalizeGstin(
        input.gstin,
    );

  validateName(name, label);
  validateMobile(mobile);
  validateEmail(email);
  validateGstin(gstin);

  return {
    name,
    mobile,
    email,
    address,
    gstin,
  };
}

function createSearchTerms(party) {
  const values = [
    party.name,
    party.mobile,
    party.email,
    party.gstin,
  ]
      .map(normalizeSearchValue)
      .filter(Boolean);

  return [...new Set(values)];
}

/* ============================================================
   AUTHENTICATION
   ============================================================ */

function requireAuthentication(request) {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "You must be signed in.",
    );
  }

  return {
    uid: request.auth.uid,
    email: request.auth.token.email || "",
  };
}

/* ============================================================
   OWNER AUTHORIZATION
   ============================================================ */

async function requireOwner(request) {
  const user =
    requireAuthentication(request);

  const businessRef =
    db
        .collection("businesses")
        .doc(BUSINESS_ID);

  const memberRef =
    businessRef
        .collection("members")
        .doc(user.uid);

  const [
    businessSnapshot,
    memberSnapshot,
  ] = await Promise.all([
    businessRef.get(),
    memberRef.get(),
  ]);

  if (!businessSnapshot.exists) {
    throw new HttpsError(
        "failed-precondition",
        "Business has not been initialized.",
    );
  }

  const business =
    businessSnapshot.data();

  if (business.active !== true) {
    throw new HttpsError(
        "failed-precondition",
        "Business is not active.",
    );
  }

  if (!memberSnapshot.exists) {
    throw new HttpsError(
        "permission-denied",
        "You are not authorized for this business.",
    );
  }

  const member =
    memberSnapshot.data();

  if (
    member.active !== true ||
    member.role !== "owner"
  ) {
    throw new HttpsError(
        "permission-denied",
        "Owner access is required.",
    );
  }

  return user;
}

/* ============================================================
   COMMON VALIDATION
   ============================================================ */

function requireObject(value, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new HttpsError(
        "invalid-argument",
        `${label} is invalid.`,
    );
  }

  return value;
}

function validateId(value, label) {
  const id =
    typeof value === "string" ?
      value.trim() :
      "";

  if (
    !id ||
    id.length > 128 ||
    id.includes("/")
  ) {
    throw new HttpsError(
        "invalid-argument",
        `${label} is invalid.`,
    );
  }

  return id;
}

function validateClientRequestId(value) {
  const id =
    validateId(
        value,
        "Client request ID",
    );

  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new HttpsError(
        "invalid-argument",
        "Client request ID contains invalid characters.",
    );
  }

  return id;
}

function validateOptionalText(
    value,
    fieldName,
    maxLength,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (typeof value !== "string") {
    throw new HttpsError(
        "invalid-argument",
        `${fieldName} must be text.`,
    );
  }

  const cleaned =
    value.trim();

  if (cleaned.length > maxLength) {
    throw new HttpsError(
        "invalid-argument",
        `${fieldName} is too long.`,
    );
  }

  return cleaned;
}

/* ============================================================
   PAYMENT VALIDATION
   ============================================================ */

function validatePositivePaise(
    value,
    fieldName,
) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new HttpsError(
        "invalid-argument",
        `${fieldName} must be a positive integer amount in paise.`,
    );
  }

  return value;
}

function validateSalePaymentMethod(value) {
  if (typeof value !== "string") {
    throw new HttpsError(
        "invalid-argument",
        "Invalid payment method.",
    );
  }

  const normalized =
    value
        .trim()
        .toLowerCase();

  if (!ALLOWED_SALE_PAYMENT_METHODS.has(normalized)) {
    throw new HttpsError(
        "invalid-argument",
        "Invalid payment method.",
    );
  }

  return normalized;
}

/* ============================================================
   DATE VALIDATION
   ============================================================ */

function parseDateOnlyToTimestamp(
    value,
    fieldName,
) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new HttpsError(
        "invalid-argument",
        `${fieldName} must be a valid date.`,
    );
  }

  const [
    year,
    month,
    day,
  ] = value
      .split("-")
      .map(Number);

  const date =
    new Date(
        Date.UTC(
            year,
            month - 1,
            day,
            0,
            0,
            0,
            0,
        ),
    );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpsError(
        "invalid-argument",
        `${fieldName} is invalid.`,
    );
  }

  return Timestamp.fromDate(date);
}

function dateKey(timestamp) {
  const date =
    timestamp.toDate();

  return [
    String(
        date.getUTCFullYear(),
    ).padStart(4, "0"),

    String(
        date.getUTCMonth() + 1,
    ).padStart(2, "0"),

    String(
        date.getUTCDate(),
    ).padStart(2, "0"),
  ].join("-");
}

/* ============================================================
   DECIMAL / MONEY HELPERS
   ============================================================ */

function parseDecimal(
    value,
    places,
    label,
    allowZero = true,
    maxWhole = 12,
) {
  const raw =
    typeof value === "string" ?
      value.trim() :
      (
        typeof value === "number" &&
        Number.isFinite(value) ?
          String(value) :
          ""
      );

  const pattern =
    new RegExp(
        `^\\d{1,${maxWhole}}(?:\\.\\d{1,${places}})?$`,
    );

  if (!pattern.test(raw)) {
    throw new HttpsError(
        "invalid-argument",
        `${label} has an invalid number format.`,
    );
  }

  const [
    whole,
    fraction = "",
  ] = raw.split(".");

  const scale =
    10 ** places;

  const result =
    Number(whole) * scale +
    Number(
        fraction.padEnd(
            places,
            "0",
        ),
    );

  if (
    !Number.isSafeInteger(result) ||
    result < 0 ||
    (!allowZero && result === 0)
  ) {
    throw new HttpsError(
        "invalid-argument",
        `${label} is out of range.`,
    );
  }

  return result;
}

function rupeesToPaise(
    value,
    label,
    allowZero = true,
) {
  return parseDecimal(
      value,
      2,
      label,
      allowZero,
      12,
  );
}
// Converts an optional rupee amount to paise.
// Kept for future optional financial fields.
// eslint-disable-next-line no-unused-vars
function optionalRupeesToPaise(
    value,
    label,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  return rupeesToPaise(
      value,
      label,
      true,
  );
}
function parsePieces(
    value,
    label,
) {
  const raw =
    typeof value === "number" ?
      String(value) :
      String(value ?? "").trim();

  if (!/^\d+$/.test(raw)) {
    throw new HttpsError(
        "invalid-argument",
        `${label} must be a whole number.`,
    );
  }

  const pieces =
    Number(raw);

  if (
    !Number.isSafeInteger(pieces) ||
    pieces < 0 ||
    pieces > 100000000
  ) {
    throw new HttpsError(
        "invalid-argument",
        `${label} is invalid.`,
    );
  }

  return pieces;
}

function safeMoneyAdd(
    first,
    second,
    label,
) {
  const result =
    first + second;

  if (
    !Number.isSafeInteger(result) ||
    result < 0
  ) {
    throw new HttpsError(
        "invalid-argument",
        `${label} is too large.`,
    );
  }

  return result;
}

function safeMultiplyRound(
    first,
    second,
    divisor,
    label,
) {
  const product =
    first * second;

  if (!Number.isSafeInteger(product)) {
    throw new HttpsError(
        "invalid-argument",
        `${label} is too large.`,
    );
  }

  const result =
    Math.round(
        product / divisor,
    );

  if (
    !Number.isSafeInteger(result) ||
    result < 0
  ) {
    throw new HttpsError(
        "invalid-argument",
        `${label} is invalid.`,
    );
  }

  return result;
}

/* ============================================================
   BOOTSTRAP BUSINESS
   ============================================================ */

exports.bootstrapBusiness =
  onCall(async (request) => {
    if (
      process.env.FUNCTIONS_EMULATOR !==
      "true"
    ) {
      throw new HttpsError(
          "failed-precondition",
          "Business bootstrap is only available in the local emulator.",
      );
    }

    const user =
      requireAuthentication(request);

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);

    const memberRef =
      businessRef
          .collection("members")
          .doc(user.uid);

    const businessSettingsRef =
      businessRef
          .collection("settings")
          .doc("business");

    const invoiceSettingsRef =
      businessRef
          .collection("settings")
          .doc("invoice");

    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();

    await db.runTransaction(
        async (transaction) => {
          const businessSnapshot =
            await transaction.get(
                businessRef,
            );

          if (businessSnapshot.exists) {
            const memberSnapshot =
              await transaction.get(
                  memberRef,
              );

            if (!memberSnapshot.exists) {
              throw new HttpsError(
                  "permission-denied",
                  "This local business already belongs to another owner.",
              );
            }

            const member =
              memberSnapshot.data();

            if (
              member.role !== "owner" ||
              member.active !== true
            ) {
              throw new HttpsError(
                  "permission-denied",
                  "Owner access is required.",
              );
            }

            return;
          }

          transaction.set(
              businessRef,
              {
                name:
                  BUSINESS_NAME,

                active: true,

                currency:
                  "INR",

                timezone:
                  "Asia/Kolkata",

                schemaVersion:
                  2,

                createdBy:
                  user.uid,

                createdAt:
                  FieldValue.serverTimestamp(),

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
          );

          transaction.set(
              memberRef,
              {
                role:
                  "owner",

                active:
                  true,

                email:
                  user.email,

                createdAt:
                  FieldValue.serverTimestamp(),

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
          );

          transaction.set(
              businessSettingsRef,
              {
                businessName:
                  BUSINESS_NAME,

                logoUrl:
                  "",

                address:
                  "",

                mobile:
                  "",

                email:
                  user.email,

                gstin:
                  "",

                currency:
                  "INR",

                timezone:
                  "Asia/Kolkata",

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
          );

          transaction.set(
              invoiceSettingsRef,
              {
                customerPrefix:
                      "OMD-C",

                nextCustomerNumber:
                      1,

                supplierPrefix:
                      "OMD-SUP",

                nextSupplierNumber:
                      1,

                salePrefix:
                      "OMD-S",

                nextSaleNumber:
                      1,

                purchasePrefix:
                      "OMD-B",

                nextPurchaseNumber:
                      1,

                defaultGstRate:
                      0,

                defaultNotes:
                      "",

                updatedAt:
                      FieldValue.serverTimestamp(),
              },
          );

          transaction.set(
              auditRef,
              {
                action:
                  "BUSINESS_BOOTSTRAPPED",

                actorUid:
                  user.uid,

                actorEmail:
                  user.email,

                businessId:
                  BUSINESS_ID,

                schemaVersion:
                  2,

                createdAt:
                  FieldValue.serverTimestamp(),
              },
          );
        },
    );

    return {
      success: true,
      businessId: BUSINESS_ID,
      message:
        "OM MARUTI DIAMOND initialized successfully.",
    };
  });


function formatPartyNumber(
    prefix,
    sequence,
    fallbackPrefix,
) {
  const cleanPrefix =
        typeof prefix === "string" &&
        prefix.trim() ?
            prefix.trim().toUpperCase() :
            fallbackPrefix;

  if (
    !Number.isSafeInteger(sequence) ||
        sequence <= 0
  ) {
    throw new HttpsError(
        "failed-precondition",
        "Party numbering is not configured correctly.",
    );
  }

  return (
    `${cleanPrefix}-${String(sequence).padStart(4, "0")}`
  );
}


/* ============================================================
   CREATE CUSTOMER
   ============================================================ */

exports.createCustomer =
  onCall(async (request) => {
    const user =
      await requireOwner(request);

    const customer =
      preparePartyData(
          request.data,
          "Customer",
      );

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);

    const customerRef =
      businessRef
          .collection("customers")
          .doc();

    const invoiceSettingsRef =
      businessRef
          .collection("settings")
          .doc("invoice");

    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();

    const result =
      await db.runTransaction(
          async (transaction) => {
            const settingsSnapshot =
              await transaction.get(
                  invoiceSettingsRef,
              );

            if (!settingsSnapshot.exists) {
              throw new HttpsError(
                  "failed-precondition",
                  "Numbering settings are missing.",
              );
            }

            const settings =
              settingsSnapshot.data() || {};

            const nextCustomerNumber =
              settings.nextCustomerNumber;

            if (
              !Number.isSafeInteger(
                  nextCustomerNumber,
              ) ||
              nextCustomerNumber <= 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Customer numbering is not configured correctly.",
              );
            }

            const customerNumber =
              formatPartyNumber(
                  settings.customerPrefix,
                  nextCustomerNumber,
                  "OMD-C",
              );

            transaction.set(
                customerRef,
                {
                  ...customer,

                  customerNumber,

                  customerSequence:
                    nextCustomerNumber,

                  active:
                    true,

                  searchTerms:
                    createSearchTerms({
                      ...customer,
                      customerNumber,
                    }),

                  createdBy:
                    user.uid,

                  createdAt:
                    FieldValue.serverTimestamp(),

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );

            transaction.set(
                invoiceSettingsRef,
                {
                  customerPrefix:
                    typeof settings.customerPrefix ===
                      "string" &&
                    settings.customerPrefix.trim() ?
                      settings.customerPrefix.trim() :
                      "OMD-C",

                  nextCustomerNumber:
                    nextCustomerNumber + 1,

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
                {
                  merge: true,
                },
            );

            transaction.set(
                auditRef,
                {
                  action:
                    "CUSTOMER_CREATED",

                  entityType:
                    "customer",

                  entityId:
                    customerRef.id,

                  actorUid:
                    user.uid,

                  actorEmail:
                    user.email,

                  businessId:
                    BUSINESS_ID,

                  details: {
                    customerNumber,
                    name:
                      customer.name,
                  },

                  createdAt:
                    FieldValue.serverTimestamp(),
                },
            );

            return {
              customerId:
                customerRef.id,

              customerNumber,
            };
          },
      );

    return {
      success: true,

      ...result,

      message:
        "Customer created successfully.",
    };
  });

/* ============================================================
   CREATE SUPPLIER
   ============================================================ */

exports.createSupplier =
  onCall(async (request) => {
    const user =
      await requireOwner(request);

    const supplier =
      preparePartyData(
          request.data,
          "Supplier",
      );

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);

    const supplierRef =
      businessRef
          .collection("suppliers")
          .doc();

    const invoiceSettingsRef =
      businessRef
          .collection("settings")
          .doc("invoice");

    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();

    const result =
      await db.runTransaction(
          async (transaction) => {
            const settingsSnapshot =
              await transaction.get(
                  invoiceSettingsRef,
              );

            if (!settingsSnapshot.exists) {
              throw new HttpsError(
                  "failed-precondition",
                  "Numbering settings are missing.",
              );
            }

            const settings =
              settingsSnapshot.data() || {};

            const nextSupplierNumber =
              settings.nextSupplierNumber;

            if (
              !Number.isSafeInteger(
                  nextSupplierNumber,
              ) ||
              nextSupplierNumber <= 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Supplier numbering is not configured correctly.",
              );
            }

            const supplierNumber =
              formatPartyNumber(
                  settings.supplierPrefix,
                  nextSupplierNumber,
                  "OMD-SUP",
              );

            transaction.set(
                supplierRef,
                {
                  ...supplier,

                  supplierNumber,

                  supplierSequence:
                    nextSupplierNumber,

                  active:
                    true,

                  searchTerms:
                    createSearchTerms({
                      ...supplier,
                      supplierNumber,
                    }),

                  createdBy:
                    user.uid,

                  createdAt:
                    FieldValue.serverTimestamp(),

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );

            transaction.set(
                invoiceSettingsRef,
                {
                  supplierPrefix:
                    typeof settings.supplierPrefix ===
                      "string" &&
                    settings.supplierPrefix.trim() ?
                      settings.supplierPrefix.trim() :
                      "OMD-SUP",

                  nextSupplierNumber:
                    nextSupplierNumber + 1,

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
                {
                  merge: true,
                },
            );

            transaction.set(
                auditRef,
                {
                  action:
                    "SUPPLIER_CREATED",

                  entityType:
                    "supplier",

                  entityId:
                    supplierRef.id,

                  actorUid:
                    user.uid,

                  actorEmail:
                    user.email,

                  businessId:
                    BUSINESS_ID,

                  details: {
                    supplierNumber,
                    name:
                      supplier.name,
                  },

                  createdAt:
                    FieldValue.serverTimestamp(),
                },
            );

            return {
              supplierId:
                supplierRef.id,

              supplierNumber,
            };
          },
      );

    return {
      success: true,

      ...result,

      message:
        "Supplier created successfully.",
    };
  });


/* ============================================================
   UPDATE SUPPLIER
   ------------------------------------------------------------
   Owner-only supplier profile update.

   IMPORTANT:
   - Does NOT accept financial values.
   - Does NOT modify purchases.
   - Does NOT modify purchase payments.
   - Does NOT rewrite historical supplier snapshots.
   ============================================================ */

exports.updateSupplier = onCall(
    async (request) => {
      /* =====================================================
           AUTHORIZATION
           ===================================================== */

      const owner =
            await requireOwner(request);


      /* =====================================================
           INPUT
           ===================================================== */

      const input =
            requireObject(
                request.data,
                "Supplier",
            );


      const supplierId =
            validateId(
                input.supplierId,
                "Supplier",
            );


      /* =====================================================
           PROFILE FIELDS ONLY
           ===================================================== */

      const name =
            String(
                input.name ?? "",
            ).trim();


      const mobile =
            String(
                input.mobile ?? "",
            ).trim();


      const email =
            String(
                input.email ?? "",
            )
                .trim()
                .toLowerCase();


      const gstin =
            String(
                input.gstin ?? "",
            )
                .replace(/\s+/g, "")
                .toUpperCase();


      const pan =
            String(
                input.pan ?? "",
            )
                .replace(/\s+/g, "")
                .toUpperCase();


      const address =
            String(
                input.address ?? "",
            ).trim();


      const status =
            String(
                input.status ?? "active",
            )
                .trim()
                .toLowerCase();


      /* =====================================================
           VALIDATION
           ===================================================== */

      if (!name) {
        throw new HttpsError(
            "invalid-argument",
            "Supplier name is required.",
        );
      }


      if (name.length > 160) {
        throw new HttpsError(
            "invalid-argument",
            "Supplier name is too long.",
        );
      }


      if (mobile.length > 30) {
        throw new HttpsError(
            "invalid-argument",
            "Supplier mobile number is too long.",
        );
      }


      if (email.length > 180) {
        throw new HttpsError(
            "invalid-argument",
            "Supplier email is too long.",
        );
      }


      if (
        email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email,
            )
      ) {
        throw new HttpsError(
            "invalid-argument",
            "Enter a valid supplier email address.",
        );
      }


      if (
        gstin &&
            !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
                gstin,
            )
      ) {
        throw new HttpsError(
            "invalid-argument",
            "Enter a valid GSTIN.",
        );
      }


      if (
        pan &&
            !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
                pan,
            )
      ) {
        throw new HttpsError(
            "invalid-argument",
            "Enter a valid PAN.",
        );
      }


      if (address.length > 500) {
        throw new HttpsError(
            "invalid-argument",
            "Supplier address is too long.",
        );
      }


      if (
        status !== "active" &&
            status !== "inactive"
      ) {
        throw new HttpsError(
            "invalid-argument",
            "Supplier status must be active or inactive.",
        );
      }


      /* =====================================================
           REFERENCES
           ===================================================== */

      const db =
            getFirestore();


      const businessRef =
            db
                .collection("businesses")
                .doc(BUSINESS_ID);


      const supplierRef =
            businessRef
                .collection("suppliers")
                .doc(supplierId);


      const auditRef =
            businessRef
                .collection("auditLogs")
                .doc();


      /* =====================================================
           TRANSACTION
           ===================================================== */

      await db.runTransaction(
          async (transaction) => {
            const supplierSnapshot =
                    await transaction.get(
                        supplierRef,
                    );


            if (
              !supplierSnapshot.exists
            ) {
              throw new HttpsError(
                  "not-found",
                  "Supplier not found.",
              );
            }


            const currentSupplier =
                    supplierSnapshot.data() ||
                    {};


            /*
                 * Only these explicitly approved profile fields
                 * are changed.
                 *
                 * Financial/accounting fields cannot be supplied
                 * by the browser because they are never copied
                 * into this update object.
                 */

            const updates = {
              name,
              mobile,
              email,
              gstin,
              pan,
              address,
              status,

              active:
                        status === "active",

              updatedBy:
                        owner.uid,

              updatedAt:
                        FieldValue.serverTimestamp(),
            };


            transaction.update(
                supplierRef,
                updates,
            );


            /* =============================================
                   AUDIT LOG
                   ============================================= */

            transaction.set(
                auditRef,
                {
                  businessId:
                            BUSINESS_ID,

                  action:
                            "SUPPLIER_UPDATED",

                  entityType:
                            "supplier",

                  entityId:
                            supplierId,

                  actorUid:
                            owner.uid,

                  before: {
                    name:
                                String(
                                    currentSupplier.name ??
                                    "",
                                ),

                    mobile:
                                String(
                                    currentSupplier.mobile ??
                                    "",
                                ),

                    email:
                                String(
                                    currentSupplier.email ??
                                    "",
                                ),

                    gstin:
                                String(
                                    currentSupplier.gstin ??
                                    "",
                                ),

                    pan:
                                String(
                                    currentSupplier.pan ??
                                    "",
                                ),

                    address:
                                String(
                                    currentSupplier.address ??
                                    "",
                                ),

                    status:
                                String(
                                    currentSupplier.status ??
                                    (
                                        currentSupplier.active ===
                                        false ?
                                            "inactive" :
                                            "active"
                                    ),
                                ),
                  },

                  after: {
                    name,
                    mobile,
                    email,
                    gstin,
                    pan,
                    address,
                    status,
                  },

                  createdAt:
                            FieldValue.serverTimestamp(),
                },
            );
          },
      );


      /* =====================================================
           RESPONSE
           ===================================================== */

      return {
        success: true,

        supplierId,

        message:
                "Supplier updated successfully.",
      };
    },
);


/* ============================================================
   RECORD SALE RECEIPT
   ============================================================ */

exports.recordSaleReceipt =
  onCall(async (request) => {
    const user =
      await requireOwner(request);

    const input =
      requireObject(
          request.data,
          "Receipt",
      );

    const saleId =
      validateId(
          input.saleId,
          "Sell invoice",
      );

    const amountPaise =
      validatePositivePaise(
          input.amountPaise,
          "Receipt amount",
      );

    const paymentDate =
      parseDateOnlyToTimestamp(
          input.receiptDate,
          "Receipt date",
      );

    const method =
      validateSalePaymentMethod(
          input.method || "cash",
      );

    const reference =
      validateOptionalText(
          input.reference,
          "Reference",
          MAX_PAYMENT_REFERENCE_LENGTH,
      );

    const note =
      validateOptionalText(
          input.note,
          "Note",
          MAX_PAYMENT_NOTE_LENGTH,
      );

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);

    const saleRef =
      businessRef
          .collection("sales")
          .doc(saleId);

    const paymentRef =
      businessRef
          .collection("salePayments")
          .doc();

    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();

    const result =
      await db.runTransaction(
          async (transaction) => {
            const saleSnapshot =
              await transaction.get(
                  saleRef,
              );

            if (!saleSnapshot.exists) {
              throw new HttpsError(
                  "not-found",
                  "Sell invoice not found.",
              );
            }

            const sale =
              saleSnapshot.data();

            const currentStatus =
              String(
                  sale.status || "",
              )
                  .trim()
                  .toLowerCase();

            if (
              currentStatus === "draft" ||
              currentStatus === "cancelled" ||
              currentStatus === "canceled"
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Payments cannot be recorded against this Sell invoice.",
              );
            }

            const customerId =
              validateId(
                  sale.customerId,
                  "Sale customer",
              );

            if (
              !Number.isSafeInteger(
                  sale.grandTotalPaise,
              ) ||
              sale.grandTotalPaise <= 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Sell invoice total is invalid.",
              );
            }

            if (
              !Number.isSafeInteger(
                  sale.receivedPaise,
              ) ||
              sale.receivedPaise < 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Sell received amount is invalid.",
              );
            }

            if (
              !Number.isSafeInteger(
                  sale.balancePaise,
              ) ||
              sale.balancePaise < 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Sell balance is invalid.",
              );
            }

            if (
              sale.receivedPaise +
              sale.balancePaise !==
              sale.grandTotalPaise
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Sell financial totals are inconsistent.",
              );
            }

            if (sale.balancePaise === 0) {
              throw new HttpsError(
                  "failed-precondition",
                  "This Sell invoice is already fully paid.",
              );
            }

            if (
              amountPaise >
              sale.balancePaise
            ) {
              throw new HttpsError(
                  "invalid-argument",
                  "Receipt amount cannot exceed the outstanding balance.",
              );
            }

            const newReceivedPaise =
              sale.receivedPaise +
              amountPaise;

            const newBalancePaise =
              sale.grandTotalPaise -
              newReceivedPaise;

            const newStatus =
              newBalancePaise === 0 ?
                "paid" :
                "partially_paid";

            transaction.set(
                paymentRef,
                {
                  businessId:
                    BUSINESS_ID,

                  saleId:
                    saleRef.id,

                  invoiceNumber:
                    sale.invoiceNumber || "",

                  customerId,

                  customerSnapshot:
                    sale.customerSnapshot || {},

                  amountPaise,

                  paymentDate,

                  method,

                  reference,

                  note,

                  source:
                    "manual_receipt",

                  createdBy:
                    user.uid,

                  createdAt:
                    FieldValue.serverTimestamp(),

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );

            transaction.update(
                saleRef,
                {
                  receivedPaise:
                    newReceivedPaise,

                  balancePaise:
                    newBalancePaise,

                  status:
                    newStatus,

                  updatedBy:
                    user.uid,

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );

            transaction.set(
                auditRef,
                {
                  action:
                    "SALE_RECEIPT_RECORDED",

                  entityType:
                    "sale",

                  entityId:
                    saleRef.id,

                  actorUid:
                    user.uid,

                  actorEmail:
                    user.email,

                  businessId:
                    BUSINESS_ID,

                  details: {
                    paymentId:
                      paymentRef.id,

                    invoiceNumber:
                      sale.invoiceNumber || "",

                    customerId,

                    amountPaise,

                    method,

                    reference,

                    previousReceivedPaise:
                      sale.receivedPaise,

                    previousBalancePaise:
                      sale.balancePaise,

                    receivedPaise:
                      newReceivedPaise,

                    balancePaise:
                      newBalancePaise,

                    status:
                      newStatus,
                  },

                  createdAt:
                    FieldValue.serverTimestamp(),
                },
            );

            return {
              paymentId:
                paymentRef.id,

              saleId:
                saleRef.id,

              invoiceNumber:
                sale.invoiceNumber || "",

              amountPaise,

              receivedPaise:
                newReceivedPaise,

              balancePaise:
                newBalancePaise,

              status:
                newStatus,
            };
          },
      );

    return {
      success:
        true,

      ...result,

      message:
        "Receipt recorded successfully.",
    };
  });


/* ============================================================
   RECORD PURCHASE PAYMENT
   ============================================================ */

exports.recordPurchasePayment =
  onCall(async (request) => {
    const user =
      await requireOwner(request);

    const input =
      requireObject(
          request.data,
          "Purchase payment",
      );

    const purchaseId =
      validateId(
          input.purchaseId,
          "Buy purchase",
      );

    const amountPaise =
      validatePositivePaise(
          input.amountPaise,
          "Payment amount",
      );

    const paymentDate =
      parseDateOnlyToTimestamp(
          input.paymentDate,
          "Payment date",
      );

    const method =
      validateSalePaymentMethod(
          input.method || "cash",
      );

    const reference =
      validateOptionalText(
          input.reference,
          "Reference",
          MAX_PAYMENT_REFERENCE_LENGTH,
      );

    const note =
      validateOptionalText(
          input.note,
          "Note",
          MAX_PAYMENT_NOTE_LENGTH,
      );


    /* --------------------------------------------------------
       REFERENCES
       -------------------------------------------------------- */

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);

    const purchaseRef =
      businessRef
          .collection("purchases")
          .doc(purchaseId);

    const paymentRef =
      businessRef
          .collection("purchasePayments")
          .doc();

    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();


    /* --------------------------------------------------------
       ATOMIC PAYMENT TRANSACTION
       -------------------------------------------------------- */

    const result =
      await db.runTransaction(
          async (transaction) => {
            const purchaseSnapshot =
              await transaction.get(
                  purchaseRef,
              );

            if (!purchaseSnapshot.exists) {
              throw new HttpsError(
                  "not-found",
                  "Buy purchase not found.",
              );
            }


            const purchase =
              purchaseSnapshot.data();


            /* ------------------------------------------------
               STATUS
               ------------------------------------------------ */

            const currentStatus =
              String(
                  purchase.status || "",
              )
                  .trim()
                  .toLowerCase();

            if (
              currentStatus === "draft" ||
              currentStatus === "cancelled" ||
              currentStatus === "canceled"
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Payments cannot be recorded against this Buy purchase.",
              );
            }


            /* ------------------------------------------------
               SUPPLIER
               ------------------------------------------------ */

            const supplierId =
              validateId(
                  purchase.supplierId,
                  "Purchase supplier",
              );


            /* ------------------------------------------------
               VERIFY AUTHORITATIVE FINANCIAL TOTALS
               ------------------------------------------------ */

            if (
              !Number.isSafeInteger(
                  purchase.grandTotalPaise,
              ) ||
              purchase.grandTotalPaise <= 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Buy purchase total is invalid.",
              );
            }


            if (
              !Number.isSafeInteger(
                  purchase.paidPaise,
              ) ||
              purchase.paidPaise < 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Buy paid amount is invalid.",
              );
            }


            if (
              !Number.isSafeInteger(
                  purchase.balancePaise,
              ) ||
              purchase.balancePaise < 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Buy payable balance is invalid.",
              );
            }


            /*
             * Critical integrity check.
             *
             * Paid + Balance must always equal
             * the authoritative purchase total.
             */

            if (
              purchase.paidPaise +
              purchase.balancePaise !==
              purchase.grandTotalPaise
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Buy financial totals are inconsistent.",
              );
            }


            /* ------------------------------------------------
               ALREADY PAID
               ------------------------------------------------ */

            if (purchase.balancePaise === 0) {
              throw new HttpsError(
                  "failed-precondition",
                  "This Buy purchase is already fully paid.",
              );
            }


            /* ------------------------------------------------
               OVERPAYMENT PROTECTION
               ------------------------------------------------ */

            if (
              amountPaise >
              purchase.balancePaise
            ) {
              throw new HttpsError(
                  "invalid-argument",
                  "Payment amount cannot exceed the outstanding payable balance.",
              );
            }


            /* ------------------------------------------------
               NEW AUTHORITATIVE TOTALS
               ------------------------------------------------ */

            const newPaidPaise =
              purchase.paidPaise +
              amountPaise;

            const newBalancePaise =
              purchase.grandTotalPaise -
              newPaidPaise;

            const newStatus =
              newBalancePaise === 0 ?
                "paid" :
                "partially_paid";


            /* ------------------------------------------------
               PAYMENT RECORD
               ------------------------------------------------ */

            transaction.set(
                paymentRef,
                {
                  businessId:
                    BUSINESS_ID,

                  purchaseId:
                    purchaseRef.id,

                  purchaseNumber:
                    purchase.purchaseNumber || "",

                  supplierId,

                  supplierSnapshot:
                    purchase.supplierSnapshot || {},

                  amountPaise,

                  paymentDate,

                  method,

                  reference,

                  note,

                  source:
                    "manual_purchase_payment",

                  createdBy:
                    user.uid,

                  createdAt:
                    FieldValue.serverTimestamp(),

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );


            /* ------------------------------------------------
               UPDATE PURCHASE
               ------------------------------------------------ */

            transaction.update(
                purchaseRef,
                {
                  paidPaise:
                    newPaidPaise,

                  balancePaise:
                    newBalancePaise,

                  status:
                    newStatus,

                  updatedBy:
                    user.uid,

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );


            /* ------------------------------------------------
               AUDIT LOG
               ------------------------------------------------ */

            transaction.set(
                auditRef,
                {
                  action:
                    "PURCHASE_PAYMENT_RECORDED",

                  entityType:
                    "purchase",

                  entityId:
                    purchaseRef.id,

                  actorUid:
                    user.uid,

                  actorEmail:
                    user.email,

                  businessId:
                    BUSINESS_ID,

                  details: {
                    paymentId:
                      paymentRef.id,

                    purchaseNumber:
                      purchase.purchaseNumber || "",

                    supplierId,

                    amountPaise,

                    method,

                    reference,

                    previousPaidPaise:
                      purchase.paidPaise,

                    previousBalancePaise:
                      purchase.balancePaise,

                    paidPaise:
                      newPaidPaise,

                    balancePaise:
                      newBalancePaise,

                    status:
                      newStatus,
                  },

                  createdAt:
                    FieldValue.serverTimestamp(),
                },
            );


            /* ------------------------------------------------
               RESULT
               ------------------------------------------------ */

            return {
              paymentId:
                paymentRef.id,

              purchaseId:
                purchaseRef.id,

              purchaseNumber:
                purchase.purchaseNumber || "",

              amountPaise,

              paidPaise:
                newPaidPaise,

              balancePaise:
                newBalancePaise,

              status:
                newStatus,
            };
          },
      );


    return {
      success:
        true,

      ...result,

      message:
        "Payment recorded successfully.",
    };
  });


/* ============================================================
   CREATE SALE ITEM PREPARATION
   ============================================================ */

function prepareSaleItems(value) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_SALE_ITEMS
  ) {
    throw new HttpsError(
        "invalid-argument",
        `Sell invoice must contain 1-${MAX_SALE_ITEMS} items.`,
    );
  }


  return value.map(
      (rawItem, index) => {
        const item =
          requireObject(
              rawItem,
              `Item ${index + 1}`,
          );


        /* ----------------------------------------------------
           TEXT FIELDS
           ---------------------------------------------------- */

        const material =
          cleanString(
              item.material || "Diamond",
              MAX_ITEM_MATERIAL_LENGTH,
          );


        const description =
          cleanString(
              item.description,
              MAX_ITEM_DESCRIPTION_LENGTH,
          );


        const remarks =
          cleanString(
              item.remarks,
              MAX_ITEM_REMARKS_LENGTH,
          );


        const hsn =
          cleanString(
              item.hsn,
              MAX_HSN_LENGTH,
          );


        if (!material) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} material is required.`,
          );
        }


        if (!description) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} description is required.`,
          );
        }


        /* ----------------------------------------------------
           PIECES
           ---------------------------------------------------- */

        const pieces =
          parsePieces(
              item.pieces,
              `Item ${index + 1} pieces`,
          );


        if (pieces <= 0) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} pieces must be greater than zero.`,
          );
        }


        /* ----------------------------------------------------
           CARAT

           Frontend sends carat as a decimal string.

           We convert it to integer micro-carats:
           9.590 ct -> 9,590,000 micro-carats.

           This prevents floating-point money calculations.
           ---------------------------------------------------- */

        const caratMicros =
          parseDecimal(
              item.carat,
              6,
              `Item ${index + 1} carat`,
              false,
              8,
          );


        /* ----------------------------------------------------
           RATE

           IMPORTANT:
           new-sale.js ALREADY converts rupees to integer paise.

           Example:
           ₹6,300.00 -> 630000

           Therefore the backend must consume ratePaise directly.
           ---------------------------------------------------- */

        const ratePaise =
          item.ratePaise;


        if (
          !Number.isSafeInteger(ratePaise) ||
          ratePaise <= 0
        ) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} rate must be a positive integer amount in paise.`,
          );
        }


        /* ----------------------------------------------------
           GROSS

           caratMicros × ratePaise / 1,000,000

           safeMultiplyRound performs the authoritative rounding
           to the nearest paise.
           ---------------------------------------------------- */

        const grossAmountPaise =
          safeMultiplyRound(
              caratMicros,
              ratePaise,
              1000000,
              `Item ${index + 1} gross amount`,
          );


        if (grossAmountPaise <= 0) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} gross amount must be greater than zero.`,
          );
        }


        /* ----------------------------------------------------
           DISCOUNT %

           Store percentages with THREE decimal places.

           Examples:

           6%       -> 6000
           1.5%     -> 1500
           0.375%   -> 375

           100%     -> 100000

           Denominator:
           100% × 1000 = 100000
           ---------------------------------------------------- */

        const discountMilliPercent =
          item.discountPercent === undefined ||
          item.discountPercent === null ||
          item.discountPercent === "" ?
            0 :
            parseDecimal(
                item.discountPercent,
                3,
                `Item ${index + 1} discount`,
                true,
                3,
            );


        if (discountMilliPercent > 100000) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} discount cannot exceed 100%.`,
          );
        }


        const discountPaise =
          safeMultiplyRound(
              grossAmountPaise,
              discountMilliPercent,
              100000,
              `Item ${index + 1} discount amount`,
          );


        const amountPaise =
          grossAmountPaise -
          discountPaise;


        if (amountPaise <= 0) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} amount must be greater than zero.`,
          );
        }


        /* ----------------------------------------------------
           TAX %

           Same 3-decimal percentage representation.

           Examples:

           3%       -> 3000
           0.375%   -> 375
           18%      -> 18000
           ---------------------------------------------------- */

        const taxMilliPercent =
          item.taxPercent === undefined ||
          item.taxPercent === null ||
          item.taxPercent === "" ?
            0 :
            parseDecimal(
                item.taxPercent,
                3,
                `Item ${index + 1} tax`,
                true,
                3,
            );


        if (taxMilliPercent > 100000) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} tax cannot exceed 100%.`,
          );
        }


        const taxPaise =
          safeMultiplyRound(
              amountPaise,
              taxMilliPercent,
              100000,
              `Item ${index + 1} tax amount`,
          );


        const totalPaise =
          safeMoneyAdd(
              amountPaise,
              taxPaise,
              `Item ${index + 1} total`,
          );


        /* ----------------------------------------------------
           HISTORICAL ITEM SNAPSHOT

           All authoritative calculated values are stored.

           We also retain normalized human-readable percentage
           strings supplied by the frontend for invoice display.
           ---------------------------------------------------- */

        return {
          material,
          description,
          remarks,
          hsn,

          pieces,

          carat:
            String(item.carat),

          caratMicros,

          ratePaise,

          discountPercent:
            item.discountPercent === undefined ||
            item.discountPercent === null ||
            item.discountPercent === "" ?
              "0" :
              String(item.discountPercent),

          discountMilliPercent,

          grossAmountPaise,

          discountPaise,

          amountPaise,

          taxPercent:
            item.taxPercent === undefined ||
            item.taxPercent === null ||
            item.taxPercent === "" ?
              "0" :
              String(item.taxPercent),

          taxMilliPercent,

          taxPaise,

          totalPaise,
        };
      },
  );
}


/* ============================================================
   CREATE PURCHASE ITEM PREPARATION
   ============================================================

   Purchase items use the same diamond calculation model as
   Sell items.

   IMPORTANT:
   The backend remains authoritative for:
   - carat
   - rate
   - discount
   - tax
   - amount
   - total
   ============================================================ */

function preparePurchaseItems(value) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_SALE_ITEMS
  ) {
    throw new HttpsError(
        "invalid-argument",
        `Purchase must contain 1-${MAX_SALE_ITEMS} items.`,
    );
  }


  return value.map(
      (rawItem, index) => {
        const item =
          requireObject(
              rawItem,
              `Item ${index + 1}`,
          );


        /* ----------------------------------------------------
           TEXT
           ---------------------------------------------------- */

        const material =
          cleanString(
              item.material || "Diamond",
              MAX_ITEM_MATERIAL_LENGTH,
          );


        const description =
          cleanString(
              item.description,
              MAX_ITEM_DESCRIPTION_LENGTH,
          );


        const remarks =
          cleanString(
              item.remarks,
              MAX_ITEM_REMARKS_LENGTH,
          );


        const hsn =
          cleanString(
              item.hsn,
              MAX_HSN_LENGTH,
          );


        if (!material) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} material is required.`,
          );
        }


        if (!description) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} description is required.`,
          );
        }


        /* ----------------------------------------------------
           PIECES
           ---------------------------------------------------- */

        const pieces =
          parsePieces(
              item.pieces,
              `Item ${index + 1} pieces`,
          );


        if (pieces <= 0) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} pieces must be greater than zero.`,
          );
        }


        /* ----------------------------------------------------
           CARAT
           ---------------------------------------------------- */

        const caratMicros =
          parseDecimal(
              item.carat,
              6,
              `Item ${index + 1} carat`,
              false,
              8,
          );


        /* ----------------------------------------------------
           RATE

           Frontend sends integer paise.
           ---------------------------------------------------- */

        const ratePaise =
          item.ratePaise;


        if (
          !Number.isSafeInteger(ratePaise) ||
          ratePaise <= 0
        ) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} rate must be a positive integer amount in paise.`,
          );
        }


        /* ----------------------------------------------------
           GROSS
           ---------------------------------------------------- */

        const grossAmountPaise =
          safeMultiplyRound(
              caratMicros,
              ratePaise,
              1000000,
              `Item ${index + 1} gross amount`,
          );


        if (grossAmountPaise <= 0) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} gross amount must be greater than zero.`,
          );
        }


        /* ----------------------------------------------------
           DISCOUNT
           ---------------------------------------------------- */

        const discountMilliPercent =
          item.discountPercent === undefined ||
          item.discountPercent === null ||
          item.discountPercent === "" ?
            0 :
            parseDecimal(
                item.discountPercent,
                3,
                `Item ${index + 1} discount`,
                true,
                3,
            );


        if (discountMilliPercent > 100000) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} discount cannot exceed 100%.`,
          );
        }


        const discountPaise =
          safeMultiplyRound(
              grossAmountPaise,
              discountMilliPercent,
              100000,
              `Item ${index + 1} discount amount`,
          );


        const amountPaise =
          grossAmountPaise -
          discountPaise;


        if (amountPaise <= 0) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} amount must be greater than zero.`,
          );
        }


        /* ----------------------------------------------------
           TAX
           ---------------------------------------------------- */

        const taxMilliPercent =
          item.taxPercent === undefined ||
          item.taxPercent === null ||
          item.taxPercent === "" ?
            0 :
            parseDecimal(
                item.taxPercent,
                3,
                `Item ${index + 1} tax`,
                true,
                3,
            );


        if (taxMilliPercent > 100000) {
          throw new HttpsError(
              "invalid-argument",
              `Item ${index + 1} tax cannot exceed 100%.`,
          );
        }


        const taxPaise =
          safeMultiplyRound(
              amountPaise,
              taxMilliPercent,
              100000,
              `Item ${index + 1} tax amount`,
          );


        const totalPaise =
          safeMoneyAdd(
              amountPaise,
              taxPaise,
              `Item ${index + 1} total`,
          );


        /* ----------------------------------------------------
           AUTHORITATIVE PURCHASE ITEM
           ---------------------------------------------------- */

        return {
          material,
          description,
          remarks,
          hsn,

          pieces,

          carat:
            String(item.carat),

          caratMicros,

          ratePaise,

          discountPercent:
            item.discountPercent === undefined ||
            item.discountPercent === null ||
            item.discountPercent === "" ?
              "0" :
              String(item.discountPercent),

          discountMilliPercent,

          grossAmountPaise,

          discountPaise,

          amountPaise,

          taxPercent:
            item.taxPercent === undefined ||
            item.taxPercent === null ||
            item.taxPercent === "" ?
              "0" :
              String(item.taxPercent),

          taxMilliPercent,

          taxPaise,

          totalPaise,
        };
      },
  );
}


/* ============================================================
   PURCHASE NUMBER
   ============================================================ */

function formatPurchaseNumber(
    prefix,
    number,
) {
  if (
    !Number.isSafeInteger(number) ||
    number <= 0
  ) {
    throw new HttpsError(
        "failed-precondition",
        "Buy numbering is invalid.",
    );
  }


  const safePrefix =
    typeof prefix === "string" &&
    prefix.trim() ?
      prefix.trim() :
      "OMD-B";


  return `${safePrefix}-${String(number).padStart(4, "0")}`;
}


/* ============================================================
   SUPPLIER HISTORICAL SNAPSHOT
   ============================================================ */

function supplierHistorySnapshot(supplier) {
  return {
    name:
      cleanString(
          supplier.name,
          MAX_NAME_LENGTH,
      ),

    mobile:
      normalizeMobile(
          supplier.mobile,
      ),

    email:
      normalizeEmail(
          supplier.email,
      ),

    address:
      cleanString(
          supplier.address,
          MAX_ADDRESS_LENGTH,
      ),

    gstin:
      normalizeGstin(
          supplier.gstin,
      ),
  };
}


/* ============================================================
   SALE NUMBER
   ============================================================ */

function formatSaleNumber(
    prefix,
    number,
) {
  if (
    !Number.isSafeInteger(number) ||
    number <= 0
  ) {
    throw new HttpsError(
        "failed-precondition",
        "Sell invoice numbering is invalid.",
    );
  }

  const safePrefix =
    typeof prefix === "string" &&
    prefix.trim() ?
      prefix.trim() :
      "OMD-S";

  return `${safePrefix}-${String(number).padStart(4, "0")}`;
}

/* ============================================================
   HISTORICAL SNAPSHOTS
   ============================================================ */

function customerHistorySnapshot(customer) {
  return {
    name:
      cleanString(
          customer.name,
          MAX_NAME_LENGTH,
      ),

    mobile:
      normalizeMobile(
          customer.mobile,
      ),

    email:
      normalizeEmail(
          customer.email,
      ),

    address:
      cleanString(
          customer.address,
          MAX_ADDRESS_LENGTH,
      ),

    gstin:
      normalizeGstin(
          customer.gstin,
      ),
  };
}

function businessHistorySnapshot(
    business,
    settings,
) {
  return {
    name:
      cleanString(
          settings.businessName ||
          business.name ||
          BUSINESS_NAME,
          MAX_NAME_LENGTH,
      ),

    address:
      cleanString(
          settings.address,
          MAX_ADDRESS_LENGTH,
      ),

    mobile:
      normalizeMobile(
          settings.mobile,
      ),

    email:
      normalizeEmail(
          settings.email,
      ),

    gstin:
      normalizeGstin(
          settings.gstin,
      ),

    logoUrl:
      typeof settings.logoUrl === "string" ?
        settings.logoUrl
            .trim()
            .slice(0, 2000) :
        "",

    currency:
      typeof business.currency === "string" &&
      business.currency.trim() ?
        business.currency.trim() :
        "INR",

    timezone:
      typeof business.timezone === "string" &&
      business.timezone.trim() ?
        business.timezone.trim() :
        "Asia/Kolkata",
  };
}

/* ============================================================
   CREATE SALE
   ============================================================ */

exports.createSale =
  onCall(async (request) => {
    const user =
      await requireOwner(request);

    const input =
      requireObject(
          request.data,
          "Sell invoice",
      );

    /* --------------------------------------------------------
       IDEMPOTENCY
       -------------------------------------------------------- */

    const clientRequestId =
      validateClientRequestId(
          input.clientRequestId,
      );

    /* --------------------------------------------------------
       CUSTOMER
       -------------------------------------------------------- */

    const customerId =
      validateId(
          input.customerId,
          "Customer",
      );

    /* --------------------------------------------------------
       CASH / CREDIT
       -------------------------------------------------------- */

    const saleType =
      typeof input.saleType === "string" ?
        input.saleType
            .trim()
            .toLowerCase() :
        "";

    if (
      saleType !== "cash" &&
      saleType !== "credit"
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Sell type must be cash or credit.",
      );
    }

    const saveAsDraft =
      input.saveAsDraft === true;

    /* --------------------------------------------------------
       INVOICE DATE
       -------------------------------------------------------- */

    const invoiceDate =
      parseDateOnlyToTimestamp(
          input.invoiceDate,
          "Invoice date",
      );

    /* --------------------------------------------------------
       DUE DATE
       -------------------------------------------------------- */

    let dueDate =
      null;

    if (saleType === "credit") {
      dueDate =
        parseDateOnlyToTimestamp(
            input.dueDate,
            "Due date",
        );

      if (
        dateKey(dueDate) <
        dateKey(invoiceDate)
      ) {
        throw new HttpsError(
            "invalid-argument",
            "Due date cannot be before the invoice date.",
        );
      }
    }

    /*
     * Cash Sell intentionally has no due date.
     */

    if (saleType === "cash") {
      dueDate = null;
    }

    /* --------------------------------------------------------
       BROKER
       -------------------------------------------------------- */

    const broker =
      validateOptionalText(
          input.broker,
          "Broker",
          MAX_BROKER_LENGTH,
      );

    /* --------------------------------------------------------
       ITEMS
       -------------------------------------------------------- */

    const items =
      prepareSaleItems(
          input.items,
      );

    let subtotalPaise =
      0;

    let taxPaise =
      0;

    let lineGrandTotalPaise =
      0;

    let totalPieces =
      0;

    let totalCaratMicros =
      0;

    for (const item of items) {
      subtotalPaise =
        safeMoneyAdd(
            subtotalPaise,
            item.amountPaise,
            "Subtotal",
        );

      taxPaise =
        safeMoneyAdd(
            taxPaise,
            item.taxPaise,
            "Tax total",
        );

      lineGrandTotalPaise =
        safeMoneyAdd(
            lineGrandTotalPaise,
            item.totalPaise,
            "Line total",
        );

      totalPieces +=
        item.pieces;

      totalCaratMicros +=
        item.caratMicros;

      if (
        !Number.isSafeInteger(totalPieces) ||
        !Number.isSafeInteger(totalCaratMicros)
      ) {
        throw new HttpsError(
            "invalid-argument",
            "Invoice quantity is too large.",
        );
      }
    }

    /* --------------------------------------------------------
       INVOICE ADJUSTMENTS

       Frontend sends integer paise for these fields.

       This matches the new-sale.js model we already created.
       -------------------------------------------------------- */

    const discountPaise =
      input.discountPaise === undefined ?
        0 :
        input.discountPaise;

    const chargesPaise =
      input.chargesPaise === undefined ?
        0 :
        input.chargesPaise;

    const roundOffPaise =
      input.roundOffPaise === undefined ?
        0 :
        input.roundOffPaise;

    if (
      !Number.isSafeInteger(discountPaise) ||
      discountPaise < 0
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Invoice discount must be a valid integer amount in paise.",
      );
    }

    if (
      !Number.isSafeInteger(chargesPaise) ||
      chargesPaise < 0
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Additional charges must be a valid integer amount in paise.",
      );
    }

    if (!Number.isSafeInteger(roundOffPaise)) {
      throw new HttpsError(
          "invalid-argument",
          "Round off must be a valid integer amount in paise.",
      );
    }

    if (
      discountPaise >
      lineGrandTotalPaise +
      chargesPaise
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Invoice discount is too large.",
      );
    }

    const grandTotalPaise =
      lineGrandTotalPaise -
      discountPaise +
      chargesPaise +
      roundOffPaise;

    if (
      !Number.isSafeInteger(
          grandTotalPaise,
      ) ||
      grandTotalPaise <= 0
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Grand total must be greater than zero.",
      );
    }

    /* --------------------------------------------------------
       NOTES / DECLARATION
       -------------------------------------------------------- */

    const notes =
      validateOptionalText(
          input.notes,
          "Notes",
          MAX_SALE_NOTES_LENGTH,
      );

    const declaration =
      validateOptionalText(
          input.declaration,
          "Declaration",
          MAX_DECLARATION_LENGTH,
      );

    /* --------------------------------------------------------
       INITIAL RECEIPT
       -------------------------------------------------------- */

    const initialPayment =
      input.initialPayment &&
      typeof input.initialPayment === "object" &&
      !Array.isArray(input.initialPayment) ?
        input.initialPayment :
        {};

    let initialReceiptPaise =
      0;

    let paymentDate =
      null;

    let paymentMethod =
      "";

    let paymentReference =
      "";

    /*
     * Drafts do not create payment records.
     */

    if (!saveAsDraft) {
      if (saleType === "cash") {
        /*
         * Cash Sell is always fully settled.
         * Browser cannot create a partially-paid Cash Sell.
         */

        initialReceiptPaise =
          grandTotalPaise;

        paymentMethod =
          validateSalePaymentMethod(
              initialPayment.method ||
              "cash",
          );

        paymentDate =
          initialPayment.paymentDate ?
            parseDateOnlyToTimestamp(
                initialPayment.paymentDate,
                "Receipt date",
            ) :
            invoiceDate;

        paymentReference =
          validateOptionalText(
              initialPayment.reference,
              "Payment reference",
              MAX_PAYMENT_REFERENCE_LENGTH,
          );
      } else {
        /*
         * Credit Sell can start unpaid,
         * partially paid or fully paid.
         */

        const requestedAmount =
          initialPayment.amountPaise ??
          0;

        if (
          !Number.isSafeInteger(
              requestedAmount,
          ) ||
          requestedAmount < 0
        ) {
          throw new HttpsError(
              "invalid-argument",
              "Initial receipt must be a valid integer amount in paise.",
          );
        }

        if (
          requestedAmount >
          grandTotalPaise
        ) {
          throw new HttpsError(
              "invalid-argument",
              "Initial receipt cannot exceed the invoice total.",
          );
        }

        initialReceiptPaise =
          requestedAmount;

        if (initialReceiptPaise > 0) {
          paymentMethod =
            validateSalePaymentMethod(
                initialPayment.method ||
                "cash",
            );

          paymentDate =
            parseDateOnlyToTimestamp(
                initialPayment.paymentDate,
                "Receipt date",
            );

          paymentReference =
            validateOptionalText(
                initialPayment.reference,
                "Payment reference",
                MAX_PAYMENT_REFERENCE_LENGTH,
            );
        }
      }
    }

    /* --------------------------------------------------------
       REFERENCES
       -------------------------------------------------------- */

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);

    /*
     * Deterministic document ID gives us retry protection.
     */

    const saleRef =
      businessRef
          .collection("sales")
          .doc(clientRequestId);

    const customerRef =
      businessRef
          .collection("customers")
          .doc(customerId);

    const businessSettingsRef =
      businessRef
          .collection("settings")
          .doc("business");

    const invoiceSettingsRef =
      businessRef
          .collection("settings")
          .doc("invoice");

    const paymentRef =
      businessRef
          .collection("salePayments")
          .doc();

    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();

    /* --------------------------------------------------------
       ATOMIC TRANSACTION
       -------------------------------------------------------- */

    const result =
      await db.runTransaction(
          async (transaction) => {
            /*
             * Firestore transaction reads must happen
             * before transaction writes.
             */

            const [
              existingSaleSnapshot,
              businessSnapshot,
              customerSnapshot,
              businessSettingsSnapshot,
              invoiceSettingsSnapshot,
            ] =
              await Promise.all([
                transaction.get(
                    saleRef,
                ),

                transaction.get(
                    businessRef,
                ),

                transaction.get(
                    customerRef,
                ),

                transaction.get(
                    businessSettingsRef,
                ),

                transaction.get(
                    invoiceSettingsRef,
                ),
              ]);

            /* ------------------------------------------------
               IDEMPOTENT RETRY
               ------------------------------------------------ */

            if (existingSaleSnapshot.exists) {
              const existing =
                existingSaleSnapshot.data();

              if (
                existing.clientRequestId !==
                clientRequestId ||
                existing.createdBy !==
                user.uid
              ) {
                throw new HttpsError(
                    "already-exists",
                    "This Sell request ID is already in use.",
                );
              }

              return {
                idempotent:
                  true,

                saleId:
                  saleRef.id,

                invoiceNumber:
                  String(
                      existing.invoiceNumber ||
                      "",
                  ),

                grandTotalPaise:
                  existing.grandTotalPaise,

                receivedPaise:
                  existing.receivedPaise,

                balancePaise:
                  existing.balancePaise,

                status:
                  existing.status,
              };
            }

            /* ------------------------------------------------
               BUSINESS
               ------------------------------------------------ */

            if (!businessSnapshot.exists) {
              throw new HttpsError(
                  "failed-precondition",
                  "Business does not exist.",
              );
            }

            const business =
              businessSnapshot.data();

            if (business.active !== true) {
              throw new HttpsError(
                  "failed-precondition",
                  "Business is not active.",
              );
            }

            /* ------------------------------------------------
               CUSTOMER
               ------------------------------------------------ */

            if (!customerSnapshot.exists) {
              throw new HttpsError(
                  "not-found",
                  "Customer not found.",
              );
            }

            const customer =
              customerSnapshot.data();

            if (customer.active !== true) {
              throw new HttpsError(
                  "failed-precondition",
                  "The selected customer is not active.",
              );
            }

            /* ------------------------------------------------
               SETTINGS
               ------------------------------------------------ */

            const businessSettings =
              businessSettingsSnapshot.exists ?
                businessSettingsSnapshot.data() :
                {};

            const invoiceSettings =
              invoiceSettingsSnapshot.exists ?
                invoiceSettingsSnapshot.data() :
                {};

            const nextSaleNumber =
              invoiceSettings.nextSaleNumber;

            if (
              !Number.isSafeInteger(
                  nextSaleNumber,
              ) ||
              nextSaleNumber <= 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Sell invoice numbering is not configured correctly.",
              );
            }

            const invoiceNumber =
              formatSaleNumber(
                  invoiceSettings.salePrefix,
                  nextSaleNumber,
              );

            /* ------------------------------------------------
               BALANCE / STATUS
               ------------------------------------------------ */

            const receivedPaise =
              saveAsDraft ?
                0 :
                initialReceiptPaise;

            const balancePaise =
              grandTotalPaise -
              receivedPaise;

            let status;

            if (saveAsDraft) {
              status =
                "draft";
            } else if (
              balancePaise === 0
            ) {
              status =
                "paid";
            } else if (
              receivedPaise > 0
            ) {
              status =
                "partially_paid";
            } else {
              status =
                "pending";
            }

            /* ------------------------------------------------
               HISTORICAL SNAPSHOTS
               ------------------------------------------------ */

            const customerSnapshotData =
              customerHistorySnapshot(
                  customer,
              );

            const businessSnapshotData =
              businessHistorySnapshot(
                  business,
                  businessSettings,
              );

            /* ------------------------------------------------
               SALE
               ------------------------------------------------ */

            transaction.set(
                saleRef,
                {
                  businessId:
                    BUSINESS_ID,

                  clientRequestId,

                  invoiceNumber,

                  invoiceSequence:
                    nextSaleNumber,

                  customerId,

                  customerSnapshot:
                    customerSnapshotData,

                  businessSnapshot:
                    businessSnapshotData,

                  saleType,

                  invoiceDate,

                  dueDate,

                  broker,

                  items,

                  totalPieces,

                  totalCaratMicros,

                  subtotalPaise,

                  taxPaise,

                  lineGrandTotalPaise,

                  discountPaise,

                  chargesPaise,

                  roundOffPaise,

                  grandTotalPaise,

                  receivedPaise,

                  balancePaise,

                  status,

                  notes,

                  declaration,

                  createdBy:
                    user.uid,

                  updatedBy:
                    user.uid,

                  createdAt:
                    FieldValue.serverTimestamp(),

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );

            /* ------------------------------------------------
               NUMBER COUNTER
               ------------------------------------------------ */

            transaction.set(
                invoiceSettingsRef,
                {
                  salePrefix:
                    typeof invoiceSettings.salePrefix ===
                      "string" &&
                    invoiceSettings.salePrefix.trim() ?
                      invoiceSettings.salePrefix.trim() :
                      "OMD-S",

                  nextSaleNumber:
                    nextSaleNumber + 1,

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
                {
                  merge:
                    true,
                },
            );

            /* ------------------------------------------------
               INITIAL PAYMENT
               ------------------------------------------------ */

            if (
              !saveAsDraft &&
              initialReceiptPaise > 0
            ) {
              transaction.set(
                  paymentRef,
                  {
                    businessId:
                      BUSINESS_ID,

                    saleId:
                      saleRef.id,

                    invoiceNumber,

                    customerId,

                    customerSnapshot:
                      customerSnapshotData,

                    amountPaise:
                      initialReceiptPaise,

                    paymentDate,

                    method:
                      paymentMethod,

                    reference:
                      paymentReference,

                    note:
                      "",

                    source:
                      "sale_creation",

                    createdBy:
                      user.uid,

                    createdAt:
                      FieldValue.serverTimestamp(),

                    updatedAt:
                      FieldValue.serverTimestamp(),
                  },
              );
            }

            /* ------------------------------------------------
               AUDIT
               ------------------------------------------------ */

            transaction.set(
                auditRef,
                {
                  action:
                    saveAsDraft ?
                      "SALE_DRAFT_CREATED" :
                      "SALE_CREATED",

                  entityType:
                    "sale",

                  entityId:
                    saleRef.id,

                  actorUid:
                    user.uid,

                  actorEmail:
                    user.email,

                  businessId:
                    BUSINESS_ID,

                  details: {
                    invoiceNumber,

                    customerId,

                    saleType,

                    invoiceDate,

                    dueDate,

                    subtotalPaise,

                    taxPaise,

                    discountPaise,

                    chargesPaise,

                    roundOffPaise,

                    grandTotalPaise,

                    receivedPaise,

                    balancePaise,

                    status,

                    initialPaymentId:
                      !saveAsDraft &&
                      initialReceiptPaise > 0 ?
                        paymentRef.id :
                        null,
                  },

                  createdAt:
                    FieldValue.serverTimestamp(),
                },
            );

            return {
              idempotent:
                false,

              saleId:
                saleRef.id,

              invoiceNumber,

              grandTotalPaise,

              receivedPaise,

              balancePaise,

              status,

              paymentId:
                !saveAsDraft &&
                initialReceiptPaise > 0 ?
                  paymentRef.id :
                  null,
            };
          },
      );

    return {
      success:
        true,

      ...result,

      message:
        result.idempotent ?
          "Sell invoice already created." :
          saveAsDraft ?
            "Sell draft created successfully." :
            "Sell invoice created successfully.",
    };
  });


/* ============================================================
   UPDATE BUSINESS PROFILE
   ============================================================

   Trusted owner-only business profile update.

   IMPORTANT:
   - Browser cannot directly authorize this operation.
   - Historical Sale / Purchase snapshots are NOT modified.
   - Changes affect future transaction snapshots only.
   - Invoice numbering settings are NOT editable here.
   ============================================================ */

exports.updateBusinessProfile =
  onCall(async (request) => {
    const user =
      await requireOwner(request);


    /* --------------------------------------------------------
       INPUT
       -------------------------------------------------------- */

    const input =
      request.data &&
      typeof request.data === "object" ?
        request.data :
        {};


    /* --------------------------------------------------------
       LOCAL CLEANING HELPERS

       These intentionally live inside the callable so they do
       not interfere with existing backend helpers.
       -------------------------------------------------------- */

    const cleanProfileString = (
        value,
        maxLength,
    ) => {
      const result =
        String(value ?? "")
            .trim();

      if (result.length > maxLength) {
        throw new HttpsError(
            "invalid-argument",
            `A profile field exceeds the maximum length of ${maxLength} characters.`,
        );
      }

      return result;
    };


    const businessName =
      cleanProfileString(
          input.businessName,
          120,
      );

    const ownerName =
      cleanProfileString(
          input.ownerName,
          120,
      );

    const mobile =
      cleanProfileString(
          input.mobile,
          20,
      );

    const email =
      cleanProfileString(
          input.email,
          160,
      ).toLowerCase();

    const address =
      cleanProfileString(
          input.address,
          500,
      );

    const gstin =
      cleanProfileString(
          input.gstin,
          15,
      ).toUpperCase();

    const pan =
      cleanProfileString(
          input.pan,
          10,
      ).toUpperCase();

    const state =
      cleanProfileString(
          input.state,
          80,
      );

    const stateCode =
      cleanProfileString(
          input.stateCode,
          2,
      );

    const bankName =
      cleanProfileString(
          input.bankName,
          120,
      );

    const accountHolder =
      cleanProfileString(
          input.accountHolder,
          120,
      );

    const accountNumber =
      cleanProfileString(
          input.accountNumber,
          34,
      );

    const ifsc =
      cleanProfileString(
          input.ifsc,
          11,
      ).toUpperCase();

    const bankBranch =
      cleanProfileString(
          input.bankBranch,
          120,
      );

    const upiId =
      cleanProfileString(
          input.upiId,
          120,
      );

    const logoUrl =
      cleanProfileString(
          input.logoUrl,
          500,
      );


    /* --------------------------------------------------------
       REQUIRED BUSINESS NAME
       -------------------------------------------------------- */

    if (!businessName) {
      throw new HttpsError(
          "invalid-argument",
          "Business name is required.",
      );
    }


    /* --------------------------------------------------------
       EMAIL
       -------------------------------------------------------- */

    if (email) {
      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        throw new HttpsError(
            "invalid-argument",
            "Enter a valid business email address.",
        );
      }
    }


    /* --------------------------------------------------------
       GSTIN

       GSTIN is optional, but when supplied it must match the
       standard 15-character structure.
       -------------------------------------------------------- */

    if (gstin) {
      const gstinPattern =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

      if (!gstinPattern.test(gstin)) {
        throw new HttpsError(
            "invalid-argument",
            "Enter a valid GSTIN.",
        );
      }
    }


    /* --------------------------------------------------------
       PAN
       -------------------------------------------------------- */

    if (pan) {
      const panPattern =
        /^[A-Z]{5}[0-9]{4}[A-Z]$/;

      if (!panPattern.test(pan)) {
        throw new HttpsError(
            "invalid-argument",
            "Enter a valid PAN.",
        );
      }
    }


    /* --------------------------------------------------------
       STATE CODE
       -------------------------------------------------------- */

    if (
      stateCode &&
      !/^[0-9]{2}$/.test(stateCode)
    ) {
      throw new HttpsError(
          "invalid-argument",
          "State code must contain exactly 2 digits.",
      );
    }


    /* --------------------------------------------------------
       IFSC
       -------------------------------------------------------- */

    if (ifsc) {
      const ifscPattern =
        /^[A-Z]{4}0[A-Z0-9]{6}$/;

      if (!ifscPattern.test(ifsc)) {
        throw new HttpsError(
            "invalid-argument",
            "Enter a valid IFSC code.",
        );
      }
    }


    /* --------------------------------------------------------
       LOGO URL

       Only HTTPS URLs are accepted.
       -------------------------------------------------------- */

    if (logoUrl) {
      let parsedUrl;

      try {
        parsedUrl =
          new URL(logoUrl);
      } catch (error) {
        throw new HttpsError(
            "invalid-argument",
            "Enter a valid logo URL.",
        );
      }

      if (parsedUrl.protocol !== "https:") {
        throw new HttpsError(
            "invalid-argument",
            "Logo URL must use HTTPS.",
        );
      }
    }


    /* --------------------------------------------------------
       DOCUMENT REFERENCES
       -------------------------------------------------------- */

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);

    const businessSettingsRef =
      businessRef
          .collection("settings")
          .doc("business");

    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();


    /* --------------------------------------------------------
       TRUSTED PROFILE DATA
       -------------------------------------------------------- */

    const profile = {
      businessName,
      ownerName,

      mobile,
      email,

      address,

      gstin,
      pan,

      state,
      stateCode,

      bankName,
      accountHolder,
      accountNumber,
      ifsc,
      bankBranch,
      upiId,

      logoUrl,
    };


    /* --------------------------------------------------------
       ATOMIC UPDATE
       -------------------------------------------------------- */

    const batch =
      db.batch();


    /*
     * Keep the root business document small.
     *
     * Root fields are useful throughout the portal, while the
     * complete invoice/business identity remains in
     * settings/business.
     */

    batch.set(
        businessRef,
        {
          name:
            businessName,

          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        },
    );


    batch.set(
        businessSettingsRef,
        {
          ...profile,

          updatedBy:
            user.uid,

          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        },
    );


    /* --------------------------------------------------------
       AUDIT
       -------------------------------------------------------- */

    batch.set(
        auditRef,
        {
          action:
            "BUSINESS_PROFILE_UPDATED",

          entityType:
            "business",

          entityId:
            BUSINESS_ID,

          actorUid:
            user.uid,

          actorEmail:
            user.email,

          /*
           * Do not copy bank account numbers into the audit log.
           */

          details: {
            businessName,
            gstin,
            state,
          },

          createdAt:
            FieldValue.serverTimestamp(),
        },
    );


    await batch.commit();


    return {
      success: true,

      message:
        "Business profile updated successfully.",
    };
  });

/* ============================================================
   CREATE PURCHASE
   ============================================================ */

exports.createPurchase =
  onCall(async (request) => {
    const user =
      await requireOwner(request);


    const input =
      requireObject(
          request.data,
          "Buy purchase",
      );


    /* --------------------------------------------------------
       IDEMPOTENCY
       -------------------------------------------------------- */

    const clientRequestId =
      validateClientRequestId(
          input.clientRequestId,
      );


    /* --------------------------------------------------------
       SUPPLIER
       -------------------------------------------------------- */

    const supplierId =
      validateId(
          input.supplierId,
          "Supplier",
      );


    /* --------------------------------------------------------
       CASH / CREDIT
       -------------------------------------------------------- */

    const purchaseType =
      typeof input.purchaseType === "string" ?
        input.purchaseType
            .trim()
            .toLowerCase() :
        "";


    if (
      purchaseType !== "cash" &&
      purchaseType !== "credit"
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Buy type must be cash or credit.",
      );
    }


    const saveAsDraft =
      input.saveAsDraft === true;


    /* --------------------------------------------------------
       PURCHASE DATE
       -------------------------------------------------------- */

    const purchaseDate =
      parseDateOnlyToTimestamp(
          input.purchaseDate,
          "Purchase date",
      );


    /* --------------------------------------------------------
       DUE DATE

       Credit Buy:
       - manually selected
       - required
       - cannot be before purchase date

       Cash Buy:
       - always null
       -------------------------------------------------------- */

    let dueDate =
      null;


    if (purchaseType === "credit") {
      dueDate =
        parseDateOnlyToTimestamp(
            input.dueDate,
            "Due date",
        );


      if (
        dateKey(dueDate) <
        dateKey(purchaseDate)
      ) {
        throw new HttpsError(
            "invalid-argument",
            "Due date cannot be before the purchase date.",
        );
      }
    }


    if (purchaseType === "cash") {
      dueDate = null;
    }


    /* --------------------------------------------------------
       SUPPLIER INVOICE NUMBER
       -------------------------------------------------------- */

    const supplierInvoiceNumber =
      validateOptionalText(
          input.supplierInvoiceNumber,
          "Supplier invoice number",
          120,
      );


    /* --------------------------------------------------------
       BROKER
       -------------------------------------------------------- */

    const broker =
      validateOptionalText(
          input.broker,
          "Broker",
          MAX_BROKER_LENGTH,
      );


    /* --------------------------------------------------------
       ITEMS
       -------------------------------------------------------- */

    const items =
      preparePurchaseItems(
          input.items,
      );


    let subtotalPaise =
      0;

    let taxPaise =
      0;

    let lineGrandTotalPaise =
      0;

    let totalPieces =
      0;

    let totalCaratMicros =
      0;


    for (const item of items) {
      subtotalPaise =
        safeMoneyAdd(
            subtotalPaise,
            item.amountPaise,
            "Subtotal",
        );


      taxPaise =
        safeMoneyAdd(
            taxPaise,
            item.taxPaise,
            "Tax total",
        );


      lineGrandTotalPaise =
        safeMoneyAdd(
            lineGrandTotalPaise,
            item.totalPaise,
            "Line total",
        );


      totalPieces +=
        item.pieces;


      totalCaratMicros +=
        item.caratMicros;


      if (
        !Number.isSafeInteger(totalPieces) ||
        !Number.isSafeInteger(totalCaratMicros)
      ) {
        throw new HttpsError(
            "invalid-argument",
            "Purchase quantity is too large.",
        );
      }
    }


    /* --------------------------------------------------------
       PURCHASE ADJUSTMENTS

       Frontend sends integer paise.
       -------------------------------------------------------- */

    const discountPaise =
      input.discountPaise === undefined ?
        0 :
        input.discountPaise;


    const chargesPaise =
      input.chargesPaise === undefined ?
        0 :
        input.chargesPaise;


    const roundOffPaise =
      input.roundOffPaise === undefined ?
        0 :
        input.roundOffPaise;


    if (
      !Number.isSafeInteger(discountPaise) ||
      discountPaise < 0
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Purchase discount must be a valid integer amount in paise.",
      );
    }


    if (
      !Number.isSafeInteger(chargesPaise) ||
      chargesPaise < 0
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Additional charges must be a valid integer amount in paise.",
      );
    }


    if (!Number.isSafeInteger(roundOffPaise)) {
      throw new HttpsError(
          "invalid-argument",
          "Round off must be a valid integer amount in paise.",
      );
    }


    if (
      discountPaise >
      lineGrandTotalPaise +
      chargesPaise
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Purchase discount is too large.",
      );
    }


    const grandTotalPaise =
      lineGrandTotalPaise -
      discountPaise +
      chargesPaise +
      roundOffPaise;


    if (
      !Number.isSafeInteger(grandTotalPaise) ||
      grandTotalPaise <= 0
    ) {
      throw new HttpsError(
          "invalid-argument",
          "Grand total must be greater than zero.",
      );
    }


    /* --------------------------------------------------------
       NOTES / DECLARATION
       -------------------------------------------------------- */

    const notes =
      validateOptionalText(
          input.notes,
          "Notes",
          MAX_SALE_NOTES_LENGTH,
      );


    const declaration =
      validateOptionalText(
          input.declaration,
          "Declaration",
          MAX_DECLARATION_LENGTH,
      );


    /* --------------------------------------------------------
       INITIAL PAYMENT
       -------------------------------------------------------- */

    const initialPayment =
      input.initialPayment &&
      typeof input.initialPayment === "object" &&
      !Array.isArray(input.initialPayment) ?
        input.initialPayment :
        {};


    let initialPaidPaise =
      0;

    let paymentDate =
      null;

    let paymentMethod =
      "";

    let paymentReference =
      "";


    /*
     * Draft purchases do not create payment records.
     */

    if (!saveAsDraft) {
      if (purchaseType === "cash") {
        /*
         * Cash Buy is always fully settled.
         *
         * Browser cannot create a partially-paid Cash Buy.
         */

        initialPaidPaise =
          grandTotalPaise;


        paymentMethod =
          validateSalePaymentMethod(
              initialPayment.method ||
              "cash",
          );


        paymentDate =
          initialPayment.paymentDate ?
            parseDateOnlyToTimestamp(
                initialPayment.paymentDate,
                "Payment date",
            ) :
            purchaseDate;


        paymentReference =
          validateOptionalText(
              initialPayment.reference,
              "Payment reference",
              MAX_PAYMENT_REFERENCE_LENGTH,
          );
      } else {
        /*
         * Credit Buy can begin:
         * - unpaid
         * - partially paid
         * - fully paid
         */

        const requestedAmount =
          initialPayment.amountPaise ??
          0;


        if (
          !Number.isSafeInteger(
              requestedAmount,
          ) ||
          requestedAmount < 0
        ) {
          throw new HttpsError(
              "invalid-argument",
              "Initial payment must be a valid integer amount in paise.",
          );
        }


        if (
          requestedAmount >
          grandTotalPaise
        ) {
          throw new HttpsError(
              "invalid-argument",
              "Initial payment cannot exceed the purchase total.",
          );
        }


        initialPaidPaise =
          requestedAmount;


        if (initialPaidPaise > 0) {
          paymentMethod =
            validateSalePaymentMethod(
                initialPayment.method ||
                "cash",
            );


          paymentDate =
            parseDateOnlyToTimestamp(
                initialPayment.paymentDate,
                "Payment date",
            );


          paymentReference =
            validateOptionalText(
                initialPayment.reference,
                "Payment reference",
                MAX_PAYMENT_REFERENCE_LENGTH,
            );
        }
      }
    }


    /* --------------------------------------------------------
       REFERENCES
       -------------------------------------------------------- */

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);


    /*
     * Deterministic ID provides retry protection.
     */

    const purchaseRef =
      businessRef
          .collection("purchases")
          .doc(clientRequestId);


    const supplierRef =
      businessRef
          .collection("suppliers")
          .doc(supplierId);


    const businessSettingsRef =
      businessRef
          .collection("settings")
          .doc("business");


    const invoiceSettingsRef =
      businessRef
          .collection("settings")
          .doc("invoice");


    const paymentRef =
      businessRef
          .collection("purchasePayments")
          .doc();


    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();


    /* --------------------------------------------------------
       ATOMIC TRANSACTION
       -------------------------------------------------------- */

    const result =
      await db.runTransaction(
          async (transaction) => {
            /*
             * Firestore transaction reads happen before writes.
             */

            const [
              existingPurchaseSnapshot,
              businessSnapshot,
              supplierSnapshot,
              businessSettingsSnapshot,
              invoiceSettingsSnapshot,
            ] =
              await Promise.all([
                transaction.get(
                    purchaseRef,
                ),

                transaction.get(
                    businessRef,
                ),

                transaction.get(
                    supplierRef,
                ),

                transaction.get(
                    businessSettingsRef,
                ),

                transaction.get(
                    invoiceSettingsRef,
                ),
              ]);


            /* ------------------------------------------------
               IDEMPOTENT RETRY
               ------------------------------------------------ */

            if (existingPurchaseSnapshot.exists) {
              const existing =
                existingPurchaseSnapshot.data();


              if (
                existing.clientRequestId !==
                  clientRequestId ||
                existing.createdBy !==
                  user.uid
              ) {
                throw new HttpsError(
                    "already-exists",
                    "This Buy request ID is already in use.",
                );
              }


              return {
                idempotent:
                  true,

                purchaseId:
                  purchaseRef.id,

                purchaseNumber:
                  String(
                      existing.purchaseNumber ||
                      "",
                  ),

                grandTotalPaise:
                  existing.grandTotalPaise,

                paidPaise:
                  existing.paidPaise,

                balancePaise:
                  existing.balancePaise,

                status:
                  existing.status,

                paymentId:
                  null,
              };
            }


            /* ------------------------------------------------
               BUSINESS
               ------------------------------------------------ */

            if (!businessSnapshot.exists) {
              throw new HttpsError(
                  "failed-precondition",
                  "Business does not exist.",
              );
            }


            const business =
              businessSnapshot.data();


            if (business.active !== true) {
              throw new HttpsError(
                  "failed-precondition",
                  "Business is not active.",
              );
            }


            /* ------------------------------------------------
               SUPPLIER
               ------------------------------------------------ */

            if (!supplierSnapshot.exists) {
              throw new HttpsError(
                  "not-found",
                  "Supplier not found.",
              );
            }


            const supplier =
              supplierSnapshot.data();


            if (supplier.active !== true) {
              throw new HttpsError(
                  "failed-precondition",
                  "The selected supplier is not active.",
              );
            }


            /* ------------------------------------------------
               SETTINGS
               ------------------------------------------------ */

            const businessSettings =
              businessSettingsSnapshot.exists ?
                businessSettingsSnapshot.data() :
                {};


            const invoiceSettings =
              invoiceSettingsSnapshot.exists ?
                invoiceSettingsSnapshot.data() :
                {};


            const nextPurchaseNumber =
              invoiceSettings.nextPurchaseNumber;


            if (
              !Number.isSafeInteger(
                  nextPurchaseNumber,
              ) ||
              nextPurchaseNumber <= 0
            ) {
              throw new HttpsError(
                  "failed-precondition",
                  "Buy numbering is not configured correctly.",
              );
            }


            const purchaseNumber =
              formatPurchaseNumber(
                  invoiceSettings.purchasePrefix,
                  nextPurchaseNumber,
              );


            /* ------------------------------------------------
               PAID / BALANCE / STATUS
               ------------------------------------------------ */

            const paidPaise =
              saveAsDraft ?
                0 :
                initialPaidPaise;


            const balancePaise =
              grandTotalPaise -
              paidPaise;


            let status;


            if (saveAsDraft) {
              status =
                "draft";
            } else if (
              balancePaise === 0
            ) {
              status =
                "paid";
            } else if (
              paidPaise > 0
            ) {
              status =
                "partially_paid";
            } else {
              status =
                "pending";
            }


            /* ------------------------------------------------
               HISTORICAL SNAPSHOTS
               ------------------------------------------------ */

            const supplierSnapshotData =
              supplierHistorySnapshot(
                  supplier,
              );


            const businessSnapshotData =
              businessHistorySnapshot(
                  business,
                  businessSettings,
              );


            /* ------------------------------------------------
               PURCHASE
               ------------------------------------------------ */

            transaction.set(
                purchaseRef,
                {
                  businessId:
                    BUSINESS_ID,

                  clientRequestId,

                  purchaseNumber,

                  purchaseSequence:
                    nextPurchaseNumber,

                  supplierId,

                  supplierSnapshot:
                    supplierSnapshotData,

                  businessSnapshot:
                    businessSnapshotData,

                  supplierInvoiceNumber,

                  purchaseType,

                  purchaseDate,

                  dueDate,

                  broker,

                  items,

                  totalPieces,

                  totalCaratMicros,

                  subtotalPaise,

                  taxPaise,

                  lineGrandTotalPaise,

                  discountPaise,

                  chargesPaise,

                  roundOffPaise,

                  grandTotalPaise,

                  paidPaise,

                  balancePaise,

                  status,

                  notes,

                  declaration,

                  createdBy:
                    user.uid,

                  updatedBy:
                    user.uid,

                  createdAt:
                    FieldValue.serverTimestamp(),

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );


            /* ------------------------------------------------
               PURCHASE NUMBER COUNTER
               ------------------------------------------------ */

            transaction.set(
                invoiceSettingsRef,
                {
                  purchasePrefix:
                    typeof invoiceSettings.purchasePrefix ===
                      "string" &&
                    invoiceSettings.purchasePrefix.trim() ?
                      invoiceSettings.purchasePrefix.trim() :
                      "OMD-B",

                  nextPurchaseNumber:
                    nextPurchaseNumber + 1,

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
                {
                  merge:
                    true,
                },
            );


            /* ------------------------------------------------
               INITIAL PURCHASE PAYMENT
               ------------------------------------------------ */

            if (
              !saveAsDraft &&
              initialPaidPaise > 0
            ) {
              transaction.set(
                  paymentRef,
                  {
                    businessId:
                      BUSINESS_ID,

                    purchaseId:
                      purchaseRef.id,

                    purchaseNumber,

                    supplierId,

                    supplierSnapshot:
                      supplierSnapshotData,

                    amountPaise:
                      initialPaidPaise,

                    paymentDate,

                    method:
                      paymentMethod,

                    reference:
                      paymentReference,

                    note:
                      "",

                    source:
                      "purchase_creation",

                    createdBy:
                      user.uid,

                    createdAt:
                      FieldValue.serverTimestamp(),

                    updatedAt:
                      FieldValue.serverTimestamp(),
                  },
              );
            }


            /* ------------------------------------------------
               AUDIT
               ------------------------------------------------ */

            transaction.set(
                auditRef,
                {
                  action:
                    saveAsDraft ?
                      "PURCHASE_DRAFT_CREATED" :
                      "PURCHASE_CREATED",

                  entityType:
                    "purchase",

                  entityId:
                    purchaseRef.id,

                  actorUid:
                    user.uid,

                  actorEmail:
                    user.email,

                  businessId:
                    BUSINESS_ID,

                  details: {
                    purchaseNumber,

                    supplierId,

                    supplierInvoiceNumber,

                    purchaseType,

                    purchaseDate,

                    dueDate,

                    subtotalPaise,

                    taxPaise,

                    discountPaise,

                    chargesPaise,

                    roundOffPaise,

                    grandTotalPaise,

                    paidPaise,

                    balancePaise,

                    status,

                    initialPaymentId:
                      !saveAsDraft &&
                      initialPaidPaise > 0 ?
                        paymentRef.id :
                        null,
                  },

                  createdAt:
                    FieldValue.serverTimestamp(),
                },
            );


            return {
              idempotent:
                false,

              purchaseId:
                purchaseRef.id,

              purchaseNumber,

              grandTotalPaise,

              paidPaise,

              balancePaise,

              status,

              paymentId:
                !saveAsDraft &&
                initialPaidPaise > 0 ?
                  paymentRef.id :
                  null,
            };
          },
      );


    /* --------------------------------------------------------
       RESPONSE
       -------------------------------------------------------- */

    return {
      success:
        true,

      ...result,

      message:
        result.idempotent ?
          "Buy purchase already created." :
          saveAsDraft ?
            "Buy draft created successfully." :
            "Buy purchase created successfully.",
    };
  });


/* ============================================================
   LOCAL SCHEMA V2 MIGRATION
   ============================================================ */

exports.migrateToSchemaV2 =
  onCall(async (request) => {
    if (
      process.env.FUNCTIONS_EMULATOR !==
      "true"
    ) {
      throw new HttpsError(
          "failed-precondition",
          "Schema migration is only available in the local emulator.",
      );
    }

    const user =
      await requireOwner(request);

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);

    const invoiceSettingsRef =
      businessRef
          .collection("settings")
          .doc("invoice");

    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();

    const result =
      await db.runTransaction(
          async (transaction) => {
            const [
              businessSnapshot,
              settingsSnapshot,
            ] =
              await Promise.all([
                transaction.get(
                    businessRef,
                ),

                transaction.get(
                    invoiceSettingsRef,
                ),
              ]);

            if (!businessSnapshot.exists) {
              throw new HttpsError(
                  "failed-precondition",
                  "Business does not exist.",
              );
            }

            const business =
              businessSnapshot.data();

            const settings =
              settingsSnapshot.exists ?
                settingsSnapshot.data() :
                {};

            const currentVersion =
              Number.isInteger(
                  business.schemaVersion,
              ) ?
                business.schemaVersion :
                1;

            if (currentVersion >= 2) {
              return {
                migrated:
                  false,

                schemaVersion:
                  currentVersion,
              };
            }

            const nextSaleNumber =
              Number.isSafeInteger(
                  settings.nextSaleNumber,
              ) &&
              settings.nextSaleNumber > 0 ?
                settings.nextSaleNumber :
                (
                  Number.isSafeInteger(
                      settings.nextInvoiceNumber,
                  ) &&
                  settings.nextInvoiceNumber > 0 ?
                    settings.nextInvoiceNumber :
                    1
                );

            const nextPurchaseNumber =
              Number.isSafeInteger(
                  settings.nextPurchaseNumber,
              ) &&
              settings.nextPurchaseNumber > 0 ?
                settings.nextPurchaseNumber :
                1;

            transaction.update(
                businessRef,
                {
                  schemaVersion:
                    2,

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );

            transaction.set(
                invoiceSettingsRef,
                {
                  salePrefix:
                    typeof settings.salePrefix ===
                      "string" &&
                    settings.salePrefix.trim() ?
                      settings.salePrefix.trim() :
                      "OMD-S",

                  nextSaleNumber,

                  purchasePrefix:
                    typeof settings.purchasePrefix ===
                      "string" &&
                    settings.purchasePrefix.trim() ?
                      settings.purchasePrefix.trim() :
                      "OMD-B",

                  nextPurchaseNumber,

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
                {
                  merge:
                    true,
                },
            );

            transaction.set(
                auditRef,
                {
                  action:
                    "SCHEMA_V2_MIGRATED",

                  actorUid:
                    user.uid,

                  actorEmail:
                    user.email,

                  businessId:
                    BUSINESS_ID,

                  fromSchemaVersion:
                    currentVersion,

                  toSchemaVersion:
                    2,

                  createdAt:
                    FieldValue.serverTimestamp(),
                },
            );

            return {
              migrated:
                true,

              schemaVersion:
                2,
            };
          },
      );

    return {
      success:
        true,

      ...result,

      message:
        result.migrated ?
          "Schema upgraded to version 2." :
          "Schema version 2 is already active.",
    };
  });

/* ============================================================
   MIGRATE PARTY PUBLIC NUMBERS
   ------------------------------------------------------------
   ONE-TIME MIGRATION

   Existing customers:
   OMD-C-0001
   OMD-C-0002
   ...

   Existing suppliers:
   OMD-SUP-0001
   OMD-SUP-0002
   ...

   IMPORTANT:
   - Owner only
   - Existing Firestore document IDs are NOT changed
   - Existing financial records are NOT changed
   - Existing historical snapshots are NOT changed
   - Safe to call again: already-numbered records are skipped
   ============================================================ */

exports.migratePartyPublicNumbers =
  onCall(async (request) => {
    const user =
      await requireOwner(request);

    const businessRef =
      db
          .collection("businesses")
          .doc(BUSINESS_ID);

    const customersRef =
      businessRef
          .collection("customers");

    const suppliersRef =
      businessRef
          .collection("suppliers");

    const invoiceSettingsRef =
      businessRef
          .collection("settings")
          .doc("invoice");

    const auditRef =
      businessRef
          .collection("auditLogs")
          .doc();

    /* --------------------------------------------------------
       READ CURRENT DATA
       -------------------------------------------------------- */

    const [
      customerSnapshot,
      supplierSnapshot,
      settingsSnapshot,
    ] = await Promise.all([
      customersRef
          .orderBy("createdAt", "asc")
          .get(),

      suppliersRef
          .orderBy("createdAt", "asc")
          .get(),

      invoiceSettingsRef.get(),
    ]);

    if (!settingsSnapshot.exists) {
      throw new HttpsError(
          "failed-precondition",
          "Invoice numbering settings are missing.",
      );
    }

    const settings =
      settingsSnapshot.data() || {};

    const customerPrefix =
      typeof settings.customerPrefix === "string" &&
      settings.customerPrefix.trim() ?
        settings.customerPrefix.trim().toUpperCase() :
        "OMD-C";

    const supplierPrefix =
      typeof settings.supplierPrefix === "string" &&
      settings.supplierPrefix.trim() ?
        settings.supplierPrefix.trim().toUpperCase() :
        "OMD-SUP";

    /* --------------------------------------------------------
       FIND EXISTING NUMBERS
       -------------------------------------------------------- */

    let highestCustomerSequence = 0;
    let highestSupplierSequence = 0;

    const customerNumbers =
      new Set();

    const supplierNumbers =
      new Set();

    for (const document of customerSnapshot.docs) {
      const customer =
        document.data() || {};

      const sequence =
        customer.customerSequence;

      const number =
        typeof customer.customerNumber === "string" ?
          customer.customerNumber.trim().toUpperCase() :
          "";

      if (
        Number.isSafeInteger(sequence) &&
        sequence > 0
      ) {
        highestCustomerSequence =
          Math.max(
              highestCustomerSequence,
              sequence,
          );
      }

      if (number) {
        customerNumbers.add(number);
      }
    }

    for (const document of supplierSnapshot.docs) {
      const supplier =
        document.data() || {};

      const sequence =
        supplier.supplierSequence;

      const number =
        typeof supplier.supplierNumber === "string" ?
          supplier.supplierNumber.trim().toUpperCase() :
          "";

      if (
        Number.isSafeInteger(sequence) &&
        sequence > 0
      ) {
        highestSupplierSequence =
          Math.max(
              highestSupplierSequence,
              sequence,
          );
      }

      if (number) {
        supplierNumbers.add(number);
      }
    }

    /* --------------------------------------------------------
       ASSIGN MISSING CUSTOMER NUMBERS
       -------------------------------------------------------- */

    let nextCustomerSequence =
      Math.max(
          highestCustomerSequence + 1,
          1,
      );

    let migratedCustomers = 0;

    const customerUpdates = [];

    for (const document of customerSnapshot.docs) {
      const customer =
        document.data() || {};

      const existingNumber =
        typeof customer.customerNumber === "string" ?
          customer.customerNumber.trim() :
          "";

      if (existingNumber) {
        continue;
      }

      let customerNumber;

      while (true) {
        customerNumber =
          formatPartyNumber(
              customerPrefix,
              nextCustomerSequence,
              "OMD-C",
          );

        if (
          !customerNumbers.has(
              customerNumber.toUpperCase(),
          )
        ) {
          break;
        }

        nextCustomerSequence += 1;
      }

      customerNumbers.add(
          customerNumber.toUpperCase(),
      );

      customerUpdates.push({
        ref: document.ref,

        data: {
          customerNumber,

          customerSequence:
            nextCustomerSequence,

          searchTerms:
            createSearchTerms({
              ...customer,
              customerNumber,
            }),

          updatedBy:
            user.uid,

          updatedAt:
            FieldValue.serverTimestamp(),
        },
      });

      migratedCustomers += 1;
      nextCustomerSequence += 1;
    }

    /* --------------------------------------------------------
       ASSIGN MISSING SUPPLIER NUMBERS
       -------------------------------------------------------- */

    let nextSupplierSequence =
      Math.max(
          highestSupplierSequence + 1,
          1,
      );

    let migratedSuppliers = 0;

    const supplierUpdates = [];

    for (const document of supplierSnapshot.docs) {
      const supplier =
        document.data() || {};

      const existingNumber =
        typeof supplier.supplierNumber === "string" ?
          supplier.supplierNumber.trim() :
          "";

      if (existingNumber) {
        continue;
      }

      let supplierNumber;

      while (true) {
        supplierNumber =
          formatPartyNumber(
              supplierPrefix,
              nextSupplierSequence,
              "OMD-SUP",
          );

        if (
          !supplierNumbers.has(
              supplierNumber.toUpperCase(),
          )
        ) {
          break;
        }

        nextSupplierSequence += 1;
      }

      supplierNumbers.add(
          supplierNumber.toUpperCase(),
      );

      supplierUpdates.push({
        ref: document.ref,

        data: {
          supplierNumber,

          supplierSequence:
            nextSupplierSequence,

          searchTerms:
            createSearchTerms({
              ...supplier,
              supplierNumber,
            }),

          updatedBy:
            user.uid,

          updatedAt:
            FieldValue.serverTimestamp(),
        },
      });

      migratedSuppliers += 1;
      nextSupplierSequence += 1;
    }

    /* --------------------------------------------------------
       WRITE MIGRATION

       Firestore batch limit is 500 writes.
       Use chunks so this also remains safe if the business grows.
       -------------------------------------------------------- */

    const updates = [
      ...customerUpdates,
      ...supplierUpdates,
    ];

    const CHUNK_SIZE = 400;

    for (
      let index = 0;
      index < updates.length;
      index += CHUNK_SIZE
    ) {
      const batch =
        db.batch();

      const chunk =
        updates.slice(
            index,
            index + CHUNK_SIZE,
        );

      for (const update of chunk) {
        batch.update(
            update.ref,
            update.data,
        );
      }

      await batch.commit();
    }

    /* --------------------------------------------------------
       UPDATE NEXT COUNTERS + AUDIT
       -------------------------------------------------------- */

    const finalBatch =
      db.batch();

    finalBatch.set(
        invoiceSettingsRef,
        {
          customerPrefix,

          nextCustomerNumber:
            nextCustomerSequence,

          supplierPrefix,

          nextSupplierNumber:
            nextSupplierSequence,

          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        },
    );

    finalBatch.set(
        auditRef,
        {
          action:
            "PARTY_PUBLIC_NUMBERS_MIGRATED",

          entityType:
            "business",

          entityId:
            BUSINESS_ID,

          actorUid:
            user.uid,

          actorEmail:
            user.email,

          businessId:
            BUSINESS_ID,

          details: {
            migratedCustomers,
            migratedSuppliers,

            nextCustomerNumber:
              nextCustomerSequence,

            nextSupplierNumber:
              nextSupplierSequence,
          },

          createdAt:
            FieldValue.serverTimestamp(),
        },
    );

    await finalBatch.commit();

    return {
      success: true,

      migratedCustomers,
      migratedSuppliers,

      nextCustomerNumber:
        nextCustomerSequence,

      nextSupplierNumber:
        nextSupplierSequence,

      message:
        "Customer and supplier public numbers migrated successfully.",
    };
  });

/* ============================================================
   OM MARUTI DIAMOND
   PROFILE PAGE
   File: js/pages/profile.js

   Responsibilities:
   - Authentication protection
   - Read business profile
   - Read invoice prefixes
   - Render owner/business information
   - Secure profile updates through Cloud Function
   - Client-side validation for UX only
   - Dashboard-style global search
   - Sidebar/mobile navigation
   - Mobile Sell / Buy create menu
   - Sign out

   SECURITY:
   Browser validation is convenience only.
   updateBusinessProfile Cloud Function is authoritative.
   ============================================================ */


/* ============================================================
   FIREBASE IMPORTS
   ============================================================ */

import {
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js";

import {
    auth,
    db,
    functions
} from "../firebase.js";


/* ============================================================
   CONFIGURATION
   ============================================================ */

const BUSINESS_ID =
    "om-maruti-diamond";

const DEFAULT_LOGO_URL =
    "https://i.ibb.co/Tq73qTts/om-maruti-logo.png";

const MAX_SEARCH_RESULTS = 12;


/* ============================================================
   REFERENCES
   ============================================================ */

const businessRef =
    doc(
        db,
        "businesses",
        BUSINESS_ID
    );

const businessSettingsRef =
    doc(
        db,
        "businesses",
        BUSINESS_ID,
        "settings",
        "business"
    );

const invoiceSettingsRef =
    doc(
        db,
        "businesses",
        BUSINESS_ID,
        "settings",
        "invoice"
    );


/* ============================================================
   TRUSTED CALLABLE
   ============================================================ */

const updateBusinessProfile =
    httpsCallable(
        functions,
        "updateBusinessProfile"
    );


/* ============================================================
   STATE
   ============================================================ */

const state = {

    authenticated: false,

    currentUser: null,

    business: null,

    businessSettings: null,

    invoiceSettings: null,

    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],

    saving: false,

    listenersStarted: false,

    unsubscribe: []
};


/* ============================================================
   DOM HELPERS
   ============================================================ */

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value, fallback = "—") {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    const normalized =
        String(value ?? "").trim();

    element.textContent =
        normalized || fallback;
}


function createElement(
    tagName,
    className = "",
    textValue = ""
) {

    const element =
        document.createElement(tagName);

    if (className) {
        element.className =
            className;
    }

    if (
        textValue !== undefined &&
        textValue !== null
    ) {
        element.textContent =
            String(textValue);
    }

    return element;
}


/* ============================================================
   SAFE STRING
   ============================================================ */

function cleanText(value) {

    return String(
        value ?? ""
    ).trim();
}


/* ============================================================
   CURRENT DATE
   ============================================================ */

function renderCurrentDate() {

    const element =
        getElement("currentDate");

    if (!element) {
        return;
    }

    const now =
        new Date();

    try {

        element.textContent =
            new Intl.DateTimeFormat(
                "en-IN",
                {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            ).format(now);

    } catch (error) {

        console.error(
            "Current date formatting failed:",
            error
        );

        element.textContent =
            now.toLocaleDateString();
    }
}


/* ============================================================
   PROFILE DATA
   ============================================================ */

function getProfile() {

    const root =
        state.business || {};

    const settings =
        state.businessSettings || {};

    return {

        businessName:
            cleanText(
                settings.businessName ||
                root.name ||
                "OM MARUTI DIAMOND"
            ),

        ownerName:
            cleanText(
                settings.ownerName
            ),

        mobile:
            cleanText(
                settings.mobile
            ),

        email:
            cleanText(
                settings.email
            ),

        address:
            cleanText(
                settings.address
            ),

        gstin:
            cleanText(
                settings.gstin
            ),

        pan:
            cleanText(
                settings.pan
            ),

        state:
            cleanText(
                settings.state
            ),

        stateCode:
            cleanText(
                settings.stateCode
            ),

        bankName:
            cleanText(
                settings.bankName
            ),

        accountHolder:
            cleanText(
                settings.accountHolder
            ),

        accountNumber:
            cleanText(
                settings.accountNumber
            ),

        ifsc:
            cleanText(
                settings.ifsc
            ),

        bankBranch:
            cleanText(
                settings.bankBranch
            ),

        upiId:
            cleanText(
                settings.upiId
            ),

        logoUrl:
            cleanText(
                settings.logoUrl
            )
    };
}


/* ============================================================
   PAGE STATE
   ============================================================ */

function showLoadingState() {

    const loading =
        getElement(
            "profileLoadingState"
        );

    const error =
        getElement(
            "profileErrorState"
        );

    const content =
        getElement(
            "profileContent"
        );

    if (loading) {
        loading.hidden = false;
    }

    if (error) {
        error.hidden = true;
    }

    if (content) {
        content.hidden = true;
    }
}


function showProfileContent() {

    const loading =
        getElement(
            "profileLoadingState"
        );

    const error =
        getElement(
            "profileErrorState"
        );

    const content =
        getElement(
            "profileContent"
        );

    if (loading) {
        loading.hidden = true;
    }

    if (error) {
        error.hidden = true;
    }

    if (content) {
        content.hidden = false;
    }
}


function showProfileError(message) {

    const loading =
        getElement(
            "profileLoadingState"
        );

    const error =
        getElement(
            "profileErrorState"
        );

    const content =
        getElement(
            "profileContent"
        );

    if (loading) {
        loading.hidden = true;
    }

    if (content) {
        content.hidden = true;
    }

    if (error) {
        error.hidden = false;
    }

    setText(
        "profileErrorMessage",
        message ||
        "The business profile could not be loaded."
    );
}


/* ============================================================
   LOGO
   ============================================================ */

function renderLogo(profile) {

    const image =
        getElement(
            "profileBusinessLogo"
        );

    const placeholder =
        getElement(
            "profileLogoPlaceholder"
        );

    if (!image) {
        return;
    }

    const source =
        profile.logoUrl ||
        DEFAULT_LOGO_URL;


    image.onload = () => {

        image.hidden = false;

        if (placeholder) {
            placeholder.hidden = true;
        }
    };


    image.onerror = () => {

        image.hidden = true;

        if (placeholder) {
            placeholder.hidden = false;
        }
    };


    /*
     * Reassigning src triggers the correct load/error path
     * when the profile changes.
     */

    image.src =
        source;
}


/* ============================================================
   RENDER PROFILE
   ============================================================ */

function renderProfile() {

    const profile =
        getProfile();

    const invoice =
        state.invoiceSettings || {};


    /* --------------------------------------------------------
       Hero
       -------------------------------------------------------- */

    setText(
        "profileBusinessName",
        profile.businessName
    );

    setText(
        "profileBusinessAddress",
        profile.address
    );

    setText(
        "profileBusinessMobile",
        profile.mobile
    );

    setText(
        "profileBusinessEmail",
        profile.email
    );


    renderLogo(
        profile
    );


    /* --------------------------------------------------------
       Summary
       -------------------------------------------------------- */

    setText(
        "profileSummaryGstin",
        profile.gstin
    );

    setText(
        "profileSummaryPan",
        profile.pan
    );

    setText(
        "profileSummaryState",
        profile.state
    );


    const stateCodeElement =
        getElement(
            "profileSummaryStateCode"
        );

    if (stateCodeElement) {

        stateCodeElement.textContent =
            profile.stateCode
                ? `State code ${profile.stateCode}`
                : "State code —";
    }


    /* --------------------------------------------------------
       Business information
       -------------------------------------------------------- */

    setText(
        "profileDetailBusinessName",
        profile.businessName
    );

    setText(
        "profileOwnerName",
        profile.ownerName
    );

    setText(
        "profileDetailMobile",
        profile.mobile
    );

    setText(
        "profileDetailEmail",
        profile.email
    );


    /* --------------------------------------------------------
       Tax
       -------------------------------------------------------- */

    setText(
        "profileGstin",
        profile.gstin
    );

    setText(
        "profilePan",
        profile.pan
    );

    setText(
        "profileState",
        profile.state
    );

    setText(
        "profileStateCode",
        profile.stateCode
    );


    /* --------------------------------------------------------
       Address
       -------------------------------------------------------- */

    setText(
        "profileAddressBusinessName",
        profile.businessName
    );

    setText(
        "profileAddress",
        profile.address
    );


    /* --------------------------------------------------------
       Bank
       -------------------------------------------------------- */

    setText(
        "profileBankName",
        profile.bankName
    );

    setText(
        "profileAccountHolder",
        profile.accountHolder
    );

    setText(
        "profileAccountNumber",
        profile.accountNumber
    );

    setText(
        "profileIfsc",
        profile.ifsc
    );

    setText(
        "profileBankBranch",
        profile.bankBranch
    );

    setText(
        "profileUpiId",
        profile.upiId
    );


    /* --------------------------------------------------------
       Invoice prefixes

       READ ONLY here.
       -------------------------------------------------------- */

    setText(
        "profileSalePrefix",
        invoice.salePrefix ||
        "OMD-S"
    );

    setText(
        "profilePurchasePrefix",
        invoice.purchasePrefix ||
        "OMD-B"
    );


    /* --------------------------------------------------------
       Auth
       -------------------------------------------------------- */

    setText(
        "profileAuthEmail",
        state.currentUser?.email
    );


    showProfileContent();
}


/* ============================================================
   FORM VALUE HELPERS
   ============================================================ */

function setInputValue(
    id,
    value
) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.value =
        cleanText(value);
}


function getInputValue(id) {

    const element =
        getElement(id);

    if (!element) {
        return "";
    }

    return cleanText(
        element.value
    );
}


/* ============================================================
   POPULATE EDIT FORM
   ============================================================ */

function populateProfileForm() {

    const profile =
        getProfile();

    setInputValue(
        "businessName",
        profile.businessName
    );

    setInputValue(
        "ownerName",
        profile.ownerName
    );

    setInputValue(
        "businessMobile",
        profile.mobile
    );

    setInputValue(
        "businessEmail",
        profile.email
    );

    setInputValue(
        "businessGstin",
        profile.gstin
    );

    setInputValue(
        "businessPan",
        profile.pan
    );

    setInputValue(
        "businessState",
        profile.state
    );

    setInputValue(
        "businessStateCode",
        profile.stateCode
    );

    setInputValue(
        "businessAddress",
        profile.address
    );

    setInputValue(
        "bankName",
        profile.bankName
    );

    setInputValue(
        "accountHolder",
        profile.accountHolder
    );

    setInputValue(
        "accountNumber",
        profile.accountNumber
    );

    setInputValue(
        "bankIfsc",
        profile.ifsc
    );

    setInputValue(
        "bankBranch",
        profile.bankBranch
    );

    setInputValue(
        "upiId",
        profile.upiId
    );

    setInputValue(
        "logoUrl",
        profile.logoUrl
    );
}


/* ============================================================
   FORM ERRORS
   ============================================================ */

function clearFieldError(
    fieldId,
    errorId
) {

    const field =
        getElement(fieldId);

    const error =
        getElement(errorId);

    if (field) {
        field.removeAttribute(
            "aria-invalid"
        );
    }

    if (error) {
        error.textContent = "";
    }
}


function setFieldError(
    fieldId,
    errorId,
    message
) {

    const field =
        getElement(fieldId);

    const error =
        getElement(errorId);

    if (field) {

        field.setAttribute(
            "aria-invalid",
            "true"
        );
    }

    if (error) {

        error.textContent =
            message;
    }
}


function clearValidationErrors() {

    clearFieldError(
        "businessName",
        "businessNameError"
    );

    clearFieldError(
        "businessEmail",
        "businessEmailError"
    );

    clearFieldError(
        "businessGstin",
        "businessGstinError"
    );

    clearFieldError(
        "businessPan",
        "businessPanError"
    );

    clearFieldError(
        "bankIfsc",
        "bankIfscError"
    );
}


/* ============================================================
   FORM MESSAGE
   ============================================================ */

function clearFormMessage() {

    const element =
        getElement(
            "profileFormMessage"
        );

    if (!element) {
        return;
    }

    element.hidden = true;

    element.textContent = "";

    element.classList.remove(
        "is-error",
        "error",
        "is-success",
        "success"
    );
}


function showFormMessage(
    message,
    type = "error"
) {

    const element =
        getElement(
            "profileFormMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        String(message || "");

    element.classList.remove(
        "is-error",
        "error",
        "is-success",
        "success"
    );

    if (type === "success") {

        element.classList.add(
            "is-success"
        );

    } else {

        element.classList.add(
            "is-error"
        );
    }

    element.hidden = false;
}


/* ============================================================
   CLIENT VALIDATION

   UX only.
   Cloud Function remains authoritative.
   ============================================================ */

function validateProfileForm() {

    clearValidationErrors();

    const data = {

        businessName:
            getInputValue(
                "businessName"
            ),

        ownerName:
            getInputValue(
                "ownerName"
            ),

        mobile:
            getInputValue(
                "businessMobile"
            ),

        email:
            getInputValue(
                "businessEmail"
            ).toLowerCase(),

        address:
            getInputValue(
                "businessAddress"
            ),

        gstin:
            getInputValue(
                "businessGstin"
            ).toUpperCase(),

        pan:
            getInputValue(
                "businessPan"
            ).toUpperCase(),

        state:
            getInputValue(
                "businessState"
            ),

        stateCode:
            getInputValue(
                "businessStateCode"
            ),

        bankName:
            getInputValue(
                "bankName"
            ),

        accountHolder:
            getInputValue(
                "accountHolder"
            ),

        accountNumber:
            getInputValue(
                "accountNumber"
            ),

        ifsc:
            getInputValue(
                "bankIfsc"
            ).toUpperCase(),

        bankBranch:
            getInputValue(
                "bankBranch"
            ),

        upiId:
            getInputValue(
                "upiId"
            ),

        logoUrl:
            getInputValue(
                "logoUrl"
            )
    };


    let valid = true;


    /* --------------------------------------------------------
       Business name
       -------------------------------------------------------- */

    if (!data.businessName) {

        setFieldError(
            "businessName",
            "businessNameError",
            "Business name is required."
        );

        valid = false;
    }


    /* --------------------------------------------------------
       Email
       -------------------------------------------------------- */

    if (data.email) {

        const pattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!pattern.test(data.email)) {

            setFieldError(
                "businessEmail",
                "businessEmailError",
                "Enter a valid email address."
            );

            valid = false;
        }
    }


    /* --------------------------------------------------------
       GSTIN
       -------------------------------------------------------- */

    if (data.gstin) {

        const pattern =
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

        if (!pattern.test(data.gstin)) {

            setFieldError(
                "businessGstin",
                "businessGstinError",
                "Enter a valid 15-character GSTIN."
            );

            valid = false;
        }
    }


    /* --------------------------------------------------------
       PAN
       -------------------------------------------------------- */

    if (data.pan) {

        const pattern =
            /^[A-Z]{5}[0-9]{4}[A-Z]$/;

        if (!pattern.test(data.pan)) {

            setFieldError(
                "businessPan",
                "businessPanError",
                "Enter a valid PAN."
            );

            valid = false;
        }
    }


    /* --------------------------------------------------------
       State code
       -------------------------------------------------------- */

    if (
        data.stateCode &&
        !/^[0-9]{2}$/.test(
            data.stateCode
        )
    ) {

        showFormMessage(
            "State code must contain exactly 2 digits."
        );

        valid = false;
    }


    /* --------------------------------------------------------
       IFSC
       -------------------------------------------------------- */

    if (data.ifsc) {

        const pattern =
            /^[A-Z]{4}0[A-Z0-9]{6}$/;

        if (!pattern.test(data.ifsc)) {

            setFieldError(
                "bankIfsc",
                "bankIfscError",
                "Enter a valid IFSC code."
            );

            valid = false;
        }
    }


    /* --------------------------------------------------------
       Logo URL
       -------------------------------------------------------- */

    if (data.logoUrl) {

        try {

            const url =
                new URL(
                    data.logoUrl
                );

            if (
                url.protocol !==
                "https:"
            ) {

                showFormMessage(
                    "Logo URL must use HTTPS."
                );

                valid = false;
            }

        } catch (error) {

            showFormMessage(
                "Enter a valid logo URL."
            );

            valid = false;
        }
    }


    return {
        valid,
        data
    };
}


/* ============================================================
   SAVING STATE
   ============================================================ */

function setSavingState(saving) {

    state.saving =
        Boolean(saving);

    const saveButton =
        getElement(
            "saveProfileButton"
        );

    const buttonText =
        getElement(
            "saveProfileButtonText"
        );

    const spinner =
        getElement(
            "saveProfileSpinner"
        );

    const cancelButton =
        getElement(
            "cancelProfileButton"
        );

    const closeButton =
        getElement(
            "closeProfileModalButton"
        );


    if (saveButton) {
        saveButton.disabled =
            state.saving;
    }

    if (cancelButton) {
        cancelButton.disabled =
            state.saving;
    }

    if (closeButton) {
        closeButton.disabled =
            state.saving;
    }

    if (buttonText) {

        buttonText.textContent =
            state.saving
                ? "Saving..."
                : "Save Profile";
    }

    if (spinner) {

        spinner.hidden =
            !state.saving;
    }
}


/* ============================================================
   PROFILE MODAL
   ============================================================ */

function openProfileModal() {

    const modal =
        getElement(
            "profileModal"
        );

    if (
        !modal ||
        state.saving
    ) {
        return;
    }

    populateProfileForm();

    clearValidationErrors();

    clearFormMessage();

    modal.hidden = false;

    document.body.classList.add(
        "modal-open"
    );


    window.setTimeout(
        () => {

            getElement(
                "businessName"
            )?.focus();

        },
        0
    );
}


function closeProfileModal() {

    const modal =
        getElement(
            "profileModal"
        );

    if (
        !modal ||
        state.saving
    ) {
        return;
    }

    modal.hidden = true;

    document.body.classList.remove(
        "modal-open"
    );

    clearValidationErrors();

    clearFormMessage();
}


/* ============================================================
   SAVE PROFILE
   ============================================================ */

async function handleProfileSubmit(event) {

    event.preventDefault();

    if (state.saving) {
        return;
    }

    clearFormMessage();


    const {
        valid,
        data
    } =
        validateProfileForm();


    if (!valid) {

        const invalidField =
            document.querySelector(
                "#profileForm [aria-invalid='true']"
            );

        if (invalidField) {
            invalidField.focus();
        }

        return;
    }


    setSavingState(true);


    try {

        const result =
            await updateBusinessProfile(
                data
            );


        if (
            !result?.data?.success
        ) {

            throw new Error(
                result?.data?.message ||
                "Profile update failed."
            );
        }


        /*
         * Real-time Firestore listener will render the updated
         * profile. We do not manually mutate trusted state.
         */

        showFormMessage(
            result.data.message ||
            "Business profile updated successfully.",
            "success"
        );


        window.setTimeout(
            () => {

                if (!state.saving) {
                    closeProfileModal();
                }

            },
            650
        );

    } catch (error) {

        console.error(
            "Profile update failed:",
            error
        );

        showFormMessage(
            getCallableErrorMessage(
                error,
                "Unable to update the business profile."
            )
        );

    } finally {

        setSavingState(false);
    }
}


/* ============================================================
   CALLABLE ERROR
   ============================================================ */

function getCallableErrorMessage(
    error,
    fallback
) {

    const message =
        cleanText(
            error?.message
        );

    if (!message) {
        return fallback;
    }

    /*
     * Firebase callable errors can contain a prefix such as:
     *
     * functions/invalid-argument
     *
     * error.message normally contains the useful backend
     * message, so preserve it rather than exposing internals.
     */

    return message;
}


/* ============================================================
   SEARCH HELPERS
   ============================================================ */

function normalizeSearchText(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


function containsSearch(
    search,
    ...values
) {

    return values.some(
        (value) =>
            normalizeSearchText(
                value
            ).includes(
                search
            )
    );
}


/* ============================================================
   MONEY HELPERS FOR SEARCH
   ============================================================ */

function safePaise(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return 0;
    }

    return Math.round(number);
}


function formatMoney(value) {

    const paise =
        safePaise(value);

    try {

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        ).format(
            paise / 100
        );

    } catch (error) {

        return `₹${(
            paise / 100
        ).toFixed(2)}`;
    }
}


/* ============================================================
   TRANSACTION HELPERS FOR SEARCH
   ============================================================ */

function getSaleTotal(sale) {

    return safePaise(
        sale?.grandTotalPaise ??
        sale?.totalPaise
    );
}


function getSaleBalance(sale) {

    return safePaise(
        sale?.balancePaise
    );
}


function getPurchaseTotal(purchase) {

    return safePaise(
        purchase?.grandTotalPaise ??
        purchase?.totalPaise
    );
}


function getPurchaseBalance(purchase) {

    return safePaise(
        purchase?.balancePaise
    );
}


function getDisplayStatus(
    transaction,
    balance,
    total
) {

    const stored =
        cleanText(
            transaction?.status
        );

    if (stored) {
        return stored;
    }

    if (
        total > 0 &&
        balance <= 0
    ) {
        return "paid";
    }

    if (
        total > 0 &&
        balance < total
    ) {
        return "partially_paid";
    }

    return "pending";
}


/* ============================================================
   SEARCH PARTY NAMES
   ============================================================ */

function findCustomer(customerId) {

    return state.customers.find(
        (customer) =>
            customer.id ===
            customerId
    ) || null;
}


function findSupplier(supplierId) {

    return state.suppliers.find(
        (supplier) =>
            supplier.id ===
            supplierId
    ) || null;
}


function getSalePartyName(sale) {

    return cleanText(
        sale?.customerSnapshot?.name ||
        sale?.customer?.name ||
        sale?.billTo?.name ||
        findCustomer(
            sale?.customerId
        )?.name ||
        "Customer"
    );
}


function getPurchasePartyName(
    purchase
) {

    return cleanText(
        purchase?.supplierSnapshot?.name ||
        purchase?.supplier?.name ||
        purchase?.billFrom?.name ||
        findSupplier(
            purchase?.supplierId
        )?.name ||
        "Supplier"
    );
}


/* ============================================================
   BUILD GLOBAL SEARCH RESULTS

   Same categories as Dashboard:
   - Customers
   - Suppliers
   - Sell
   - Buy
   ============================================================ */

function buildSearchResults(
    searchText
) {

    const search =
        normalizeSearchText(
            searchText
        );

    if (!search) {
        return [];
    }


    const results = [];


    /* --------------------------------------------------------
       Customers
       -------------------------------------------------------- */

    state.customers.forEach(
        (customer) => {

            if (
                containsSearch(
                    search,
                    customer.customerNumber,
                    customer.name,
                    customer.mobile,
                    customer.email,
                    customer.gstin,
                    customer.address
                )
            ) {

                results.push({

                    type:
                        "Customer",

                    title:
                        customer.name ||
                        "Customer",

                    subtitle:
                        customer.mobile ||
                        customer.email ||
                        "Customer record",

                    href:
                        customer.customerNumber
                            ? `/customers/${encodeURIComponent(
                                String(customer.customerNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/customers"
                });
            }
        }
    );


    /* --------------------------------------------------------
       Suppliers
       -------------------------------------------------------- */

    state.suppliers.forEach(
        (supplier) => {

            if (
                containsSearch(
                    search,
                    supplier.name,
                    supplier.mobile,
                    supplier.email,
                    supplier.gstin,
                    supplier.address
                )
            ) {

                results.push({

                    type:
                        "Supplier",

                    title:
                        supplier.name ||
                        "Supplier",

                    subtitle:
                        supplier.mobile ||
                        supplier.email ||
                        "Supplier record",

                    href:
                        supplier.supplierNumber
                            ? `/suppliers/${encodeURIComponent(
                                String(supplier.supplierNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/suppliers"
                });
            }
        }
    );


    /* --------------------------------------------------------
       Sell
       -------------------------------------------------------- */

    state.sales.forEach(
        (sale) => {

            const total =
                getSaleTotal(
                    sale
                );

            const balance =
                getSaleBalance(
                    sale
                );

            const status =
                getDisplayStatus(
                    sale,
                    balance,
                    total
                );

            const party =
                getSalePartyName(
                    sale
                );


            if (
                containsSearch(
                    search,
                    sale.invoiceNumber,
                    party,
                    sale.customerSnapshot?.mobile,
                    sale.customerSnapshot?.gstin,
                    sale.saleType,
                    status,
                    formatMoney(total),
                    formatMoney(balance),
                    total / 100,
                    balance / 100
                )
            ) {

                results.push({

                    type:
                        "Sell",

                    title:
                        sale.invoiceNumber ||
                        "Sale",

                    subtitle:
                        `${party} · ` +
                        `${formatMoney(total)} · ` +
                        status,

                    href:
                        sale.invoiceNumber
                            ? `/sales/${encodeURIComponent(
                                String(sale.invoiceNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/sales"
                });
            }
        }
    );


    /* --------------------------------------------------------
       Buy
       -------------------------------------------------------- */

    state.purchases.forEach(
        (purchase) => {

            const total =
                getPurchaseTotal(
                    purchase
                );

            const balance =
                getPurchaseBalance(
                    purchase
                );

            const status =
                getDisplayStatus(
                    purchase,
                    balance,
                    total
                );

            const party =
                getPurchasePartyName(
                    purchase
                );


            if (
                containsSearch(
                    search,
                    purchase.purchaseNumber,
                    purchase.supplierInvoiceNumber,
                    party,
                    purchase.supplierSnapshot?.mobile,
                    purchase.supplierSnapshot?.gstin,
                    purchase.purchaseType,
                    status,
                    formatMoney(total),
                    formatMoney(balance),
                    total / 100,
                    balance / 100
                )
            ) {

                results.push({

                    type:
                        "Buy",

                    title:
                        purchase.purchaseNumber ||
                        "Purchase",

                    subtitle:
                        `${party} · ` +
                        `${formatMoney(total)} · ` +
                        status,

                    href:
                        purchase.purchaseNumber
                            ? `/purchases/${encodeURIComponent(
                                String(purchase.purchaseNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/purchases"
                });
            }
        }
    );


    return results.slice(
        0,
        MAX_SEARCH_RESULTS
    );
}


/* ============================================================
   HIDE SEARCH
   ============================================================ */

function hideSearchResults() {

    const container =
        getElement(
            "globalSearchResults"
        );

    if (container) {
        container.hidden = true;
    }
}


/* ============================================================
   RENDER SEARCH
   ============================================================ */

function renderSearchResults(
    searchText
) {

    const container =
        getElement(
            "globalSearchResults"
        );

    const content =
        getElement(
            "globalSearchResultsContent"
        );


    if (
        !container ||
        !content
    ) {
        return;
    }


    content.replaceChildren();


    const search =
        normalizeSearchText(
            searchText
        );


    if (!search) {

        container.hidden = true;

        return;
    }


    const results =
        buildSearchResults(
            search
        );


    if (
        results.length === 0
    ) {

        content.appendChild(
            createElement(
                "div",
                "search-result-empty",
                "No matching customers, suppliers, Sell or Buy records."
            )
        );

        container.hidden = false;

        return;
    }


    const fragment =
        document.createDocumentFragment();


    results.forEach(
        (result) => {

            const link =
                createElement(
                    "a",
                    "search-result-item"
                );

            link.href =
                result.href;


            const information =
                createElement(
                    "div",
                    "search-result-content"
                );


            information.append(
                createElement(
                    "strong",
                    "",
                    result.title
                ),

                createElement(
                    "span",
                    "",
                    result.subtitle
                )
            );


            const type =
                createElement(
                    "span",
                    "search-result-type",
                    result.type
                );


            link.append(
                information,
                type
            );


            fragment.appendChild(
                link
            );
        }
    );


    content.appendChild(
        fragment
    );

    container.hidden = false;
}


/* ============================================================
   REFRESH SEARCH
   ============================================================ */

function refreshSearchIfOpen() {

    const input =
        getElement(
            "globalSearchInput"
        );

    const results =
        getElement(
            "globalSearchResults"
        );


    if (
        !input ||
        !results ||
        results.hidden
    ) {
        return;
    }


    renderSearchResults(
        input.value
    );
}


/* ============================================================
   BIND GLOBAL SEARCH
   ============================================================ */

function bindGlobalSearch() {

    const input =
        getElement(
            "globalSearchInput"
        );

    const results =
        getElement(
            "globalSearchResults"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            renderSearchResults(
                input.value
            );
        }
    );


    input.addEventListener(
        "focus",
        () => {

            if (
                cleanText(
                    input.value
                )
            ) {

                renderSearchResults(
                    input.value
                );
            }
        }
    );


    input.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Escape"
            ) {

                hideSearchResults();

                input.blur();
            }
        }
    );


    document.addEventListener(
        "click",
        (event) => {

            if (
                event.target === input ||
                results?.contains(
                    event.target
                )
            ) {
                return;
            }

            hideSearchResults();
        }
    );
}


/* ============================================================
   FIRESTORE COLLECTION LISTENER
   ============================================================ */

function listenToSearchCollection(
    collectionName,
    stateKey
) {

    const collectionRef =
        collection(
            db,
            "businesses",
            BUSINESS_ID,
            collectionName
        );


    const collectionQuery =
        query(
            collectionRef,
            orderBy(
                "createdAt",
                "desc"
            ),
            limit(500)
        );


    const unsubscribe =
        onSnapshot(
            collectionQuery,

            (snapshot) => {

                state[stateKey] =
                    snapshot.docs.map(
                        (snapshotDocument) => ({
                            id:
                                snapshotDocument.id,

                            ...snapshotDocument.data()
                        })
                    );


                refreshSearchIfOpen();
            },

            (error) => {

                console.error(
                    `${collectionName} search listener failed:`,
                    error
                );
            }
        );


    state.unsubscribe.push(
        unsubscribe
    );
}


/* ============================================================
   SEARCH DATA LISTENERS
   ============================================================ */

function startSearchListeners() {

    listenToSearchCollection(
        "customers",
        "customers"
    );

    listenToSearchCollection(
        "suppliers",
        "suppliers"
    );

    listenToSearchCollection(
        "sales",
        "sales"
    );

    listenToSearchCollection(
        "purchases",
        "purchases"
    );
}


/* ============================================================
   PROFILE LISTENERS
   ============================================================ */

function startProfileListeners() {

    if (state.listenersStarted) {
        return;
    }


    state.listenersStarted = true;


    /* --------------------------------------------------------
       Root business
       -------------------------------------------------------- */

    const unsubscribeBusiness =
        onSnapshot(
            businessRef,

            (snapshot) => {

                if (!snapshot.exists()) {

                    showProfileError(
                        "Business profile does not exist."
                    );

                    return;
                }


                state.business = {
                    id:
                        snapshot.id,

                    ...snapshot.data()
                };


                renderProfile();
            },

            (error) => {

                console.error(
                    "Business listener failed:",
                    error
                );

                showProfileError(
                    "Unable to load the business profile."
                );
            }
        );


    state.unsubscribe.push(
        unsubscribeBusiness
    );


    /* --------------------------------------------------------
       Business settings
       -------------------------------------------------------- */

    const unsubscribeSettings =
        onSnapshot(
            businessSettingsRef,

            (snapshot) => {

                state.businessSettings =
                    snapshot.exists()
                        ? snapshot.data()
                        : {};


                renderProfile();
            },

            (error) => {

                console.error(
                    "Business settings listener failed:",
                    error
                );

                showProfileError(
                    "Unable to load business settings."
                );
            }
        );


    state.unsubscribe.push(
        unsubscribeSettings
    );


    /* --------------------------------------------------------
       Invoice settings

       Read-only for Profile.
       -------------------------------------------------------- */

    const unsubscribeInvoice =
        onSnapshot(
            invoiceSettingsRef,

            (snapshot) => {

                state.invoiceSettings =
                    snapshot.exists()
                        ? snapshot.data()
                        : {};


                renderProfile();
            },

            (error) => {

                console.error(
                    "Invoice settings listener failed:",
                    error
                );

                /*
                 * Prefixes have safe UI fallbacks.
                 * Do not hide the whole Profile page because
                 * invoice settings failed independently.
                 */

                state.invoiceSettings = {};

                renderProfile();
            }
        );


    state.unsubscribe.push(
        unsubscribeInvoice
    );


    /* --------------------------------------------------------
       Global search
       -------------------------------------------------------- */

    startSearchListeners();
}


/* ============================================================
   SIDEBAR
   ============================================================ */

function openSidebar() {

    const sidebar =
        getElement(
            "sidebar"
        );

    const overlay =
        getElement(
            "sidebarOverlay"
        );

    const button =
        getElement(
            "mobileMenuButton"
        );


    if (!sidebar) {
        return;
    }


    sidebar.classList.add(
        "is-open"
    );


    if (overlay) {
        overlay.hidden = false;
    }


    if (button) {

        button.setAttribute(
            "aria-expanded",
            "true"
        );
    }
}


function closeSidebar() {

    const sidebar =
        getElement(
            "sidebar"
        );

    const overlay =
        getElement(
            "sidebarOverlay"
        );

    const button =
        getElement(
            "mobileMenuButton"
        );


    if (sidebar) {

        sidebar.classList.remove(
            "is-open"
        );
    }


    if (overlay) {
        overlay.hidden = true;
    }


    if (button) {

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}


function toggleSidebar() {

    const sidebar =
        getElement(
            "sidebar"
        );

    if (!sidebar) {
        return;
    }


    if (
        sidebar.classList.contains(
            "is-open"
        )
    ) {

        closeSidebar();

    } else {

        openSidebar();
    }
}


/* ============================================================
   MOBILE CREATE MENU
   ============================================================ */

function openMobileCreateMenu() {

    const menu =
        getElement(
            "mobileCreateMenu"
        );

    if (!menu) {
        return;
    }


    menu.hidden = false;


    const button =
        getElement(
            "mobileNewTransactionButton"
        );

    if (button) {

        button.setAttribute(
            "aria-expanded",
            "true"
        );
    }
}


function closeMobileCreateMenu() {

    const menu =
        getElement(
            "mobileCreateMenu"
        );

    if (!menu) {
        return;
    }


    menu.hidden = true;


    const button =
        getElement(
            "mobileNewTransactionButton"
        );

    if (button) {

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}


function toggleMobileCreateMenu() {

    const menu =
        getElement(
            "mobileCreateMenu"
        );

    if (!menu) {
        return;
    }


    if (menu.hidden) {

        openMobileCreateMenu();

    } else {

        closeMobileCreateMenu();
    }
}


/* ============================================================
   SIGN OUT
   ============================================================ */

async function handleSignOut() {

    try {

        closeSidebar();

        closeMobileCreateMenu();

        await signOut(
            auth
        );


        /*
         * onAuthStateChanged will redirect.
         */

    } catch (error) {

        console.error(
            "Sign out failed:",
            error
        );

        window.alert(
            "Unable to sign out. Please try again."
        );
    }
}


/* ============================================================
   CLEANUP
   ============================================================ */

function cleanupListeners() {

    state.unsubscribe.forEach(
        (unsubscribe) => {

            try {

                unsubscribe();

            } catch (error) {

                console.error(
                    "Listener cleanup failed:",
                    error
                );
            }
        }
    );


    state.unsubscribe = [];

    state.listenersStarted = false;
}


/* ============================================================
   EVENT BINDINGS
   ============================================================ */

function bindEvents() {

    /* --------------------------------------------------------
       Edit profile
       -------------------------------------------------------- */

    getElement(
        "editProfileButton"
    )?.addEventListener(
        "click",
        openProfileModal
    );


    getElement(
        "headingEditProfileButton"
    )?.addEventListener(
        "click",
        openProfileModal
    );


    /* --------------------------------------------------------
       Profile modal
       -------------------------------------------------------- */

    getElement(
        "closeProfileModalButton"
    )?.addEventListener(
        "click",
        closeProfileModal
    );


    getElement(
        "cancelProfileButton"
    )?.addEventListener(
        "click",
        closeProfileModal
    );


    getElement(
        "profileForm"
    )?.addEventListener(
        "submit",
        handleProfileSubmit
    );


    const modal =
        getElement(
            "profileModal"
        );


    modal?.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal &&
                !state.saving
            ) {

                closeProfileModal();
            }
        }
    );


    /* --------------------------------------------------------
       Sidebar
       -------------------------------------------------------- */

    getElement(
        "mobileMenuButton"
    )?.addEventListener(
        "click",
        toggleSidebar
    );


    getElement(
        "sidebarOverlay"
    )?.addEventListener(
        "click",
        closeSidebar
    );


    /* --------------------------------------------------------
       Logout
       -------------------------------------------------------- */

    getElement(
        "logoutButton"
    )?.addEventListener(
        "click",
        handleSignOut
    );


    getElement(
        "profileSignOutButton"
    )?.addEventListener(
        "click",
        handleSignOut
    );


    /* --------------------------------------------------------
       Mobile +
       -------------------------------------------------------- */

    const mobileCreateButton =
        getElement(
            "mobileNewTransactionButton"
        );


    if (mobileCreateButton) {

        mobileCreateButton.setAttribute(
            "aria-expanded",
            "false"
        );


        mobileCreateButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                toggleMobileCreateMenu();
            }
        );
    }


    getElement(
        "mobileCreateSellButton"
    )?.addEventListener(
        "click",
        () => {

            window.location.href =
                "/sales/new";
        }
    );


    getElement(
        "mobileCreateBuyButton"
    )?.addEventListener(
        "click",
        () => {

            window.location.href =
                "/purchases/new";
        }
    );


    /* --------------------------------------------------------
       Retry
       -------------------------------------------------------- */

    getElement(
        "retryProfileButton"
    )?.addEventListener(
        "click",
        () => {

            window.location.reload();
        }
    );


    /* --------------------------------------------------------
       Escape
       -------------------------------------------------------- */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            const modal =
                getElement(
                    "profileModal"
                );


            if (
                modal &&
                !modal.hidden &&
                !state.saving
            ) {

                closeProfileModal();

                return;
            }


            const createMenu =
                getElement(
                    "mobileCreateMenu"
                );


            if (
                createMenu &&
                !createMenu.hidden
            ) {

                closeMobileCreateMenu();

                return;
            }


            closeSidebar();
        }
    );


    /* --------------------------------------------------------
       Outside mobile create click
       -------------------------------------------------------- */

    document.addEventListener(
        "click",
        (event) => {

            const menu =
                getElement(
                    "mobileCreateMenu"
                );

            const button =
                getElement(
                    "mobileNewTransactionButton"
                );


            if (
                !menu ||
                menu.hidden
            ) {
                return;
            }


            if (
                menu.contains(
                    event.target
                ) ||
                button?.contains(
                    event.target
                )
            ) {
                return;
            }


            closeMobileCreateMenu();
        }
    );


    /* --------------------------------------------------------
       Window resize
       -------------------------------------------------------- */

    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth >
                767
            ) {

                closeSidebar();

                closeMobileCreateMenu();
            }
        }
    );
}


/* ============================================================
   AUTHENTICATION
   ============================================================ */

function startAuthentication() {

    onAuthStateChanged(
        auth,

        (user) => {

            if (!user) {

                cleanupListeners();

                state.authenticated = false;

                state.currentUser = null;


                const destination =
                    encodeURIComponent(
                        "profile.html"
                    );


                window.location.replace("/login");

                return;
            }


            state.authenticated = true;

            state.currentUser =
                user;


            setText(
                "profileAuthEmail",
                user.email
            );


            startProfileListeners();
        },

        (error) => {

            console.error(
                "Authentication listener failed:",
                error
            );


            showProfileError(
                "Unable to verify your account session."
            );
        }
    );
}


/* ============================================================
   INITIALIZE
   ============================================================ */

function initializeProfilePage() {

    renderCurrentDate();

    showLoadingState();

    bindEvents();

    bindGlobalSearch();

    startAuthentication();
}


/* ============================================================
   PAGE CLEANUP
   ============================================================ */

window.addEventListener(
    "pagehide",
    cleanupListeners
);


/* ============================================================
   START
   ============================================================ */

initializeProfilePage();
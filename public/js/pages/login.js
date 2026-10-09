// ============================================================
// OM MARUTI DIAMOND
// LOGIN PAGE
// ============================================================
//
// Responsibilities:
//
// 1. Validate the login form.
// 2. Show / hide password.
// 3. Authenticate through Firebase Authentication.
// 4. Handle Firebase errors safely.
// 5. Prevent duplicate submissions.
// 6. Detect existing authenticated sessions.
// 7. Initialize local development business data.
//
// IMPORTANT:
//
// This file does NOT contain:
// - passwords
// - admin credentials
// - service account keys
// - authorization rules
//
// Authentication tells us WHO the user is.
//
// Firestore Security Rules determine WHAT the user is
// allowed to access.
//
// ============================================================


// ============================================================
// FIREBASE IMPORTS
// ============================================================

import {
    onAuthStateChanged,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


import {
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js";


import {
    auth,
    functions,
    isLocalDevelopment
} from "../firebase.js";


// ============================================================
// DOM ELEMENTS
// ============================================================

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const emailError =
    document.getElementById("emailError");

const passwordError =
    document.getElementById("passwordError");

const loginMessage =
    document.getElementById("loginMessage");

const loginButton =
    document.getElementById("loginButton");

const loginButtonText =
    document.getElementById("loginButtonText");

const loginSpinner =
    document.getElementById("loginSpinner");

const togglePasswordButton =
    document.getElementById("togglePassword");


// ============================================================
// APPLICATION STATE
// ============================================================

let isSubmitting = false;

let initialAuthCheckComplete = false;


// ============================================================
// CONSTANTS
// ============================================================

const LOGIN_BUTTON_DEFAULT_TEXT = "Sign in";

const LOGIN_BUTTON_LOADING_TEXT = "Signing in...";


// ============================================================
// EMAIL VALIDATION
// ============================================================
//
// Firebase performs the actual authentication.
//
// This validation only catches obvious mistakes before
// making an authentication request.
//
// ============================================================

function isValidEmail(email) {

    if (
        typeof email !== "string" ||
        email.length === 0 ||
        email.length > 254
    ) {
        return false;
    }


    const atIndex = email.indexOf("@");

    const lastAtIndex = email.lastIndexOf("@");


    // Must contain exactly one @
    if (
        atIndex <= 0 ||
        atIndex !== lastAtIndex
    ) {
        return false;
    }


    const domain = email.slice(atIndex + 1);


    // Domain must exist and contain at least one dot.
    if (
        domain.length < 3 ||
        !domain.includes(".")
    ) {
        return false;
    }


    // Reject whitespace.
    if (/\s/.test(email)) {
        return false;
    }


    return true;

}


// ============================================================
// NORMALIZE EMAIL
// ============================================================

function normalizeEmail(value) {

    return value
        .trim()
        .toLowerCase();

}


// ============================================================
// CLEAR FIELD ERROR
// ============================================================

function clearFieldError(
    inputElement,
    errorElement
) {

    inputElement.classList.remove("input-error");

    inputElement.removeAttribute("aria-invalid");

    errorElement.textContent = "";

}


// ============================================================
// SET FIELD ERROR
// ============================================================

function setFieldError(
    inputElement,
    errorElement,
    message
) {

    inputElement.classList.add("input-error");

    inputElement.setAttribute(
        "aria-invalid",
        "true"
    );

    errorElement.textContent = message;

}


// ============================================================
// CLEAR ALL ERRORS
// ============================================================

function clearErrors() {

    clearFieldError(
        emailInput,
        emailError
    );

    clearFieldError(
        passwordInput,
        passwordError
    );

    hideLoginMessage();

}


// ============================================================
// LOGIN MESSAGE
// ============================================================

function showLoginMessage(message) {

    // textContent is intentional.
    //
    // Never inject authentication errors using innerHTML.

    loginMessage.textContent = message;

    loginMessage.hidden = false;

}


function hideLoginMessage() {

    loginMessage.textContent = "";

    loginMessage.hidden = true;

}


// ============================================================
// VALIDATE LOGIN FORM
// ============================================================

function validateLoginForm() {

    clearErrors();


    const email =
        normalizeEmail(emailInput.value);

    const password =
        passwordInput.value;


    let isValid = true;


    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    if (!email) {

        setFieldError(
            emailInput,
            emailError,
            "Enter your email address."
        );

        isValid = false;

    } else if (!isValidEmail(email)) {

        setFieldError(
            emailInput,
            emailError,
            "Enter a valid email address."
        );

        isValid = false;

    }


    // --------------------------------------------------------
    // PASSWORD
    // --------------------------------------------------------

    if (!password) {

        setFieldError(
            passwordInput,
            passwordError,
            "Enter your password."
        );

        isValid = false;

    } else if (password.length > 128) {

        setFieldError(
            passwordInput,
            passwordError,
            "Password is too long."
        );

        isValid = false;

    }


    return {
        isValid,
        email,
        password
    };

}


// ============================================================
// LOADING STATE
// ============================================================

function setLoadingState(isLoading) {

    isSubmitting = isLoading;


    loginButton.disabled =
        isLoading;

    emailInput.disabled =
        isLoading;

    passwordInput.disabled =
        isLoading;

    togglePasswordButton.disabled =
        isLoading;


    if (isLoading) {

        loginButtonText.textContent =
            LOGIN_BUTTON_LOADING_TEXT;

        loginSpinner.hidden = false;

        loginForm.setAttribute(
            "aria-busy",
            "true"
        );

    } else {

        loginButtonText.textContent =
            LOGIN_BUTTON_DEFAULT_TEXT;

        loginSpinner.hidden = true;

        loginForm.removeAttribute(
            "aria-busy"
        );

    }

}


// ============================================================
// PASSWORD VISIBILITY
// ============================================================

function togglePasswordVisibility() {

    const passwordIsHidden =
        passwordInput.type === "password";


    if (passwordIsHidden) {

        passwordInput.type = "text";

        togglePasswordButton.textContent =
            "Hide";

        togglePasswordButton.setAttribute(
            "aria-label",
            "Hide password"
        );

        togglePasswordButton.setAttribute(
            "aria-pressed",
            "true"
        );

    } else {

        passwordInput.type = "password";

        togglePasswordButton.textContent =
            "Show";

        togglePasswordButton.setAttribute(
            "aria-label",
            "Show password"
        );

        togglePasswordButton.setAttribute(
            "aria-pressed",
            "false"
        );

    }


    passwordInput.focus();

}


// ============================================================
// AUTHENTICATION ERROR MESSAGE
// ============================================================
//
// Don't expose detailed account information.
//
// A generic authentication response reveals less useful
// information to an attacker.
//
// ============================================================

function getAuthenticationErrorMessage(error) {

    const errorCode =
        typeof error?.code === "string"
            ? error.code
            : "";


    switch (errorCode) {

        // ----------------------------------------------------
        // BAD / INVALID CREDENTIALS
        // ----------------------------------------------------

        case "auth/invalid-credential":

        case "auth/user-not-found":

        case "auth/wrong-password":

        case "auth/invalid-email":

            return (
                "Unable to sign in with those credentials."
            );


        // ----------------------------------------------------
        // USER DISABLED
        // ----------------------------------------------------

        case "auth/user-disabled":

            return (
                "Unable to sign in. Contact the administrator."
            );


        // ----------------------------------------------------
        // TOO MANY ATTEMPTS
        // ----------------------------------------------------

        case "auth/too-many-requests":

            return (
                "Too many sign-in attempts. Please wait and try again."
            );


        // ----------------------------------------------------
        // NETWORK
        // ----------------------------------------------------

        case "auth/network-request-failed":

            return (
                "Network error. Check your connection and try again."
            );


        // ----------------------------------------------------
        // DEFAULT
        // ----------------------------------------------------

        default:

            return (
                "Unable to sign in right now. Please try again."
            );

    }

}


// ============================================================
// LOCAL BUSINESS BOOTSTRAP
// ============================================================
//
// DEVELOPMENT ONLY.
//
// The browser calls our callable Cloud Function.
//
// The Cloud Function itself also checks FUNCTIONS_EMULATOR,
// so the current bootstrap implementation refuses to execute
// as a production function.
//
// The authenticated Firebase UID is NOT supplied by this page.
// Firebase Authentication supplies that identity to the
// callable function.
//
// On the first successful call, the function creates:
//
// businesses/om-maruti-diamond
// members/{authenticated UID}
// settings/business
// settings/invoice
// auditLogs/{generated ID}
//
// Calling it again for the already-created local owner is safe.
//
// ============================================================

async function bootstrapLocalBusiness() {
    if (!isLocalDevelopment) return;

    const bootstrapBusiness =
        httpsCallable(
            functions,
            "bootstrapBusiness"
        );

    const result =
        await bootstrapBusiness();

    if (!result?.data?.success) {
        throw new Error(
            "Local business initialization failed."
        );
    }
}


// ============================================================
// HANDLE LOGIN
// ============================================================

async function handleLogin(event) {

    event.preventDefault();


    // Prevent accidental duplicate submissions.
    if (isSubmitting) {
        return;
    }


    const {
        isValid,
        email,
        password
    } = validateLoginForm();


    if (!isValid) {
        return;
    }


    setLoadingState(true);


    try {

        // ====================================================
        // FIREBASE AUTHENTICATION
        // ====================================================

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        // ====================================================
        // LOCAL DEVELOPMENT BOOTSTRAP
        // ====================================================
        //
        // This does not run on the deployed production site.
        //
        // It initializes our disposable local Firestore
        // environment after authentication succeeds.
        // ====================================================

        if (isLocalDevelopment) {

            await bootstrapLocalBusiness();

        }


        // ----------------------------------------------------
        // TEMPORARY SUCCESS STATE
        // ----------------------------------------------------
        //
        // We deliberately do not redirect to the dashboard yet.
        //
        // First we will verify that the local Firestore
        // structure was created correctly.
        // ----------------------------------------------------

        showLoginMessage(
            isLocalDevelopment
                ? "Login successful. Business initialized."
                : "Authentication successful."
        );

        /*
        * Authentication and local bootstrap both succeeded.
        * Continue to the protected dashboard.
        */

        window.location.replace("/");


    } catch (error) {

        // Never log passwords or authentication tokens.

        console.error(
            "Login process failed:",
            error?.code || error?.message || "unknown-error"
        );


        // Callable Function errors have a different namespace
        // from Firebase Authentication errors.

        if (
            typeof error?.code === "string" &&
            error.code.startsWith("functions/")
        ) {

            showLoginMessage(
                "Login succeeded, but local setup could not be completed."
            );

        } else {

            showLoginMessage(
                getAuthenticationErrorMessage(error)
            );

        }


    } finally {

        setLoadingState(false);


        // Remove password from the visible form after the
        // authentication attempt.

        passwordInput.value = "";

    }

}


// ============================================================
// EMAIL INPUT EVENT
// ============================================================

function handleEmailInput() {

    clearFieldError(
        emailInput,
        emailError
    );

    hideLoginMessage();

}


// ============================================================
// PASSWORD INPUT EVENT
// ============================================================

function handlePasswordInput() {

    clearFieldError(
        passwordInput,
        passwordError
    );

    hideLoginMessage();

}


// ============================================================
// AUTHENTICATION STATE OBSERVER
// ============================================================
//
// Firebase can restore an existing session asynchronously.
//
// For now, we only observe the state.
//
// Dashboard redirection will be enabled after the authorization
// and protected-page flow is complete.
//
// ============================================================

onAuthStateChanged(
    auth,
    (user) => {

        initialAuthCheckComplete = true;


        if (user) {

            console.info(
                "Authenticated Firebase session detected."
            );

            // Never expose:
            //
            // access tokens
            // refresh tokens
            // credentials
            //
            // in console output.

        } else {

            console.info(
                "No authenticated Firebase session."
            );

        }

    },
    () => {

        initialAuthCheckComplete = true;

        showLoginMessage(
            "Unable to verify your session. Please refresh the page."
        );

    }
);


// ============================================================
// EVENT LISTENERS
// ============================================================

loginForm.addEventListener(
    "submit",
    handleLogin
);


togglePasswordButton.addEventListener(
    "click",
    togglePasswordVisibility
);


emailInput.addEventListener(
    "input",
    handleEmailInput
);


passwordInput.addEventListener(
    "input",
    handlePasswordInput
);


// ============================================================
// INITIAL PAGE STATE
// ============================================================

hideLoginMessage();

emailInput.focus();
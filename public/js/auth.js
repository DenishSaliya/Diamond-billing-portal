// ============================================================
// OM MARUTI DIAMOND
// AUTHENTICATION SERVICE
// ============================================================
//
// This module provides reusable authentication functionality
// for the entire billing portal.
//
// IMPORTANT:
//
// Authentication:
//     "Who is this user?"
//
// Authorization:
//     "Is this user allowed to access this business?"
//
// Those are deliberately treated as separate concerns.
//
// ============================================================


import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


import {
    auth,
    db
} from "./firebase.js";


// ============================================================
// BUSINESS CONFIGURATION
// ============================================================
//
// We currently operate a single business.
//
// Keeping this value centralized means we don't scatter
// "om-maruti-diamond" throughout dozens of files.
//
// ============================================================

export const BUSINESS_ID = "om-maruti-diamond";


// ============================================================
// APPLICATION ROUTES
// ============================================================

const LOGIN_PAGE = "./login.html";

const DASHBOARD_PAGE = "./index.html";


// ============================================================
// AUTH STATE CACHE
// ============================================================

let currentAuthorizedSession = null;


// ============================================================
// WAIT FOR FIREBASE AUTH
// ============================================================
//
// Firebase restores the previous authentication session
// asynchronously.
//
// This Promise waits until Firebase has determined whether
// someone is logged in.
//
// ============================================================

export function waitForAuthState() {

    return new Promise((resolve, reject) => {

        const unsubscribe = onAuthStateChanged(
            auth,

            (user) => {

                unsubscribe();

                resolve(user);
            },

            (error) => {

                unsubscribe();

                reject(error);
            }
        );
    });
}


// ============================================================
// GET MEMBER DOCUMENT REFERENCE
// ============================================================

function getMemberReference(uid) {

    return doc(
        db,
        "businesses",
        BUSINESS_ID,
        "members",
        uid
    );
}


// ============================================================
// CHECK BUSINESS AUTHORIZATION
// ============================================================

export async function getBusinessAuthorization(user) {

    if (!user) {

        return {
            authorized: false,
            reason: "not-authenticated",
            user: null,
            member: null
        };
    }


    try {

        const memberReference =
            getMemberReference(user.uid);


        const memberSnapshot =
            await getDoc(memberReference);


        if (!memberSnapshot.exists()) {

            return {
                authorized: false,
                reason: "not-a-member",
                user,
                member: null
            };
        }


        const member =
            memberSnapshot.data();


        // ----------------------------------------------------
        // ACTIVE CHECK
        // ----------------------------------------------------

        if (member.active !== true) {

            return {
                authorized: false,
                reason: "inactive-member",
                user,
                member: null
            };
        }


        // ----------------------------------------------------
        // ROLE CHECK
        // ----------------------------------------------------

        const allowedRoles = [
            "owner",
            "admin",
            "staff"
        ];


        if (
            typeof member.role !== "string" ||
            !allowedRoles.includes(member.role)
        ) {

            return {
                authorized: false,
                reason: "invalid-role",
                user,
                member: null
            };
        }


        // ----------------------------------------------------
        // AUTHORIZED
        // ----------------------------------------------------

        const session = {

            authorized: true,

            reason: null,

            user,

            member: {
                uid: user.uid,

                role: member.role,

                active: true,

                displayName:
                    typeof member.displayName === "string"
                        ? member.displayName
                        : "",

                email:
                    typeof member.email === "string"
                        ? member.email
                        : ""
            },

            businessId: BUSINESS_ID
        };


        currentAuthorizedSession = session;


        return session;


    } catch (error) {

        console.error(
            "Unable to verify business authorization:",
            error?.code || "authorization-error"
        );


        return {
            authorized: false,
            reason: "authorization-error",
            user,
            member: null
        };
    }
}


// ============================================================
// REQUIRE AUTHORIZED USER
// ============================================================
//
// Protected pages will call this.
//
// Example:
//
// const session = await requireAuthorizedUser();
//
// If the visitor is not authenticated or not an authorized
// business member, they won't be allowed to continue.
//
// ============================================================

export async function requireAuthorizedUser() {

    let user;


    try {

        user = await waitForAuthState();

    } catch (error) {

        console.error(
            "Unable to restore authentication state."
        );

        redirectToLogin();

        return null;
    }


    // --------------------------------------------------------
    // NOT LOGGED IN
    // --------------------------------------------------------

    if (!user) {

        redirectToLogin();

        return null;
    }


    // --------------------------------------------------------
    // CHECK BUSINESS MEMBERSHIP
    // --------------------------------------------------------

    const authorization =
        await getBusinessAuthorization(user);


    if (!authorization.authorized) {

        // We deliberately sign unauthorized Firebase users
        // out of this portal.

        try {

            await signOut(auth);

        } catch (error) {

            console.error(
                "Unable to sign out unauthorized session."
            );
        }


        redirectToLogin(
            "unauthorized"
        );


        return null;
    }


    return authorization;
}


// ============================================================
// GET CURRENT AUTHORIZED SESSION
// ============================================================

export function getCurrentAuthorizedSession() {

    return currentAuthorizedSession;
}


// ============================================================
// LOG OUT
// ============================================================

export async function logout() {

    try {

        currentAuthorizedSession = null;

        await signOut(auth);

        redirectToLogin();


    } catch (error) {

        console.error(
            "Unable to sign out:",
            error?.code || "sign-out-error"
        );


        throw new Error(
            "Unable to sign out."
        );
    }
}


// ============================================================
// REDIRECT TO LOGIN
// ============================================================

export function redirectToLogin(reason = "") {

    const url =
        reason
            ? `${LOGIN_PAGE}?reason=${encodeURIComponent(reason)}`
            : LOGIN_PAGE;


    window.location.replace(url);
}


// ============================================================
// REDIRECT TO DASHBOARD
// ============================================================

export function redirectToDashboard() {

    window.location.replace(
        DASHBOARD_PAGE
    );
}


// ============================================================
// CHECK WHETHER LOGIN PAGE USER IS ALREADY AUTHORIZED
// ============================================================
//
// login.html can use this to avoid showing the login page to
// an already authenticated + authorized user.
//
// ============================================================

export async function redirectIfAlreadyAuthorized() {

    let user;


    try {

        user = await waitForAuthState();

    } catch (error) {

        return false;
    }


    if (!user) {

        return false;
    }


    const authorization =
        await getBusinessAuthorization(user);


    if (authorization.authorized) {

        redirectToDashboard();

        return true;
    }


    return false;
}
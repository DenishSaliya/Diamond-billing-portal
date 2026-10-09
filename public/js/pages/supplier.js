/* ============================================================
   OM MARUTI DIAMOND
   SUPPLIER ACCOUNT PAGE
   ------------------------------------------------------------
   - Supplier profile
   - Total Buy / Paid / Payable / Overdue
   - Purchase history
   - Purchase payment history
   - Secure supplier editing via updateSupplier callable
   - Dashboard-style global search
   - Responsive sidebar / mobile navigation

   SECURITY
   ------------------------------------------------------------
   - Authentication required
   - Supplier profile updates use Cloud Function
   - No browser writes to purchases/payments
   - Historical supplier snapshots remain unchanged
   - DOM values rendered with textContent/createElement
   ============================================================ */


/* ============================================================
   FIREBASE IMPORTS
   ============================================================ */

import {
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    where
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
   CONFIG
   ============================================================ */

const BUSINESS_ID =
    "om-maruti-diamond";

const MAX_SEARCH_RESULTS =
    12;


/* ============================================================
   STATE
   ============================================================ */

const state = {

    supplierId: "",
    supplier: null,

    purchases: [],
    payments: [],

    customers: [],
    suppliers: [],
    sales: [],
    globalPurchases: [],

    authenticated: false,
    listenersStarted: false,
    submitting: false,

    unsubscribers: []
};


/* ============================================================
   FIRESTORE HELPERS
   ============================================================ */

function businessCollection(
    collectionName
) {

    return collection(
        db,
        "businesses",
        BUSINESS_ID,
        collectionName
    );
}


function businessDocument(
    collectionName,
    documentId
) {

    return doc(
        db,
        "businesses",
        BUSINESS_ID,
        collectionName,
        documentId
    );
}


/* ============================================================
   DOM
   ============================================================ */

const elements = {

    /* Shell */

    sidebar:
        document.getElementById(
            "sidebar"
        ),

    sidebarOverlay:
        document.getElementById(
            "sidebarOverlay"
        ),

    mobileMenuButton:
        document.getElementById(
            "mobileMenuButton"
        ),

    logoutButton:
        document.getElementById(
            "logoutButton"
        ),

    currentDate:
        document.getElementById(
            "currentDate"
        ),


    /* Global search */

    globalSearchInput:
        document.getElementById(
            "globalSearchInput"
        ),

    globalSearchResults:
        document.getElementById(
            "globalSearchResults"
        ),

    globalSearchResultsContent:
        document.getElementById(
            "globalSearchResultsContent"
        ),


    /* Topbar */

    backToSuppliersButton:
        document.getElementById(
            "backToSuppliersButton"
        ),

    newPurchaseButton:
        document.getElementById(
            "newPurchaseButton"
        ),


    /* Page state */

    supplierLoadingState:
        document.getElementById(
            "supplierLoadingState"
        ),

    supplierErrorState:
        document.getElementById(
            "supplierErrorState"
        ),

    supplierErrorTitle:
        document.getElementById(
            "supplierErrorTitle"
        ),

    supplierErrorMessage:
        document.getElementById(
            "supplierErrorMessage"
        ),

    supplierErrorBackButton:
        document.getElementById(
            "supplierErrorBackButton"
        ),

    supplierContent:
        document.getElementById(
            "supplierContent"
        ),


    /* Header */

    supplierAvatar:
        document.getElementById(
            "supplierAvatar"
        ),

    supplierName:
        document.getElementById(
            "supplierName"
        ),

    supplierMobile:
        document.getElementById(
            "supplierMobile"
        ),

    supplierEmail:
        document.getElementById(
            "supplierEmail"
        ),

    supplierStatusBadge:
        document.getElementById(
            "supplierStatusBadge"
        ),

    editSupplierButton:
        document.getElementById(
            "editSupplierButton"
        ),

    editSupplierButton:
        document.getElementById(
            "editSupplierButton"
        ),

    headerNewPurchaseButton:
        document.getElementById(
            "headerNewPurchaseButton"
        ),


    /* Quick actions */

    quickNewPurchaseButton:
        document.getElementById(
            "quickNewPurchaseButton"
        ),

    quickRecordPaymentButton:
        document.getElementById(
            "quickRecordPaymentButton"
        ),

    quickEditSupplierButton:
        document.getElementById(
            "quickEditSupplierButton"
        ),


    /* Summary */

    supplierTotalBuyValue:
        document.getElementById(
            "supplierTotalBuyValue"
        ),

    supplierTotalBuyMeta:
        document.getElementById(
            "supplierTotalBuyMeta"
        ),

    supplierPaidValue:
        document.getElementById(
            "supplierPaidValue"
        ),

    supplierPaidMeta:
        document.getElementById(
            "supplierPaidMeta"
        ),

    supplierPayableValue:
        document.getElementById(
            "supplierPayableValue"
        ),

    supplierPayableMeta:
        document.getElementById(
            "supplierPayableMeta"
        ),

    supplierOverdueValue:
        document.getElementById(
            "supplierOverdueValue"
        ),

    supplierOverdueMeta:
        document.getElementById(
            "supplierOverdueMeta"
        ),


    /* Supplier details */

    supplierDetailName:
        document.getElementById(
            "supplierDetailName"
        ),

    supplierDetailMobile:
        document.getElementById(
            "supplierDetailMobile"
        ),

    supplierDetailEmail:
        document.getElementById(
            "supplierDetailEmail"
        ),

    supplierDetailGstin:
        document.getElementById(
            "supplierDetailGstin"
        ),

    supplierDetailPan:
        document.getElementById(
            "supplierDetailPan"
        ),

    supplierDetailAddress:
        document.getElementById(
            "supplierDetailAddress"
        ),

    supplierDetailStatus:
        document.getElementById(
            "supplierDetailStatus"
        ),

    supplierCreatedAt:
        document.getElementById(
            "supplierCreatedAt"
        ),


    /* Account position */

    supplierPositionPayable:
        document.getElementById(
            "supplierPositionPayable"
        ),

    supplierOpenPurchases:
        document.getElementById(
            "supplierOpenPurchases"
        ),

    supplierOverduePurchases:
        document.getElementById(
            "supplierOverduePurchases"
        ),

    supplierLastPurchaseDate:
        document.getElementById(
            "supplierLastPurchaseDate"
        ),

    supplierLastPaymentDate:
        document.getElementById(
            "supplierLastPaymentDate"
        ),


    /* Purchase history */

    purchaseHistoryNewButton:
        document.getElementById(
            "purchaseHistoryNewButton"
        ),

    supplierPurchasesTableBody:
        document.getElementById(
            "supplierPurchasesTableBody"
        ),

    supplierPurchasesMobileList:
        document.getElementById(
            "supplierPurchasesMobileList"
        ),

    supplierPurchasesEmptyState:
        document.getElementById(
            "supplierPurchasesEmptyState"
        ),


    /* Payment history */

    supplierPaymentsTableBody:
        document.getElementById(
            "supplierPaymentsTableBody"
        ),

    supplierPaymentsMobileList:
        document.getElementById(
            "supplierPaymentsMobileList"
        ),

    supplierPaymentsEmptyState:
        document.getElementById(
            "supplierPaymentsEmptyState"
        ),


    /* Edit modal */

    editSupplierModal:
        document.getElementById(
            "editSupplierModal"
        ),

    closeEditSupplierModalButton:
        document.getElementById(
            "closeEditSupplierModalButton"
        ),

    cancelEditSupplierButton:
        document.getElementById(
            "cancelEditSupplierButton"
        ),

    editSupplierForm:
        document.getElementById(
            "editSupplierForm"
        ),

    editSupplierName:
        document.getElementById(
            "editSupplierName"
        ),

    editSupplierMobile:
        document.getElementById(
            "editSupplierMobile"
        ),

    editSupplierEmail:
        document.getElementById(
            "editSupplierEmail"
        ),

    editSupplierGstin:
        document.getElementById(
            "editSupplierGstin"
        ),

    editSupplierPan:
        document.getElementById(
            "editSupplierPan"
        ),

    editSupplierAddress:
        document.getElementById(
            "editSupplierAddress"
        ),

    editSupplierStatus:
        document.getElementById(
            "editSupplierStatus"
        ),

    editSupplierNameError:
        document.getElementById(
            "editSupplierNameError"
        ),

    editSupplierMobileError:
        document.getElementById(
            "editSupplierMobileError"
        ),

    editSupplierEmailError:
        document.getElementById(
            "editSupplierEmailError"
        ),

    editSupplierGstinError:
        document.getElementById(
            "editSupplierGstinError"
        ),

    editSupplierPanError:
        document.getElementById(
            "editSupplierPanError"
        ),

    editSupplierAddressError:
        document.getElementById(
            "editSupplierAddressError"
        ),

    editSupplierFormMessage:
        document.getElementById(
            "editSupplierFormMessage"
        ),

    saveSupplierChangesButton:
        document.getElementById(
            "saveSupplierChangesButton"
        ),

    saveSupplierChangesButtonText:
        document.getElementById(
            "saveSupplierChangesButtonText"
        ),

    saveSupplierChangesSpinner:
        document.getElementById(
            "saveSupplierChangesSpinner"
        ),


    /* Mobile */

    mobileNewTransactionButton:
        document.getElementById(
            "mobileNewTransactionButton"
        )
};


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function text(value) {

    return String(
        value ?? ""
    );
}


function cleanText(value) {

    return text(value)
        .trim();
}


function normalizeSearchText(value) {

    return text(value)
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
            ).includes(search)
    );
}


function safePaise(value) {

    return Number.isSafeInteger(
        value
    )
        ? value
        : 0;
}


function createElement(
    tag,
    className = "",
    content = ""
) {

    const element =
        document.createElement(
            tag
        );


    if (className) {
        element.className =
            className;
    }


    if (
        content !== undefined &&
        content !== null
    ) {

        element.textContent =
            text(content);
    }


    return element;
}


/* ============================================================
   MONEY
   ============================================================ */

function formatMoney(value) {

    const paise =
        Number.isFinite(
            Number(value)
        )
            ? Number(value)
            : 0;


    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(
        paise / 100
    );
}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function timestampToDate(value) {

    if (!value) {
        return null;
    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();
    }


    if (
        value instanceof Date
    ) {

        return value;
    }


    if (
        typeof value ===
        "string"
    ) {

        const dateOnly =
            value.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );


        if (dateOnly) {

            return new Date(
                Number(dateOnly[1]),
                Number(dateOnly[2]) - 1,
                Number(dateOnly[3])
            );
        }


        const parsed =
            new Date(value);


        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {

            return parsed;
        }
    }


    if (
        typeof value ===
        "number"
    ) {

        const parsed =
            new Date(value);


        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {

            return parsed;
        }
    }


    return null;
}


function startOfDay(value) {

    const date =
        new Date(value);


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;
}


function formatDate(value) {

    const date =
        timestampToDate(
            value
        );


    if (!date) {
        return "—";
    }


    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(date);
}


function formatCurrentDate() {

    if (
        !elements.currentDate
    ) {
        return;
    }


    elements.currentDate.textContent =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(
            new Date()
        );
}


/* ============================================================
   URL
   ============================================================ */

function readSupplierNumber() {

    const pathname =
        decodeURIComponent(
            window.location.pathname
        );

    const parts =
        pathname
            .split("/")
            .filter(Boolean);

    if (
        parts.length === 2 &&
        parts[0].toLowerCase() ===
            "suppliers"
    ) {
        return cleanText(
            parts[1]
        ).toUpperCase();
    }

    return "";
}


async function resolveSupplierIdByNumber(
    supplierNumber
) {

    const cleanedSupplierNumber =
        cleanText(
            supplierNumber
        ).toUpperCase();

    if (!cleanedSupplierNumber) {
        return "";
    }

    const supplierQuery =
        query(
            businessCollection(
                "suppliers"
            ),
            where(
                "supplierNumber",
                "==",
                cleanedSupplierNumber
            ),
            limit(1)
        );

    const snapshot =
        await getDocs(
            supplierQuery
        );

    if (snapshot.empty) {
        return "";
    }

    return snapshot.docs[0].id;
}


/* ============================================================
   SUPPLIER HELPERS
   ============================================================ */

function getInitials(name) {

    const words =
        cleanText(name)
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2);


    if (!words.length) {
        return "S";
    }


    return words
        .map(
            (word) =>
                word
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");
}


function supplierIsActive(
    supplier
) {

    if (!supplier) {
        return false;
    }


    const status =
        normalizeSearchText(
            supplier.status
        );


    return (
        status !== "inactive" &&
        supplier.active !== false
    );
}


function getSupplierStatus() {

    return supplierIsActive(
        state.supplier
    )
        ? "active"
        : "inactive";
}


/* ============================================================
   PURCHASE HELPERS
   ============================================================ */

function isPurchaseCancelled(
    purchase
) {

    const status =
        normalizeSearchText(
            purchase.status
        );


    return (
        status === "cancelled" ||
        status === "canceled"
    );
}


function isPurchaseDraft(
    purchase
) {

    return (
        normalizeSearchText(
            purchase.status
        ) === "draft"
    );
}


function isFinancialPurchase(
    purchase
) {

    return (
        !isPurchaseDraft(
            purchase
        ) &&
        !isPurchaseCancelled(
            purchase
        )
    );
}


function getPurchaseTotal(
    purchase
) {

    return Math.max(
        0,
        safePaise(
            purchase.grandTotalPaise
        )
    );
}


function getPurchasePaid(
    purchase
) {

    return Math.max(
        0,
        safePaise(
            purchase.paidPaise
        )
    );
}


function getPurchaseBalance(
    purchase
) {

    if (
        !isFinancialPurchase(
            purchase
        )
    ) {

        return 0;
    }


    if (
        Number.isSafeInteger(
            purchase.balancePaise
        )
    ) {

        return Math.max(
            0,
            purchase.balancePaise
        );
    }


    return Math.max(
        0,
        getPurchaseTotal(
            purchase
        ) -
        getPurchasePaid(
            purchase
        )
    );
}


function isPurchaseOverdue(
    purchase
) {

    if (
        !isFinancialPurchase(
            purchase
        )
    ) {
        return false;
    }


    if (
        normalizeSearchText(
            purchase.purchaseType
        ) !== "credit"
    ) {
        return false;
    }


    if (
        getPurchaseBalance(
            purchase
        ) <= 0
    ) {
        return false;
    }


    const dueDate =
        timestampToDate(
            purchase.dueDate
        );


    if (!dueDate) {
        return false;
    }


    return (
        startOfDay(dueDate) <
        startOfDay(
            new Date()
        )
    );
}


/* ============================================================
   PURCHASE STATUS
   ============================================================ */

function getPurchaseDisplayStatus(
    purchase
) {

    if (
        isPurchaseCancelled(
            purchase
        )
    ) {

        return {
            key: "cancelled",
            label: "Cancelled"
        };
    }


    if (
        isPurchaseDraft(
            purchase
        )
    ) {

        return {
            key: "draft",
            label: "Draft"
        };
    }


    if (
        getPurchaseBalance(
            purchase
        ) <= 0
    ) {

        return {
            key: "paid",
            label: "Paid"
        };
    }


    if (
        isPurchaseOverdue(
            purchase
        )
    ) {

        return {
            key: "overdue",
            label: "Overdue"
        };
    }


    if (
        getPurchasePaid(
            purchase
        ) > 0
    ) {

        return {
            key: "partially_paid",
            label: "Partially Paid"
        };
    }


    return {
        key: "pending",
        label: "Pending"
    };
}


/* ============================================================
   SORTING
   ============================================================ */

function sortPurchasesNewest(
    purchases
) {

    return [
        ...purchases
    ].sort(
        (a, b) => {

            const aDate =
                timestampToDate(
                    a.purchaseDate
                );

            const bDate =
                timestampToDate(
                    b.purchaseDate
                );


            return (
                (bDate?.getTime() || 0) -
                (aDate?.getTime() || 0)
            );
        }
    );
}


function sortPaymentsNewest(
    payments
) {

    return [
        ...payments
    ].sort(
        (a, b) => {

            const aDate =
                timestampToDate(
                    a.paymentDate
                );

            const bDate =
                timestampToDate(
                    b.paymentDate
                );


            return (
                (bDate?.getTime() || 0) -
                (aDate?.getTime() || 0)
            );
        }
    );
}


/* ============================================================
   ACCOUNT STATS
   ============================================================ */

function calculateAccountStats() {

    let totalBuyPaise = 0;
    let payablePaise = 0;
    let overduePaise = 0;

    let completedCount = 0;
    let openCount = 0;
    let overdueCount = 0;


    for (
        const purchase of
        state.purchases
    ) {

        if (
            !isFinancialPurchase(
                purchase
            )
        ) {
            continue;
        }


        completedCount += 1;

        totalBuyPaise +=
            getPurchaseTotal(
                purchase
            );


        const balance =
            getPurchaseBalance(
                purchase
            );


        payablePaise +=
            balance;


        if (
            balance > 0
        ) {
            openCount += 1;
        }


        if (
            isPurchaseOverdue(
                purchase
            )
        ) {

            overdueCount += 1;

            overduePaise +=
                balance;
        }
    }


    /*
     * Payment history is the source for total actual
     * payments to this supplier.
     */

    const paidPaise =
        state.payments.reduce(
            (total, payment) =>
                total +
                Math.max(
                    0,
                    safePaise(
                        payment.amountPaise
                    )
                ),
            0
        );


    const purchases =
        sortPurchasesNewest(
            state.purchases
        );


    const payments =
        sortPaymentsNewest(
            state.payments
        );


    return {
        totalBuyPaise,
        paidPaise,
        payablePaise,
        overduePaise,

        completedCount,
        openCount,
        overdueCount,

        lastPurchase:
            purchases[0] ||
            null,

        lastPayment:
            payments[0] ||
            null
    };
}


/* ============================================================
   PAGE STATE
   ============================================================ */

function showLoading() {

    if (
        elements.supplierLoadingState
    ) {
        elements.supplierLoadingState.hidden =
            false;
    }


    if (
        elements.supplierErrorState
    ) {
        elements.supplierErrorState.hidden =
            true;
    }


    if (
        elements.supplierContent
    ) {
        elements.supplierContent.hidden =
            true;
    }
}


function showContent() {

    if (
        elements.supplierLoadingState
    ) {
        elements.supplierLoadingState.hidden =
            true;
    }


    if (
        elements.supplierErrorState
    ) {
        elements.supplierErrorState.hidden =
            true;
    }


    if (
        elements.supplierContent
    ) {
        elements.supplierContent.hidden =
            false;
    }
}


function showError(
    title,
    message
) {

    if (
        elements.supplierLoadingState
    ) {
        elements.supplierLoadingState.hidden =
            true;
    }


    if (
        elements.supplierContent
    ) {
        elements.supplierContent.hidden =
            true;
    }


    if (
        elements.supplierErrorTitle
    ) {
        elements.supplierErrorTitle.textContent =
            title;
    }


    if (
        elements.supplierErrorMessage
    ) {
        elements.supplierErrorMessage.textContent =
            message;
    }


    if (
        elements.supplierErrorState
    ) {
        elements.supplierErrorState.hidden =
            false;
    }
}


/* ============================================================
   PROFILE RENDER
   ============================================================ */

function renderSupplierProfile() {

    const supplier =
        state.supplier;


    if (!supplier) {
        return;
    }


    const name =
        cleanText(
            supplier.name
        ) ||
        "Supplier";


    const mobile =
        cleanText(
            supplier.mobile
        ) ||
        "—";


    const email =
        cleanText(
            supplier.email
        ) ||
        "—";


    const gstin =
        cleanText(
            supplier.gstin
        ) ||
        "—";


    const pan =
        cleanText(
            supplier.pan
        ) ||
        "—";


    const address =
        cleanText(
            supplier.address
        ) ||
        "—";


    const active =
        supplierIsActive(
            supplier
        );


    if (
        elements.supplierAvatar
    ) {
        elements.supplierAvatar.textContent =
            getInitials(name);
    }


    if (
        elements.supplierName
    ) {
        elements.supplierName.textContent =
            name;
    }


    if (
        elements.supplierMobile
    ) {
        elements.supplierMobile.textContent =
            mobile;
    }


    if (
        elements.supplierEmail
    ) {
        elements.supplierEmail.textContent =
            email;
    }


    if (
        elements.supplierStatusBadge
    ) {

        elements.supplierStatusBadge.textContent =
            active
                ? "Active"
                : "Inactive";

        elements.supplierStatusBadge.dataset.status =
            active
                ? "active"
                : "inactive";
    }


    if (
        elements.supplierDetailName
    ) {
        elements.supplierDetailName.textContent =
            name;
    }


    if (
        elements.supplierDetailMobile
    ) {
        elements.supplierDetailMobile.textContent =
            mobile;
    }


    if (
        elements.supplierDetailEmail
    ) {
        elements.supplierDetailEmail.textContent =
            email;
    }


    if (
        elements.supplierDetailGstin
    ) {
        elements.supplierDetailGstin.textContent =
            gstin;
    }


    if (
        elements.supplierDetailPan
    ) {
        elements.supplierDetailPan.textContent =
            pan;
    }


    if (
        elements.supplierDetailAddress
    ) {
        elements.supplierDetailAddress.textContent =
            address;
    }


    if (
        elements.supplierDetailStatus
    ) {
        elements.supplierDetailStatus.textContent =
            active
                ? "Active"
                : "Inactive";
    }


    if (
        elements.supplierCreatedAt
    ) {
        elements.supplierCreatedAt.textContent =
            formatDate(
                supplier.createdAt
            );
    }


    document.title =
        `${name} | OM MARUTI DIAMOND`;
}


/* ============================================================
   SUMMARY RENDER
   ============================================================ */

function renderSummary() {

    const stats =
        calculateAccountStats();


    if (
        elements.supplierTotalBuyValue
    ) {
        elements.supplierTotalBuyValue.textContent =
            formatMoney(
                stats.totalBuyPaise
            );
    }


    if (
        elements.supplierTotalBuyMeta
    ) {

        elements.supplierTotalBuyMeta.textContent =
            stats.completedCount === 1
                ? "1 completed purchase"
                : `${stats.completedCount} completed purchases`;
    }


    if (
        elements.supplierPaidValue
    ) {
        elements.supplierPaidValue.textContent =
            formatMoney(
                stats.paidPaise
            );
    }


    if (
        elements.supplierPaidMeta
    ) {

        elements.supplierPaidMeta.textContent =
            state.payments.length === 1
                ? "1 recorded payment"
                : `${state.payments.length} recorded payments`;
    }


    if (
        elements.supplierPayableValue
    ) {
        elements.supplierPayableValue.textContent =
            formatMoney(
                stats.payablePaise
            );
    }


    if (
        elements.supplierPayableMeta
    ) {

        elements.supplierPayableMeta.textContent =
            stats.openCount === 1
                ? "1 open purchase"
                : `${stats.openCount} open purchases`;
    }


    if (
        elements.supplierOverdueValue
    ) {
        elements.supplierOverdueValue.textContent =
            formatMoney(
                stats.overduePaise
            );
    }


    if (
        elements.supplierOverdueMeta
    ) {

        elements.supplierOverdueMeta.textContent =
            stats.overdueCount === 1
                ? "1 overdue purchase"
                : `${stats.overdueCount} overdue purchases`;
    }


    /* Account position */

    if (
        elements.supplierPositionPayable
    ) {
        elements.supplierPositionPayable.textContent =
            formatMoney(
                stats.payablePaise
            );
    }


    if (
        elements.supplierOpenPurchases
    ) {
        elements.supplierOpenPurchases.textContent =
            String(
                stats.openCount
            );
    }


    if (
        elements.supplierOverduePurchases
    ) {
        elements.supplierOverduePurchases.textContent =
            String(
                stats.overdueCount
            );
    }


    if (
        elements.supplierLastPurchaseDate
    ) {

        elements.supplierLastPurchaseDate.textContent =
            stats.lastPurchase
                ? formatDate(
                    stats
                        .lastPurchase
                        .purchaseDate
                )
                : "—";
    }


    if (
        elements.supplierLastPaymentDate
    ) {

        elements.supplierLastPaymentDate.textContent =
            stats.lastPayment
                ? formatDate(
                    stats
                        .lastPayment
                        .paymentDate
                )
                : "—";
    }
}


/* ============================================================
   BADGES
   ============================================================ */

function createPurchaseStatusBadge(
    purchase
) {

    const status =
        getPurchaseDisplayStatus(
            purchase
        );


    const badge =
        createElement(
            "span",
            "supplier-history-status",
            status.label
        );


    badge.dataset.status =
        status.key;


    return badge;
}


/* ============================================================
   PURCHASE ROUTE
   ============================================================ */

function openPurchase(
    purchase
) {

    const purchaseNumber =
        cleanText(
            purchase?.purchaseNumber
        ).toUpperCase();


    if (!purchaseNumber) {
        return;
    }


    window.location.href =
        `/purchases/${encodeURIComponent(
            purchaseNumber
        )}`;
}

/* ============================================================
   PURCHASE HISTORY - DESKTOP
   ============================================================ */

function renderPurchaseTable() {

    const body =
        elements
            .supplierPurchasesTableBody;


    if (!body) {
        return;
    }


    body.replaceChildren();


    const purchases =
        sortPurchasesNewest(
            state.purchases
        );


    const fragment =
        document.createDocumentFragment();


    for (
        const purchase of purchases
    ) {

        const row =
            document.createElement(
                "tr"
            );


        row.tabIndex = 0;


        row.addEventListener(
            "click",
            () =>
                openPurchase(
                purchase
            )
        );


        row.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    openPurchase(
                        purchase
                    );
                }
            }
        );


        /* Purchase number */

        const numberCell =
            document.createElement(
                "td"
            );


        numberCell.appendChild(
            createElement(
                "strong",
                "",
                cleanText(
                    purchase.purchaseNumber
                ) ||
                "—"
            )
        );


        row.appendChild(
            numberCell
        );


        /* Date */

        row.appendChild(
            createElement(
                "td",
                "",
                formatDate(
                    purchase.purchaseDate
                )
            )
        );


        /* Supplier bill */

        row.appendChild(
            createElement(
                "td",
                "",
                cleanText(
                    purchase.supplierInvoiceNumber
                ) ||
                "—"
            )
        );


        /* Type */

        row.appendChild(
            createElement(
                "td",
                "",
                normalizeSearchText(
                    purchase.purchaseType
                ) === "credit"
                    ? "Credit"
                    : "Cash"
            )
        );


        /* Total */

        row.appendChild(
            createElement(
                "td",
                "supplier-history-money",
                formatMoney(
                    getPurchaseTotal(
                        purchase
                    )
                )
            )
        );


        /* Paid */

        row.appendChild(
            createElement(
                "td",
                "supplier-history-money",
                formatMoney(
                    getPurchasePaid(
                        purchase
                    )
                )
            )
        );


        /* Payable */

        row.appendChild(
            createElement(
                "td",
                "supplier-history-money",
                formatMoney(
                    getPurchaseBalance(
                        purchase
                    )
                )
            )
        );


        /* Due date */

        row.appendChild(
            createElement(
                "td",
                "",
                normalizeSearchText(
                    purchase.purchaseType
                ) === "credit"
                    ? formatDate(
                        purchase.dueDate
                    )
                    : "—"
            )
        );


        /* Status */

        const statusCell =
            document.createElement(
                "td"
            );


        statusCell.appendChild(
            createPurchaseStatusBadge(
                purchase
            )
        );


        row.appendChild(
            statusCell
        );


        /* Action */

        const actionCell =
            document.createElement(
                "td"
            );


        const button =
            createElement(
                "button",
                "supplier-history-view",
                "View"
            );


        button.type =
            "button";


        button.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                openPurchase(
                    purchase
                );
            }
        );


        actionCell.appendChild(
            button
        );


        row.appendChild(
            actionCell
        );


        fragment.appendChild(
            row
        );
    }


    body.appendChild(
        fragment
    );
}


/* ============================================================
   PURCHASE HISTORY - MOBILE
   ============================================================ */

function renderPurchaseMobileList() {

    const container =
        elements
            .supplierPurchasesMobileList;


    if (!container) {
        return;
    }


    container.replaceChildren();


    const purchases =
        sortPurchasesNewest(
            state.purchases
        );


    const fragment =
        document.createDocumentFragment();


    for (
        const purchase of purchases
    ) {

        const card =
            createElement(
                "article",
                "supplier-history-mobile-card"
            );


        card.tabIndex = 0;


        card.addEventListener(
            "click",
            () =>
                openPurchase(
                    purchase
                )
        );


        card.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    openPurchase(
                        purchase
                    );
                }
            }
        );


        const header =
            createElement(
                "div",
                "supplier-history-mobile-header"
            );


        const heading =
            createElement(
                "div"
            );


        heading.append(
            createElement(
                "strong",
                "",
                cleanText(
                    purchase.purchaseNumber
                ) ||
                "Buy"
            ),

            createElement(
                "span",
                "",
                formatDate(
                    purchase.purchaseDate
                )
            )
        );


        header.append(
            heading,
            createPurchaseStatusBadge(
                purchase
            )
        );


        const grid =
            createElement(
                "div",
                "supplier-history-mobile-grid"
            );


        grid.append(
            createMobileValue(
                "Total",
                formatMoney(
                    getPurchaseTotal(
                        purchase
                    )
                )
            ),

            createMobileValue(
                "Paid",
                formatMoney(
                    getPurchasePaid(
                        purchase
                    )
                )
            ),

            createMobileValue(
                "Payable",
                formatMoney(
                    getPurchaseBalance(
                        purchase
                    )
                )
            ),

            createMobileValue(
                "Type",
                normalizeSearchText(
                    purchase.purchaseType
                ) === "credit"
                    ? "Credit"
                    : "Cash"
            )
        );


        const footer =
            createElement(
                "div",
                "supplier-history-mobile-footer"
            );


        footer.append(
            createElement(
                "span",
                "",
                cleanText(
                    purchase.supplierInvoiceNumber
                )
                    ? `Supplier Bill: ${cleanText(
                        purchase.supplierInvoiceNumber
                    )}`
                    : "Supplier Bill: —"
            ),

            createElement(
                "span",
                "",
                "View →"
            )
        );


        card.append(
            header,
            grid,
            footer
        );


        fragment.appendChild(
            card
        );
    }


    container.appendChild(
        fragment
    );
}


function createMobileValue(
    label,
    value
) {

    const wrapper =
        createElement(
            "div",
            "supplier-history-mobile-value"
        );


    wrapper.append(
        createElement(
            "span",
            "",
            label
        ),

        createElement(
            "strong",
            "",
            value
        )
    );


    return wrapper;
}


/* ============================================================
   PURCHASE HISTORY
   ============================================================ */

function renderPurchases() {

    renderPurchaseTable();

    renderPurchaseMobileList();


    const count =
        state.purchases.length;


    const countElement =
        document.getElementById(
            "supplierPurchaseCount"
        );


    if (countElement) {

        countElement.textContent =
            count === 1
                ? "1 purchase"
                : `${count} purchases`;
    }


    const empty =
        count === 0;


    if (
        elements.supplierPurchasesEmptyState
    ) {

        elements.supplierPurchasesEmptyState.hidden =
            !empty;
    }
}


/* ============================================================
   PAYMENT HELPERS
   ============================================================ */

function getPaymentPurchase(
    payment
) {

    return (
        state.purchases.find(
            (purchase) =>
                purchase.id ===
                payment.purchaseId
        ) ||
        null
    );
}


function getPaymentPurchaseNumber(
    payment
) {

    const purchase =
        getPaymentPurchase(
            payment
        );


    return (
        cleanText(
            payment.purchaseNumber
        ) ||
        cleanText(
            purchase?.purchaseNumber
        ) ||
        "—"
    );
}


function formatPaymentMethod(
    method
) {

    const value =
        normalizeSearchText(
            method
        );


    switch (value) {

        case "cash":
            return "Cash";

        case "bank":
            return "Bank";

        case "upi":
            return "UPI";

        case "cheque":
            return "Cheque";

        case "other":
            return "Other";

        default:
            return cleanText(method) || "—";
    }
}


/* ============================================================
   PAYMENT HISTORY - DESKTOP
   ============================================================ */

function renderPaymentTable() {

    const body =
        elements
            .supplierPaymentsTableBody;


    if (!body) {
        return;
    }


    body.replaceChildren();


    const payments =
        sortPaymentsNewest(
            state.payments
        );


    const fragment =
        document.createDocumentFragment();


    for (
        const payment of payments
    ) {

        const row =
            document.createElement(
                "tr"
            );


        const purchase =
            getPaymentPurchase(
                payment
            );


        if (purchase) {

            row.tabIndex = 0;


            row.addEventListener(
                "click",
                () =>
                    openPurchase(
                        purchase
                    )
            );


            row.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        openPurchase(
                            purchase
                        );
                    }
                }
            );
        }


        row.append(
            createElement(
                "td",
                "",
                formatDate(
                    payment.paymentDate
                )
            ),

            createElement(
                "td",
                "",
                getPaymentPurchaseNumber(
                    payment
                )
            ),

            createElement(
                "td",
                "",
                formatPaymentMethod(
                    payment.method
                )
            ),

            createElement(
                "td",
                "",
                cleanText(
                    payment.reference
                ) ||
                "—"
            ),

            createElement(
                "td",
                "supplier-payment-amount",
                formatMoney(
                    Math.max(
                        0,
                        safePaise(
                            payment.amountPaise
                        )
                    )
                )
            )
        );


        fragment.appendChild(
            row
        );
    }


    body.appendChild(
        fragment
    );
}


/* ============================================================
   PAYMENT HISTORY - MOBILE
   ============================================================ */

function renderPaymentMobileList() {

    const container =
        elements
            .supplierPaymentsMobileList;


    if (!container) {
        return;
    }


    container.replaceChildren();


    const payments =
        sortPaymentsNewest(
            state.payments
        );


    const fragment =
        document.createDocumentFragment();


    for (
        const payment of payments
    ) {

        const purchase =
            getPaymentPurchase(
                payment
            );


        const card =
            createElement(
                "article",
                "supplier-payment-mobile-card"
            );


        if (purchase) {

            card.tabIndex = 0;


            card.addEventListener(
                "click",
                () =>
                    openPurchase(
                        purchase
                    )
            );


            card.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        openPurchase(
                            purchase
                        );
                    }
                }
            );
        }


        const header =
            createElement(
                "div",
                "supplier-payment-mobile-header"
            );


        header.append(
            createElement(
                "strong",
                "",
                formatMoney(
                    Math.max(
                        0,
                        safePaise(
                            payment.amountPaise
                        )
                    )
                )
            ),

            createElement(
                "span",
                "",
                formatDate(
                    payment.paymentDate
                )
            )
        );


        const details =
            createElement(
                "div",
                "supplier-payment-mobile-details"
            );


        details.append(
            createMobileValue(
                "Purchase",
                getPaymentPurchaseNumber(
                    payment
                )
            ),

            createMobileValue(
                "Method",
                formatPaymentMethod(
                    payment.method
                )
            ),

            createMobileValue(
                "Reference",
                cleanText(
                    payment.reference
                ) ||
                "—"
            )
        );


        card.append(
            header,
            details
        );


        fragment.appendChild(
            card
        );
    }


    container.appendChild(
        fragment
    );
}


/* ============================================================
   PAYMENT HISTORY
   ============================================================ */

function renderPayments() {

    renderPaymentTable();

    renderPaymentMobileList();


    const count =
        state.payments.length;


    const countElement =
        document.getElementById(
            "supplierPaymentCount"
        );


    if (countElement) {

        countElement.textContent =
            count === 1
                ? "1 payment"
                : `${count} payments`;
    }


    if (
        elements.supplierPaymentsEmptyState
    ) {

        elements.supplierPaymentsEmptyState.hidden =
            count !== 0;
    }
}


/* ============================================================
   MAIN ACCOUNT RENDER
   ============================================================ */

function renderAccount() {

    if (!state.supplier) {
        return;
    }


    renderSupplierProfile();

    renderSummary();

    renderPurchases();

    renderPayments();

    showContent();

    refreshSearchIfOpen();
}


/* ============================================================
   EDIT SUPPLIER MODAL
   ============================================================ */

function clearFieldError(
    element
) {

    if (!element) {
        return;
    }


    element.textContent =
        "";

    element.hidden =
        true;
}


function showFieldError(
    element,
    message
) {

    if (!element) {
        return;
    }


    element.textContent =
        message;

    element.hidden =
        false;
}


function clearEditErrors() {

    clearFieldError(
        elements.editSupplierNameError
    );

    clearFieldError(
        elements.editSupplierMobileError
    );

    clearFieldError(
        elements.editSupplierEmailError
    );

    clearFieldError(
        elements.editSupplierGstinError
    );

    clearFieldError(
        elements.editSupplierPanError
    );

    clearFieldError(
        elements.editSupplierAddressError
    );


    hideEditMessage();
}


function showEditMessage(
    message,
    type = "error"
) {

    if (
        !elements.editSupplierFormMessage
    ) {
        return;
    }


    elements.editSupplierFormMessage.textContent =
        message;

    elements.editSupplierFormMessage.dataset.type =
        type;

    elements.editSupplierFormMessage.hidden =
        false;
}


function hideEditMessage() {

    if (
        !elements.editSupplierFormMessage
    ) {
        return;
    }


    elements.editSupplierFormMessage.textContent =
        "";

    elements.editSupplierFormMessage.hidden =
        true;

    elements.editSupplierFormMessage.removeAttribute(
        "data-type"
    );
}


function populateEditForm() {

    const supplier =
        state.supplier;


    if (!supplier) {
        return;
    }


    if (
        elements.editSupplierName
    ) {
        elements.editSupplierName.value =
            cleanText(
                supplier.name
            );
    }


    if (
        elements.editSupplierMobile
    ) {
        elements.editSupplierMobile.value =
            cleanText(
                supplier.mobile
            );
    }


    if (
        elements.editSupplierEmail
    ) {
        elements.editSupplierEmail.value =
            cleanText(
                supplier.email
            );
    }


    if (
        elements.editSupplierGstin
    ) {
        elements.editSupplierGstin.value =
            cleanText(
                supplier.gstin
            );
    }


    if (
        elements.editSupplierPan
    ) {
        elements.editSupplierPan.value =
            cleanText(
                supplier.pan
            );
    }


    if (
        elements.editSupplierAddress
    ) {
        elements.editSupplierAddress.value =
            cleanText(
                supplier.address
            );
    }


    if (
        elements.editSupplierStatus
    ) {
        elements.editSupplierStatus.value =
            getSupplierStatus();
    }
}


function openEditSupplierModal() {

    if (
        !state.supplier ||
        !elements.editSupplierModal
    ) {
        return;
    }


    clearEditErrors();

    populateEditForm();


    elements.editSupplierModal.hidden =
        false;


    document.body.classList.add(
        "modal-open"
    );


    window.setTimeout(
        () => {
            elements.editSupplierName
                ?.focus();
        },
        0
    );
}


function closeEditSupplierModal() {

    if (
        state.submitting
    ) {
        return;
    }


    if (
        elements.editSupplierModal
    ) {
        elements.editSupplierModal.hidden =
            true;
    }


    document.body.classList.remove(
        "modal-open"
    );


    clearEditErrors();
}


/* ============================================================
   EDIT VALIDATION
   ============================================================ */

function normalizeGstin(value) {

    return cleanText(value)
        .replace(/\s+/g, "")
        .toUpperCase();
}


function normalizePan(value) {

    return cleanText(value)
        .replace(/\s+/g, "")
        .toUpperCase();
}


function validateEditSupplier() {

    clearEditErrors();


    const name =
        cleanText(
            elements.editSupplierName
                ?.value
        );


    const mobile =
        cleanText(
            elements.editSupplierMobile
                ?.value
        );


    const email =
        cleanText(
            elements.editSupplierEmail
                ?.value
        );


    const gstin =
        normalizeGstin(
            elements.editSupplierGstin
                ?.value
        );


    const pan =
        normalizePan(
            elements.editSupplierPan
                ?.value
        );


    const address =
        cleanText(
            elements.editSupplierAddress
                ?.value
        );


    const status =
        normalizeSearchText(
            elements.editSupplierStatus
                ?.value
        ) ||
        "active";


    let valid =
        true;


    if (!name) {

        showFieldError(
            elements.editSupplierNameError,
            "Supplier name is required."
        );

        valid = false;
    }


    if (
        name.length > 160
    ) {

        showFieldError(
            elements.editSupplierNameError,
            "Supplier name is too long."
        );

        valid = false;
    }


    if (
        mobile.length > 30
    ) {

        showFieldError(
            elements.editSupplierMobileError,
            "Mobile number is too long."
        );

        valid = false;
    }


    if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email)
    ) {

        showFieldError(
            elements.editSupplierEmailError,
            "Enter a valid email address."
        );

        valid = false;
    }


    if (
        gstin &&
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
            .test(gstin)
    ) {

        showFieldError(
            elements.editSupplierGstinError,
            "Enter a valid GSTIN."
        );

        valid = false;
    }


    if (
        pan &&
        !/^[A-Z]{5}[0-9]{4}[A-Z]$/
            .test(pan)
    ) {

        showFieldError(
            elements.editSupplierPanError,
            "Enter a valid PAN."
        );

        valid = false;
    }


    if (
        address.length > 500
    ) {

        showFieldError(
            elements.editSupplierAddressError,
            "Address is too long."
        );

        valid = false;
    }


    if (
        status !== "active" &&
        status !== "inactive"
    ) {

        valid = false;

        showEditMessage(
            "Invalid supplier account status."
        );
    }


    return {
        valid,

        data: {
            supplierId:
                state.supplierId,

            name,
            mobile,
            email,
            gstin,
            pan,
            address,
            status
        }
    };
}


/* ============================================================
   SUBMIT STATE
   ============================================================ */

function setEditSubmitting(
    submitting
) {

    state.submitting =
        submitting;


    if (
        elements.saveSupplierChangesButton
    ) {
        elements.saveSupplierChangesButton.disabled =
            submitting;
    }


    if (
        elements.cancelEditSupplierButton
    ) {
        elements.cancelEditSupplierButton.disabled =
            submitting;
    }


    if (
        elements.closeEditSupplierModalButton
    ) {
        elements.closeEditSupplierModalButton.disabled =
            submitting;
    }


    if (
        elements.saveSupplierChangesButtonText
    ) {

        elements.saveSupplierChangesButtonText.textContent =
            submitting
                ? "Saving..."
                : "Save Changes";
    }


    if (
        elements.saveSupplierChangesSpinner
    ) {
        elements.saveSupplierChangesSpinner.hidden =
            !submitting;
    }
}


/* ============================================================
   UPDATE SUPPLIER
   ============================================================ */

async function handleEditSupplierSubmit(
    event
) {

    event.preventDefault();


    if (
        state.submitting
    ) {
        return;
    }


    const validation =
        validateEditSupplier();


    if (
        !validation.valid
    ) {

        if (
            elements.editSupplierFormMessage
                ?.hidden
        ) {

            showEditMessage(
                "Please correct the highlighted supplier details."
            );
        }

        return;
    }


    setEditSubmitting(
        true
    );


    hideEditMessage();


    try {

        const updateSupplier =
            httpsCallable(
                functions,
                "updateSupplier"
            );


        const response =
            await updateSupplier(
                validation.data
            );


        if (
            response.data?.success ===
            false
        ) {

            throw new Error(
                response.data?.message ||
                "Supplier could not be updated."
            );
        }


        showEditMessage(
            "Supplier updated successfully.",
            "success"
        );


        /*
         * The realtime supplier listener will receive the
         * authoritative updated supplier document.
         */

        window.setTimeout(
            () => {

                if (
                    !state.submitting
                ) {
                    closeEditSupplierModal();
                }

            },
            450
        );

    } catch (error) {

        console.error(
            "Update supplier failed:",
            error
        );


        showEditMessage(
            cleanText(
                error?.message
            ) ||
            "Supplier could not be updated. Please try again."
        );

    } finally {

        setEditSubmitting(
            false
        );
    }
}


/* ============================================================
   NEW BUY
   ============================================================ */

function openNewPurchase() {

    const supplierNumber =
        cleanText(
            state.supplier?.supplierNumber
        )
            .toUpperCase();


    if (supplierNumber) {

        sessionStorage.setItem(
            "omdNewPurchaseSupplierNumber",
            supplierNumber
        );

    } else {

        sessionStorage.removeItem(
            "omdNewPurchaseSupplierNumber"
        );
    }


    window.location.href =
        "/purchases/new";
}


/* ============================================================
   RECORD SUPPLIER PAYMENT
   ============================================================ */
function handleRecordSupplierPayment() {

    const outstandingPurchases =
        sortPurchasesNewest(
            state.purchases.filter(
                (purchase) =>
                    isFinancialPurchase(purchase) &&
                    getPurchaseBalance(purchase) > 0
            )
        );

    if (outstandingPurchases.length === 0) {

        window.alert(
            "This supplier has no outstanding purchase balance."
        );

        return;
    }

    if (outstandingPurchases.length === 1) {

        const purchase =
            outstandingPurchases[0];

        const purchaseNumber =
            cleanText(
                purchase.purchaseNumber
            ).toUpperCase();

        if (!purchaseNumber) {

            console.error(
                "Purchase number is missing:",
                purchase
            );

            window.alert(
                "Unable to open payment: purchase number is missing."
            );

            return;
        }

        window.location.href =
            `/purchases/${encodeURIComponent(
                purchaseNumber
            )}?action=payment`;

        return;
    }

    /*
     * Multiple outstanding purchases:
     * Admin must choose which Buy to pay.
     */

    window.location.href =
        "/purchases";
}

/* ============================================================
   GLOBAL SEARCH LOOKUPS
   ============================================================ */

function findGlobalSupplier(
    supplierId
) {

    return (
        state.suppliers.find(
            (supplier) =>
                supplier.id ===
                supplierId
        ) ||
        null
    );
}


function findCustomer(
    customerId
) {

    return (
        state.customers.find(
            (customer) =>
                customer.id ===
                customerId
        ) ||
        null
    );
}


function getPurchaseSupplierName(
    purchase
) {

    const snapshot =
        purchase.supplierSnapshot ||
        {};


    const snapshotName =
        cleanText(
            snapshot.name ||
            snapshot.businessName ||
            snapshot.companyName
        );


    if (snapshotName) {
        return snapshotName;
    }


    const supplier =
        findGlobalSupplier(
            purchase.supplierId
        );


    return (
        cleanText(
            supplier?.name
        ) ||
        "Supplier"
    );
}


function getSaleCustomerName(
    sale
) {

    const snapshot =
        sale.customerSnapshot ||
        sale.billTo ||
        {};


    const snapshotName =
        cleanText(
            snapshot.name ||
            snapshot.businessName ||
            snapshot.companyName
        );


    if (snapshotName) {
        return snapshotName;
    }


    const customer =
        findCustomer(
            sale.customerId
        );


    return (
        cleanText(
            customer?.name
        ) ||
        "Customer"
    );
}


/* ============================================================
   GLOBAL SEARCH
   ============================================================ */

function buildSearchResults(
    rawSearch
) {

    const search =
        normalizeSearchText(
            rawSearch
        );


    if (!search) {
        return [];
    }


    const results = [];


    /* Customers */

    for (
        const customer of
        state.customers
    ) {

        if (
            !containsSearch(
                search,

                customer.name,
                customer.mobile,
                customer.email,
                customer.gstin,
                customer.address
            )
        ) {
            continue;
        }


        results.push({
            type:
                "Customer",

            title:
                cleanText(
                    customer.name
                ) ||
                "Customer",

            subtitle:
                cleanText(
                    customer.mobile ||
                    customer.gstin
                ) ||
                "Customer account",

            href:
                customer.customerNumber
                    ? `/customers/${encodeURIComponent(
                        cleanText(
                            customer.customerNumber
                        ).toUpperCase()
                    )}`
                    : "/customers"
        });
    }


    /* Suppliers */

    for (
        const supplier of
        state.suppliers
    ) {

        if (
            !containsSearch(
                search,
                supplier.supplierNumber,
                supplier.name,
                supplier.mobile,
                supplier.email,
                supplier.gstin,
                supplier.address
            )
        ) {
            continue;
        }


        results.push({
            type:
                "Supplier",

            title:
                cleanText(
                    supplier.name
                ) ||
                "Supplier",

            subtitle:
                cleanText(
                    supplier.mobile ||
                    supplier.gstin
                ) ||
                "Supplier account",

            href:
            supplier.supplierNumber
                ? `/suppliers/${encodeURIComponent(
                    cleanText(
                        supplier.supplierNumber
                    ).toUpperCase()
                )}`
                : "/suppliers"
        });
    }


    /* Sell */

    for (
        const sale of
        state.sales
    ) {

        const snapshot =
            sale.customerSnapshot ||
            sale.billTo ||
            {};


        const party =
            getSaleCustomerName(
                sale
            );


        if (
            !containsSearch(
                search,

                sale.invoiceNumber,
                party,
                snapshot.mobile,
                snapshot.gstin,
                sale.saleType,
                sale.status,
                safePaise(
                    sale.grandTotalPaise
                ) / 100
            )
        ) {
            continue;
        }


        results.push({
            type:
                "Sell",

            title:
                cleanText(
                    sale.invoiceNumber
                ) ||
                "Sell",

            subtitle:
                `${party} • ${formatMoney(
                    safePaise(
                        sale.grandTotalPaise
                    )
                )}`,

            href:
                sale.invoiceNumber
                    ? `/sales/${encodeURIComponent(
                        cleanText(
                            sale.invoiceNumber
                        ).toUpperCase()
                    )}`
                    : "/sales"
        });
    }


    /* Buy */

    for (
        const purchase of
        state.globalPurchases
    ) {

        const snapshot =
            purchase.supplierSnapshot ||
            {};


        const party =
            getPurchaseSupplierName(
                purchase
            );


        if (
            !containsSearch(
                search,

                purchase.purchaseNumber,
                purchase.supplierInvoiceNumber,
                party,
                snapshot.mobile,
                snapshot.gstin,
                purchase.purchaseType,
                purchase.status,
                safePaise(
                    purchase.grandTotalPaise
                ) / 100
            )
        ) {
            continue;
        }


        results.push({
            type:
                "Buy",

            title:
                cleanText(
                    purchase.purchaseNumber
                ) ||
                "Buy",

            subtitle:
                `${party} • ${formatMoney(
                    safePaise(
                        purchase.grandTotalPaise
                    )
                )}`,

            href:
            purchase.purchaseNumber
                ? `/purchases/${encodeURIComponent(
                    cleanText(
                        purchase.purchaseNumber
                    ).toUpperCase()
                )}`
                : "/purchases"
        });
    }


    return results.slice(
        0,
        MAX_SEARCH_RESULTS
    );
}


/* ============================================================
   GLOBAL SEARCH RENDER
   ============================================================ */

function hideGlobalSearchResults() {

    if (
        elements.globalSearchResults
    ) {
        elements.globalSearchResults.hidden =
            true;
    }


    if (
        elements.globalSearchResultsContent
    ) {
        elements.globalSearchResultsContent.replaceChildren();
    }
}


function renderGlobalSearchResults() {

    const input =
        elements.globalSearchInput;

    const panel =
        elements.globalSearchResults;

    const container =
        elements.globalSearchResultsContent;


    if (
        !input ||
        !panel ||
        !container
    ) {
        return;
    }


    const search =
        cleanText(
            input.value
        );


    if (!search) {

        hideGlobalSearchResults();

        return;
    }


    const results =
        buildSearchResults(
            search
        );


    container.replaceChildren();


    if (!results.length) {

        container.appendChild(
            createElement(
                "div",
                "search-result-empty",
                "No matching customers, suppliers, Sell or Buy records."
            )
        );


        panel.hidden =
            false;

        return;
    }


    const fragment =
        document.createDocumentFragment();


    for (
        const result of results
    ) {

        const anchor =
            document.createElement(
                "a"
            );


        anchor.href =
            result.href;

        anchor.className =
            "search-result-item";


        const content =
            createElement(
                "span",
                "search-result-content"
            );


        content.append(
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


        anchor.append(
            content,

            createElement(
                "span",
                "search-result-type",
                result.type
            )
        );


        fragment.appendChild(
            anchor
        );
    }


    container.appendChild(
        fragment
    );


    panel.hidden =
        false;
}


function refreshSearchIfOpen() {

    if (
        elements.globalSearchResults &&
        !elements.globalSearchResults.hidden
    ) {

        renderGlobalSearchResults();
    }
}


/* ============================================================
   SIDEBAR
   ============================================================ */

function toggleMobileSidebar() {

    if (
        !elements.sidebar
    ) {
        return;
    }


    const open =
        elements.sidebar.classList.contains(
            "open"
        ) ||
        elements.sidebar.classList.contains(
            "is-open"
        );


    if (open) {

        closeMobileSidebar();

        return;
    }


    elements.sidebar.classList.add(
        "open",
        "is-open"
    );


    if (
        elements.sidebarOverlay
    ) {
        elements.sidebarOverlay.hidden =
            false;
    }


    elements.mobileMenuButton
        ?.setAttribute(
            "aria-expanded",
            "true"
        );
}


function closeMobileSidebar() {

    elements.sidebar
        ?.classList.remove(
            "open",
            "is-open"
        );


    if (
        elements.sidebarOverlay
    ) {
        elements.sidebarOverlay.hidden =
            true;
    }


    elements.mobileMenuButton
        ?.setAttribute(
            "aria-expanded",
            "false"
        );
}


/* ============================================================
   NAVIGATION
   ============================================================ */

function backToSuppliers() {

    window.location.href =
        "/suppliers";
}


/* ============================================================
   SIGN OUT
   ============================================================ */

async function handleLogout() {

    try {

        cleanupListeners();


        await signOut(
            auth
        );


        window.location.replace(
            "/login"
        );

    } catch (error) {

        console.error(
            "Sign out failed:",
            error
        );
    }
}


/* ============================================================
   LISTENER REGISTRATION
   ============================================================ */

function registerUnsubscriber(
    unsubscribe
) {

    if (
        typeof unsubscribe ===
        "function"
    ) {

        state.unsubscribers.push(
            unsubscribe
        );
    }
}


function cleanupListeners() {

    for (
        const unsubscribe of
        state.unsubscribers
    ) {

        try {

            unsubscribe();

        } catch (error) {

            console.error(
                "Listener cleanup failed:",
                error
            );
        }
    }


    state.unsubscribers =
        [];

    state.listenersStarted =
        false;
}


/* ============================================================
   SUPPLIER LISTENER
   ============================================================ */

function startSupplierListener() {

    const supplierRef =
        businessDocument(
            "suppliers",
            state.supplierId
        );


    const unsubscribe =
        onSnapshot(
            supplierRef,

            (snapshot) => {

                if (
                    !snapshot.exists()
                ) {

                    state.supplier =
                        null;


                    showError(
                        "Supplier not found",
                        "This supplier account does not exist or is no longer available."
                    );

                    return;
                }


                state.supplier = {
                    id:
                        snapshot.id,

                    ...snapshot.data()
                };


                renderAccount();
            },

            (error) => {

                console.error(
                    "Supplier listener failed:",
                    error
                );


                showError(
                    "Unable to load supplier",
                    "The supplier account could not be loaded."
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


/* ============================================================
   SUPPLIER PURCHASE LISTENER
   ============================================================ */

function startSupplierPurchasesListener() {

    /*
     * Keep this query simple:
     * supplierId equality only.
     *
     * Sorting is performed safely in JavaScript.
     * This avoids requiring an unnecessary composite index.
     */

    const purchasesQuery =
        query(
            businessCollection(
                "purchases"
            ),
            where(
                "supplierId",
                "==",
                state.supplierId
            )
        );


    const unsubscribe =
        onSnapshot(
            purchasesQuery,

            (snapshot) => {

                state.purchases =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );


                renderAccount();
            },

            (error) => {

                console.error(
                    "Supplier purchases listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


/* ============================================================
   SUPPLIER PAYMENT LISTENER
   ============================================================ */

function startSupplierPaymentsListener() {

    /*
     * recordPurchasePayment/createPurchase should store
     * supplierId on purchasePayments.
     *
     * If older legacy payment documents do not contain
     * supplierId, they will not appear in this account view.
     */

    const paymentsQuery =
        query(
            businessCollection(
                "purchasePayments"
            ),
            where(
                "supplierId",
                "==",
                state.supplierId
            )
        );


    const unsubscribe =
        onSnapshot(
            paymentsQuery,

            (snapshot) => {

                state.payments =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );


                renderAccount();
            },

            (error) => {

                console.error(
                    "Supplier payments listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


/* ============================================================
   GLOBAL SEARCH LISTENERS
   ============================================================ */

function startGlobalSuppliersListener() {

    const suppliersQuery =
        query(
            businessCollection(
                "suppliers"
            ),
            orderBy(
                "createdAt",
                "desc"
            ),
            limit(500)
        );


    const unsubscribe =
        onSnapshot(
            suppliersQuery,

            (snapshot) => {

                state.suppliers =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );


                refreshSearchIfOpen();
            },

            (error) => {

                console.error(
                    "Global suppliers listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


function startCustomersListener() {

    const customersQuery =
        query(
            businessCollection(
                "customers"
            ),
            orderBy(
                "createdAt",
                "desc"
            ),
            limit(500)
        );


    const unsubscribe =
        onSnapshot(
            customersQuery,

            (snapshot) => {

                state.customers =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );


                refreshSearchIfOpen();
            },

            (error) => {

                console.error(
                    "Global customers listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


function startSalesListener() {

    const salesQuery =
        query(
            businessCollection(
                "sales"
            ),
            orderBy(
                "invoiceDate",
                "desc"
            ),
            limit(500)
        );


    const unsubscribe =
        onSnapshot(
            salesQuery,

            (snapshot) => {

                state.sales =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );


                refreshSearchIfOpen();
            },

            (error) => {

                console.error(
                    "Global sales listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


function startGlobalPurchasesListener() {

    const purchasesQuery =
        query(
            businessCollection(
                "purchases"
            ),
            orderBy(
                "purchaseDate",
                "desc"
            ),
            limit(500)
        );


    const unsubscribe =
        onSnapshot(
            purchasesQuery,

            (snapshot) => {

                state.globalPurchases =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );


                refreshSearchIfOpen();
            },

            (error) => {

                console.error(
                    "Global purchases listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


/* ============================================================
   START LISTENERS
   ============================================================ */

function startDataListeners() {

    if (
        state.listenersStarted
    ) {
        return;
    }


    state.listenersStarted =
        true;


    startSupplierListener();

    startSupplierPurchasesListener();

    startSupplierPaymentsListener();


    /* Dashboard-style global search */

    startCustomersListener();

    startGlobalSuppliersListener();

    startSalesListener();

    startGlobalPurchasesListener();
}


/* ============================================================
   EVENTS
   ============================================================ */

function bindEvents() {

    /* Navigation */

    elements.backToSuppliersButton
        ?.addEventListener(
            "click",
            backToSuppliers
        );


    elements.supplierErrorBackButton
        ?.addEventListener(
            "click",
            backToSuppliers
        );


    elements.newPurchaseButton
        ?.addEventListener(
            "click",
            openNewPurchase
        );


    elements.headerNewPurchaseButton
        ?.addEventListener(
            "click",
            openNewPurchase
        );

        /* ========================================================
    QUICK ACTIONS
    ======================================================== */

    elements.quickNewPurchaseButton
        ?.addEventListener(
            "click",
            openNewPurchase
        );


    elements.quickRecordPaymentButton
        ?.addEventListener(
            "click",
            handleRecordSupplierPayment
        );

    elements.quickEditSupplierButton
        ?.addEventListener(
            "click",
            openEditSupplierModal
        );

    elements.purchaseHistoryNewButton
        ?.addEventListener(
            "click",
            openNewPurchase
        );


    elements.mobileNewTransactionButton
        ?.addEventListener(
            "click",
            openNewPurchase
        );

    /* Edit supplier */

    elements.editSupplierButton
        ?.addEventListener(
            "click",
            openEditSupplierModal
        );


    elements.closeEditSupplierModalButton
        ?.addEventListener(
            "click",
            closeEditSupplierModal
        );


    elements.cancelEditSupplierButton
        ?.addEventListener(
            "click",
            closeEditSupplierModal
        );


    elements.editSupplierForm
        ?.addEventListener(
            "submit",
            handleEditSupplierSubmit
        );


    elements.editSupplierModal
        ?.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    elements.editSupplierModal
                ) {

                    closeEditSupplierModal();
                }
            }
        );


    /* Sidebar */

    elements.mobileMenuButton
        ?.addEventListener(
            "click",
            toggleMobileSidebar
        );


    elements.sidebarOverlay
        ?.addEventListener(
            "click",
            closeMobileSidebar
        );


    /* Global search */

    elements.globalSearchInput
        ?.addEventListener(
            "input",
            renderGlobalSearchResults
        );


    elements.globalSearchInput
        ?.addEventListener(
            "focus",
            () => {

                if (
                    cleanText(
                        elements
                            .globalSearchInput
                            ?.value
                    )
                ) {

                    renderGlobalSearchResults();
                }
            }
        );


    document.addEventListener(
        "click",
        (event) => {

            const target =
                event.target;


            if (
                !(target instanceof Node)
            ) {
                return;
            }


            if (
                elements.globalSearchInput
                    ?.contains(target) ||
                elements.globalSearchResults
                    ?.contains(target)
            ) {
                return;
            }


            hideGlobalSearchResults();
        }
    );


    /* Logout */

    elements.logoutButton
        ?.addEventListener(
            "click",
            handleLogout
        );


    /* Escape */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            hideGlobalSearchResults();

            closeMobileSidebar();


            if (
                elements.editSupplierModal &&
                !elements
                    .editSupplierModal
                    .hidden
            ) {

                closeEditSupplierModal();
            }
        }
    );


    window.addEventListener(
        "beforeunload",
        cleanupListeners
    );
}


/* ============================================================
   AUTH
   ============================================================ */

function startAuthentication() {

    onAuthStateChanged(
        auth,

        async (user) => {

            if (!user) {

                cleanupListeners();

                window.location.replace(
                    "/login"
                );

                return;
            }


            if (
                state.authenticated
            ) {
                return;
            }


            state.authenticated =
                true;


            const supplierNumber =
                readSupplierNumber();


            if (!supplierNumber) {

                showError(
                    "Supplier not found",
                    "No supplier account was selected."
                );

                return;
            }


            showLoading();


            try {

                const resolvedSupplierId =
                    await resolveSupplierIdByNumber(
                        supplierNumber
                    );


                if (!resolvedSupplierId) {

                    showError(
                        "Supplier not found",
                        "This supplier account does not exist or is no longer available."
                    );

                    return;
                }


                /*
                 * Public URL:
                 * /suppliers/OMD-SUP-0001
                 *
                 * Internal Firestore ID remains private
                 * and is used by the existing listeners.
                 */

                state.supplierId =
                    resolvedSupplierId;


                startDataListeners();

            } catch (error) {

                console.error(
                    "Supplier resolution failed:",
                    error?.code ||
                    error?.message ||
                    error
                );


                if (
                    error?.code ===
                    "permission-denied"
                ) {

                    cleanupListeners();

                    window.location.replace(
                        "/login"
                    );

                    return;
                }


                showError(
                    "Unable to load supplier",
                    "The supplier account could not be loaded."
                );
            }
        },

        (error) => {

            console.error(
                "Supplier auth failed:",
                error
            );


            cleanupListeners();


            window.location.replace(
                "/login"
            );
        }
    );
}


/* ============================================================
   INITIALIZE
   ============================================================ */

function initialize() {

    formatCurrentDate();

    bindEvents();

    showLoading();

    startAuthentication();
}


initialize();
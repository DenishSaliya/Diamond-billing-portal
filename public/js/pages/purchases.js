/* ============================================================
   OM MARUTI DIAMOND
   PURCHASES / BUY LIST
   purchases.js

   Responsibilities:
   - Authentication guard
   - Load real Buy transactions from Firestore
   - Date filtering
   - Local Buy search
   - Cash / Credit filtering
   - Payment status filtering
   - Buy summary
   - purchasePayments based Paid calculation
   - Desktop table
   - Mobile cards
   - Portal-wide global search
   - Shared navigation interactions

   IMPORTANT:
   This page performs READ operations only.
   Financial writes remain protected behind trusted backend
   functions.
   ============================================================ */


/* ============================================================
   FIREBASE APP
   ============================================================ */

import {
    auth,
    db
} from "../firebase.js";


/* ============================================================
   FIREBASE AUTH
   ============================================================ */

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


/* ============================================================
   FIRESTORE
   ============================================================ */

import {
    collection,
    onSnapshot,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


/* ============================================================
   CONFIG
   ============================================================ */

const BUSINESS_ID = "om-maruti-diamond";

const PURCHASES_COLLECTION_PATH = [
    "businesses",
    BUSINESS_ID,
    "purchases"
];

const MAX_SEARCH_RESULTS = 12;


/* ============================================================
   DOM
   ============================================================ */

const elements = {

    /* Shared shell */

    sidebar:
        document.getElementById("sidebar"),

    mobileMenuButton:
        document.getElementById("mobileMenuButton"),

    logoutButton:
        document.getElementById("logoutButton"),

    currentDate:
        document.getElementById("currentDate"),


    /* Global search */

    globalSearchInput:
        document.getElementById("globalSearchInput"),

    globalSearchResults:
        document.getElementById("globalSearchResults"),

    globalSearchResultsContent:
        document.getElementById("globalSearchResultsContent"),


    /* Date filter */

    billingDateFilter:
        document.getElementById("billingDateFilter"),

    customDatePanel:
        document.getElementById("customDatePanel"),

    customStartDate:
        document.getElementById("customStartDate"),

    customEndDate:
        document.getElementById("customEndDate"),

    applyCustomDateButton:
        document.getElementById("applyCustomDateButton"),


    /* Summary */

    summaryTotalBuy:
        document.getElementById("summaryTotalBuy"),

    summaryPaid:
        document.getElementById("summaryPaid"),

    summaryPayable:
        document.getElementById("summaryPayable"),

    summaryOverdue:
        document.getElementById("summaryOverdue"),


    /* Purchase filters */

    purchasesSearchInput:
        document.getElementById("purchasesSearchInput"),

    purchasesTypeFilter:
        document.getElementById("purchasesTypeFilter"),

    purchasesStatusFilter:
        document.getElementById("purchasesStatusFilter"),

    purchasesResultCount:
        document.getElementById("purchasesResultCount"),


    /* States */

    purchasesLoadingState:
        document.getElementById("purchasesLoadingState"),

    purchasesErrorState:
        document.getElementById("purchasesErrorState"),

    purchasesErrorMessage:
        document.getElementById("purchasesErrorMessage"),

    purchasesEmptyState:
        document.getElementById("purchasesEmptyState"),


    /* Desktop */

    purchasesTableWrapper:
        document.getElementById("purchasesTableWrapper"),

    purchasesTableBody:
        document.getElementById("purchasesTableBody"),


    /* Mobile */

    purchasesMobileList:
        document.getElementById("purchasesMobileList"),


    /* Mobile create */

    mobileNewTransactionButton:
        document.getElementById("mobileNewTransactionButton")

};


/* ============================================================
   STATE
   ============================================================ */

const state = {

    purchases: [],

    purchasePayments: [],

    searchText: "",

    typeFilter: "all",

    statusFilter: "all",

    dateFilter: "today",

    customStartDate: null,

    customEndDate: null,


    /* Global search */

    customers: [],

    suppliers: [],

    sales: [],


    /* Listeners */

    unsubscribePurchases: null,

    unsubscribePurchasePayments: null,

    unsubscribeCustomers: null,

    unsubscribeSuppliers: null,

    unsubscribeSales: null,

    authenticated: false

};


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function text(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();

}


function number(value) {

    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;

}


function integer(value) {

    return Math.round(
        number(value)
    );

}


function setText(
    element,
    value,
    fallback = "—"
) {

    if (!element) {
        return;
    }

    const output =
        text(value);

    element.textContent =
        output || fallback;

}


/* ============================================================
   MONEY
   ============================================================ */

const moneyFormatter =
    new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );


function formatMoneyPaise(value) {

    const paise =
        integer(value);

    return moneyFormatter.format(
        paise / 100
    );

}


/* ============================================================
   DATE FORMATTERS
   ============================================================ */

const displayDateFormatter =
    new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );


const currentDateFormatter =
    new Intl.DateTimeFormat(
        "en-IN",
        {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );


/* ============================================================
   DATE CONVERSION
   ============================================================ */

function toDate(value) {

    if (!value) {
        return null;
    }


    /* Firestore Timestamp */

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        const result =
            value.toDate();

        return Number.isNaN(
            result.getTime()
        )
            ? null
            : result;

    }


    /* Firestore-like timestamp */

    if (
        typeof value === "object" &&
        Number.isFinite(value.seconds)
    ) {

        const result =
            new Date(
                value.seconds * 1000
            );

        return Number.isNaN(
            result.getTime()
        )
            ? null
            : result;

    }


    /* JS Date */

    if (value instanceof Date) {

        return Number.isNaN(
            value.getTime()
        )
            ? null
            : value;

    }


    const result =
        new Date(value);

    return Number.isNaN(
        result.getTime()
    )
        ? null
        : result;

}


function formatDate(value) {

    const date =
        toDate(value);

    if (!date) {
        return "—";
    }

    return displayDateFormatter.format(
        date
    );

}


function startOfDay(value) {

    const date =
        value instanceof Date
            ? new Date(value)
            : new Date();

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;

}


function endOfDay(value) {

    const date =
        value instanceof Date
            ? new Date(value)
            : new Date();

    date.setHours(
        23,
        59,
        59,
        999
    );

    return date;

}


function addDays(
    date,
    amount
) {

    const result =
        new Date(date);

    result.setDate(
        result.getDate() + amount
    );

    return result;

}


function parseLocalDateInput(value) {

    const raw =
        text(value);

    if (!raw) {
        return null;
    }

    const parts =
        raw.split("-");

    if (parts.length !== 3) {
        return null;
    }

    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

    const day =
        Number(parts[2]);

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    ) {
        return null;
    }

    const result =
        new Date(
            year,
            month - 1,
            day
        );

    if (
        Number.isNaN(
            result.getTime()
        )
    ) {
        return null;
    }

    return result;

}


/* ============================================================
   CURRENT DATE
   ============================================================ */

function renderCurrentDate() {

    if (!elements.currentDate) {
        return;
    }

    const now =
        new Date();

    elements.currentDate.dateTime =
        now.toISOString();

    elements.currentDate.textContent =
        currentDateFormatter.format(now);

}


/* ============================================================
   PURCHASE FIELD HELPERS
   ============================================================ */

function getPurchaseNumber(purchase) {

    return (
        text(purchase.purchaseNumber) ||
        text(purchase.buyNumber) ||
        text(purchase.transactionNumber) ||
        text(purchase.invoiceNumber) ||
        "—"
    );

}


function getPurchaseDate(purchase) {

    return (
        purchase.purchaseDate ||
        purchase.invoiceDate ||
        purchase.buyDate ||
        purchase.transactionDate ||
        purchase.createdAt ||
        null
    );

}


function getDueDate(purchase) {

    return (
        purchase.dueDate ||
        purchase.paymentDueDate ||
        null
    );

}


function getPurchaseType(purchase) {

    const value =
        text(
            purchase.purchaseType ||
            purchase.buyType ||
            purchase.transactionType ||
            purchase.termType
        ).toLowerCase();

    if (value === "credit") {
        return "credit";
    }

    if (value === "cash") {
        return "cash";
    }

    return value || "cash";

}


function getGrandTotalPaise(purchase) {

    return integer(
        purchase.grandTotalPaise ??
        purchase.totalPaise ??
        purchase.purchaseTotalPaise ??
        0
    );

}


function getPaidPaise(purchase) {

    return Math.max(
        0,
        integer(
            purchase.paidPaise ??
            purchase.paymentTotalPaise ??
            purchase.amountPaidPaise ??
            0
        )
    );

}


function getBalancePaise(purchase) {

    /*
     * Prefer authoritative backend balance.
     */

    if (
        purchase.balancePaise !== null &&
        purchase.balancePaise !== undefined
    ) {

        return Math.max(
            0,
            integer(
                purchase.balancePaise
            )
        );

    }

    return Math.max(
        0,
        getGrandTotalPaise(purchase) -
        getPaidPaise(purchase)
    );

}


/* ============================================================
   SUPPLIER SNAPSHOT
   ============================================================ */

function getSupplierSnapshot(purchase) {

    const candidates = [
        purchase.supplierSnapshot,
        purchase.supplier,
        purchase.billFrom
    ];

    return (
        candidates.find(
            (value) =>
                value &&
                typeof value === "object"
        ) || {}
    );

}


function getSupplierName(purchase) {

    const supplier =
        getSupplierSnapshot(
            purchase
        );

    return (
        text(supplier.name) ||
        text(supplier.supplierName) ||
        text(purchase.supplierName) ||
        "Supplier"
    );

}


function getSupplierMobile(purchase) {

    const supplier =
        getSupplierSnapshot(
            purchase
        );

    return (
        text(supplier.mobile) ||
        text(supplier.phone) ||
        text(supplier.mobileNumber) ||
        text(purchase.supplierMobile)
    );

}


function getSupplierInitials(name) {

    const words =
        text(name)
            .split(/\s+/)
            .filter(Boolean);

    if (!words.length) {
        return "SU";
    }

    if (words.length === 1) {

        return words[0]
            .slice(0, 2)
            .toUpperCase();

    }

    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();

}


/* ============================================================
   STATUS HELPERS
   ============================================================ */

function isPurchaseCancelled(purchase) {

    return (
        text(purchase.status)
            .toLowerCase() ===
        "cancelled"
    );

}


function isPurchaseDraft(purchase) {

    return (
        text(purchase.status)
            .toLowerCase() ===
        "draft"
    );

}


function isOverdue(purchase) {

    if (
        isPurchaseCancelled(purchase) ||
        isPurchaseDraft(purchase)
    ) {
        return false;
    }

    if (
        getBalancePaise(purchase) <= 0
    ) {
        return false;
    }

    /*
     * Cash Buy has no due date / overdue state.
     */

    if (
        getPurchaseType(purchase) !==
        "credit"
    ) {
        return false;
    }

    const dueDate =
        toDate(
            getDueDate(purchase)
        );

    if (!dueDate) {
        return false;
    }

    return (
        endOfDay(dueDate).getTime() <
        startOfDay(new Date()).getTime()
    );

}


function getDisplayStatus(purchase) {

    const storedStatus =
        text(purchase.status)
            .toLowerCase();

    if (storedStatus === "cancelled") {
        return "cancelled";
    }

    if (storedStatus === "draft") {
        return "draft";
    }

    if (isOverdue(purchase)) {
        return "overdue";
    }

    const total =
        getGrandTotalPaise(purchase);

    const paid =
        getPaidPaise(purchase);

    const balance =
        getBalancePaise(purchase);

    if (
        balance <= 0 &&
        total > 0
    ) {
        return "paid";
    }

    if (
        paid > 0 &&
        balance > 0
    ) {
        return "partially_paid";
    }

    if (
        storedStatus ===
        "partially_paid"
    ) {
        return "partially_paid";
    }

    if (storedStatus === "paid") {
        return "paid";
    }

    return "pending";

}


function statusLabel(status) {

    switch (status) {

        case "paid":
            return "Paid";

        case "partially_paid":
            return "Partial";

        case "overdue":
            return "Overdue";

        case "cancelled":
            return "Cancelled";

        case "draft":
            return "Draft";

        default:
            return "Unpaid";

    }

}


/* ============================================================
   DATE RANGE
   ============================================================ */

function getSelectedDateRange() {

    const now =
        new Date();

    const todayStart =
        startOfDay(now);

    const todayEnd =
        endOfDay(now);


    switch (state.dateFilter) {

        case "today":

            return {
                start: todayStart,
                end: todayEnd
            };


        case "yesterday": {

            const yesterday =
                addDays(
                    todayStart,
                    -1
                );

            return {
                start:
                    startOfDay(yesterday),

                end:
                    endOfDay(yesterday)
            };

        }


        case "7days":

            return {
                start:
                    startOfDay(
                        addDays(
                            todayStart,
                            -6
                        )
                    ),

                end:
                    todayEnd
            };


        case "30days":

            return {
                start:
                    startOfDay(
                        addDays(
                            todayStart,
                            -29
                        )
                    ),

                end:
                    todayEnd
            };


        case "custom":

            if (
                !state.customStartDate ||
                !state.customEndDate
            ) {
                return null;
            }

            return {
                start:
                    startOfDay(
                        state.customStartDate
                    ),

                end:
                    endOfDay(
                        state.customEndDate
                    )
            };


        case "all":
        default:

            return null;

    }

}


/* ============================================================
   PURCHASE DATE MATCH
   ============================================================ */

function purchaseMatchesDateFilter(purchase) {

    const range =
        getSelectedDateRange();

    if (!range) {
        return true;
    }

    const purchaseDate =
        toDate(
            getPurchaseDate(purchase)
        );

    if (!purchaseDate) {
        return false;
    }

    const timestamp =
        purchaseDate.getTime();

    return (
        timestamp >=
            range.start.getTime() &&
        timestamp <=
            range.end.getTime()
    );

}


/* ============================================================
   LOCAL SEARCH
   ============================================================ */

function purchaseMatchesSearch(purchase) {

    const search =
        state.searchText;

    if (!search) {
        return true;
    }

    const supplier =
        getSupplierSnapshot(
            purchase
        );

    const searchable =
        [
            getPurchaseNumber(purchase),
            purchase.supplierInvoiceNumber,
            purchase.billNumber,
            getSupplierName(purchase),
            getSupplierMobile(purchase),
            supplier.email,
            supplier.gstin,
            purchase.supplierId,
            getPurchaseType(purchase),
            statusLabel(
                getDisplayStatus(purchase)
            )
        ]
            .map(text)
            .join(" ")
            .toLowerCase();

    return searchable.includes(
        search
    );

}


/* ============================================================
   TYPE MATCH
   ============================================================ */

function purchaseMatchesType(purchase) {

    if (
        state.typeFilter === "all"
    ) {
        return true;
    }

    return (
        getPurchaseType(purchase) ===
        state.typeFilter
    );

}


/* ============================================================
   STATUS MATCH
   ============================================================ */

function purchaseMatchesStatus(purchase) {

    if (
        state.statusFilter === "all"
    ) {
        return true;
    }

    return (
        getDisplayStatus(purchase) ===
        state.statusFilter
    );

}


/* ============================================================
   FILTERED PURCHASES
   ============================================================ */

function getFilteredPurchases() {

    return state.purchases.filter(
        (purchase) => {

            return (
                purchaseMatchesDateFilter(
                    purchase
                ) &&
                purchaseMatchesSearch(
                    purchase
                ) &&
                purchaseMatchesType(
                    purchase
                ) &&
                purchaseMatchesStatus(
                    purchase
                )
            );

        }
    );

}


/* ============================================================
   PURCHASE PAYMENT DATE
   ============================================================ */

function getPurchasePaymentDate(payment) {

    return toDate(
        payment.paymentDate
    );

}


/* ============================================================
   PAID FOR SELECTED PERIOD

   IMPORTANT:
   This is based on purchasePayments.paymentDate.

   We do NOT sum purchase.paidPaise for purchases created
   inside the selected period because that would assign later
   payments to the original purchase date.

   Cash Buy initial payment should also exist in
   purchasePayments, so it must not be added separately.
   ============================================================ */

function getPaidForSelectedPeriod() {

    const range =
        getSelectedDateRange();

    let totalPaise = 0;

    for (
        const payment
        of state.purchasePayments
    ) {

        const paymentDate =
            getPurchasePaymentDate(
                payment
            );

        if (!paymentDate) {
            continue;
        }

        if (range) {

            const timestamp =
                paymentDate.getTime();

            if (
                timestamp <
                    range.start.getTime() ||
                timestamp >
                    range.end.getTime()
            ) {
                continue;
            }

        }

        totalPaise +=
            Math.max(
                0,
                integer(
                    payment.amountPaise
                )
            );

    }

    return totalPaise;

}


/* ============================================================
   SUMMARY

   Total Buy:
   Purchase date obeys selected date filter.

   Paid:
   purchasePayments.paymentDate obeys selected date filter.

   Payable:
   Current supplier outstanding.
   Does NOT obey date filter.

   Overdue:
   Current overdue outstanding.
   Does NOT obey date filter.
   ============================================================ */

function renderSummary() {

    const periodPurchases =
        state.purchases.filter(
            (purchase) => {

                return (
                    !isPurchaseCancelled(
                        purchase
                    ) &&
                    !isPurchaseDraft(
                        purchase
                    ) &&
                    purchaseMatchesDateFilter(
                        purchase
                    )
                );

            }
        );


    /* Total Buy */

    let totalBuyPaise = 0;

    for (
        const purchase
        of periodPurchases
    ) {

        totalBuyPaise +=
            getGrandTotalPaise(
                purchase
            );

    }


    /* Paid */

    const paidPaise =
        getPaidForSelectedPeriod();


    /* Current Payable + Overdue */

    let payablePaise = 0;

    let overduePaise = 0;


    for (
        const purchase
        of state.purchases
    ) {

        if (
            isPurchaseCancelled(purchase) ||
            isPurchaseDraft(purchase)
        ) {
            continue;
        }

        const balance =
            getBalancePaise(
                purchase
            );

        if (balance <= 0) {
            continue;
        }

        payablePaise +=
            balance;

        if (
            isOverdue(purchase)
        ) {

            overduePaise +=
                balance;

        }

    }


    setText(
        elements.summaryTotalBuy,
        formatMoneyPaise(
            totalBuyPaise
        )
    );


    setText(
        elements.summaryPaid,
        formatMoneyPaise(
            paidPaise
        )
    );


    setText(
        elements.summaryPayable,
        formatMoneyPaise(
            payablePaise
        )
    );


    setText(
        elements.summaryOverdue,
        formatMoneyPaise(
            overduePaise
        )
    );

}


/* ============================================================
   STATE VISIBILITY
   ============================================================ */

function hideAllPurchaseStates() {

    if (
        elements.purchasesLoadingState
    ) {
        elements.purchasesLoadingState.hidden =
            true;
    }

    if (
        elements.purchasesErrorState
    ) {
        elements.purchasesErrorState.hidden =
            true;
    }

    if (
        elements.purchasesEmptyState
    ) {
        elements.purchasesEmptyState.hidden =
            true;
    }

    if (
        elements.purchasesTableWrapper
    ) {
        elements.purchasesTableWrapper.hidden =
            true;
    }

    if (
        elements.purchasesMobileList
    ) {
        elements.purchasesMobileList.hidden =
            true;
    }

}


function showLoading() {

    hideAllPurchaseStates();

    if (
        elements.purchasesLoadingState
    ) {
        elements.purchasesLoadingState.hidden =
            false;
    }

}


function showError(message) {

    hideAllPurchaseStates();

    setText(
        elements.purchasesErrorMessage,
        message,
        "Please try again."
    );

    if (
        elements.purchasesErrorState
    ) {
        elements.purchasesErrorState.hidden =
            false;
    }

}


function showEmpty() {

    hideAllPurchaseStates();

    if (
        elements.purchasesEmptyState
    ) {
        elements.purchasesEmptyState.hidden =
            false;
    }

}


function showResults() {

    hideAllPurchaseStates();

    if (
        elements.purchasesTableWrapper
    ) {
        elements.purchasesTableWrapper.hidden =
            false;
    }

    if (
        elements.purchasesMobileList
    ) {
        elements.purchasesMobileList.hidden =
            false;
    }

}


/* ============================================================
   DOM HELPERS
   ============================================================ */

function createElement(
    tag,
    className = ""
) {

    const element =
        document.createElement(tag);

    if (className) {

        element.className =
            className;

    }

    return element;

}


function createTextElement(
    tag,
    className,
    value
) {

    const element =
        createElement(
            tag,
            className
        );

    element.textContent =
        text(value);

    return element;

}


/* ============================================================
   STATUS BADGE
   ============================================================ */

function createStatusBadge(purchase) {

    const status =
        getDisplayStatus(
            purchase
        );

    const badge =
        createTextElement(
            "span",
            "purchases-status-badge",
            statusLabel(status)
        );

    badge.dataset.status =
        status;

    return badge;

}


/* ============================================================
   TYPE BADGE
   ============================================================ */

function createTypeBadge(purchase) {

    const type =
        getPurchaseType(
            purchase
        );

    const badge =
        createTextElement(
            "span",
            "purchase-type-badge",
            type === "credit"
                ? "Credit"
                : "Cash"
        );

    badge.dataset.type =
        type;

    return badge;

}


/* ============================================================
   SUPPLIER CELL
   ============================================================ */

function createSupplierCell(purchase) {

    const container =
        createElement(
            "div",
            "supplier-identity"
        );

    const name =
        getSupplierName(
            purchase
        );

    const mobile =
        getSupplierMobile(
            purchase
        );

    const avatar =
        createTextElement(
            "span",
            "supplier-avatar",
            getSupplierInitials(
                name
            )
        );

    const content =
        createElement(
            "div",
            "supplier-cell-content"
        );

    const strong =
        createTextElement(
            "strong",
            "",
            name
        );

    const detail =
        createTextElement(
            "span",
            "",
            mobile || "Supplier"
        );

    content.append(
        strong,
        detail
    );

    container.append(
        avatar,
        content
    );

    return container;

}


/* ============================================================
   OPEN PURCHASE
   ============================================================ */

function openPurchase(purchase) {

    const purchaseNumber =
        text(
            purchase?.purchaseNumber
        )
            .trim()
            .toUpperCase();

    if (!purchaseNumber) {
        return;
    }

    window.location.href =
        `/purchases/${encodeURIComponent(
            purchaseNumber
        )}`;
}


/* ============================================================
   DESKTOP ROW
   ============================================================ */

function createDesktopPurchaseRow(
    purchase
) {

    const row =
        document.createElement("tr");

    row.tabIndex = 0;

    row.dataset.purchaseId =
        purchase.id;


    row.addEventListener(
        "click",
        () => {

            openPurchase(
                purchase
            );

        }
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
        document.createElement("td");

    numberCell.append(
        createTextElement(
            "span",
            "bill-number",
            getPurchaseNumber(
                purchase
            )
        )
    );


    /* Supplier */

    const supplierCell =
        document.createElement("td");

    supplierCell.className =
        "supplier-cell";

    supplierCell.append(
        createSupplierCell(
            purchase
        )
    );


    /* Date */

    const dateCell =
        document.createElement("td");

    dateCell.append(
        createTextElement(
            "span",
            "purchases-date",
            formatDate(
                getPurchaseDate(
                    purchase
                )
            )
        )
    );


    /* Type */

    const typeCell =
        document.createElement("td");

    typeCell.append(
        createTypeBadge(
            purchase
        )
    );


    /* Total */

    const totalCell =
        createTextElement(
            "td",
            "table-money",
            formatMoneyPaise(
                getGrandTotalPaise(
                    purchase
                )
            )
        );


    /* Paid */

    const paidCell =
        createTextElement(
            "td",
            "table-money",
            formatMoneyPaise(
                getPaidPaise(
                    purchase
                )
            )
        );


    /* Balance */

    const balanceCell =
        createTextElement(
            "td",
            "table-money purchases-balance",
            formatMoneyPaise(
                getBalancePaise(
                    purchase
                )
            )
        );


    /* Due date */

    const dueCell =
        document.createElement("td");

    const dueDate =
        createTextElement(
            "span",
            "purchases-due-date",
            getPurchaseType(
                purchase
            ) === "credit"
                ? formatDate(
                    getDueDate(
                        purchase
                    )
                )
                : "—"
        );

    if (
        isOverdue(purchase)
    ) {

        dueDate.classList.add(
            "is-overdue"
        );

    }

    dueCell.append(
        dueDate
    );


    /* Status */

    const statusCell =
        document.createElement("td");

    statusCell.append(
        createStatusBadge(
            purchase
        )
    );


    /* Action */

    const actionCell =
        document.createElement("td");

    actionCell.className =
        "table-actions";

    const openButton =
        createTextElement(
            "button",
            "purchases-open-button",
            "›"
        );

    openButton.type =
        "button";

    openButton.setAttribute(
        "aria-label",
        `Open ${getPurchaseNumber(purchase)}`
    );

    openButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            openPurchase(
                purchase
            );

        }
    );

    actionCell.append(
        openButton
    );


    row.append(
        numberCell,
        supplierCell,
        dateCell,
        typeCell,
        totalCell,
        paidCell,
        balanceCell,
        dueCell,
        statusCell,
        actionCell
    );

    return row;

}


/* ============================================================
   MOBILE VALUE
   ============================================================ */

function createMobileValue(
    label,
    value
) {

    const container =
        createElement(
            "div",
            "purchases-mobile-value"
        );

    container.append(
        createTextElement(
            "span",
            "",
            label
        ),

        createTextElement(
            "strong",
            "",
            value
        )
    );

    return container;

}


/* ============================================================
   MOBILE PURCHASE CARD
   ============================================================ */

function createMobilePurchaseCard(
    purchase
) {

    const card =
        createElement(
            "a",
            "purchases-mobile-card"
        );

    const purchaseNumber =
    text(
        purchase.purchaseNumber
    )
        .trim()
        .toUpperCase();

        card.href =
            purchaseNumber
                ? `/purchases/${encodeURIComponent(
                    purchaseNumber
                )}`
                : "/purchases";


    /* Header */

    const header =
        createElement(
            "div",
            "purchases-mobile-card-header"
        );

    const title =
        createElement(
            "div",
            "purchases-mobile-card-title"
        );

    title.append(
        createTextElement(
            "strong",
            "bill-number",
            getPurchaseNumber(
                purchase
            )
        ),

        createTextElement(
            "span",
            "supplier-name",
            getSupplierName(
                purchase
            )
        )
    );

    header.append(
        title,
        createStatusBadge(
            purchase
        )
    );


    /* Meta */

    const meta =
        createElement(
            "div",
            "purchases-mobile-meta"
        );

    meta.append(
        createTypeBadge(
            purchase
        ),

        createTextElement(
            "span",
            "purchases-mobile-date",
            formatDate(
                getPurchaseDate(
                    purchase
                )
            )
        )
    );


    /* Values */

    const values =
        createElement(
            "div",
            "purchases-mobile-values"
        );

    values.append(
        createMobileValue(
            "Total",
            formatMoneyPaise(
                getGrandTotalPaise(
                    purchase
                )
            )
        ),

        createMobileValue(
            "Paid",
            formatMoneyPaise(
                getPaidPaise(
                    purchase
                )
            )
        ),

        createMobileValue(
            "Balance",
            formatMoneyPaise(
                getBalancePaise(
                    purchase
                )
            )
        )
    );


    /* Footer */

    const footer =
        createElement(
            "div",
            "purchases-mobile-card-footer"
        );

    const due =
        createElement(
            "span",
            "purchases-mobile-due"
        );

    if (
        getPurchaseType(purchase) ===
        "credit"
    ) {

        due.append(
            document.createTextNode(
                "Due "
            ),

            createTextElement(
                "strong",
                "",
                formatDate(
                    getDueDate(
                        purchase
                    )
                )
            )
        );

    }
    else {

        due.textContent =
            "Fully settled";

    }

    if (
        isOverdue(purchase)
    ) {

        due.classList.add(
            "is-overdue"
        );

    }

    footer.append(
        due
    );


    card.append(
        header,
        meta,
        values,
        footer
    );

    return card;

}


/* ============================================================
   RESULT COUNT
   ============================================================ */

function renderResultCount(
    visibleCount
) {

    if (
        !elements.purchasesResultCount
    ) {
        return;
    }

    const totalCount =
        state.purchases.length;

    if (totalCount === 0) {

        elements.purchasesResultCount.textContent =
            "No purchases";

        return;

    }

    if (
        visibleCount === totalCount
    ) {

        elements.purchasesResultCount.textContent =
            `${totalCount} ${
                totalCount === 1
                    ? "purchase"
                    : "purchases"
            }`;

        return;

    }

    elements.purchasesResultCount.textContent =
        `${visibleCount} of ${totalCount} purchases`;

}


/* ============================================================
   RENDER PURCHASES
   ============================================================ */

function renderPurchases() {

    renderSummary();

    const filteredPurchases =
        getFilteredPurchases();

    renderResultCount(
        filteredPurchases.length
    );


    if (
        elements.purchasesTableBody
    ) {

        elements.purchasesTableBody
            .replaceChildren();

    }


    if (
        elements.purchasesMobileList
    ) {

        elements.purchasesMobileList
            .replaceChildren();

    }


    if (
        !filteredPurchases.length
    ) {

        showEmpty();

        return;

    }


    const desktopFragment =
        document.createDocumentFragment();

    const mobileFragment =
        document.createDocumentFragment();


    for (
        const purchase
        of filteredPurchases
    ) {

        desktopFragment.append(
            createDesktopPurchaseRow(
                purchase
            )
        );

        mobileFragment.append(
            createMobilePurchaseCard(
                purchase
            )
        );

    }


    if (
        elements.purchasesTableBody
    ) {

        elements.purchasesTableBody.append(
            desktopFragment
        );

    }


    if (
        elements.purchasesMobileList
    ) {

        elements.purchasesMobileList.append(
            mobileFragment
        );

    }


    showResults();

}


/* ============================================================
   NORMALIZE FIRESTORE DOCUMENT
   ============================================================ */

function normalizeDocument(snapshot) {

    return {
        id: snapshot.id,
        ...snapshot.data()
    };

}


/* ============================================================
   PURCHASES LISTENER
   ============================================================ */

function startPurchasesListener() {

    if (
        typeof state.unsubscribePurchases ===
        "function"
    ) {

        state.unsubscribePurchases();

        state.unsubscribePurchases =
            null;

    }

    showLoading();

    const purchasesReference =
        collection(
            db,
            ...PURCHASES_COLLECTION_PATH
        );


    /*
     * Primary Buy date field.
     *
     * Finalized Buy documents should store purchaseDate.
     */

    const purchasesQuery =
        query(
            purchasesReference,
            orderBy(
                "purchaseDate",
                "desc"
            )
        );


    state.unsubscribePurchases =
        onSnapshot(
            purchasesQuery,

            (snapshot) => {

                state.purchases =
                    snapshot.docs.map(
                        normalizeDocument
                    );

                renderPurchases();

                refreshOpenGlobalSearch();

            },

            (error) => {

                console.error(
                    "Unable to load purchases:",
                    error
                );

                showError(
                    error?.message ||
                    "Unable to load Buy transactions."
                );

            }
        );

}


/* ============================================================
   PURCHASE PAYMENTS LISTENER
   ============================================================ */

function startPurchasePaymentsListener() {

    if (
        typeof state.unsubscribePurchasePayments ===
        "function"
    ) {

        state.unsubscribePurchasePayments();

        state.unsubscribePurchasePayments =
            null;

    }


    const paymentsQuery =
        query(
            collection(
                db,
                "businesses",
                BUSINESS_ID,
                "purchasePayments"
            ),
            orderBy(
                "paymentDate",
                "desc"
            )
        );


    state.unsubscribePurchasePayments =
        onSnapshot(
            paymentsQuery,

            (snapshot) => {

                state.purchasePayments =
                    snapshot.docs.map(
                        normalizeDocument
                    );

                /*
                 * Payment data affects the Paid summary.
                 */

                renderPurchases();

            },

            (error) => {

                console.error(
                    "Purchase payments listener failed:",
                    error
                );

            }
        );

}


/* ============================================================
   GLOBAL SEARCH SUPPORT
   ============================================================ */

function getSaleInvoiceNumber(sale) {

    return (
        text(sale.invoiceNumber) ||
        text(sale.saleNumber) ||
        text(sale.transactionNumber) ||
        "—"
    );

}


function getSaleType(sale) {

    const value =
        text(
            sale.saleType ||
            sale.transactionType ||
            sale.termType
        ).toLowerCase();

    return value || "cash";

}


function getSaleTotalPaise(sale) {

    return integer(
        sale.grandTotalPaise ??
        sale.totalPaise ??
        sale.invoiceTotalPaise ??
        0
    );

}


function getSaleReceivedPaise(sale) {

    return Math.max(
        0,
        integer(
            sale.receivedPaise ??
            sale.paidPaise ??
            0
        )
    );

}


function getSaleBalancePaise(sale) {

    if (
        sale.balancePaise !== null &&
        sale.balancePaise !== undefined
    ) {

        return Math.max(
            0,
            integer(
                sale.balancePaise
            )
        );

    }

    return Math.max(
        0,
        getSaleTotalPaise(sale) -
        getSaleReceivedPaise(sale)
    );

}


function getCustomerSnapshot(sale) {

    const candidates = [
        sale.customerSnapshot,
        sale.customer,
        sale.billTo
    ];

    return (
        candidates.find(
            (value) =>
                value &&
                typeof value === "object"
        ) || {}
    );

}


function getCustomerName(sale) {

    const customer =
        getCustomerSnapshot(
            sale
        );

    return (
        text(customer.name) ||
        text(customer.customerName) ||
        text(sale.customerName) ||
        "Customer"
    );

}


function getSaleDisplayStatus(sale) {

    const storedStatus =
        text(sale.status)
            .toLowerCase();

    if (
        storedStatus === "cancelled" ||
        storedStatus === "draft"
    ) {
        return storedStatus;
    }

    const total =
        getSaleTotalPaise(sale);

    const received =
        getSaleReceivedPaise(sale);

    const balance =
        getSaleBalancePaise(sale);

    const dueDate =
        toDate(
            sale.dueDate ||
            sale.paymentDueDate
        );

    if (
        balance > 0 &&
        dueDate &&
        endOfDay(dueDate).getTime() <
            startOfDay(
                new Date()
            ).getTime()
    ) {
        return "overdue";
    }

    if (
        balance <= 0 &&
        total > 0
    ) {
        return "paid";
    }

    if (
        received > 0 &&
        balance > 0
    ) {
        return "partially_paid";
    }

    return "pending";

}


/* ============================================================
   GLOBAL SEARCH LISTENERS
   ============================================================ */

function startGlobalSearchListeners() {

    /* Customers */

    if (
        typeof state.unsubscribeCustomers ===
        "function"
    ) {
        state.unsubscribeCustomers();
    }

    state.unsubscribeCustomers =
        onSnapshot(
            collection(
                db,
                "businesses",
                BUSINESS_ID,
                "customers"
            ),

            (snapshot) => {

                state.customers =
                    snapshot.docs.map(
                        normalizeDocument
                    );

                refreshOpenGlobalSearch();

            },

            (error) => {

                console.error(
                    "Global customer search listener failed:",
                    error
                );

            }
        );


    /* Suppliers */

    if (
        typeof state.unsubscribeSuppliers ===
        "function"
    ) {
        state.unsubscribeSuppliers();
    }

    state.unsubscribeSuppliers =
        onSnapshot(
            collection(
                db,
                "businesses",
                BUSINESS_ID,
                "suppliers"
            ),

            (snapshot) => {

                state.suppliers =
                    snapshot.docs.map(
                        normalizeDocument
                    );

                refreshOpenGlobalSearch();

            },

            (error) => {

                console.error(
                    "Global supplier search listener failed:",
                    error
                );

            }
        );


    /* Sales */

    if (
        typeof state.unsubscribeSales ===
        "function"
    ) {
        state.unsubscribeSales();
    }

    state.unsubscribeSales =
        onSnapshot(
            collection(
                db,
                "businesses",
                BUSINESS_ID,
                "sales"
            ),

            (snapshot) => {

                state.sales =
                    snapshot.docs.map(
                        normalizeDocument
                    );

                refreshOpenGlobalSearch();

            },

            (error) => {

                console.error(
                    "Global sales search listener failed:",
                    error
                );

            }
        );

}


/* ============================================================
   GLOBAL SEARCH
   ============================================================ */

function normalizeGlobalSearchText(value) {

    return text(value)
        .toLowerCase();

}


function globalSearchContains(
    search,
    ...values
) {

    return values.some(
        (value) =>
            normalizeGlobalSearchText(
                value
            ).includes(search)
    );

}


/* ============================================================
   BUILD GLOBAL SEARCH RESULTS
   ============================================================ */

function buildGlobalSearchResults(
    searchText
) {

    const search =
        normalizeGlobalSearchText(
            searchText
        );

    if (!search) {
        return [];
    }

    const results = [];


    /* Customers */

    for (
        const customer
        of state.customers
    ) {

        if (
            !globalSearchContains(
                search,
                customer.customerNumber,
                customer.name,
                customer.mobile,
                customer.phone,
                customer.email,
                customer.gstin,
                customer.address
            )
        ) {
            continue;
        }

        results.push({

            type: "Customer",

            title:
                text(customer.name) ||
                "Customer",

            subtitle:
                text(customer.mobile) ||
                text(customer.phone) ||
                text(customer.email) ||
                "Customer record",

            href:
                customer.customerNumber
                    ? `/customers/${encodeURIComponent(
                        text(
                            customer.customerNumber
                        ).toUpperCase()
                    )}`
                    : "/customers"

        });

    }


    /* Suppliers */

    for (
        const supplier
        of state.suppliers
    ) {

        if (
            !globalSearchContains(
                search,
                supplier.supplierNumber,
                supplier.name,
                supplier.mobile,
                supplier.phone,
                supplier.email,
                supplier.gstin,
                supplier.address
            )
        ) {
            continue;
        }

        results.push({

            type: "Supplier",

            title:
                text(supplier.name) ||
                "Supplier",

            subtitle:
                text(supplier.mobile) ||
                text(supplier.phone) ||
                text(supplier.email) ||
                "Supplier record",

            href:
                supplier.supplierNumber
                    ? `/suppliers/${encodeURIComponent(
                        text(
                            supplier.supplierNumber
                        ).toUpperCase()
                    )}`
                    : "/suppliers"

        });

    }


    /* Sell */

    for (
        const sale
        of state.sales
    ) {

        const customer =
            getCustomerSnapshot(
                sale
            );

        const customerName =
            getCustomerName(
                sale
            );

        const total =
            getSaleTotalPaise(
                sale
            );

        const balance =
            getSaleBalancePaise(
                sale
            );

        const status =
            getSaleDisplayStatus(
                sale
            );

        if (
            !globalSearchContains(
                search,

                getSaleInvoiceNumber(
                    sale
                ),

                customerName,

                customer.mobile,

                customer.phone,

                customer.email,

                customer.gstin,

                getSaleType(
                    sale
                ),

                status,

                statusLabel(
                    status
                ),

                formatMoneyPaise(
                    total
                ),

                formatMoneyPaise(
                    balance
                ),

                total / 100,

                balance / 100
            )
        ) {
            continue;
        }

        results.push({

            type: "Sell",

            title:
                getSaleInvoiceNumber(
                    sale
                ),

            subtitle:
                `${customerName} · ` +
                `${formatMoneyPaise(total)} · ` +
                `${statusLabel(status)}`,

            href:
                sale.invoiceNumber
                    ? `/sales/${encodeURIComponent(
                        text(
                            sale.invoiceNumber
                        ).toUpperCase()
                    )}`
                    : "/sales"

        });

    }


    /* Buy */

    for (
        const purchase
        of state.purchases
    ) {

        const supplier =
            getSupplierSnapshot(
                purchase
            );

        const supplierName =
            getSupplierName(
                purchase
            );

        const total =
            getGrandTotalPaise(
                purchase
            );

        const balance =
            getBalancePaise(
                purchase
            );

        const status =
            getDisplayStatus(
                purchase
            );

        if (
            !globalSearchContains(
                search,

                getPurchaseNumber(
                    purchase
                ),

                purchase.supplierInvoiceNumber,

                purchase.billNumber,

                supplierName,

                supplier.mobile,

                supplier.phone,

                supplier.email,

                supplier.gstin,

                getPurchaseType(
                    purchase
                ),

                status,

                statusLabel(
                    status
                ),

                formatMoneyPaise(
                    total
                ),

                formatMoneyPaise(
                    balance
                ),

                total / 100,

                balance / 100
            )
        ) {
            continue;
        }

        results.push({

            type: "Buy",

            title:
                getPurchaseNumber(
                    purchase
                ),

            subtitle:
                `${supplierName} · ` +
                `${formatMoneyPaise(total)} · ` +
                `${statusLabel(status)}`,

            href:
                purchase.purchaseNumber
                    ? `/purchases/${encodeURIComponent(
                        text(
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
   HIDE GLOBAL SEARCH
   ============================================================ */

function hideGlobalSearchResults() {

    if (
        elements.globalSearchResults
    ) {

        elements.globalSearchResults.hidden =
            true;

    }

}


/* ============================================================
   RENDER GLOBAL SEARCH
   ============================================================ */

function renderGlobalSearchResults(
    searchText
) {

    const container =
        elements.globalSearchResults;

    const content =
        elements.globalSearchResultsContent;

    if (
        !container ||
        !content
    ) {
        return;
    }

    content.replaceChildren();

    const search =
        normalizeGlobalSearchText(
            searchText
        );

    if (!search) {

        container.hidden =
            true;

        return;

    }

    const results =
        buildGlobalSearchResults(
            search
        );

    if (!results.length) {

        content.append(
            createTextElement(
                "div",
                "search-result-empty",
                "No matching customers, suppliers, Sell or Buy records."
            )
        );

        container.hidden =
            false;

        return;

    }

    const fragment =
        document.createDocumentFragment();

    for (
        const result
        of results
    ) {

        const link =
            createElement(
                "a",
                "search-result-item"
            );

        link.href =
            result.href;

        const resultContent =
            createElement(
                "div",
                "search-result-content"
            );

        resultContent.append(
            createTextElement(
                "strong",
                "",
                result.title
            ),

            createTextElement(
                "span",
                "",
                result.subtitle
            )
        );

        const type =
            createTextElement(
                "span",
                "search-result-type",
                result.type
            );

        link.append(
            resultContent,
            type
        );

        fragment.append(
            link
        );

    }

    content.append(
        fragment
    );

    container.hidden =
        false;

}


/* ============================================================
   GLOBAL SEARCH EVENTS
   ============================================================ */

function handleGlobalSearch() {

    renderGlobalSearchResults(
        elements.globalSearchInput
            ?.value || ""
    );

}


function handleGlobalSearchFocus() {

    const value =
        elements.globalSearchInput
            ?.value || "";

    if (text(value)) {

        renderGlobalSearchResults(
            value
        );

    }

}


function handleGlobalSearchKeyDown(
    event
) {

    if (
        event.key !== "Escape"
    ) {
        return;
    }

    hideGlobalSearchResults();

    elements.globalSearchInput
        ?.blur();

}


function refreshOpenGlobalSearch() {

    if (
        !elements.globalSearchInput ||
        !elements.globalSearchResults
    ) {
        return;
    }

    const value =
        elements.globalSearchInput.value;

    if (!text(value)) {
        return;
    }

    renderGlobalSearchResults(
        value
    );

}


function handleDocumentClick(event) {

    if (
        !elements.globalSearchResults ||
        elements.globalSearchResults.hidden
    ) {
        return;
    }

    const target =
        event.target;

    if (
        !(target instanceof Node)
    ) {
        return;
    }

    const searchContainer =
        elements.globalSearchInput
            ?.closest(
                ".global-search"
            );

    if (
        searchContainer &&
        searchContainer.contains(
            target
        )
    ) {
        return;
    }

    hideGlobalSearchResults();

}


/* ============================================================
   DATE FILTER
   ============================================================ */

function handleDateFilterChange() {

    if (
        !elements.billingDateFilter
    ) {
        return;
    }

    state.dateFilter =
        text(
            elements.billingDateFilter.value
        ) || "today";

    const isCustom =
        state.dateFilter === "custom";

    if (
        elements.customDatePanel
    ) {

        elements.customDatePanel.hidden =
            !isCustom;

    }

    if (!isCustom) {

        state.customStartDate =
            null;

        state.customEndDate =
            null;

        renderPurchases();

    }

}


/* ============================================================
   CUSTOM DATE
   ============================================================ */

function applyCustomDate() {

    const start =
        parseLocalDateInput(
            elements.customStartDate
                ?.value
        );

    const end =
        parseLocalDateInput(
            elements.customEndDate
                ?.value
        );

    if (
        !start ||
        !end
    ) {

        window.alert(
            "Please select both From and To dates."
        );

        return;

    }

    if (
        start.getTime() >
        end.getTime()
    ) {

        window.alert(
            "From date cannot be after To date."
        );

        return;

    }

    state.customStartDate =
        start;

    state.customEndDate =
        end;

    state.dateFilter =
        "custom";

    renderPurchases();

}


/* ============================================================
   PURCHASE SEARCH
   ============================================================ */

function handlePurchasesSearch() {

    state.searchText =
        text(
            elements.purchasesSearchInput
                ?.value
        ).toLowerCase();

    renderPurchases();

}


/* ============================================================
   TYPE FILTER
   ============================================================ */

function handleTypeFilter() {

    state.typeFilter =
        text(
            elements.purchasesTypeFilter
                ?.value
        ).toLowerCase() || "all";

    renderPurchases();

}


/* ============================================================
   STATUS FILTER
   ============================================================ */

function handleStatusFilter() {

    state.statusFilter =
        text(
            elements.purchasesStatusFilter
                ?.value
        ).toLowerCase() || "all";

    renderPurchases();

}


/* ============================================================
   MOBILE CREATE
   ============================================================ */

function handleMobileCreate() {

    window.location.href =
        "/purchases/new";

}


/* ============================================================
   MOBILE SIDEBAR
   ============================================================ */

function toggleMobileSidebar() {

    if (
        !elements.sidebar ||
        !elements.mobileMenuButton
    ) {
        return;
    }

    const currentlyOpen =
        elements.sidebar.classList.contains(
            "open"
        );

    elements.sidebar.classList.toggle(
        "open",
        !currentlyOpen
    );

    elements.sidebar.classList.toggle(
        "is-open",
        !currentlyOpen
    );

    elements.mobileMenuButton.setAttribute(
        "aria-expanded",
        String(!currentlyOpen)
    );

}


function closeMobileSidebar() {

    if (!elements.sidebar) {
        return;
    }

    elements.sidebar.classList.remove(
        "open",
        "is-open"
    );

    if (
        elements.mobileMenuButton
    ) {

        elements.mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }

}


/* ============================================================
   LOGOUT
   ============================================================ */

async function handleLogout() {

    if (
        !elements.logoutButton
    ) {
        return;
    }

    elements.logoutButton.disabled =
        true;

    try {

        await signOut(auth);

    }
    catch (error) {

        console.error(
            "Sign out failed:",
            error
        );

        window.alert(
            "Unable to sign out. Please try again."
        );

        elements.logoutButton.disabled =
            false;

    }

}


/* ============================================================
   BIND EVENTS
   ============================================================ */

function bindEvents() {

    elements.billingDateFilter
        ?.addEventListener(
            "change",
            handleDateFilterChange
        );


    elements.applyCustomDateButton
        ?.addEventListener(
            "click",
            applyCustomDate
        );


    elements.purchasesSearchInput
        ?.addEventListener(
            "input",
            handlePurchasesSearch
        );


    elements.purchasesTypeFilter
        ?.addEventListener(
            "change",
            handleTypeFilter
        );


    elements.purchasesStatusFilter
        ?.addEventListener(
            "change",
            handleStatusFilter
        );


    elements.mobileNewTransactionButton
        ?.addEventListener(
            "click",
            handleMobileCreate
        );


    elements.mobileMenuButton
        ?.addEventListener(
            "click",
            toggleMobileSidebar
        );


    elements.logoutButton
        ?.addEventListener(
            "click",
            handleLogout
        );


    elements.globalSearchInput
        ?.addEventListener(
            "input",
            handleGlobalSearch
        );


    elements.globalSearchInput
        ?.addEventListener(
            "focus",
            handleGlobalSearchFocus
        );


    elements.globalSearchInput
        ?.addEventListener(
            "keydown",
            handleGlobalSearchKeyDown
        );


    document.addEventListener(
        "click",
        handleDocumentClick
    );


    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth > 900
            ) {

                closeMobileSidebar();

            }

        }
    );

}


/* ============================================================
   CLEANUP
   ============================================================ */

function cleanupListeners() {

    if (
        typeof state.unsubscribePurchases ===
        "function"
    ) {

        state.unsubscribePurchases();

        state.unsubscribePurchases =
            null;

    }


    if (
        typeof state.unsubscribePurchasePayments ===
        "function"
    ) {

        state.unsubscribePurchasePayments();

        state.unsubscribePurchasePayments =
            null;

    }


    if (
        typeof state.unsubscribeCustomers ===
        "function"
    ) {

        state.unsubscribeCustomers();

        state.unsubscribeCustomers =
            null;

    }


    if (
        typeof state.unsubscribeSuppliers ===
        "function"
    ) {

        state.unsubscribeSuppliers();

        state.unsubscribeSuppliers =
            null;

    }


    if (
        typeof state.unsubscribeSales ===
        "function"
    ) {

        state.unsubscribeSales();

        state.unsubscribeSales =
            null;

    }

}


/* ============================================================
   AUTH
   ============================================================ */

function startAuth() {

    onAuthStateChanged(
        auth,

        (user) => {

            if (!user) {

                state.authenticated =
                    false;

                cleanupListeners();

                window.location.replace(
                    "/login"
                );

                return;

            }


            state.authenticated =
                true;


            /*
             * Main Buy data.
             */

            startPurchasesListener();


            /*
             * Paid summary.
             */

            startPurchasePaymentsListener();


            /*
             * Portal-wide search.
             */

            startGlobalSearchListeners();

        },

        (error) => {

            console.error(
                "Authentication state error:",
                error
            );

            showError(
                "Unable to verify your session."
            );

        }
    );

}


/* ============================================================
   BEFORE UNLOAD
   ============================================================ */

window.addEventListener(
    "beforeunload",
    cleanupListeners
);


/* ============================================================
   INITIALIZE
   ============================================================ */

function initialize() {

    renderCurrentDate();

    bindEvents();

    showLoading();

    startAuth();

}


/* ============================================================
   START
   ============================================================ */

initialize();
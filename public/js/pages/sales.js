/* ============================================================
   OM MARUTI DIAMOND
   SALES / SELL LIST
   sales.js

   Responsibilities:
   - Authentication guard
   - Load real Sell invoices from Firestore
   - Date filtering
   - Search
   - Cash / Credit filtering
   - Payment status filtering
   - Sales summary
   - Desktop table
   - Mobile cards
   - Open sale detail
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

const SALES_COLLECTION_PATH = [
    "businesses",
    BUSINESS_ID,
    "sales"
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


    /* Date filtering */

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

    summaryTotalSell:
        document.getElementById("summaryTotalSell"),

    summaryReceived:
        document.getElementById("summaryReceived"),

    summaryReceivable:
        document.getElementById("summaryReceivable"),

    summaryOverdue:
        document.getElementById("summaryOverdue"),


    /* Sales controls */

    salesSearchInput:
        document.getElementById("salesSearchInput"),

    salesTypeFilter:
        document.getElementById("salesTypeFilter"),

    salesStatusFilter:
        document.getElementById("salesStatusFilter"),

    salesResultCount:
        document.getElementById("salesResultCount"),


    /* States */

    salesLoadingState:
        document.getElementById("salesLoadingState"),

    salesErrorState:
        document.getElementById("salesErrorState"),

    salesErrorMessage:
        document.getElementById("salesErrorMessage"),

    salesEmptyState:
        document.getElementById("salesEmptyState"),


    /* Desktop */

    salesTableWrapper:
        document.getElementById("salesTableWrapper"),

    salesTableBody:
        document.getElementById("salesTableBody"),


    /* Mobile */

    salesMobileList:
        document.getElementById("salesMobileList"),


    /* Mobile create */

    mobileNewTransactionButton:
        document.getElementById("mobileNewTransactionButton")

};


/* ============================================================
   STATE
   ============================================================ */

const state = {

    /* Sales page */
    sales: [],

    searchText: "",
    typeFilter: "all",
    statusFilter: "all",

    dateFilter: "today",

    customStartDate: null,
    customEndDate: null,

    /* Portal global search */
    customers: [],
    suppliers: [],
    purchases: [],

    salePayments: [],

    /* Firestore listeners */
    unsubscribeSales: null,
    unsubscribeCustomers: null,
    unsubscribeSuppliers: null,
    unsubscribePurchases: null,
    unsubscribeSalePayments: null,

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

    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;

}


function integer(value) {

    return Math.round(number(value));

}


function setText(
    element,
    value,
    fallback = "—"
) {

    if (!element) {
        return;
    }

    const output = text(value);

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

    const paise = integer(value);

    return moneyFormatter.format(
        paise / 100
    );

}


/* ============================================================
   DATE HELPERS
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


function toDate(value) {

    if (!value) {
        return null;
    }


    /* Firestore Timestamp */

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        const result = value.toDate();

        return Number.isNaN(result.getTime())
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

        return Number.isNaN(result.getTime())
            ? null
            : result;

    }


    /* JS Date */

    if (value instanceof Date) {

        return Number.isNaN(value.getTime())
            ? null
            : value;

    }


    /* String / number */

    const result =
        new Date(value);

    return Number.isNaN(result.getTime())
        ? null
        : result;

}


function formatDate(value) {

    const date = toDate(value);

    if (!date) {
        return "—";
    }

    return displayDateFormatter.format(date);

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

    const raw = text(value);

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

    if (Number.isNaN(result.getTime())) {
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
   SALE FIELD HELPERS
   ============================================================ */

function getInvoiceNumber(sale) {

    return (
        text(sale.invoiceNumber) ||
        text(sale.saleNumber) ||
        text(sale.transactionNumber) ||
        "—"
    );

}


function getInvoiceDate(sale) {

    return (
        sale.invoiceDate ||
        sale.saleDate ||
        sale.transactionDate ||
        sale.createdAt ||
        null
    );

}


function getDueDate(sale) {

    return (
        sale.dueDate ||
        sale.paymentDueDate ||
        null
    );

}


function getSaleType(sale) {

    const value =
        text(
            sale.saleType ||
            sale.transactionType ||
            sale.termType
        ).toLowerCase();

    if (value === "credit") {
        return "credit";
    }

    if (value === "cash") {
        return "cash";
    }

    return value || "cash";

}


function getGrandTotalPaise(sale) {

    return integer(
        sale.grandTotalPaise ??
        sale.totalPaise ??
        sale.invoiceTotalPaise ??
        0
    );

}


function getReceivedPaise(sale) {

    return Math.max(
        0,
        integer(
            sale.receivedPaise ??
            sale.paidPaise ??
            sale.receiptTotalPaise ??
            0
        )
    );

}


function getBalancePaise(sale) {

    /*
     * Prefer authoritative stored balance.
     */

    if (
        sale.balancePaise !== null &&
        sale.balancePaise !== undefined
    ) {

        return Math.max(
            0,
            integer(sale.balancePaise)
        );

    }


    const total =
        getGrandTotalPaise(sale);

    const received =
        getReceivedPaise(sale);

    return Math.max(
        0,
        total - received
    );

}



/* ============================================================
   GLOBAL SEARCH — PURCHASE HELPERS
   ============================================================ */

function getPurchaseNumber(purchase) {

    return (
        text(purchase.purchaseNumber) ||
        text(purchase.buyNumber) ||
        text(purchase.transactionNumber) ||
        "—"
    );

}


function getPurchaseType(purchase) {

    const value =
        text(
            purchase.purchaseType ||
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


function getPurchaseTotalPaise(purchase) {

    return integer(
        purchase.grandTotalPaise ??
        purchase.totalPaise ??
        purchase.purchaseTotalPaise ??
        0
    );

}


function getPurchasePaidPaise(purchase) {

    return Math.max(
        0,
        integer(
            purchase.paidPaise ??
            purchase.paymentTotalPaise ??
            0
        )
    );

}


function getPurchaseBalancePaise(purchase) {

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
        getPurchaseTotalPaise(purchase) -
        getPurchasePaidPaise(purchase)
    );

}


function getSupplierSnapshot(purchase) {

    const candidates = [
        purchase.supplierSnapshot,
        purchase.supplier,
        purchase.billFrom
    ];


    return candidates.find(
        (value) =>
            value &&
            typeof value === "object"
    ) || {};

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


function getPurchaseDisplayStatus(purchase) {

    const storedStatus =
        text(
            purchase.status
        ).toLowerCase();


    if (storedStatus === "cancelled") {
        return "cancelled";
    }


    if (storedStatus === "draft") {
        return "draft";
    }


    const total =
        getPurchaseTotalPaise(
            purchase
        );

    const paid =
        getPurchasePaidPaise(
            purchase
        );

    const balance =
        getPurchaseBalancePaise(
            purchase
        );


    if (
        balance <= 0 &&
        total > 0
    ) {
        return "paid";
    }


    const dueDate =
        toDate(
            purchase.dueDate ||
            purchase.paymentDueDate
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


    return "pending";

}


/* ============================================================
   CUSTOMER SNAPSHOT
   ============================================================ */

function getCustomerSnapshot(sale) {

    const snapshot =
        sale.customerSnapshot;

    if (
        snapshot &&
        typeof snapshot === "object"
    ) {
        return snapshot;
    }


    const customer =
        sale.customer;

    if (
        customer &&
        typeof customer === "object"
    ) {
        return customer;
    }


    return {};

}


function getCustomerName(sale) {

    const customer =
        getCustomerSnapshot(sale);

    return (
        text(customer.name) ||
        text(customer.customerName) ||
        text(sale.customerName) ||
        "Customer"
    );

}


function getCustomerMobile(sale) {

    const customer =
        getCustomerSnapshot(sale);

    return (
        text(customer.mobile) ||
        text(customer.phone) ||
        text(customer.mobileNumber) ||
        text(sale.customerMobile)
    );

}


function getCustomerInitials(name) {

    const words =
        text(name)
            .split(/\s+/)
            .filter(Boolean);

    if (!words.length) {
        return "CU";
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
   STATUS
   ============================================================ */

function isSaleCancelled(sale) {

    return (
        text(sale.status)
            .toLowerCase() ===
        "cancelled"
    );

}


function isSaleDraft(sale) {

    return (
        text(sale.status)
            .toLowerCase() ===
        "draft"
    );

}


function isOverdue(sale) {

    if (
        isSaleCancelled(sale) ||
        isSaleDraft(sale)
    ) {
        return false;
    }

    if (
        getBalancePaise(sale) <= 0
    ) {
        return false;
    }

    const dueDate =
        toDate(
            getDueDate(sale)
        );

    if (!dueDate) {
        return false;
    }

    return (
        endOfDay(dueDate).getTime() <
        startOfDay(new Date()).getTime()
    );

}


function getDisplayStatus(sale) {

    const storedStatus =
        text(sale.status)
            .toLowerCase();


    if (storedStatus === "cancelled") {
        return "cancelled";
    }


    if (storedStatus === "draft") {
        return "draft";
    }


    if (isOverdue(sale)) {
        return "overdue";
    }


    const total =
        getGrandTotalPaise(sale);

    const received =
        getReceivedPaise(sale);

    const balance =
        getBalancePaise(sale);


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


    if (
        storedStatus ===
        "partially_paid"
    ) {
        return "partially_paid";
    }


    if (
        storedStatus === "paid"
    ) {
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


        case "custom": {

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

        }


        case "all":
        default:

            return null;

    }

}


/* ============================================================
   DATE MATCH
   ============================================================ */

function saleMatchesDateFilter(sale) {

    const range =
        getSelectedDateRange();

    if (!range) {
        return true;
    }

    const saleDate =
        toDate(
            getInvoiceDate(sale)
        );

    if (!saleDate) {
        return false;
    }

    const timestamp =
        saleDate.getTime();

    return (
        timestamp >=
            range.start.getTime() &&
        timestamp <=
            range.end.getTime()
    );

}


/* ============================================================
   SEARCH MATCH
   ============================================================ */

function saleMatchesSearch(sale) {

    const search =
        state.searchText;

    if (!search) {
        return true;
    }

    const customer =
        getCustomerSnapshot(sale);

    const searchable =
        [
            getInvoiceNumber(sale),
            getCustomerName(sale),
            getCustomerMobile(sale),
            customer.email,
            customer.gstin,
            sale.customerId,
            getSaleType(sale),
            statusLabel(
                getDisplayStatus(sale)
            )
        ]
            .map(text)
            .join(" ")
            .toLowerCase();

    return searchable.includes(search);

}


/* ============================================================
   TYPE MATCH
   ============================================================ */

function saleMatchesType(sale) {

    if (
        state.typeFilter === "all"
    ) {
        return true;
    }

    return (
        getSaleType(sale) ===
        state.typeFilter
    );

}


/* ============================================================
   STATUS MATCH
   ============================================================ */

function saleMatchesStatus(sale) {

    if (
        state.statusFilter === "all"
    ) {
        return true;
    }

    return (
        getDisplayStatus(sale) ===
        state.statusFilter
    );

}


/* ============================================================
   FILTERED SALES
   ============================================================ */

function getFilteredSales() {

    return state.sales.filter(
        (sale) => {

            return (
                saleMatchesDateFilter(sale) &&
                saleMatchesSearch(sale) &&
                saleMatchesType(sale) &&
                saleMatchesStatus(sale)
            );

        }
    );

}


/* ============================================================
   SUMMARY

   Total Sell:
   Uses invoiceDate and respects selected date range.

   Received:
   Uses salePayments.paymentDate and respects selected date range.

   Receivable:
   Current customer outstanding.
   Independent of selected date range.

   Overdue:
   Current overdue outstanding.
   Independent of selected date range.
   ============================================================ */

function renderSummary() {

    /*
     * --------------------------------------------------------
     * TOTAL SELL
     *
     * Controlled by invoice date.
     * --------------------------------------------------------
     */

    const periodSales =
        state.sales.filter(
            (sale) => {

                return (
                    !isSaleCancelled(sale) &&
                    !isSaleDraft(sale) &&
                    saleMatchesDateFilter(sale)
                );

            }
        );


    let totalSellPaise = 0;


    for (
        const sale
        of periodSales
    ) {

        totalSellPaise +=
            getGrandTotalPaise(
                sale
            );

    }


    /*
     * --------------------------------------------------------
     * RECEIVED
     *
     * Controlled by actual paymentDate,
     * NOT invoiceDate.
     * --------------------------------------------------------
     */

    const receivedPaise =
        getReceivedForSelectedPeriod();


    /*
     * --------------------------------------------------------
     * RECEIVABLE / OVERDUE
     *
     * Current outstanding values.
     * Intentionally independent of date filter.
     * --------------------------------------------------------
     */

    let receivablePaise = 0;
    let overduePaise = 0;


    for (
        const sale
        of state.sales
    ) {

        if (
            isSaleCancelled(sale) ||
            isSaleDraft(sale)
        ) {

            continue;

        }


        const balance =
            getBalancePaise(
                sale
            );


        if (balance <= 0) {
            continue;
        }


        receivablePaise +=
            balance;


        if (
            isOverdue(sale)
        ) {

            overduePaise +=
                balance;

        }

    }


    /*
     * --------------------------------------------------------
     * RENDER
     * --------------------------------------------------------
     */

    setText(
        elements.summaryTotalSell,
        formatMoneyPaise(
            totalSellPaise
        )
    );


    setText(
        elements.summaryReceived,
        formatMoneyPaise(
            receivedPaise
        )
    );


    setText(
        elements.summaryReceivable,
        formatMoneyPaise(
            receivablePaise
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

function hideAllSalesStates() {

    if (elements.salesLoadingState) {
        elements.salesLoadingState.hidden = true;
    }

    if (elements.salesErrorState) {
        elements.salesErrorState.hidden = true;
    }

    if (elements.salesEmptyState) {
        elements.salesEmptyState.hidden = true;
    }

    if (elements.salesTableWrapper) {
        elements.salesTableWrapper.hidden = true;
    }

    if (elements.salesMobileList) {
        elements.salesMobileList.hidden = true;
    }

}


function showLoading() {

    hideAllSalesStates();

    if (elements.salesLoadingState) {
        elements.salesLoadingState.hidden = false;
    }

}


function showError(message) {

    hideAllSalesStates();

    setText(
        elements.salesErrorMessage,
        message,
        "Please try again."
    );

    if (elements.salesErrorState) {
        elements.salesErrorState.hidden = false;
    }

}


function showEmpty() {

    hideAllSalesStates();

    if (elements.salesEmptyState) {
        elements.salesEmptyState.hidden = false;
    }

}


function showResults() {

    hideAllSalesStates();

    if (elements.salesTableWrapper) {
        elements.salesTableWrapper.hidden = false;
    }

    if (elements.salesMobileList) {
        elements.salesMobileList.hidden = false;
    }

}


/* ============================================================
   DOM ELEMENT HELPERS
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

function createStatusBadge(sale) {

    const status =
        getDisplayStatus(sale);

    const badge =
        createTextElement(
            "span",
            "sales-status-badge",
            statusLabel(status)
        );

    badge.dataset.status =
        status;

    return badge;

}


/* ============================================================
   TYPE BADGE
   ============================================================ */

function createTypeBadge(sale) {

    const type =
        getSaleType(sale);

    const badge =
        createTextElement(
            "span",
            "sale-type-badge",
            type === "credit"
                ? "Credit"
                : "Cash"
        );

    badge.dataset.type =
        type;

    return badge;

}


/* ============================================================
   CUSTOMER CELL
   ============================================================ */

function createCustomerCell(sale) {

    const container =
        createElement(
            "div",
            "customer-cell"
        );


    const name =
        getCustomerName(sale);

    const mobile =
        getCustomerMobile(sale);


    const avatar =
        createTextElement(
            "span",
            "customer-avatar",
            getCustomerInitials(name)
        );


    const content =
        createElement(
            "div",
            "customer-cell-content"
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
            mobile || "Customer"
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
   OPEN SALE
   ============================================================ */

function openSale(sale) {

    const invoiceNumber =
        getInvoiceNumber(sale);

    if (
        !invoiceNumber ||
        invoiceNumber === "—"
    ) {
        return;
    }

    window.location.href =
        `/sales/${encodeURIComponent(
            invoiceNumber
        )}`;
}


/* ============================================================
   DESKTOP ROW
   ============================================================ */

function createDesktopSaleRow(sale) {

    const row =
        document.createElement("tr");


    row.tabIndex = 0;

    row.dataset.saleId =
        sale.id;


    row.addEventListener(
        "click",
        () => {
            openSale(sale);
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

                openSale(sale);

            }

        }
    );


    /* --------------------------------------------------------
       Invoice
       -------------------------------------------------------- */

    const invoiceCell =
        document.createElement("td");


    const invoiceNumber =
        createTextElement(
            "span",
            "invoice-number",
            getInvoiceNumber(sale)
        );


    invoiceCell.append(
        invoiceNumber
    );


    /* --------------------------------------------------------
       Customer
       -------------------------------------------------------- */

    const customerCell =
        document.createElement("td");

    customerCell.append(
        createCustomerCell(sale)
    );


    /* --------------------------------------------------------
       Date
       -------------------------------------------------------- */

    const dateCell =
        document.createElement("td");


    dateCell.append(
        createTextElement(
            "span",
            "sales-date",
            formatDate(
                getInvoiceDate(sale)
            )
        )
    );


    /* --------------------------------------------------------
       Type
       -------------------------------------------------------- */

    const typeCell =
        document.createElement("td");

    typeCell.append(
        createTypeBadge(sale)
    );


    /* --------------------------------------------------------
       Total
       -------------------------------------------------------- */

    const totalCell =
        createTextElement(
            "td",
            "table-money",
            formatMoneyPaise(
                getGrandTotalPaise(sale)
            )
        );


    /* --------------------------------------------------------
       Received
       -------------------------------------------------------- */

    const receivedCell =
        createTextElement(
            "td",
            "table-money",
            formatMoneyPaise(
                getReceivedPaise(sale)
            )
        );


    /* --------------------------------------------------------
       Balance
       -------------------------------------------------------- */

    const balanceCell =
        createTextElement(
            "td",
            "table-money sales-balance",
            formatMoneyPaise(
                getBalancePaise(sale)
            )
        );


    /* --------------------------------------------------------
       Due date
       -------------------------------------------------------- */

    const dueCell =
        document.createElement("td");


    const dueDate =
        createTextElement(
            "span",
            "sales-due-date",
            getSaleType(sale) === "credit"
                ? formatDate(
                    getDueDate(sale)
                )
                : "—"
        );


    if (isOverdue(sale)) {

        dueDate.classList.add(
            "is-overdue"
        );

    }


    dueCell.append(
        dueDate
    );


    /* --------------------------------------------------------
       Status
       -------------------------------------------------------- */

    const statusCell =
        document.createElement("td");

    statusCell.append(
        createStatusBadge(sale)
    );


    /* --------------------------------------------------------
       Action
       -------------------------------------------------------- */

    const actionCell =
        document.createElement("td");

    actionCell.className =
        "table-actions";


    const openButton =
        createTextElement(
            "button",
            "sales-open-button",
            "›"
        );


    openButton.type =
        "button";

    openButton.setAttribute(
        "aria-label",
        `Open ${getInvoiceNumber(sale)}`
    );


    openButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            openSale(sale);

        }
    );


    actionCell.append(
        openButton
    );


    row.append(
        invoiceCell,
        customerCell,
        dateCell,
        typeCell,
        totalCell,
        receivedCell,
        balanceCell,
        dueCell,
        statusCell,
        actionCell
    );


    return row;

}


/* ============================================================
   MOBILE CUSTOMER
   ============================================================ */

function createMobileCustomer(sale) {

    const container =
        createElement(
            "div",
            "sales-mobile-customer"
        );


    const name =
        getCustomerName(sale);


    const avatar =
        createTextElement(
            "span",
            "sales-mobile-customer-avatar",
            getCustomerInitials(name)
        );


    const content =
        createElement(
            "div",
            "sales-mobile-customer-content"
        );


    const strong =
        createTextElement(
            "strong",
            "",
            name
        );


    const secondary =
        createTextElement(
            "span",
            "",
            getCustomerMobile(sale) ||
            "Customer"
        );


    content.append(
        strong,
        secondary
    );


    container.append(
        avatar,
        content
    );


    return container;

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
            "sales-mobile-value"
        );


    const labelElement =
        createTextElement(
            "span",
            "",
            label
        );


    const valueElement =
        createTextElement(
            "strong",
            "",
            value
        );


    container.append(
        labelElement,
        valueElement
    );


    return container;

}


/* ============================================================
   MOBILE CARD
   ============================================================ */

function createMobileSaleCard(sale) {

    const card =
        createElement(
            "a",
            "sales-mobile-card"
        );


    const invoiceNumber =
    getInvoiceNumber(sale);

    card.href =
        invoiceNumber &&
        invoiceNumber !== "—"
            ? `/sales/${encodeURIComponent(
                invoiceNumber
            )}`
            : "/sales";


    /* Header */

    const header =
        createElement(
            "div",
            "sales-mobile-card-header"
        );


    const title =
        createElement(
            "div",
            "sales-mobile-card-title"
        );


    title.append(
        createTextElement(
            "strong",
            "invoice-number",
            getInvoiceNumber(sale)
        )
    );


    title.append(
        createTextElement(
            "span",
            "sales-mobile-date",
            formatDate(
                getInvoiceDate(sale)
            )
        )
    );


    header.append(
        title,
        createStatusBadge(sale)
    );


    /* Customer */

    const customer =
        createMobileCustomer(sale);


    /* Values */

    const values =
        createElement(
            "div",
            "sales-mobile-values"
        );


    values.append(
        createMobileValue(
            "Total",
            formatMoneyPaise(
                getGrandTotalPaise(sale)
            )
        ),

        createMobileValue(
            "Received",
            formatMoneyPaise(
                getReceivedPaise(sale)
            )
        ),

        createMobileValue(
            "Balance",
            formatMoneyPaise(
                getBalancePaise(sale)
            )
        )
    );


    /* Footer */

    const footer =
        createElement(
            "div",
            "sales-mobile-card-footer"
        );


    footer.append(
        createTypeBadge(sale)
    );


    const due =
        createTextElement(
            "span",
            "sales-due-date",
            getSaleType(sale) === "credit"
                ? `Due ${formatDate(
                    getDueDate(sale)
                )}`
                : "Fully settled"
        );


    if (isOverdue(sale)) {

        due.classList.add(
            "is-overdue"
        );

    }


    footer.append(
        due
    );


    card.append(
        header,
        customer,
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

    if (!elements.salesResultCount) {
        return;
    }


    const totalCount =
        state.sales.length;


    if (totalCount === 0) {

        elements.salesResultCount.textContent =
            "No invoices";

        return;

    }


    if (visibleCount === totalCount) {

        elements.salesResultCount.textContent =
            `${totalCount} ${
                totalCount === 1
                    ? "invoice"
                    : "invoices"
            }`;

        return;

    }


    elements.salesResultCount.textContent =
        `${visibleCount} of ${totalCount} invoices`;

}


/* ============================================================
   RENDER SALES
   ============================================================ */

function renderSales() {

    renderSummary();


    const filteredSales =
        getFilteredSales();


    renderResultCount(
        filteredSales.length
    );


    if (elements.salesTableBody) {

        elements.salesTableBody.replaceChildren();

    }


    if (elements.salesMobileList) {

        elements.salesMobileList.replaceChildren();

    }


    if (!filteredSales.length) {

        showEmpty();

        return;

    }


    const desktopFragment =
        document.createDocumentFragment();

    const mobileFragment =
        document.createDocumentFragment();


    for (const sale of filteredSales) {

        desktopFragment.append(
            createDesktopSaleRow(sale)
        );

        mobileFragment.append(
            createMobileSaleCard(sale)
        );

    }


    if (elements.salesTableBody) {

        elements.salesTableBody.append(
            desktopFragment
        );

    }


    if (elements.salesMobileList) {

        elements.salesMobileList.append(
            mobileFragment
        );

    }


    showResults();

}


/* ============================================================
   NORMALIZE FIRESTORE SALE
   ============================================================ */

function normalizeSale(
    snapshot
) {

    return {
        id: snapshot.id,
        ...snapshot.data()
    };

}


/* ============================================================
   FIRESTORE LISTENER
   ============================================================ */

function startSalesListener() {

    if (state.unsubscribeSales) {

        state.unsubscribeSales();

        state.unsubscribeSales = null;

    }


    showLoading();


    const salesReference =
        collection(
            db,
            ...SALES_COLLECTION_PATH
        );


    /*
     * The normal schema stores invoiceDate on every finalized
     * sale. If an older document is missing invoiceDate,
     * Firestore orderBy will not include that document.
     */

    const salesQuery =
        query(
            salesReference,
            orderBy(
                "invoiceDate",
                "desc"
            )
        );


    state.unsubscribeSales =
        onSnapshot(
            salesQuery,

            (snapshot) => {

                state.sales =
                    snapshot.docs.map(
                        normalizeSale
                    );

                renderSales();

            },

            (error) => {

                console.error(
                    "Unable to load sales:",
                    error
                );


                showError(
                    error?.message ||
                    "Unable to load Sell invoices."
                );

            }
        );

}





function startSalePaymentsListener() {

    if (
        typeof state.unsubscribeSalePayments ===
        "function"
    ) {

        state.unsubscribeSalePayments();

        state.unsubscribeSalePayments =
            null;
    }


    const paymentsQuery =
        query(
            collection(
                db,
                "businesses",
                BUSINESS_ID,
                "salePayments"
            ),
            orderBy(
                "paymentDate",
                "desc"
            )
        );


    state.unsubscribeSalePayments =
        onSnapshot(
            paymentsQuery,

            (snapshot) => {

                state.salePayments =
                    snapshot.docs.map(
                        (documentSnapshot) => ({
                            id:
                                documentSnapshot.id,

                            ...documentSnapshot.data()
                        })
                    );


                /*
                 * Payment data affects the Received summary.
                 */
                renderSales();

            },

            (error) => {

                console.error(
                    "Sale payments listener failed:",
                    error
                );

            }
        );

}


function getSalePaymentDate(payment) {

    return toDate(
        payment.paymentDate
    );

}




function getReceivedForSelectedPeriod() {

    const range =
        getSelectedDateRange();


    let totalPaise = 0;


    for (
        const payment
        of state.salePayments
    ) {

        const paymentDate =
            getSalePaymentDate(
                payment
            );


        if (!paymentDate) {
            continue;
        }


        /*
         * "All" has no date range,
         * therefore every payment is included.
         */
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
   GLOBAL SEARCH FIRESTORE LISTENERS
   ============================================================ */

function normalizeSearchDocument(snapshot) {

    return {
        id: snapshot.id,
        ...snapshot.data()
    };

}


function startGlobalSearchListeners() {

    /* --------------------------------------------------------
       CUSTOMERS
       -------------------------------------------------------- */

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
                        normalizeSearchDocument
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


    /* --------------------------------------------------------
       SUPPLIERS
       -------------------------------------------------------- */

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
                        normalizeSearchDocument
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


    /* --------------------------------------------------------
       PURCHASES
       -------------------------------------------------------- */

    if (
        typeof state.unsubscribePurchases ===
        "function"
    ) {
        state.unsubscribePurchases();
    }


    state.unsubscribePurchases =
        onSnapshot(

            collection(
                db,
                "businesses",
                BUSINESS_ID,
                "purchases"
            ),

            (snapshot) => {

                state.purchases =
                    snapshot.docs.map(
                        normalizeSearchDocument
                    );


                refreshOpenGlobalSearch();

            },

            (error) => {

                console.error(
                    "Global purchase search listener failed:",
                    error
                );

            }

        );

}






/* ============================================================
   DATE FILTER
   ============================================================ */

function handleDateFilterChange() {

    if (!elements.billingDateFilter) {
        return;
    }


    state.dateFilter =
        text(
            elements.billingDateFilter.value
        ) || "today";


    const isCustom =
        state.dateFilter === "custom";


    if (elements.customDatePanel) {

        elements.customDatePanel.hidden =
            !isCustom;

    }


    if (!isCustom) {

        state.customStartDate =
            null;

        state.customEndDate =
            null;

        renderSales();

    }

}


/* ============================================================
   CUSTOM DATE
   ============================================================ */

function applyCustomDate() {

    const start =
        parseLocalDateInput(
            elements.customStartDate?.value
        );

    const end =
        parseLocalDateInput(
            elements.customEndDate?.value
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


    renderSales();

}


/* ============================================================
   SALES SEARCH
   ============================================================ */

function handleSalesSearch() {

    state.searchText =
        text(
            elements.salesSearchInput?.value
        ).toLowerCase();

    renderSales();

}


/* ============================================================
   TYPE FILTER
   ============================================================ */

function handleTypeFilter() {

    state.typeFilter =
        text(
            elements.salesTypeFilter?.value
        ).toLowerCase() || "all";

    renderSales();

}


/* ============================================================
   STATUS FILTER
   ============================================================ */

function handleStatusFilter() {

    state.statusFilter =
        text(
            elements.salesStatusFilter?.value
        ).toLowerCase() || "all";

    renderSales();

}


/* ============================================================
   MOBILE CREATE
   ============================================================ */

function handleMobileCreate() {

    /*
     * On the Sell page, the central create action starts
     * a new Sell transaction.
     */

    window.location.href =
    "/sales/new";

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


    /*
     * Support the alternative shared class if layout.css uses it.
     */

    elements.sidebar.classList.toggle(
        "is-open",
        !currentlyOpen
    );


    elements.mobileMenuButton.setAttribute(
        "aria-expanded",
        String(!currentlyOpen)
    );

}


/* ============================================================
   CLOSE SIDEBAR WHEN RESIZED
   ============================================================ */

function closeMobileSidebar() {

    if (!elements.sidebar) {
        return;
    }


    elements.sidebar.classList.remove(
        "open",
        "is-open"
    );


    if (elements.mobileMenuButton) {

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

    if (!elements.logoutButton) {
        return;
    }


    elements.logoutButton.disabled =
        true;


    try {

        await signOut(auth);


        /*
         * Auth state listener handles the signed-out state.
         */

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
   GLOBAL SEARCH

   Keep the field functional without duplicating the full
   dashboard cross-collection search implementation.

   On this page it searches the currently loaded Sell invoices.
   ============================================================ */

/* ============================================================
   GLOBAL SEARCH

   Portal-wide search:
   - Customers
   - Suppliers
   - Sell
   - Buy
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


    /* --------------------------------------------------------
       CUSTOMERS
       -------------------------------------------------------- */

    for (
        const customer
        of state.customers
    ) {

        if (
            !globalSearchContains(
                search,
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

            type:
                "Customer",

            title:
                text(customer.name) ||
                "Customer",

            subtitle:
                text(customer.mobile) ||
                text(customer.phone) ||
                text(customer.email) ||
                "Customer record",

            href:
            `/customers/${encodeURIComponent(
                text(customer.customerNumber)
            )}`

        });

    }


    /* --------------------------------------------------------
       SUPPLIERS
       -------------------------------------------------------- */

    for (
        const supplier
        of state.suppliers
    ) {

        if (
            !globalSearchContains(
                search,
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

            type:
                "Supplier",

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
                        String(supplier.supplierNumber)
                            .trim()
                            .toUpperCase()
                    )}`
                    : "/suppliers"

        });

    }


    /* --------------------------------------------------------
       SELL
       -------------------------------------------------------- */

    for (
        const sale
        of state.sales
    ) {

        const total =
            getGrandTotalPaise(
                sale
            );

        const balance =
            getBalancePaise(
                sale
            );

        const status =
            getDisplayStatus(
                sale
            );

        const customer =
            getCustomerSnapshot(
                sale
            );

        const partyName =
            getCustomerName(
                sale
            );


        if (
            !globalSearchContains(
                search,

                getInvoiceNumber(
                    sale
                ),

                partyName,

                getCustomerMobile(
                    sale
                ),

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

            type:
                "Sell",

            title:
                getInvoiceNumber(
                    sale
                ),

            subtitle:
                `${partyName} · ` +
                `${formatMoneyPaise(total)} · ` +
                `${statusLabel(status)}`,

            href:
                `/sales/${encodeURIComponent(
                    getInvoiceNumber(sale)
                )}`

        });

    }


    /* --------------------------------------------------------
       BUY
       -------------------------------------------------------- */

    for (
        const purchase
        of state.purchases
    ) {

        const total =
            getPurchaseTotalPaise(
                purchase
            );

        const balance =
            getPurchaseBalancePaise(
                purchase
            );

        const status =
            getPurchaseDisplayStatus(
                purchase
            );

        const supplier =
            getSupplierSnapshot(
                purchase
            );

        const partyName =
            getSupplierName(
                purchase
            );


        if (
            !globalSearchContains(
                search,

                getPurchaseNumber(
                    purchase
                ),

                purchase.supplierInvoiceNumber,

                partyName,

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

            type:
                "Buy",

            title:
                getPurchaseNumber(
                    purchase
                ),

            subtitle:
                `${partyName} · ` +
                `${formatMoneyPaise(total)} · ` +
                `${statusLabel(status)}`,

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
   GLOBAL SEARCH INPUT
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


    if (
        text(value)
    ) {

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


/* ============================================================
   REFRESH SEARCH AFTER SNAPSHOT UPDATE
   ============================================================ */

function refreshOpenGlobalSearch() {

    if (
        !elements.globalSearchInput ||
        !elements.globalSearchResults
    ) {
        return;
    }


    const value =
        elements.globalSearchInput.value;


    if (
        !text(value)
    ) {
        return;
    }


    renderGlobalSearchResults(
        value
    );

}


/* ============================================================
   CLICK OUTSIDE GLOBAL SEARCH
   ============================================================ */

function handleDocumentClick(event) {

    if (
        !elements.globalSearchResults ||
        elements.globalSearchResults.hidden
    ) {
        return;
    }


    const target =
        event.target;


    if (!(target instanceof Node)) {
        return;
    }


    const searchContainer =
        elements.globalSearchInput
            ?.closest(".global-search");


    if (
        searchContainer &&
        searchContainer.contains(target)
    ) {
        return;
    }


    hideGlobalSearchResults();

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


    elements.salesSearchInput
        ?.addEventListener(
            "input",
            handleSalesSearch
        );


    elements.salesTypeFilter
        ?.addEventListener(
            "change",
            handleTypeFilter
        );


    elements.salesStatusFilter
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


            startSalesListener();
            startGlobalSearchListeners();
            startSalePaymentsListener();
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
   CLEANUP
   ============================================================ */

function cleanupListeners() {

    if (
        typeof state.unsubscribeSales ===
        "function"
    ) {

        state.unsubscribeSales();

        state.unsubscribeSales =
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
        typeof state.unsubscribePurchases ===
        "function"
    ) {

        state.unsubscribePurchases();

        state.unsubscribePurchases =
            null;

    }

    if (
        typeof state.unsubscribeSalePayments ===
        "function"
    ) {

        state.unsubscribeSalePayments();

        state.unsubscribeSalePayments =
            null;

    }

}


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
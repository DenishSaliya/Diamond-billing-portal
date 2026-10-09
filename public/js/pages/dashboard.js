/* ============================================================
   OM MARUTI DIAMOND
   DASHBOARD
   ============================================================

   Dashboard responsibilities:
   - Current date
   - Authentication protection
   - Real-time Firestore updates
   - Today / Yesterday / 7 Days / 30 Days / All Time / Custom
   - Total Sell
   - Total Buy
   - Current Receivable
   - Current Payable
   - Received
   - Paid
   - Overdue Receivable
   - Overdue Payable
   - Sell vs Buy chart
   - Recent transactions
   - Credit Sell dues
   - Credit Buy dues
   - Global search
   - New transaction modal
   - Sidebar
   - Logout

   IMPORTANT:
   This dashboard performs READS only.

   Financial/customer/supplier writes remain behind trusted
   callable Cloud Functions.
   ============================================================ */


/* ============================================================
   FIREBASE IMPORTS
   ============================================================ */

import {
    collection,
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
    auth,
    db
} from "../firebase.js";


/* ============================================================
   CONFIGURATION
   ============================================================ */

const BUSINESS_ID = "om-maruti-diamond";

const DEFAULT_DATE_RANGE = "today";

const MAX_RECENT_TRANSACTIONS = 10;

const MAX_DUE_ITEMS = 6;

const MAX_SEARCH_RESULTS = 12;


/* ============================================================
   STATE
   ============================================================ */

const state = {
    sales: [],
    purchases: [],
    customers: [],
    suppliers: [],
    salePayments: [],
    purchasePayments: [],

    dateRange: {
        type: DEFAULT_DATE_RANGE,
        start: null,
        end: null
    },

    listenersStarted: false
};


/* ============================================================
   DOM HELPERS
   ============================================================ */

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = getElement(id);

    if (!element) {
        return;
    }

    element.textContent = String(
        value ?? ""
    );
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

    const now = new Date();

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
   MONEY HELPERS
   ============================================================ */

function toSafePaise(value) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.round(number);
}


function formatMoney(value) {
    const paise =
        toSafePaise(value);

    const rupees =
        paise / 100;

    try {
        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        ).format(rupees);
    } catch (error) {
        console.error(
            "Money formatting failed:",
            error
        );

        return `₹${rupees.toFixed(2)}`;
    }
}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function toDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(
            value.getTime()
        )
            ? null
            : value;
    }

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {
        const date =
            value.toDate();

        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;
    }

    const date =
        new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
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


function endOfDay(value) {
    const date =
        new Date(value);

    date.setHours(
        23,
        59,
        59,
        999
    );

    return date;
}


function formatShortDate(value) {
    const date =
        toDate(value);

    if (!date) {
        return "—";
    }

    try {
        return new Intl.DateTimeFormat(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(date);
    } catch {
        return date.toLocaleDateString();
    }
}


function formatChartDate(value) {
    const date =
        toDate(value);

    if (!date) {
        return "";
    }

    try {
        return new Intl.DateTimeFormat(
            "en-IN",
            {
                day: "2-digit",
                month: "short"
            }
        ).format(date);
    } catch {
        return date.toLocaleDateString();
    }
}


function toInputDateValue(value) {
    const date =
        toDate(value);

    if (!date) {
        return "";
    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function parseDateInput(value) {
    if (!value) {
        return null;
    }

    const parts =
        String(value).split("-");

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

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    /*
     * Prevent invalid values such as 2026-02-31
     * silently rolling into March.
     */
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}


/* ============================================================
   DOCUMENT DATE HELPERS
   ============================================================ */

function getSaleDate(sale) {
    return toDate(
        sale?.invoiceDate ||
        sale?.saleDate ||
        sale?.createdAt
    );
}


function getPurchaseDate(purchase) {
    return toDate(
        purchase?.purchaseDate ||
        purchase?.invoiceDate ||
        purchase?.createdAt
    );
}


function getPaymentDate(payment) {
    return toDate(
        payment?.paymentDate ||
        payment?.date ||
        payment?.createdAt
    );
}


/* ============================================================
   SALE MONEY HELPERS
   ============================================================ */

function getSaleTotal(sale) {
    return toSafePaise(
        sale?.grandTotalPaise ??
        sale?.totalPaise ??
        0
    );
}


function getSaleReceived(sale) {
    return toSafePaise(
        sale?.receivedPaise ??
        sale?.paidPaise ??
        0
    );
}


function getSaleBalance(sale) {
    if (
        sale?.balancePaise !== undefined &&
        sale?.balancePaise !== null
    ) {
        return Math.max(
            0,
            toSafePaise(
                sale.balancePaise
            )
        );
    }

    return Math.max(
        0,
        getSaleTotal(sale) -
        getSaleReceived(sale)
    );
}


/* ============================================================
   PURCHASE MONEY HELPERS
   ============================================================ */

function getPurchaseTotal(purchase) {
    return toSafePaise(
        purchase?.grandTotalPaise ??
        purchase?.totalPaise ??
        0
    );
}


function getPurchasePaid(purchase) {
    return toSafePaise(
        purchase?.paidPaise ??
        0
    );
}


function getPurchaseBalance(purchase) {
    if (
        purchase?.balancePaise !== undefined &&
        purchase?.balancePaise !== null
    ) {
        return Math.max(
            0,
            toSafePaise(
                purchase.balancePaise
            )
        );
    }

    return Math.max(
        0,
        getPurchaseTotal(purchase) -
        getPurchasePaid(purchase)
    );
}


/* ============================================================
   PAYMENT MONEY HELPERS
   ============================================================ */

function getSalePaymentAmount(payment) {
    return toSafePaise(
        payment?.amountPaise ??
        payment?.receivedPaise ??
        0
    );
}


function getPurchasePaymentAmount(payment) {
    return toSafePaise(
        payment?.amountPaise ??
        payment?.paidPaise ??
        0
    );
}


/* ============================================================
   STATUS HELPERS
   ============================================================ */

function normalizeStatus(value) {
    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase()
        .replaceAll("-", "_")
        .replaceAll(" ", "_");
}


function isDraft(record) {
    return (
        normalizeStatus(
            record?.status
        ) === "draft"
    );
}


function isCancelled(record) {
    const status =
        normalizeStatus(
            record?.status
        );

    return (
        status === "cancelled" ||
        status === "canceled"
    );
}


function isActiveFinancialRecord(record) {
    return (
        !isDraft(record) &&
        !isCancelled(record)
    );
}


/* ============================================================
   OVERDUE

   Overdue is DERIVED rather than trusted from a stored flag.

   Conditions:
   - not Draft
   - not Cancelled
   - balance > 0
   - due date exists
   - due date is before today

   An invoice due today is NOT overdue until tomorrow.
   ============================================================ */

function isOverdue(
    record,
    balancePaise
) {
    if (
        !record ||
        balancePaise <= 0 ||
        !isActiveFinancialRecord(record)
    ) {
        return false;
    }

    const dueDate =
        toDate(record.dueDate);

    if (!dueDate) {
        return false;
    }

    return (
        endOfDay(dueDate).getTime() <
        startOfDay(new Date()).getTime()
    );
}


/* ============================================================
   DISPLAY STATUS
   ============================================================ */

function getDisplayStatus(
    record,
    balancePaise,
    totalPaise
) {
    if (isCancelled(record)) {
        return "Cancelled";
    }

    if (isDraft(record)) {
        return "Draft";
    }

    if (balancePaise <= 0) {
        return "Paid";
    }

    if (
        isOverdue(
            record,
            balancePaise
        )
    ) {
        return "Overdue";
    }

    if (
        totalPaise > 0 &&
        balancePaise < totalPaise
    ) {
        return "Partially Paid";
    }

    return "Pending";
}


function getStatusClass(status) {
    return (
        "status-" +
        String(status)
            .trim()
            .toLowerCase()
            .replaceAll(" ", "-")
    );
}


/* ============================================================
   DATE RANGE CALCULATION

   DEFAULT = TODAY
   ============================================================ */

function calculateDateRange(type) {
    const now =
        new Date();


    /* --------------------------------------------------------
       Today
       -------------------------------------------------------- */

    if (type === "today") {
        return {
            type: "today",
            start: startOfDay(now),
            end: endOfDay(now)
        };
    }


    /* --------------------------------------------------------
       Yesterday
       -------------------------------------------------------- */

    if (type === "yesterday") {
        const yesterday =
            new Date(now);

        yesterday.setDate(
            yesterday.getDate() - 1
        );

        return {
            type: "yesterday",
            start:
                startOfDay(
                    yesterday
                ),
            end:
                endOfDay(
                    yesterday
                )
        };
    }


    /* --------------------------------------------------------
       Last 7 Days

       Includes today.
       -------------------------------------------------------- */

    if (type === "7days") {
        const start =
            startOfDay(now);

        start.setDate(
            start.getDate() - 6
        );

        return {
            type: "7days",
            start,
            end: endOfDay(now)
        };
    }


    /* --------------------------------------------------------
       Last 30 Days

       Includes today.
       -------------------------------------------------------- */

    if (type === "30days") {
        const start =
            startOfDay(now);

        start.setDate(
            start.getDate() - 29
        );

        return {
            type: "30days",
            start,
            end: endOfDay(now)
        };
    }


    /* --------------------------------------------------------
       All Time
       -------------------------------------------------------- */

    if (type === "all") {
        return {
            type: "all",
            start: null,
            end: null
        };
    }


    /*
     * Invalid/unknown values safely fall back to Today.
     */
    return {
        type: "today",
        start: startOfDay(now),
        end: endOfDay(now)
    };
}


/* ============================================================
   DATE FILTER
   ============================================================ */

function setDateRange(type) {
    if (type === "custom") {
        state.dateRange = {
            ...state.dateRange,
            type: "custom"
        };

        showCustomDatePanel(true);

        updateChartPeriodLabel();

        return;
    }

    state.dateRange =
        calculateDateRange(type);

    showCustomDatePanel(false);

    updateChartPeriodLabel();

    renderDashboard();
}


function isDateInSelectedRange(value) {
    const date =
        toDate(value);

    if (!date) {
        return false;
    }

    const {
        start,
        end
    } = state.dateRange;

    /*
     * All Time.
     */
    if (!start && !end) {
        return true;
    }

    const time =
        date.getTime();

    if (
        start &&
        time < start.getTime()
    ) {
        return false;
    }

    if (
        end &&
        time > end.getTime()
    ) {
        return false;
    }

    return true;
}


/* ============================================================
   CUSTOM DATE PANEL
   ============================================================ */

function showCustomDatePanel(show) {
    const panel =
        getElement(
            "customDatePanel"
        );

    if (!panel) {
        return;
    }

    panel.hidden = !show;
}


function applyCustomDateRange() {
    const startInput =
        getElement(
            "customStartDate"
        );

    const endInput =
        getElement(
            "customEndDate"
        );

    if (
        !startInput ||
        !endInput
    ) {
        return;
    }

    const start =
        parseDateInput(
            startInput.value
        );

    const end =
        parseDateInput(
            endInput.value
        );

    if (!start || !end) {
        window.alert(
            "Please select a valid start date and end date."
        );

        return;
    }

    if (
        start.getTime() >
        end.getTime()
    ) {
        window.alert(
            "Start date cannot be after end date."
        );

        return;
    }

    state.dateRange = {
        type: "custom",
        start: startOfDay(start),
        end: endOfDay(end)
    };

    showCustomDatePanel(true);

    updateChartPeriodLabel();

    renderDashboard();
}


/* ============================================================
   CHART PERIOD LABEL
   ============================================================ */

function updateChartPeriodLabel() {
    const element =
        getElement(
            "chartPeriodLabel"
        );

    if (!element) {
        return;
    }

    const range =
        state.dateRange;

    switch (range.type) {
        case "today":
            element.textContent =
                "Today";
            break;

        case "yesterday":
            element.textContent =
                "Yesterday";
            break;

        case "7days":
            element.textContent =
                "Last 7 days";
            break;

        case "30days":
            element.textContent =
                "Last 30 days";
            break;

        case "all":
            element.textContent =
                "All time";
            break;

        case "custom":
            if (
                range.start &&
                range.end
            ) {
                element.textContent =
                    `${formatShortDate(range.start)} – ` +
                    `${formatShortDate(range.end)}`;
            } else {
                element.textContent =
                    "Custom date";
            }

            break;

        default:
            element.textContent =
                "Today";
    }
}


/* ============================================================
   FILTERED SALES
   ============================================================ */

function getFilteredSales() {
    return state.sales.filter(
        (sale) => {
            if (
                !isActiveFinancialRecord(
                    sale
                )
            ) {
                return false;
            }

            return isDateInSelectedRange(
                getSaleDate(sale)
            );
        }
    );
}


/* ============================================================
   FILTERED PURCHASES
   ============================================================ */

function getFilteredPurchases() {
    return state.purchases.filter(
        (purchase) => {
            if (
                !isActiveFinancialRecord(
                    purchase
                )
            ) {
                return false;
            }

            return isDateInSelectedRange(
                getPurchaseDate(
                    purchase
                )
            );
        }
    );
}


/* ============================================================
   FILTERED SALE PAYMENTS
   ============================================================ */

function getFilteredSalePayments() {
    return state.salePayments.filter(
        (payment) =>
            isDateInSelectedRange(
                getPaymentDate(
                    payment
                )
            )
    );
}


/* ============================================================
   FILTERED PURCHASE PAYMENTS
   ============================================================ */

function getFilteredPurchasePayments() {
    return state.purchasePayments.filter(
        (payment) =>
            isDateInSelectedRange(
                getPaymentDate(
                    payment
                )
            )
    );
}


/* ============================================================
   SUMMARY METRICS
   ============================================================ */

function renderSummaryMetrics() {
    const filteredSales =
        getFilteredSales();

    const filteredPurchases =
        getFilteredPurchases();

    const filteredSalePayments =
        getFilteredSalePayments();

    const filteredPurchasePayments =
        getFilteredPurchasePayments();


    /* ========================================================
       TOTAL SELL

       Respects selected date range.
       ======================================================== */

    const totalSalesPaise =
        filteredSales.reduce(
            (total, sale) =>
                total +
                getSaleTotal(sale),
            0
        );

    setText(
        "totalSalesValue",
        formatMoney(
            totalSalesPaise
        )
    );

    setText(
        "totalSalesMeta",
        `${filteredSales.length} ` +
        (
            filteredSales.length === 1
                ? "sale"
                : "sales"
        )
    );


    /* ========================================================
       TOTAL BUY

       Respects selected date range.
       ======================================================== */

    const totalPurchasesPaise =
        filteredPurchases.reduce(
            (total, purchase) =>
                total +
                getPurchaseTotal(
                    purchase
                ),
            0
        );

    setText(
        "totalPurchasesValue",
        formatMoney(
            totalPurchasesPaise
        )
    );

    setText(
        "totalPurchasesMeta",
        `${filteredPurchases.length} ` +
        (
            filteredPurchases.length === 1
                ? "purchase"
                : "purchases"
        )
    );


    /* ========================================================
       RECEIVABLE

       CURRENT outstanding balance.

       Deliberately NOT affected by Today / 7 Days / etc.
       ======================================================== */

    const openSales =
        state.sales.filter(
            (sale) =>
                isActiveFinancialRecord(
                    sale
                ) &&
                getSaleBalance(
                    sale
                ) > 0
        );

    const receivablePaise =
        openSales.reduce(
            (total, sale) =>
                total +
                getSaleBalance(
                    sale
                ),
            0
        );

    setText(
        "receivableValue",
        formatMoney(
            receivablePaise
        )
    );

    setText(
        "receivableMeta",
        openSales.length === 0
            ? "Customer outstanding"
            : `${openSales.length} open ` +
              (
                  openSales.length === 1
                      ? "sale"
                      : "sales"
              )
    );


    /* ========================================================
       PAYABLE

       CURRENT outstanding balance.

       Deliberately NOT affected by date filter.
       ======================================================== */

    const openPurchases =
        state.purchases.filter(
            (purchase) =>
                isActiveFinancialRecord(
                    purchase
                ) &&
                getPurchaseBalance(
                    purchase
                ) > 0
        );

    const payablePaise =
        openPurchases.reduce(
            (total, purchase) =>
                total +
                getPurchaseBalance(
                    purchase
                ),
            0
        );

    setText(
        "payableValue",
        formatMoney(
            payablePaise
        )
    );

    setText(
        "payableMeta",
        openPurchases.length === 0
            ? "Supplier outstanding"
            : `${openPurchases.length} open ` +
              (
                  openPurchases.length === 1
                      ? "purchase"
                      : "purchases"
              )
    );


    /* ========================================================
       RECEIVED

       Actual customer receipts in selected date range.
       ======================================================== */

    const receivedPaise =
        filteredSalePayments.reduce(
            (total, payment) =>
                total +
                getSalePaymentAmount(
                    payment
                ),
            0
        );

    setText(
        "receivedValue",
        formatMoney(
            receivedPaise
        )
    );

    setText(
        "receivedMeta",
        filteredSalePayments.length === 0
            ? "Customer payments"
            : `${filteredSalePayments.length} ` +
              (
                  filteredSalePayments.length === 1
                      ? "receipt"
                      : "receipts"
              )
    );


    /* ========================================================
       PAID

       Actual supplier payments in selected date range.
       ======================================================== */

    const paidPaise =
        filteredPurchasePayments.reduce(
            (total, payment) =>
                total +
                getPurchasePaymentAmount(
                    payment
                ),
            0
        );

    setText(
        "paidValue",
        formatMoney(
            paidPaise
        )
    );

    setText(
        "paidMeta",
        filteredPurchasePayments.length === 0
            ? "Supplier payments"
            : `${filteredPurchasePayments.length} ` +
              (
                  filteredPurchasePayments.length === 1
                      ? "payment"
                      : "payments"
              )
    );


    /* ========================================================
       OVERDUE RECEIVABLE

       CURRENT outstanding overdue.
       Not affected by dashboard date filter.
       ======================================================== */

    const overdueSales =
        openSales.filter(
            (sale) =>
                isOverdue(
                    sale,
                    getSaleBalance(
                        sale
                    )
                )
        );

    const overdueReceivablePaise =
        overdueSales.reduce(
            (total, sale) =>
                total +
                getSaleBalance(
                    sale
                ),
            0
        );

    setText(
        "overdueReceivableValue",
        formatMoney(
            overdueReceivablePaise
        )
    );

    setText(
        "overdueReceivableMeta",
        `${overdueSales.length} overdue ` +
        (
            overdueSales.length === 1
                ? "sale"
                : "sales"
        )
    );


    /* ========================================================
       OVERDUE PAYABLE

       CURRENT outstanding overdue.
       ======================================================== */

    const overduePurchases =
        openPurchases.filter(
            (purchase) =>
                isOverdue(
                    purchase,
                    getPurchaseBalance(
                        purchase
                    )
                )
        );

    const overduePayablePaise =
        overduePurchases.reduce(
            (total, purchase) =>
                total +
                getPurchaseBalance(
                    purchase
                ),
            0
        );

    setText(
        "overduePayableValue",
        formatMoney(
            overduePayablePaise
        )
    );

    setText(
        "overduePayableMeta",
        `${overduePurchases.length} overdue ` +
        (
            overduePurchases.length === 1
                ? "purchase"
                : "purchases"
        )
    );
}


/* ============================================================
   CUSTOMER / SUPPLIER LOOKUPS
   ============================================================ */

function findCustomer(customerId) {
    if (!customerId) {
        return null;
    }

    return (
        state.customers.find(
            (customer) =>
                customer.id ===
                customerId
        ) || null
    );
}


function findSupplier(supplierId) {
    if (!supplierId) {
        return null;
    }

    return (
        state.suppliers.find(
            (supplier) =>
                supplier.id ===
                supplierId
        ) || null
    );
}


/* ============================================================
   HISTORICAL PARTY NAMES

   Snapshot is preferred.

   This means changing a customer's/supplier's current name
   later does not rewrite historical invoice meaning.
   ============================================================ */

function getSalePartyName(sale) {
    return (
        sale?.customerSnapshot?.name ||
        sale?.customerName ||
        findCustomer(
            sale?.customerId
        )?.name ||
        "Unknown customer"
    );
}


function getPurchasePartyName(purchase) {
    return (
        purchase?.supplierSnapshot?.name ||
        purchase?.supplierName ||
        findSupplier(
            purchase?.supplierId
        )?.name ||
        "Unknown supplier"
    );
}


/* ============================================================
   SAFE DOM CREATION

   User data is inserted with textContent.
   No user-controlled HTML is injected.
   ============================================================ */

function createElement(
    tagName,
    className = "",
    text = null
) {
    const element =
        document.createElement(
            tagName
        );

    if (className) {
        element.className =
            className;
    }

    if (
        text !== null &&
        text !== undefined
    ) {
        element.textContent =
            String(text);
    }

    return element;
}


/* ============================================================
   STATUS BADGE
   ============================================================ */

function createStatusBadge(status) {
    const badge =
        createElement(
            "span",
            "status-badge",
            status
        );

    badge.classList.add(
        getStatusClass(status)
    );

    return badge;
}


/* ============================================================
   RECENT TRANSACTIONS
   ============================================================ */

function buildRecentTransactions() {
    const sales =
        state.sales.map(
            (sale) => {
                const total =
                    getSaleTotal(sale);

                const balance =
                    getSaleBalance(sale);

                return {
                    id:
                        sale.id,

                    type:
                        "Sell",

                    number:
                        sale.invoiceNumber ||
                        "—",

                    party:
                        getSalePartyName(
                            sale
                        ),

                    date:
                        getSaleDate(
                            sale
                        ),

                    total,

                    balance,

                    status:
                        getDisplayStatus(
                            sale,
                            balance,
                            total
                        ),

                    href:
                        sale.invoiceNumber
                            ? `/sales/${encodeURIComponent(
                                String(sale.invoiceNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/sales"
                };
            }
        );


    const purchases =
        state.purchases.map(
            (purchase) => {
                const total =
                    getPurchaseTotal(
                        purchase
                    );

                const balance =
                    getPurchaseBalance(
                        purchase
                    );

                return {
                    id:
                        purchase.id,

                    type:
                        "Buy",

                    number:
                        purchase.purchaseNumber ||
                        "—",

                    party:
                        getPurchasePartyName(
                            purchase
                        ),

                    date:
                        getPurchaseDate(
                            purchase
                        ),

                    total,

                    balance,

                    status:
                        getDisplayStatus(
                            purchase,
                            balance,
                            total
                        ),

                    href:
                        purchase.purchaseNumber
                            ? `/purchases/${encodeURIComponent(
                                String(purchase.purchaseNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/purchases"
                };
            }
        );


    return [
        ...sales,
        ...purchases
    ]
        .sort(
            (a, b) =>
                (
                    b.date?.getTime() ||
                    0
                ) -
                (
                    a.date?.getTime() ||
                    0
                )
        )
        .slice(
            0,
            MAX_RECENT_TRANSACTIONS
        );
}


/* ============================================================
   RECENT TRANSACTIONS RENDER
   ============================================================ */

function renderRecentTransactions() {
    const tbody =
        getElement(
            "recentTransactionsBody"
        );

    const empty =
        getElement(
            "recentTransactionsEmpty"
        );

    if (!tbody) {
        return;
    }

    tbody.replaceChildren();

    const records =
        buildRecentTransactions();

    if (empty) {
        empty.hidden =
            records.length > 0;
    }

    if (records.length === 0) {
        return;
    }

    const fragment =
        document.createDocumentFragment();


    records.forEach(
        (record) => {
            const row =
                document.createElement(
                    "tr"
                );


            /* Type */

            const typeCell =
                document.createElement(
                    "td"
                );

            const typeBadge =
                createElement(
                    "span",
                    record.type === "Sell"
                        ? "type-badge type-sell"
                        : "type-badge type-buy",
                    record.type
                );

            typeCell.appendChild(
                typeBadge
            );


            /* Number */

            const numberCell =
                document.createElement(
                    "td"
                );

            const numberLink =
                createElement(
                    "a",
                    "transaction-number",
                    record.number
                );

            numberLink.href =
                record.href;

            numberCell.appendChild(
                numberLink
            );


            /* Customer / Supplier */

            const partyCell =
                createElement(
                    "td",
                    "party-cell",
                    record.party
                );


            /* Date */

            const dateCell =
                createElement(
                    "td",
                    "",
                    formatShortDate(
                        record.date
                    )
                );


            /* Total */

            const totalCell =
                createElement(
                    "td",
                    "money-value",
                    formatMoney(
                        record.total
                    )
                );


            /* Balance */

            const balanceCell =
                createElement(
                    "td",
                    "money-value",
                    formatMoney(
                        record.balance
                    )
                );


            /* Status */

            const statusCell =
                document.createElement(
                    "td"
                );

            statusCell.appendChild(
                createStatusBadge(
                    record.status
                )
            );


            row.append(
                typeCell,
                numberCell,
                partyCell,
                dateCell,
                totalCell,
                balanceCell,
                statusCell
            );

            fragment.appendChild(
                row
            );
        }
    );


    tbody.appendChild(
        fragment
    );
}


/* ============================================================
   DUE SORTING
   ============================================================ */

function sortByDueDate(records) {
    return [...records].sort(
        (a, b) => {
            const aDate =
                toDate(a?.dueDate);

            const bDate =
                toDate(b?.dueDate);

            if (!aDate && !bDate) {
                return 0;
            }

            if (!aDate) {
                return 1;
            }

            if (!bDate) {
                return -1;
            }

            return (
                aDate.getTime() -
                bDate.getTime()
            );
        }
    );
}


/* ============================================================
   DUE LIST ITEM
   ============================================================ */

function createDueListItem({
    title,
    subtitle,
    amount,
    status,
    href
}) {
    const item =
        createElement(
            "a",
            "compact-list-item"
        );

    item.href = href;


    const content =
        createElement(
            "div",
            "compact-list-content"
        );

    content.append(
        createElement(
            "strong",
            "",
            title
        ),

        createElement(
            "span",
            "",
            subtitle
        )
    );


    const value =
        createElement(
            "div",
            "compact-list-value"
        );

    value.append(
        createElement(
            "strong",
            "money-value",
            formatMoney(amount)
        ),

        createStatusBadge(
            status
        )
    );


    item.append(
        content,
        value
    );

    return item;
}


/* ============================================================
   CREDIT SELL DUE LIST
   ============================================================ */

function renderSalesDueList() {
    const container =
        getElement(
            "salesDueList"
        );

    if (!container) {
        return;
    }

    container.replaceChildren();


    const records =
        sortByDueDate(
            state.sales.filter(
                (sale) =>
                    isActiveFinancialRecord(
                        sale
                    ) &&
                    getSaleBalance(
                        sale
                    ) > 0
            )
        ).slice(
            0,
            MAX_DUE_ITEMS
        );


    if (records.length === 0) {
        const empty =
            createElement(
                "div",
                "empty-state"
            );

        empty.append(
            createElement(
                "strong",
                "",
                "No customer dues"
            ),

            createElement(
                "span",
                "",
                "Open credit sales will appear here."
            )
        );

        container.appendChild(
            empty
        );

        return;
    }


    const fragment =
        document.createDocumentFragment();


    records.forEach(
        (sale) => {
            const balance =
                getSaleBalance(
                    sale
                );

            const status =
                getDisplayStatus(
                    sale,
                    balance,
                    getSaleTotal(
                        sale
                    )
                );

            const dueText =
                sale.dueDate
                    ? `Due ${formatShortDate(sale.dueDate)}`
                    : "Due date not set";


            fragment.appendChild(
                createDueListItem({
                    title:
                        getSalePartyName(
                            sale
                        ),

                    subtitle:
                        `${sale.invoiceNumber || "Sale"} · ${dueText}`,

                    amount:
                        balance,

                    status,

                    href:
                        sale.invoiceNumber
                            ? `/sales/${encodeURIComponent(
                                String(sale.invoiceNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/sales"
                })
            );
        }
    );


    container.appendChild(
        fragment
    );
}


/* ============================================================
   CREDIT BUY DUE LIST
   ============================================================ */

function renderPurchasesDueList() {
    const container =
        getElement(
            "purchasesDueList"
        );

    if (!container) {
        return;
    }

    container.replaceChildren();


    const records =
        sortByDueDate(
            state.purchases.filter(
                (purchase) =>
                    isActiveFinancialRecord(
                        purchase
                    ) &&
                    getPurchaseBalance(
                        purchase
                    ) > 0
            )
        ).slice(
            0,
            MAX_DUE_ITEMS
        );


    if (records.length === 0) {
        const empty =
            createElement(
                "div",
                "empty-state"
            );

        empty.append(
            createElement(
                "strong",
                "",
                "No supplier dues"
            ),

            createElement(
                "span",
                "",
                "Open credit purchases will appear here."
            )
        );

        container.appendChild(
            empty
        );

        return;
    }


    const fragment =
        document.createDocumentFragment();


    records.forEach(
        (purchase) => {
            const balance =
                getPurchaseBalance(
                    purchase
                );

            const status =
                getDisplayStatus(
                    purchase,
                    balance,
                    getPurchaseTotal(
                        purchase
                    )
                );

            const dueText =
                purchase.dueDate
                    ? `Due ${formatShortDate(purchase.dueDate)}`
                    : "Due date not set";


            fragment.appendChild(
                createDueListItem({
                    title:
                        getPurchasePartyName(
                            purchase
                        ),

                    subtitle:
                        `${purchase.purchaseNumber || "Purchase"} · ${dueText}`,

                    amount:
                        balance,

                    status,

                    href:
                        purchase.purchaseNumber
                            ? `/purchases/${encodeURIComponent(
                                String(purchase.purchaseNumber)
                                    .trim()
                                    .toUpperCase()
                            )}`
                            : "/purchases"
                })
            );
        }
    );


    container.appendChild(
        fragment
    );
}


/* ============================================================
   CHART RANGE
   ============================================================ */

function getChartRange() {
    /*
     * Today, Yesterday, 7 Days, 30 Days and Custom
     * already have explicit start/end values.
     */
    if (
        state.dateRange.start &&
        state.dateRange.end
    ) {
        return {
            start:
                startOfDay(
                    state.dateRange.start
                ),

            end:
                endOfDay(
                    state.dateRange.end
                )
        };
    }


    /*
     * ALL TIME:
     * derive range from actual transactions.
     */
    const dates = [
        ...state.sales.map(
            getSaleDate
        ),

        ...state.purchases.map(
            getPurchaseDate
        )
    ].filter(Boolean);


    if (dates.length === 0) {
        const today =
            new Date();

        return {
            start:
                startOfDay(today),

            end:
                endOfDay(today)
        };
    }


    const timestamps =
        dates.map(
            (date) =>
                date.getTime()
        );


    return {
        start:
            startOfDay(
                new Date(
                    Math.min(
                        ...timestamps
                    )
                )
            ),

        end:
            endOfDay(
                new Date(
                    Math.max(
                        ...timestamps
                    )
                )
            )
    };
}


/* ============================================================
   CHART BUCKETS
   ============================================================ */

function buildChartBuckets() {
    const {
        start,
        end
    } = getChartRange();


    const millisecondsPerDay =
        24 * 60 * 60 * 1000;


    const totalDays =
        Math.max(
            1,
            Math.floor(
                (
                    startOfDay(end).getTime() -
                    startOfDay(start).getTime()
                ) /
                millisecondsPerDay
            ) + 1
        );


    /*
     * Short ranges:
     * one column per day.

     * Longer ranges:
     * maximum 12 grouped columns.
     */
    const maximumBuckets =
        totalDays <= 14
            ? totalDays
            : 12;


    const bucketSizeDays =
        Math.max(
            1,
            Math.ceil(
                totalDays /
                maximumBuckets
            )
        );


    const buckets = [];

    let cursor =
        startOfDay(start);


    while (
        cursor.getTime() <=
        end.getTime()
    ) {
        const bucketStart =
            new Date(cursor);

        const bucketEnd =
            endOfDay(
                new Date(cursor)
            );

        bucketEnd.setDate(
            bucketEnd.getDate() +
            bucketSizeDays -
            1
        );


        if (
            bucketEnd.getTime() >
            end.getTime()
        ) {
            bucketEnd.setTime(
                end.getTime()
            );
        }


        buckets.push({
            start:
                bucketStart,

            end:
                bucketEnd,

            sell:
                0,

            buy:
                0
        });


        cursor =
            startOfDay(
                bucketEnd
            );

        cursor.setDate(
            cursor.getDate() + 1
        );
    }


    return buckets;
}


/* ============================================================
   ADD VALUE TO CHART BUCKET
   ============================================================ */

function addValueToChartBucket(
    buckets,
    date,
    type,
    amount
) {
    if (!date) {
        return;
    }

    const timestamp =
        date.getTime();


    const bucket =
        buckets.find(
            (item) =>
                timestamp >=
                    item.start.getTime() &&
                timestamp <=
                    item.end.getTime()
        );


    if (!bucket) {
        return;
    }


    bucket[type] +=
        toSafePaise(amount);
}


/* ============================================================
   CHART
   ============================================================ */

function renderChart() {
    const chart =
        getElement(
            "billingChart"
        );

    const empty =
        getElement(
            "billingChartEmpty"
        );


    if (!chart) {
        return;
    }


    chart.replaceChildren();


    const sales =
        getFilteredSales();

    const purchases =
        getFilteredPurchases();


    if (
        sales.length === 0 &&
        purchases.length === 0
    ) {
        chart.hidden = true;

        if (empty) {
            empty.hidden = false;
        }

        return;
    }


    chart.hidden = false;

    if (empty) {
        empty.hidden = true;
    }


    const buckets =
        buildChartBuckets();


    sales.forEach(
        (sale) => {
            addValueToChartBucket(
                buckets,
                getSaleDate(sale),
                "sell",
                getSaleTotal(sale)
            );
        }
    );


    purchases.forEach(
        (purchase) => {
            addValueToChartBucket(
                buckets,
                getPurchaseDate(
                    purchase
                ),
                "buy",
                getPurchaseTotal(
                    purchase
                )
            );
        }
    );


    const maxValue =
        Math.max(
            1,

            ...buckets.map(
                (bucket) =>
                    Math.max(
                        bucket.sell,
                        bucket.buy
                    )
            )
        );


    const fragment =
        document.createDocumentFragment();


    buckets.forEach(
        (bucket) => {
            const column =
                createElement(
                    "div",
                    "chart-column"
                );


            const bars =
                createElement(
                    "div",
                    "chart-bars"
                );


            /* ------------------------------------------------
               Sell bar
               ------------------------------------------------ */

            const sellBar =
                createElement(
                    "div",
                    "chart-bar chart-bar-sell"
                );


            const sellHeight =
                bucket.sell > 0
                    ? Math.max(
                        3,
                        (
                            bucket.sell /
                            maxValue
                        ) * 100
                    )
                    : 0;


            sellBar.style.height =
                `${sellHeight}%`;

            sellBar.title =
                `Sell: ${formatMoney(bucket.sell)}`;


            /* ------------------------------------------------
               Buy bar
               ------------------------------------------------ */

            const buyBar =
                createElement(
                    "div",
                    "chart-bar chart-bar-buy"
                );


            const buyHeight =
                bucket.buy > 0
                    ? Math.max(
                        3,
                        (
                            bucket.buy /
                            maxValue
                        ) * 100
                    )
                    : 0;


            buyBar.style.height =
                `${buyHeight}%`;

            buyBar.title =
                `Buy: ${formatMoney(bucket.buy)}`;


            bars.append(
                sellBar,
                buyBar
            );


            /* ------------------------------------------------
               Label
               ------------------------------------------------ */

            let labelText =
                formatChartDate(
                    bucket.start
                );


            if (
                bucket.start.toDateString() !==
                bucket.end.toDateString()
            ) {
                labelText =
                    `${formatChartDate(bucket.start)}–` +
                    `${formatChartDate(bucket.end)}`;
            }


            const label =
                createElement(
                    "div",
                    "chart-label",
                    labelText
                );


            column.append(
                bars,
                label
            );


            fragment.appendChild(
                column
            );
        }
    );


    chart.appendChild(
        fragment
    );
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
   BUILD GLOBAL SEARCH RESULTS
   ============================================================ */

function buildSearchResults(searchText) {
    const search =
        normalizeSearchText(
            searchText
        );


    if (!search) {
        return [];
    }


    const results = [];


    /* ========================================================
       CUSTOMERS
       ======================================================== */

    state.customers.forEach(
        (customer) => {
            if (
                containsSearch(
                    search,
                    customer.name,
                    customer.customerNumber,
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


    /* ========================================================
       SUPPLIERS
       ======================================================== */

    state.suppliers.forEach(
        (supplier) => {
            if (
                containsSearch(
                    search,
                    supplier.supplierNumber,
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


    /* ========================================================
       SALES
       ======================================================== */

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


    /* ========================================================
       PURCHASES
       ======================================================== */

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

function renderSearchResults(searchText) {
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


    if (results.length === 0) {
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
   REFRESH OPEN SEARCH
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
   NEW TRANSACTION MODAL
   ============================================================ */

function openNewTransactionModal() {
    const modal =
        getElement(
            "newTransactionModal"
        );


    if (!modal) {
        return;
    }


    modal.hidden = false;

    document.body.classList.add(
        "modal-open"
    );


    const closeButton =
        getElement(
            "closeNewTransactionModal"
        );


    if (closeButton) {
        window.setTimeout(
            () => {
                closeButton.focus();
            },
            0
        );
    }
}


function closeNewTransactionModal() {
    const modal =
        getElement(
            "newTransactionModal"
        );


    if (!modal) {
        return;
    }


    modal.hidden = true;

    document.body.classList.remove(
        "modal-open"
    );
}


/* ============================================================
   SIDEBAR
   ============================================================ */

function openSidebar() {
    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    const overlay =
        getElement(
            "sidebarOverlay"
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


    document.body.classList.add(
        "modal-open"
    );
}


function closeSidebar() {
    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    const overlay =
        getElement(
            "sidebarOverlay"
        );


    if (sidebar) {
        sidebar.classList.remove(
            "is-open"
        );
    }


    if (overlay) {
        overlay.hidden = true;
    }


    /*
     * Don't unlock body if transaction modal is still open.
     */
    const transactionModal =
        getElement(
            "newTransactionModal"
        );


    if (
        !transactionModal ||
        transactionModal.hidden
    ) {
        document.body.classList.remove(
            "modal-open"
        );
    }
}


/* ============================================================
   RENDER DASHBOARD
   ============================================================ */

function renderDashboard() {
    renderSummaryMetrics();

    renderRecentTransactions();

    renderSalesDueList();

    renderPurchasesDueList();

    renderChart();
}


/* ============================================================
   FIRESTORE SNAPSHOT CONVERSION
   ============================================================ */

function snapshotToRecords(snapshot) {
    return snapshot.docs.map(
        (documentSnapshot) => ({
            id:
                documentSnapshot.id,

            ...documentSnapshot.data()
        })
    );
}


/* ============================================================
   FIRESTORE ERROR HANDLING
   ============================================================ */

function handleFirestoreError(
    label,
    error
) {
    console.error(
        `${label} listener failed:`,
        error
    );


    if (
        error?.code !==
        "permission-denied"
    ) {
        return;
    }


    /*
     * Permission denied means the current browser session
     * should no longer remain on the protected dashboard.
     */
    signOut(auth)
        .catch(
            (signOutError) => {
                console.error(
                    "Sign-out after permission error failed:",
                    signOutError
                );
            }
        )
        .finally(
            () => {
                window.location.replace(
                    "/login"
                );
            }
        );
}


/* ============================================================
   BUSINESS SUBCOLLECTION

   Correct Firestore structure:

   businesses
       └── om-maruti-diamond
             ├── customers
             ├── suppliers
             ├── sales
             ├── salePayments
             ├── purchases
             └── purchasePayments

   businesses/om-maruti-diamond is a DOCUMENT.
   ============================================================ */

function getBusinessSubcollection(
    collectionName
) {
    return collection(
        db,
        "businesses",
        BUSINESS_ID,
        collectionName
    );
}


/* ============================================================
   REAL-TIME FIRESTORE LISTENERS
   ============================================================ */

function startRealtimeListeners() {
    if (state.listenersStarted) {
        return;
    }


    state.listenersStarted = true;


    /* ========================================================
       SALES
       ======================================================== */

    const salesQuery =
        query(
            getBusinessSubcollection(
                "sales"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(500)
        );


    onSnapshot(
        salesQuery,

        (snapshot) => {
            state.sales =
                snapshotToRecords(
                    snapshot
                );

            renderDashboard();

            refreshSearchIfOpen();
        },

        (error) => {
            handleFirestoreError(
                "Sales",
                error
            );
        }
    );


    /* ========================================================
       PURCHASES
       ======================================================== */

    const purchasesQuery =
        query(
            getBusinessSubcollection(
                "purchases"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(500)
        );


    onSnapshot(
        purchasesQuery,

        (snapshot) => {
            state.purchases =
                snapshotToRecords(
                    snapshot
                );

            renderDashboard();

            refreshSearchIfOpen();
        },

        (error) => {
            handleFirestoreError(
                "Purchases",
                error
            );
        }
    );


    /* ========================================================
       CUSTOMERS
       ======================================================== */

    const customersQuery =
        query(
            getBusinessSubcollection(
                "customers"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(500)
        );


    onSnapshot(
        customersQuery,

        (snapshot) => {
            state.customers =
                snapshotToRecords(
                    snapshot
                );

            renderDashboard();

            refreshSearchIfOpen();
        },

        (error) => {
            handleFirestoreError(
                "Customers",
                error
            );
        }
    );


    /* ========================================================
       SUPPLIERS
       ======================================================== */

    const suppliersQuery =
        query(
            getBusinessSubcollection(
                "suppliers"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(500)
        );


    onSnapshot(
        suppliersQuery,

        (snapshot) => {
            state.suppliers =
                snapshotToRecords(
                    snapshot
                );

            renderDashboard();

            refreshSearchIfOpen();
        },

        (error) => {
            handleFirestoreError(
                "Suppliers",
                error
            );
        }
    );


    /* ========================================================
       SALE PAYMENTS / RECEIPTS
       ======================================================== */

    const salePaymentsQuery =
        query(
            getBusinessSubcollection(
                "salePayments"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(1000)
        );


    onSnapshot(
        salePaymentsQuery,

        (snapshot) => {
            state.salePayments =
                snapshotToRecords(
                    snapshot
                );

            renderDashboard();
        },

        (error) => {
            handleFirestoreError(
                "Sale payments",
                error
            );
        }
    );


    /* ========================================================
       PURCHASE PAYMENTS
       ======================================================== */

    const purchasePaymentsQuery =
        query(
            getBusinessSubcollection(
                "purchasePayments"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(1000)
        );


    onSnapshot(
        purchasePaymentsQuery,

        (snapshot) => {
            state.purchasePayments =
                snapshotToRecords(
                    snapshot
                );

            renderDashboard();
        },

        (error) => {
            handleFirestoreError(
                "Purchase payments",
                error
            );
        }
    );
}


/* ============================================================
   DATE FILTER EVENT
   ============================================================ */

function bindDateFilterEvents() {
    const dateFilter =
        getElement(
            "billingDateFilter"
        );


    if (dateFilter) {
        /*
         * JS also enforces Today as default.
         *
         * This means the dashboard still starts on Today even
         * if the HTML accidentally leaves another option
         * selected.
         */
        if (
            dateFilter.querySelector(
                'option[value="today"]'
            )
        ) {
            dateFilter.value =
                DEFAULT_DATE_RANGE;
        }


        dateFilter.addEventListener(
            "change",
            () => {
                setDateRange(
                    dateFilter.value
                );
            }
        );
    }


    const applyButton =
        getElement(
            "applyCustomDateButton"
        );


    if (applyButton) {
        applyButton.addEventListener(
            "click",
            applyCustomDateRange
        );
    }
}


/* ============================================================
   SEARCH EVENTS
   ============================================================ */

function bindSearchEvents() {
    const searchInput =
        getElement(
            "globalSearchInput"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        () => {
            renderSearchResults(
                searchInput.value
            );
        }
    );


    searchInput.addEventListener(
        "focus",
        () => {
            if (
                searchInput.value.trim()
            ) {
                renderSearchResults(
                    searchInput.value
                );
            }
        }
    );


    searchInput.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape"
            ) {
                hideSearchResults();

                searchInput.blur();
            }
        }
    );


    document.addEventListener(
        "click",
        (event) => {
            const search =
                document.querySelector(
                    ".global-search"
                );


            if (
                search &&
                !search.contains(
                    event.target
                )
            ) {
                hideSearchResults();
            }
        }
    );
}


/* ============================================================
   TRANSACTION MODAL EVENTS
   ============================================================ */

function bindTransactionModalEvents() {
    const desktopButton =
        getElement(
            "newTransactionButton"
        );

    const mobileButton =
        getElement(
            "mobileNewTransactionButton"
        );

    const closeButton =
        getElement(
            "closeNewTransactionModal"
        );

    const modal =
        getElement(
            "newTransactionModal"
        );


    desktopButton?.addEventListener(
        "click",
        openNewTransactionModal
    );


    mobileButton?.addEventListener(
        "click",
        openNewTransactionModal
    );


    closeButton?.addEventListener(
        "click",
        closeNewTransactionModal
    );


    modal?.addEventListener(
        "click",
        (event) => {
            if (
                event.target === modal
            ) {
                closeNewTransactionModal();
            }
        }
    );
}


/* ============================================================
   SIDEBAR EVENTS
   ============================================================ */

function bindSidebarEvents() {
    const menuButton =
        getElement(
            "mobileMenuButton"
        );

    const overlay =
        getElement(
            "sidebarOverlay"
        );


    menuButton?.addEventListener(
        "click",
        openSidebar
    );


    overlay?.addEventListener(
        "click",
        closeSidebar
    );
}


/* ============================================================
   LOGOUT
   ============================================================ */

function bindLogoutEvent() {
    const logoutButton =
        getElement(
            "logoutButton"
        );


    if (!logoutButton) {
        return;
    }


    logoutButton.addEventListener(
        "click",
        async () => {
            logoutButton.disabled =
                true;


            try {
                await signOut(auth);

                window.location.replace(
                    "/login"
                );
            } catch (error) {
                console.error(
                    "Logout failed:",
                    error
                );

                logoutButton.disabled =
                    false;
            }
        }
    );
}


/* ============================================================
   GLOBAL ESCAPE KEY
   ============================================================ */

function bindEscapeKey() {
    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key !== "Escape"
            ) {
                return;
            }


            hideSearchResults();

            closeNewTransactionModal();

            closeSidebar();
        }
    );
}


/* ============================================================
   INITIAL CUSTOM DATE VALUES

   We prefill Custom Date with Today.

   The user can then manually change either date.
   ============================================================ */

function initializeCustomDateInputs() {
    const startInput =
        getElement(
            "customStartDate"
        );

    const endInput =
        getElement(
            "customEndDate"
        );


    if (
        !startInput ||
        !endInput
    ) {
        return;
    }


    const today =
        new Date();


    startInput.value =
        toInputDateValue(
            today
        );


    endInput.value =
        toInputDateValue(
            today
        );
}


/* ============================================================
   AUTHENTICATION

   Firestore listeners only start after Firebase confirms
   there is an authenticated user.
   ============================================================ */

function initializeAuthentication() {
    onAuthStateChanged(
        auth,

        (user) => {
            if (!user) {
                window.location.replace(
                    "/login"
                );

                return;
            }


            startRealtimeListeners();
        },

        (error) => {
            console.error(
                "Authentication state failed:",
                error
            );


            window.location.replace(
                "/login"
            );
        }
    );
}


/* ============================================================
   INITIALIZE DASHBOARD
   ============================================================ */

function initializeDashboard() {
    /*
     * 1. Current date is completely independent from Firebase.
     */
    renderCurrentDate();


    /*
     * 2. Today is the default dashboard overview.
     */
    state.dateRange =
        calculateDateRange(
            DEFAULT_DATE_RANGE
        );


    /*
     * 3. Update the chart period immediately.
     */
    updateChartPeriodLabel();


    /*
     * 4. Prepare custom date inputs.
     */
    initializeCustomDateInputs();


    /*
     * 5. Bind UI behavior.
     */
    bindDateFilterEvents();

    bindSearchEvents();

    bindTransactionModalEvents();

    bindSidebarEvents();

    bindLogoutEvent();

    bindEscapeKey();


    /*
     * 6. Initial empty-state render.
     */
    renderDashboard();


    /*
     * 7. Verify authentication, then connect Firestore.
     */
    initializeAuthentication();
}


/* ============================================================
   START
   ============================================================ */

initializeDashboard();
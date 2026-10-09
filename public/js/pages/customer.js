/* ============================================================
   OM MARUTI DIAMOND
   CUSTOMER ACCOUNT PAGE
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
   CONSTANTS
   ============================================================ */

const BUSINESS_ID = "om-maruti-diamond";

const DEFAULT_DATE_RANGE = "today";

const MAX_SALES = 1500;
const MAX_PAYMENTS = 2500;
const MAX_CUSTOMERS = 1000;

const CURRENCY_FORMATTER = new Intl.NumberFormat(
    "en-IN",
    {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }
);

const DATE_FORMATTER = new Intl.DateTimeFormat(
    "en-IN",
    {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }
);

const CURRENT_DATE_FORMATTER = new Intl.DateTimeFormat(
    "en-IN",
    {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
    }
);


/* ============================================================
   STATE
   ============================================================ */

const state = {
    customerId: "",

    customer: null,

    customers: [],
    sales: [],
    salePayments: [],

    dateRange: DEFAULT_DATE_RANGE,

    customStartDate: null,
    customEndDate: null,

    activeTab: "sales",

    authResolved: false,
    customerResolved: false,

    listenersStarted: false,

    receiptSubmitting: false,

    unsubscribeCustomer: null,
    unsubscribeCustomers: null,
    unsubscribeSales: null,
    unsubscribePayments: null
};


/* ============================================================
   DOM
   ============================================================ */

const elements = {

    /* Topbar */

    currentDate:
        document.getElementById("currentDate"),

    globalSearchInput:
        document.getElementById("globalSearchInput"),

    globalSearchResults:
        document.getElementById("globalSearchResults"),

    globalSearchResultsContent:
        document.getElementById(
            "globalSearchResultsContent"
        ),

    billingDateFilter:
        document.getElementById("billingDateFilter"),

    customDatePanel:
        document.getElementById("customDatePanel"),

    customStartDate:
        document.getElementById("customStartDate"),

    customEndDate:
        document.getElementById("customEndDate"),

    applyCustomDateButton:
        document.getElementById(
            "applyCustomDateButton"
        ),


    /* Customer */

    customerAvatar:
        document.getElementById("customerAvatar"),

    customerName:
        document.getElementById("customerName"),

    customerMobile:
        document.getElementById("customerMobile"),

    customerEmail:
        document.getElementById("customerEmail"),

    customerGstin:
        document.getElementById("customerGstin"),

    customerStatus:
        document.getElementById("customerStatus"),

    customerAddress:
        document.getElementById("customerAddress"),

    customerNotFound:
        document.getElementById("customerNotFound"),


    /* Summary */

    customerTotalSellValue:
        document.getElementById(
            "customerTotalSellValue"
        ),

    customerTotalSellMeta:
        document.getElementById(
            "customerTotalSellMeta"
        ),

    customerReceivedValue:
        document.getElementById(
            "customerReceivedValue"
        ),

    customerReceivedMeta:
        document.getElementById(
            "customerReceivedMeta"
        ),

    customerReceivableValue:
        document.getElementById(
            "customerReceivableValue"
        ),

    customerReceivableMeta:
        document.getElementById(
            "customerReceivableMeta"
        ),

    customerOverdueValue:
        document.getElementById(
            "customerOverdueValue"
        ),

    customerOverdueMeta:
        document.getElementById(
            "customerOverdueMeta"
        ),


    /* Buttons */

    newSaleButton:
        document.getElementById("newSaleButton"),

    customerNewSaleButton:
        document.getElementById(
            "customerNewSaleButton"
        ),

    quickNewSaleButton:
        document.getElementById(
            "quickNewSaleButton"
        ),

    mobileNewSaleButton:
        document.getElementById(
            "mobileNewSaleButton"
        ),

    recordReceiptButton:
        document.getElementById(
            "recordReceiptButton"
        ),

    quickRecordReceiptButton:
        document.getElementById(
            "quickRecordReceiptButton"
        ),

    printStatementButton:
        document.getElementById(
            "printStatementButton"
        ),


    /* Tabs */

    salesTabButton:
        document.getElementById("salesTabButton"),

    receiptsTabButton:
        document.getElementById(
            "receiptsTabButton"
        ),

    statementTabButton:
        document.getElementById(
            "statementTabButton"
        ),

    salesTabPanel:
        document.getElementById("salesTabPanel"),

    receiptsTabPanel:
        document.getElementById(
            "receiptsTabPanel"
        ),

    statementTabPanel:
        document.getElementById(
            "statementTabPanel"
        ),


    /* Sales */

    salesCount:
        document.getElementById("salesCount"),

    customerSalesTableBody:
        document.getElementById(
            "customerSalesTableBody"
        ),

    customerSalesEmpty:
        document.getElementById(
            "customerSalesEmpty"
        ),


    /* Receipts */

    receiptsCount:
        document.getElementById(
            "receiptsCount"
        ),

    customerReceiptsTableBody:
        document.getElementById(
            "customerReceiptsTableBody"
        ),

    customerReceiptsEmpty:
        document.getElementById(
            "customerReceiptsEmpty"
        ),


    /* Statement */

    statementCount:
        document.getElementById(
            "statementCount"
        ),

    statementOpeningBalance:
        document.getElementById(
            "statementOpeningBalance"
        ),

    statementSellTotal:
        document.getElementById(
            "statementSellTotal"
        ),

    statementReceivedTotal:
        document.getElementById(
            "statementReceivedTotal"
        ),

    statementClosingBalance:
        document.getElementById(
            "statementClosingBalance"
        ),

    customerStatementTableBody:
        document.getElementById(
            "customerStatementTableBody"
        ),

    customerStatementEmpty:
        document.getElementById(
            "customerStatementEmpty"
        ),


    /* Receipt modal */

    recordReceiptModal:
        document.getElementById(
            "recordReceiptModal"
        ),

    closeRecordReceiptModal:
        document.getElementById(
            "closeRecordReceiptModal"
        ),

    cancelReceiptButton:
        document.getElementById(
            "cancelReceiptButton"
        ),

    recordReceiptForm:
        document.getElementById(
            "recordReceiptForm"
        ),

    receiptCustomerName:
        document.getElementById(
            "receiptCustomerName"
        ),

    receiptCurrentReceivable:
        document.getElementById(
            "receiptCurrentReceivable"
        ),

    receiptSaleId:
        document.getElementById(
            "receiptSaleId"
        ),

    receiptInvoiceBalance:
        document.getElementById(
            "receiptInvoiceBalance"
        ),

    receiptAmount:
        document.getElementById(
            "receiptAmount"
        ),

    receiptDate:
        document.getElementById(
            "receiptDate"
        ),

    receiptMethod:
        document.getElementById(
            "receiptMethod"
        ),

    receiptReference:
        document.getElementById(
            "receiptReference"
        ),

    receiptNote:
        document.getElementById(
            "receiptNote"
        ),

    receiptSaleIdError:
        document.getElementById(
            "receiptSaleIdError"
        ),

    receiptAmountError:
        document.getElementById(
            "receiptAmountError"
        ),

    receiptDateError:
        document.getElementById(
            "receiptDateError"
        ),

    receiptFormMessage:
        document.getElementById(
            "receiptFormMessage"
        ),

    saveReceiptButton:
        document.getElementById(
            "saveReceiptButton"
        ),

    saveReceiptButtonText:
        document.getElementById(
            "saveReceiptButtonText"
        ),

    saveReceiptSpinner:
        document.getElementById(
            "saveReceiptSpinner"
        ),


    /* Navigation */

    sidebar:
        document.getElementById("sidebar"),

    sidebarOverlay:
        document.getElementById("sidebarOverlay"),

    mobileMenuButton:
        document.getElementById(
            "mobileMenuButton"
        ),

    logoutButton:
        document.getElementById("logoutButton")
};


/* ============================================================
   URL
   ============================================================ */

function readCustomerNumber() {
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
            "customers"
    ) {
        return String(
            parts[1] ?? ""
        )
            .trim()
            .toUpperCase();
    }

    return "";
}


async function resolveCustomerIdByNumber(
    customerNumber
) {
    const cleanedCustomerNumber =
        String(
            customerNumber ?? ""
        )
            .trim()
            .toUpperCase();

    if (!cleanedCustomerNumber) {
        return "";
    }

    const customerQuery =
        query(
            businessCollection(
                "customers"
            ),

            where(
                "customerNumber",
                "==",
                cleanedCustomerNumber
            ),

            limit(1)
        );

    const snapshot =
        await getDocs(
            customerQuery
        );

    if (snapshot.empty) {
        return "";
    }

    return snapshot.docs[0].id;
}


/* ============================================================
   FIRESTORE PATHS
   ============================================================ */

function businessCollection(name) {
    return collection(
        db,
        "businesses",
        BUSINESS_ID,
        name
    );
}


function customerDocument(customerId) {
    return doc(
        db,
        "businesses",
        BUSINESS_ID,
        "customers",
        customerId
    );
}


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


function normalizeCompactText(value) {
    return normalizeText(value)
        .replace(/\s+/g, "");
}


function integer(value) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.trunc(number);
}


function positivePaise(value) {
    return Math.max(
        0,
        integer(value)
    );
}


function formatMoney(value) {
    return CURRENCY_FORMATTER.format(
        integer(value) / 100
    );
}


function pluralize(
    count,
    singular,
    plural = `${singular}s`
) {
    return count === 1
        ? singular
        : plural;
}


function createElement(
    tagName,
    className = ""
) {
    const element =
        document.createElement(tagName);

    if (className) {
        element.className =
            className;
    }

    return element;
}


function appendText(
    parent,
    tagName,
    value,
    className = ""
) {
    const element =
        createElement(
            tagName,
            className
        );

    element.textContent =
        String(value ?? "");

    parent.appendChild(element);

    return element;
}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function timestampToDate(value) {
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
        const result =
            value.toDate();

        return Number.isNaN(
            result.getTime()
        )
            ? null
            : result;
    }

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
        timestampToDate(value);

    return date
        ? DATE_FORMATTER.format(date)
        : "—";
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


function addDays(value, amount) {
    const date =
        new Date(value);

    date.setDate(
        date.getDate() + amount
    );

    return date;
}


function parseDateInput(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return null;
    }

    const [
        year,
        month,
        day
    ] = value
        .split("-")
        .map(Number);

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}


function dateToInputValue(value) {
    const date =
        new Date(value);

    const year =
        String(
            date.getFullYear()
        );

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


function calculateDateRange() {
    const today =
        new Date();

    switch (state.dateRange) {

        case "today":
            return {
                start:
                    startOfDay(today),

                end:
                    endOfDay(today)
            };


        case "yesterday": {
            const yesterday =
                addDays(today, -1);

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
                            today,
                            -6
                        )
                    ),

                end:
                    endOfDay(today)
            };


        case "30days":
            return {
                start:
                    startOfDay(
                        addDays(
                            today,
                            -29
                        )
                    ),

                end:
                    endOfDay(today)
            };


        case "custom":
            if (
                state.customStartDate &&
                state.customEndDate
            ) {
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

            return {
                start:
                    startOfDay(today),

                end:
                    endOfDay(today)
            };


        case "all":
        default:
            return {
                start: null,
                end: null
            };
    }
}


function isInSelectedRange(value) {
    const date =
        timestampToDate(value);

    if (!date) {
        return false;
    }

    const {
        start,
        end
    } = calculateDateRange();

    if (!start || !end) {
        return true;
    }

    return (
        date >= start &&
        date <= end
    );
}


function getSelectedRangeLabel() {
    switch (state.dateRange) {

        case "today":
            return "Today";

        case "yesterday":
            return "Yesterday";

        case "7days":
            return "Last 7 days";

        case "30days":
            return "Last 30 days";

        case "all":
            return "All time";

        case "custom":
            if (
                state.customStartDate &&
                state.customEndDate
            ) {
                return (
                    `${formatDate(
                        state.customStartDate
                    )} – ${formatDate(
                        state.customEndDate
                    )}`
                );
            }

            return "Custom";

        default:
            return "Today";
    }
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
        dateToInputValue(now);

    elements.currentDate.textContent =
        CURRENT_DATE_FORMATTER.format(
            now
        );
}


/* ============================================================
   CUSTOMER HELPERS
   ============================================================ */

function customerName(customer) {
    return String(
        customer?.name ??
        customer?.customerName ??
        "Unnamed Customer"
    ).trim();
}


function customerMobile(customer) {
    return String(
        customer?.mobile ??
        customer?.phone ??
        ""
    ).trim();
}


function customerEmail(customer) {
    return String(
        customer?.email ??
        ""
    ).trim();
}


function customerGstin(customer) {
    return String(
        customer?.gstin ??
        customer?.gstNumber ??
        ""
    ).trim();
}


function customerAddress(customer) {
    return String(
        customer?.address ??
        ""
    ).trim();
}


function customerIsActive(customer) {
    if (!customer) {
        return false;
    }

    if (
        customer.active === false ||
        customer.isActive === false
    ) {
        return false;
    }

    const status =
        normalizeText(
            customer.status
        );

    return (
        status !== "inactive" &&
        status !== "disabled" &&
        status !== "archived"
    );
}


function getInitials(name) {
    const words =
        String(name ?? "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (words.length === 0) {
        return "C";
    }

    if (words.length === 1) {
        return words[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return (
        words[0][0] +
        words[1][0]
    ).toUpperCase();
}


/* ============================================================
   SALE HELPERS
   ============================================================ */

function saleCustomerId(sale) {
    return String(
        sale?.customerId ??
        sale?.customer?.id ??
        sale?.customerSnapshot?.id ??
        ""
    ).trim();
}


function saleDate(sale) {
    return (
        sale?.invoiceDate ??
        sale?.saleDate ??
        sale?.createdAt ??
        null
    );
}


function saleDueDate(sale) {
    return (
        sale?.dueDate ??
        null
    );
}


function saleTotal(sale) {
    return positivePaise(
        sale?.grandTotalPaise
    );
}


function saleReceived(sale) {
    return positivePaise(
        sale?.receivedPaise
    );
}


function saleBalance(sale) {
    if (
        Number.isFinite(
            Number(
                sale?.balancePaise
            )
        )
    ) {
        return positivePaise(
            sale.balancePaise
        );
    }

    return Math.max(
        0,
        saleTotal(sale) -
        saleReceived(sale)
    );
}


function isDraftSale(sale) {
    return normalizeText(
        sale?.status
    ) === "draft";
}


function isCancelledSale(sale) {
    const status =
        normalizeText(
            sale?.status
        );

    return (
        status === "cancelled" ||
        status === "canceled" ||
        sale?.cancelled === true ||
        sale?.isCancelled === true
    );
}


function isActiveSale(sale) {
    return (
        !isDraftSale(sale) &&
        !isCancelledSale(sale)
    );
}


function isOverdueSale(sale) {
    if (
        !isActiveSale(sale) ||
        saleBalance(sale) <= 0
    ) {
        return false;
    }

    const dueDate =
        timestampToDate(
            saleDueDate(sale)
        );

    if (!dueDate) {
        return false;
    }

    /*
     * Due today is not overdue.
     */

    return (
        startOfDay(dueDate) <
        startOfDay(new Date())
    );
}


function saleStatus(sale) {
    if (isDraftSale(sale)) {
        return {
            label: "Draft",
            className:
                "customer-invoice-status-draft"
        };
    }

    if (isOverdueSale(sale)) {
        return {
            label: "Overdue",
            className:
                "customer-invoice-status-overdue"
        };
    }

    const balance =
        saleBalance(sale);

    const received =
        saleReceived(sale);

    if (balance <= 0) {
        return {
            label: "Paid",
            className:
                "customer-invoice-status-paid"
        };
    }

    if (received > 0) {
        return {
            label: "Partially Paid",
            className:
                "customer-invoice-status-partially-paid"
        };
    }

    return {
        label: "Pending",
        className:
            "customer-invoice-status-pending"
    };
}


/* ============================================================
   PAYMENT HELPERS
   ============================================================ */

function paymentCustomerId(payment) {
    return String(
        payment?.customerId ??
        payment?.customer?.id ??
        ""
    ).trim();
}


function paymentSaleId(payment) {
    return String(
        payment?.saleId ??
        payment?.invoiceId ??
        ""
    ).trim();
}


function paymentDate(payment) {
    return (
        payment?.paymentDate ??
        payment?.receiptDate ??
        payment?.receivedDate ??
        payment?.date ??
        payment?.createdAt ??
        null
    );
}


function paymentAmount(payment) {
    return positivePaise(
        payment?.amountPaise
    );
}


/* ============================================================
   CUSTOMER DATA
   ============================================================ */

function customerSales() {
    return state.sales.filter(
        (sale) =>
            saleCustomerId(sale) ===
            state.customerId
    );
}


function activeCustomerSales() {
    return customerSales().filter(
        isActiveSale
    );
}


function customerPayments() {
    return state.salePayments.filter(
        (payment) => {
            const directCustomerId =
                paymentCustomerId(
                    payment
                );

            if (
                directCustomerId ===
                state.customerId
            ) {
                return true;
            }

            /*
             * Fallback for older payment documents that
             * only store saleId.
             */

            const linkedSaleId =
                paymentSaleId(
                    payment
                );

            if (!linkedSaleId) {
                return false;
            }

            return state.sales.some(
                (sale) =>
                    sale.id ===
                        linkedSaleId &&
                    saleCustomerId(sale) ===
                        state.customerId
            );
        }
    );
}


/* ============================================================
   FINANCIAL CALCULATIONS
   ============================================================ */

function calculateCurrentReceivable() {
    return activeCustomerSales()
        .reduce(
            (total, sale) =>
                total +
                saleBalance(sale),
            0
        );
}


function calculateCurrentOverdue() {
    return activeCustomerSales()
        .filter(
            isOverdueSale
        )
        .reduce(
            (total, sale) =>
                total +
                saleBalance(sale),
            0
        );
}


function overdueSaleCount() {
    return activeCustomerSales()
        .filter(
            isOverdueSale
        )
        .length;
}


function filteredSales() {
    return customerSales()
        .filter(
            (sale) =>
                isInSelectedRange(
                    saleDate(sale)
                )
        )
        .sort(
            (a, b) => {
                const first =
                    timestampToDate(
                        saleDate(a)
                    )?.getTime() ?? 0;

                const second =
                    timestampToDate(
                        saleDate(b)
                    )?.getTime() ?? 0;

                return second - first;
            }
        );
}


function filteredPayments() {
    return customerPayments()
        .filter(
            (payment) =>
                isInSelectedRange(
                    paymentDate(payment)
                )
        )
        .sort(
            (a, b) => {
                const first =
                    timestampToDate(
                        paymentDate(a)
                    )?.getTime() ?? 0;

                const second =
                    timestampToDate(
                        paymentDate(b)
                    )?.getTime() ?? 0;

                return second - first;
            }
        );
}


/* ============================================================
   CUSTOMER PROFILE
   ============================================================ */

function renderCustomerProfile() {
    const customer =
        state.customer;

    if (!customer) {
        return;
    }

    const name =
        customerName(customer);

    if (elements.customerAvatar) {
        elements.customerAvatar.textContent =
            getInitials(name);
    }

    if (elements.customerName) {
        elements.customerName.textContent =
            name;
    }

    if (elements.customerMobile) {
        elements.customerMobile.textContent =
            customerMobile(customer) ||
            "No mobile";
    }

    if (elements.customerEmail) {
        elements.customerEmail.textContent =
            customerEmail(customer) ||
            "No email";
    }

    if (elements.customerGstin) {
        elements.customerGstin.textContent =
            customerGstin(customer) ||
            "—";
    }

    if (elements.customerAddress) {
        elements.customerAddress.textContent =
            customerAddress(customer) ||
            "—";
    }

    if (elements.customerStatus) {
        elements.customerStatus.textContent =
            customerIsActive(customer)
                ? "Active"
                : "Inactive";
    }

    if (elements.receiptCustomerName) {
        elements.receiptCustomerName.textContent =
            name;
    }

    document.title =
        `${name} | OM MARUTI DIAMOND`;
}


/* ============================================================
   SUMMARY
   ============================================================ */

function renderSummary() {
    const sales =
        filteredSales();

    const payments =
        filteredPayments();

    const totalSell =
        sales
            .filter(
                isActiveSale
            )
            .reduce(
                (total, sale) =>
                    total +
                    saleTotal(sale),
                0
            );

    const received =
        payments.reduce(
            (total, payment) =>
                total +
                paymentAmount(payment),
            0
        );

    const receivable =
        calculateCurrentReceivable();

    const overdue =
        calculateCurrentOverdue();

    const overdueCount =
        overdueSaleCount();

    const rangeLabel =
        getSelectedRangeLabel();


    if (
        elements.customerTotalSellValue
    ) {
        elements.customerTotalSellValue.textContent =
            formatMoney(totalSell);
    }

    if (
        elements.customerTotalSellMeta
    ) {
        elements.customerTotalSellMeta.textContent =
            rangeLabel;
    }


    if (
        elements.customerReceivedValue
    ) {
        elements.customerReceivedValue.textContent =
            formatMoney(received);
    }

    if (
        elements.customerReceivedMeta
    ) {
        elements.customerReceivedMeta.textContent =
            rangeLabel;
    }


    if (
        elements.customerReceivableValue
    ) {
        elements.customerReceivableValue.textContent =
            formatMoney(receivable);
    }

    if (
        elements.customerReceivableMeta
    ) {
        elements.customerReceivableMeta.textContent =
            "Current outstanding";
    }


    if (
        elements.customerOverdueValue
    ) {
        elements.customerOverdueValue.textContent =
            formatMoney(overdue);
    }

    if (
        elements.customerOverdueMeta
    ) {
        elements.customerOverdueMeta.textContent =
            `${overdueCount} overdue ${pluralize(
                overdueCount,
                "sale"
            )}`;
    }


    if (
        elements.receiptCurrentReceivable
    ) {
        elements.receiptCurrentReceivable.textContent =
            formatMoney(receivable);
    }
}


/* ============================================================
   SALES TABLE
   ============================================================ */

function createSaleRow(sale) {
    const row =
        document.createElement("tr");

    const invoiceNumber =
        String(
            sale.invoiceNumber ??
            "—"
        );

    appendText(
        row,
        "td",
        invoiceNumber,
        "customer-reference-cell"
    );

    appendText(
        row,
        "td",
        formatDate(
            saleDate(sale)
        )
    );

    const type =
        normalizeText(
            sale.saleType
        ) === "cash"
            ? "Cash"
            : "Credit";

    appendText(
        row,
        "td",
        type
    );

    appendText(
        row,
        "td",
        saleDueDate(sale)
            ? formatDate(
                saleDueDate(sale)
            )
            : "—"
    );

    appendText(
        row,
        "td",
        formatMoney(
            saleTotal(sale)
        ),
        "customer-money-cell"
    );

    appendText(
        row,
        "td",
        formatMoney(
            saleReceived(sale)
        ),
        "customer-money-cell"
    );

    appendText(
        row,
        "td",
        formatMoney(
            saleBalance(sale)
        ),
        "customer-money-cell customer-balance-cell"
    );


    /* Status */

    const statusCell =
        document.createElement("td");

    const status =
        saleStatus(sale);

    const badge =
        createElement(
            "span",
            `customer-invoice-status ${status.className}`
        );

    badge.textContent =
        status.label;

    statusCell.appendChild(
        badge
    );

    row.appendChild(
        statusCell
    );


    /* Action */

    const actionCell =
        document.createElement("td");

    const link =
        createElement(
            "a",
            "customer-table-action"
        );

    link.textContent =
        "View";

    link.href =
    invoiceNumber
        ? `/sales/${encodeURIComponent(
            invoiceNumber
        )}`
        : "/sales";

    actionCell.appendChild(
        link
    );

    row.appendChild(
        actionCell
    );

    return row;
}


function renderSales() {
    if (
        !elements.customerSalesTableBody
    ) {
        return;
    }

    const sales =
        filteredSales();

    elements.customerSalesTableBody
        .replaceChildren();

    if (elements.salesCount) {
        elements.salesCount.textContent =
            `${sales.length} ${pluralize(
                sales.length,
                "invoice"
            )}`;
    }

    if (
        elements.customerSalesEmpty
    ) {
        elements.customerSalesEmpty.hidden =
            sales.length !== 0;
    }

    if (sales.length === 0) {
        return;
    }

    const fragment =
        document.createDocumentFragment();

    for (const sale of sales) {
        fragment.appendChild(
            createSaleRow(sale)
        );
    }

    elements.customerSalesTableBody
        .appendChild(fragment);
}


/* ============================================================
   RECEIPT HELPERS
   ============================================================ */

function findSaleById(saleId) {
    return state.sales.find(
        (sale) =>
            sale.id === saleId
    ) ?? null;
}


function receiptInvoiceNumber(payment) {
    const explicit =
        String(
            payment.invoiceNumber ??
            payment.saleNumber ??
            ""
        ).trim();

    if (explicit) {
        return explicit;
    }

    const sale =
        findSaleById(
            paymentSaleId(payment)
        );

    return String(
        sale?.invoiceNumber ??
        "—"
    );
}


/* ============================================================
   RECEIPTS TABLE
   ============================================================ */

function createReceiptRow(payment) {
    const row =
        document.createElement("tr");

    appendText(
        row,
        "td",
        formatDate(
            paymentDate(payment)
        )
    );

    appendText(
        row,
        "td",
        receiptInvoiceNumber(
            payment
        ),
        "customer-reference-cell"
    );

    appendText(
        row,
        "td",
        formatMoney(
            paymentAmount(payment)
        ),
        "customer-money-cell"
    );

    appendText(
        row,
        "td",
        String(
            payment.method ??
            payment.paymentMethod ??
            "—"
        )
    );

    appendText(
        row,
        "td",
        String(
            payment.reference ??
            payment.referenceNumber ??
            "—"
        )
    );

    appendText(
        row,
        "td",
        String(
            payment.note ??
            payment.notes ??
            "—"
        )
    );

    return row;
}


function renderReceipts() {
    if (
        !elements.customerReceiptsTableBody
    ) {
        return;
    }

    const payments =
        filteredPayments();

    elements.customerReceiptsTableBody
        .replaceChildren();

    if (elements.receiptsCount) {
        elements.receiptsCount.textContent =
            `${payments.length} ${pluralize(
                payments.length,
                "receipt"
            )}`;
    }

    if (
        elements.customerReceiptsEmpty
    ) {
        elements.customerReceiptsEmpty.hidden =
            payments.length !== 0;
    }

    if (
        payments.length === 0
    ) {
        return;
    }

    const fragment =
        document.createDocumentFragment();

    for (
        const payment of payments
    ) {
        fragment.appendChild(
            createReceiptRow(
                payment
            )
        );
    }

    elements.customerReceiptsTableBody
        .appendChild(fragment);
}


/* ============================================================
   STATEMENT

   Accounting convention for customer ledger:

   Sell invoice = Debit
   Receipt      = Credit

   Balance = previous balance + debit - credit
   ============================================================ */

function statementRange() {
    return calculateDateRange();
}


function allStatementEntries() {
    const entries = [];


    for (
        const sale of
            activeCustomerSales()
    ) {
        const date =
            timestampToDate(
                saleDate(sale)
            );

        if (!date) {
            continue;
        }

        entries.push({
            id: `sale-${sale.id}`,
            date,
            type: "sale",

            particular:
                "Sell Invoice",

            reference:
                String(
                    sale.invoiceNumber ??
                    "—"
                ),

            debit:
                saleTotal(sale),

            credit: 0
        });
    }


    for (
        const payment of
            customerPayments()
    ) {
        const date =
            timestampToDate(
                paymentDate(payment)
            );

        if (!date) {
            continue;
        }

        entries.push({
            id:
                `receipt-${payment.id}`,

            date,
            type: "receipt",

            particular:
                "Receipt",

            reference:
                receiptInvoiceNumber(
                    payment
                ),

            debit: 0,

            credit:
                paymentAmount(payment)
        });
    }


    /*
     * Oldest first because this is a running ledger.
     */

    entries.sort(
        (a, b) => {
            const dateDifference =
                a.date.getTime() -
                b.date.getTime();

            if (dateDifference !== 0) {
                return dateDifference;
            }

            /*
             * Stable deterministic ordering if two entries
             * share the same timestamp/day.
             */

            return a.id.localeCompare(
                b.id
            );
        }
    );

    return entries;
}


function calculateStatement() {
    const entries =
        allStatementEntries();

    const {
        start,
        end
    } = statementRange();


    /*
     * All Time has no opening balance.
     */

    let openingBalance = 0;

    if (start) {
        for (
            const entry of entries
        ) {
            if (
                entry.date < start
            ) {
                openingBalance +=
                    entry.debit -
                    entry.credit;
            }
        }
    }


    const visibleEntries =
        entries.filter(
            (entry) => {
                if (!start || !end) {
                    return true;
                }

                return (
                    entry.date >= start &&
                    entry.date <= end
                );
            }
        );


    let runningBalance =
        openingBalance;

    let sellTotal = 0;
    let receivedTotal = 0;


    const calculatedEntries =
        visibleEntries.map(
            (entry) => {
                sellTotal +=
                    entry.debit;

                receivedTotal +=
                    entry.credit;

                runningBalance +=
                    entry.debit -
                    entry.credit;

                return {
                    ...entry,
                    balance:
                        runningBalance
                };
            }
        );


    return {
        openingBalance,
        sellTotal,
        receivedTotal,

        closingBalance:
            runningBalance,

        entries:
            calculatedEntries
    };
}


/* ============================================================
   STATEMENT TABLE
   ============================================================ */

function createStatementRow(entry) {
    const row =
        document.createElement("tr");

    appendText(
        row,
        "td",
        formatDate(entry.date)
    );

    appendText(
        row,
        "td",
        entry.particular
    );

    appendText(
        row,
        "td",
        entry.reference,
        "customer-reference-cell"
    );

    appendText(
        row,
        "td",
        entry.debit > 0
            ? formatMoney(
                entry.debit
            )
            : "—",
        "customer-money-cell"
    );

    appendText(
        row,
        "td",
        entry.credit > 0
            ? formatMoney(
                entry.credit
            )
            : "—",
        "customer-money-cell"
    );

    appendText(
        row,
        "td",
        formatMoney(
            entry.balance
        ),
        "customer-money-cell customer-balance-cell"
    );

    return row;
}


function renderStatement() {
    if (
        !elements.customerStatementTableBody
    ) {
        return;
    }

    const statement =
        calculateStatement();

    elements.customerStatementTableBody
        .replaceChildren();


    if (
        elements.statementOpeningBalance
    ) {
        elements.statementOpeningBalance.textContent =
            formatMoney(
                statement.openingBalance
            );
    }

    if (
        elements.statementSellTotal
    ) {
        elements.statementSellTotal.textContent =
            formatMoney(
                statement.sellTotal
            );
    }

    if (
        elements.statementReceivedTotal
    ) {
        elements.statementReceivedTotal.textContent =
            formatMoney(
                statement.receivedTotal
            );
    }

    if (
        elements.statementClosingBalance
    ) {
        elements.statementClosingBalance.textContent =
            formatMoney(
                statement.closingBalance
            );
    }

    if (
        elements.statementCount
    ) {
        elements.statementCount.textContent =
            `${statement.entries.length} ${pluralize(
                statement.entries.length,
                "entry",
                "entries"
            )}`;
    }

    if (
        elements.customerStatementEmpty
    ) {
        elements.customerStatementEmpty.hidden =
            statement.entries.length !== 0;
    }


    const fragment =
        document.createDocumentFragment();

    for (
        const entry of statement.entries
    ) {
        fragment.appendChild(
            createStatementRow(
                entry
            )
        );
    }

    elements.customerStatementTableBody
        .appendChild(fragment);
}


/* ============================================================
   RECEIPT INVOICE OPTIONS
   ============================================================ */

function renderReceiptInvoiceOptions() {
    if (
        !elements.receiptSaleId
    ) {
        return;
    }

    const previousValue =
        elements.receiptSaleId.value;

    elements.receiptSaleId
        .replaceChildren();


    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value = "";
    placeholder.textContent =
        "Select invoice";

    elements.receiptSaleId
        .appendChild(
            placeholder
        );


    const openSales =
        activeCustomerSales()
            .filter(
                (sale) =>
                    saleBalance(sale) > 0
            )
            .sort(
                (a, b) => {
                    const first =
                        timestampToDate(
                            saleDate(a)
                        )?.getTime() ?? 0;

                    const second =
                        timestampToDate(
                            saleDate(b)
                        )?.getTime() ?? 0;

                    return second - first;
                }
            );


    for (
        const sale of openSales
    ) {
        const option =
            document.createElement(
                "option"
            );

        option.value =
            sale.id;

        option.textContent =
            `${sale.invoiceNumber ?? "Sell"} — ${formatMoney(
                saleBalance(sale)
            )} due`;

        elements.receiptSaleId
            .appendChild(option);
    }


    if (
        openSales.some(
            (sale) =>
                sale.id ===
                previousValue
        )
    ) {
        elements.receiptSaleId.value =
            previousValue;
    }


    updateReceiptBalancePreview();
}


/* ============================================================
   RECEIPT BALANCE PREVIEW
   ============================================================ */

function selectedReceiptSale() {
    const saleId =
        elements.receiptSaleId
            ?.value ?? "";

    return findSaleById(
        saleId
    );
}


function updateReceiptBalancePreview() {
    const sale =
        selectedReceiptSale();

    const balance =
        sale
            ? saleBalance(sale)
            : 0;


    if (
        elements.receiptInvoiceBalance
    ) {
        elements.receiptInvoiceBalance.textContent =
            formatMoney(balance);
    }


    if (
        !elements.receiptAmount
    ) {
        return;
    }


    if (balance > 0) {
        elements.receiptAmount.max =
            String(
                balance / 100
            );
    } else {
        elements.receiptAmount
            .removeAttribute(
                "max"
            );
    }


    /*
     * If the selected invoice changes and the previously
     * entered amount is now too large, clear it rather than
     * leaving a misleading value in the form.
     */

    const currentAmount =
        Number(
            elements.receiptAmount.value
        );


    if (
        Number.isFinite(
            currentAmount
        ) &&
        currentAmount > 0 &&
        Math.round(
            currentAmount * 100
        ) > balance
    ) {
        elements.receiptAmount.value =
            "";
    }


    if (
        elements.receiptAmountError
    ) {
        elements.receiptAmountError.textContent =
            "";
    }
}


/* ============================================================
   COMPLETE RENDER
   ============================================================ */

function renderPage() {
    if (!state.customer) {
        return;
    }

    renderCustomerProfile();
    renderSummary();

    renderSales();
    renderReceipts();
    renderStatement();

    renderReceiptInvoiceOptions();
}


/* ============================================================
   NOT FOUND
   ============================================================ */

function showCustomerNotFound() {
    if (
        elements.customerNotFound
    ) {
        elements.customerNotFound.hidden =
            false;
    }

    if (
        elements.customerName
    ) {
        elements.customerName.textContent =
            "Customer not found";
    }

    document.title =
        "Customer Not Found | OM MARUTI DIAMOND";
}


function hideCustomerNotFound() {
    if (
        elements.customerNotFound
    ) {
        elements.customerNotFound.hidden =
            true;
    }
}


/* ============================================================
   DATE FILTER
   ============================================================ */

function initializeDateFilter() {
    const today =
        new Date();

    if (
        elements.billingDateFilter
    ) {
        elements.billingDateFilter.value =
            DEFAULT_DATE_RANGE;
    }

    if (
        elements.customStartDate
    ) {
        elements.customStartDate.value =
            dateToInputValue(today);
    }

    if (
        elements.customEndDate
    ) {
        elements.customEndDate.value =
            dateToInputValue(today);
    }
}


function bindDateFilter() {
    elements.billingDateFilter
        ?.addEventListener(
            "change",
            () => {
                const value =
                    elements.billingDateFilter
                        .value;

                if (
                    value === "custom"
                ) {
                    if (
                        elements.customDatePanel
                    ) {
                        elements.customDatePanel.hidden =
                            false;
                    }

                    return;
                }

                state.dateRange =
                    value;

                if (
                    elements.customDatePanel
                ) {
                    elements.customDatePanel.hidden =
                        true;
                }

                renderPage();
            }
        );


    elements.applyCustomDateButton
        ?.addEventListener(
            "click",
            () => {
                const start =
                    parseDateInput(
                        elements.customStartDate
                            ?.value ?? ""
                    );

                const end =
                    parseDateInput(
                        elements.customEndDate
                            ?.value ?? ""
                    );

                if (!start || !end) {
                    window.alert(
                        "Please select both dates."
                    );

                    return;
                }

                if (start > end) {
                    window.alert(
                        "Start date cannot be after end date."
                    );

                    return;
                }

                state.customStartDate =
                    start;

                state.customEndDate =
                    end;

                state.dateRange =
                    "custom";

                if (
                    elements.customDatePanel
                ) {
                    elements.customDatePanel.hidden =
                        true;
                }

                renderPage();
            }
        );
}


/* ============================================================
   TABS
   ============================================================ */

function activateTab(tabName) {
    const tabs = {
        sales: {
            button:
                elements.salesTabButton,
            panel:
                elements.salesTabPanel
        },

        receipts: {
            button:
                elements.receiptsTabButton,
            panel:
                elements.receiptsTabPanel
        },

        statement: {
            button:
                elements.statementTabButton,
            panel:
                elements.statementTabPanel
        }
    };

    if (!tabs[tabName]) {
        return;
    }

    state.activeTab =
        tabName;


    for (
        const [
            name,
            tab
        ] of Object.entries(tabs)
    ) {
        const active =
            name === tabName;

        tab.button
            ?.classList.toggle(
                "active",
                active
            );

        tab.button
            ?.setAttribute(
                "aria-selected",
                String(active)
            );

        if (tab.panel) {
            tab.panel.hidden =
                !active;
        }
    }
}


function bindTabs() {
    elements.salesTabButton
        ?.addEventListener(
            "click",
            () =>
                activateTab("sales")
        );

    elements.receiptsTabButton
        ?.addEventListener(
            "click",
            () =>
                activateTab(
                    "receipts"
                )
        );

    elements.statementTabButton
        ?.addEventListener(
            "click",
            () =>
                activateTab(
                    "statement"
                )
        );
}


/* ============================================================
   NEW SELL
   ============================================================ */

function openNewSale() {
    const customerNumber =
        String(
            state.customer?.customerNumber ?? ""
        )
            .trim()
            .toUpperCase();

    if (!customerNumber) {
        return;
    }

    window.location.href =
        `/sales/new?customer=${encodeURIComponent(
            customerNumber
        )}`;
}


function bindNewSaleButtons() {
    const buttons = [
        elements.newSaleButton,
        elements.customerNewSaleButton,
        elements.quickNewSaleButton,
        elements.mobileNewSaleButton
    ];

    for (
        const button of buttons
    ) {
        button?.addEventListener(
            "click",
            openNewSale
        );
    }
}


/* ============================================================
   RECEIPT MODAL
   ============================================================ */

function clearReceiptErrors() {
    const errors = [
        elements.receiptSaleIdError,
        elements.receiptAmountError,
        elements.receiptDateError
    ];

    for (
        const error of errors
    ) {
        if (error) {
            error.textContent =
                "";
        }
    }
}


function hideReceiptMessage() {
    if (
        !elements.receiptFormMessage
    ) {
        return;
    }

    elements.receiptFormMessage.hidden =
        true;

    elements.receiptFormMessage.textContent =
        "";

    elements.receiptFormMessage
        .removeAttribute(
            "data-type"
        );
}


function showReceiptMessage(
    message,
    type = "info"
) {
    if (
        !elements.receiptFormMessage
    ) {
        return;
    }

    elements.receiptFormMessage.textContent =
        String(message ?? "");

    elements.receiptFormMessage.dataset.type =
        type;

    elements.receiptFormMessage.hidden =
        false;
}

function setReceiptSubmitting(
    submitting
) {
    state.receiptSubmitting =
        Boolean(submitting);


    if (
        elements.saveReceiptButton
    ) {
        elements.saveReceiptButton.disabled =
            state.receiptSubmitting;
    }


    if (
        elements.cancelReceiptButton
    ) {
        elements.cancelReceiptButton.disabled =
            state.receiptSubmitting;
    }


    if (
        elements.closeRecordReceiptModal
    ) {
        elements.closeRecordReceiptModal.disabled =
            state.receiptSubmitting;
    }


    if (
        elements.receiptSaleId
    ) {
        elements.receiptSaleId.disabled =
            state.receiptSubmitting;
    }


    if (
        elements.receiptAmount
    ) {
        elements.receiptAmount.disabled =
            state.receiptSubmitting;
    }


    if (
        elements.receiptDate
    ) {
        elements.receiptDate.disabled =
            state.receiptSubmitting;
    }


    if (
        elements.receiptMethod
    ) {
        elements.receiptMethod.disabled =
            state.receiptSubmitting;
    }


    if (
        elements.receiptReference
    ) {
        elements.receiptReference.disabled =
            state.receiptSubmitting;
    }


    if (
        elements.receiptNote
    ) {
        elements.receiptNote.disabled =
            state.receiptSubmitting;
    }


    if (
        elements.saveReceiptButtonText
    ) {
        elements.saveReceiptButtonText.textContent =
            state.receiptSubmitting
                ? "Saving..."
                : "Save Receipt";
    }


    if (
        elements.saveReceiptSpinner
    ) {
        elements.saveReceiptSpinner.hidden =
            !state.receiptSubmitting;
    }
}


function resetReceiptForm() {
    elements.recordReceiptForm
        ?.reset();

    clearReceiptErrors();
    hideReceiptMessage();

    if (
        elements.receiptDate
    ) {
        elements.receiptDate.value =
            dateToInputValue(
                new Date()
            );
    }

    renderReceiptInvoiceOptions();

    updateReceiptBalancePreview();
}

function openReceiptModal() {
    if (
        !elements.recordReceiptModal
    ) {
        return;
    }

    if (
        state.receiptSubmitting
    ) {
        return;
    }


    resetReceiptForm();


    const openSales =
        activeCustomerSales()
            .filter(
                (sale) =>
                    saleBalance(sale) > 0
            );


    if (
        openSales.length === 0
    ) {
        showReceiptMessage(
            "This customer has no outstanding Sell invoice.",
            "info"
        );
    }


    elements.recordReceiptModal.hidden =
        false;

    document.body.classList.add(
        "modal-open"
    );


    requestAnimationFrame(
        () => {
            elements.receiptSaleId
                ?.focus();
        }
    );
}

function closeReceiptModal() {
    if (
        state.receiptSubmitting
    ) {
        return;
    }

    if (
        !elements.recordReceiptModal
    ) {
        return;
    }


    elements.recordReceiptModal.hidden =
        true;

    document.body.classList.remove(
        "modal-open"
    );


    resetReceiptForm();
}


function bindReceiptModal() {
    elements.recordReceiptButton
        ?.addEventListener(
            "click",
            openReceiptModal
        );

    elements.quickRecordReceiptButton
        ?.addEventListener(
            "click",
            openReceiptModal
        );

    elements.closeRecordReceiptModal
        ?.addEventListener(
            "click",
            closeReceiptModal
        );

    elements.cancelReceiptButton
        ?.addEventListener(
            "click",
            closeReceiptModal
        );

    elements.recordReceiptModal
        ?.addEventListener(
            "click",
            (event) => {
                if (
                    event.target ===
                    elements.recordReceiptModal
                ) {
                    closeReceiptModal();
                }
            }
        );

    elements.receiptSaleId
        ?.addEventListener(
            "change",
            updateReceiptBalancePreview
        );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape" &&
                elements.recordReceiptModal &&
                !elements.recordReceiptModal.hidden
            ) {
                closeReceiptModal();
            }
        }
    );
}


/* ============================================================
   RECEIPT VALIDATION

   We validate now, but do not perform the financial write
   until the trusted callable function exists.
   ============================================================ */

function validateReceiptForm() {
    clearReceiptErrors();
    hideReceiptMessage();

    let valid = true;

    const sale =
        selectedReceiptSale();

    const amountRupees =
        Number(
            elements.receiptAmount
                ?.value
        );

    const receiptDate =
        parseDateInput(
            elements.receiptDate
                ?.value ?? ""
        );

    const today =
    endOfDay(
        new Date()
    );

    


    if (!sale) {
        if (
            elements.receiptSaleIdError
        ) {
            elements.receiptSaleIdError.textContent =
                "Select a Sell invoice.";
        }

        valid = false;
    }


    if (
        !Number.isFinite(
            amountRupees
        ) ||
        amountRupees <= 0
    ) {
        if (
            elements.receiptAmountError
        ) {
            elements.receiptAmountError.textContent =
                "Enter a valid receipt amount.";
        }

        valid = false;
    }


    const amountPaise =
        Number.isFinite(
            amountRupees
        )
            ? Math.round(
                amountRupees * 100
            )
            : 0;


    if (
        sale &&
        amountPaise >
            saleBalance(sale)
    ) {
        if (
            elements.receiptAmountError
        ) {
            elements.receiptAmountError.textContent =
                "Receipt cannot exceed the invoice outstanding balance.";
        }

        valid = false;
    }


    if (!receiptDate) {
        if (
            elements.receiptDateError
        ) {
            elements.receiptDateError.textContent =
                "Select a valid receipt date.";
        }

        valid = false;
    }

    if (
    receiptDate &&
    receiptDate > today
) {
    if (
        elements.receiptDateError
    ) {
        elements.receiptDateError.textContent =
            "Receipt date cannot be in the future.";
    }

    valid = false;
}


    if (!valid) {
        return null;
    }


    return {
        saleId:
            sale.id,

        amountPaise,

        receiptDate:
    dateToInputValue(
        receiptDate
    ),

        method:
            String(
                elements.receiptMethod
                    ?.value ??
                "cash"
            ),

        reference:
            String(
                elements.receiptReference
                    ?.value ??
                ""
            ).trim(),

        note:
            String(
                elements.receiptNote
                    ?.value ??
                ""
            ).trim()
    };
}

function getReceiptErrorMessage(
    error
) {
    const code =
        String(
            error?.code ?? ""
        )
            .replace(
                /^functions\//,
                ""
            );


    switch (code) {

        case "unauthenticated":
            return "Your session has expired. Please sign in again.";


        case "permission-denied":
            return "You are not authorized to record receipts.";


        case "invalid-argument":
            return (
                error?.message ||
                "Please check the receipt details."
            );


        case "not-found":
            return "The selected Sell invoice no longer exists.";


        case "failed-precondition":
            return (
                error?.message ||
                "This receipt cannot be recorded."
            );


        case "unavailable":
            return "The billing service is temporarily unavailable. Please try again.";


        case "deadline-exceeded":
            return "The request took too long. Please try again.";


        case "internal":
            return "The receipt could not be recorded. Please try again.";


        default:
            return "The receipt could not be recorded. Please try again.";
    }
}


/* ============================================================
   RECEIPT SUBMIT

   Financial writes are never performed directly from
   the browser.

   The form sends the requested receipt to the trusted
   recordSaleReceipt callable Cloud Function.

   The backend authoritatively validates and updates:
   - salePayments
   - receivedPaise
   - balancePaise
   - sale status
   - auditLogs

   Firestore realtime listeners then refresh this page.
   ============================================================ */

async function handleReceiptSubmit(
    event
) {
    event.preventDefault();


    /*
     * Prevent accidental double submission.
     */

    if (
        state.receiptSubmitting
    ) {
        return;
    }


    const receipt =
        validateReceiptForm();


    if (!receipt) {
        return;
    }


    const selectedSale =
        findSaleById(
            receipt.saleId
        );


    if (!selectedSale) {
        showReceiptMessage(
            "The selected Sell invoice could not be found.",
            "error"
        );

        return;
    }


    /*
     * Keep this only as a friendly frontend check.
     *
     * The Cloud Function performs the authoritative
     * balance validation again inside a Firestore
     * transaction.
     */

    if (
        receipt.amountPaise >
        saleBalance(
            selectedSale
        )
    ) {
        if (
            elements.receiptAmountError
        ) {
            elements.receiptAmountError.textContent =
                "Receipt cannot exceed the current invoice balance.";
        }

        return;
    }


    setReceiptSubmitting(true);

    hideReceiptMessage();


    try {

        /*
         * Trusted financial operation.
         *
         * Browser only sends the requested receipt.
         *
         * It does NOT send:
         *
         * - new invoice balance
         * - new received total
         * - invoice status
         *
         * Those are calculated by the backend.
         */

        const recordSaleReceipt =
            httpsCallable(
                functions,
                "recordSaleReceipt"
            );


        const response =
            await recordSaleReceipt({
                saleId:
                    receipt.saleId,

                amountPaise:
                    receipt.amountPaise,

                receiptDate:
                    receipt.receiptDate,

                method:
                    receipt.method,

                reference:
                    receipt.reference,

                note:
                    receipt.note
            });


        if (
            !response?.data?.success
        ) {
            throw new Error(
                "Receipt operation did not complete."
            );
        }


        /*
         * We intentionally do not manually modify
         * state.sales or state.salePayments here.
         *
         * Firestore onSnapshot() listeners will receive
         * the authoritative server state automatically.
         */


        showReceiptMessage(
            "Receipt recorded successfully.",
            "success"
        );


        /*
         * Briefly keep the success state visible.
         */

        await new Promise(
            (resolve) => {
                window.setTimeout(
                    resolve,
                    650
                );
            }
        );


        setReceiptSubmitting(false);

        closeReceiptModal();


        /*
         * Take the user directly to Receipt History.
         */

        activateTab(
            "receipts"
        );

    } catch (error) {

        console.error(
            "Record receipt failed:",
            error
        );


        setReceiptSubmitting(false);


        const message =
            getReceiptErrorMessage(
                error
            );


        showReceiptMessage(
            message,
            "error"
        );


        /*
         * Authentication errors should return to login.
         */

        const code =
            String(
                error?.code ?? ""
            );


        if (
            code ===
                "functions/unauthenticated" ||
            code ===
                "functions/permission-denied"
        ) {
            window.setTimeout(
                async () => {
                    try {
                        await signOut(
                            auth
                        );
                    } finally {
                        window.location.replace(
                            "/login"
                        );
                    }
                },
                900
            );
        }
    }
}


function bindReceiptForm() {
    elements.recordReceiptForm
        ?.addEventListener(
            "submit",
            handleReceiptSubmit
        );
}


/* ============================================================
   PRINT
   ============================================================ */

function printStatement() {
    activateTab(
        "statement"
    );

    requestAnimationFrame(
        () => {
            window.print();
        }
    );
}


function bindPrint() {
    elements.printStatementButton
        ?.addEventListener(
            "click",
            printStatement
        );
}


/* ============================================================
   GLOBAL SEARCH
   ============================================================ */

function hideGlobalSearch() {
    if (
        elements.globalSearchResults
    ) {
        elements.globalSearchResults.hidden =
            true;
    }

    elements.globalSearchResultsContent
        ?.replaceChildren();
}


function globalSearchMatches(
    value,
    search,
    compactSearch
) {
    return (
        normalizeText(value)
            .includes(search) ||
        normalizeCompactText(value)
            .includes(
                compactSearch
            )
    );
}


function buildGlobalSearchResults(value) {
    const search =
        normalizeText(value);

    const compactSearch =
        normalizeCompactText(value);

    if (!search) {
        return [];
    }

    const results = [];


    /* Customers */

    for (
        const customer of
            state.customers
    ) {
        const values = [
            customerName(customer),
            customerMobile(customer),
            customerEmail(customer),
            customerGstin(customer)
        ];

        if (
            values.some(
                (item) =>
                    globalSearchMatches(
                        item,
                        search,
                        compactSearch
                    )
            )
        ) {
            results.push({
                type: "Customer",

                title:
                    customerName(
                        customer
                    ),

                subtitle:
                    customerMobile(
                        customer
                    ) ||
                    customerEmail(
                        customer
                    ) ||
                    "Customer",

                href:
                customer.customerNumber
                    ? `/customers/${encodeURIComponent(
                        String(
                            customer.customerNumber
                        )
                            .trim()
                            .toUpperCase()
                    )}`
                    : "/customers"
            });
        }
    }


    /* Sell */

    for (
        const sale of state.sales
    ) {
        const invoice =
            String(
                sale.invoiceNumber ??
                ""
            );

        const snapshotName =
            String(
                sale.customerSnapshot
                    ?.name ??
                sale.customerName ??
                ""
            );

        const status =
            saleStatus(sale).label;

        const amount =
            formatMoney(
                saleTotal(sale)
            );

        const values = [
            invoice,
            snapshotName,
            status,
            amount
        ];

        if (
            values.some(
                (item) =>
                    globalSearchMatches(
                        item,
                        search,
                        compactSearch
                    )
            )
        ) {
            results.push({

                type: "Sell",

                title:
                    invoice ||
                    "Sell Invoice",

                subtitle:
                    snapshotName ||
                    amount,

                href:
                    invoice
                        ? `/sales/${encodeURIComponent(
                            invoice
                        )}`
                        : "/sales"

            });
        }
    }


    return results.slice(
        0,
        8
    );
}


function renderGlobalSearch(value) {
    if (
        !elements.globalSearchResults ||
        !elements.globalSearchResultsContent
    ) {
        return;
    }

    const results =
        buildGlobalSearchResults(
            value
        );

    elements.globalSearchResultsContent
        .replaceChildren();

    if (!normalizeText(value)) {
        hideGlobalSearch();
        return;
    }

    elements.globalSearchResults.hidden =
        false;


    if (
        results.length === 0
    ) {
        appendText(
            elements.globalSearchResultsContent,
            "div",
            "No matching customers or Sell records.",
            "search-result-empty"
        );

        return;
    }


    const fragment =
        document.createDocumentFragment();


    for (
        const result of results
    ) {
        const link =
            createElement(
                "a",
                "search-result-item"
            );

        link.href =
            result.href;


        const content =
            createElement(
                "span",
                "search-result-content"
            );

        appendText(
            content,
            "strong",
            result.title
        );

        appendText(
            content,
            "span",
            result.subtitle
        );


        appendText(
            link,
            "span",
            result.type,
            "search-result-type"
        );

        link.prepend(
            content
        );

        fragment.appendChild(
            link
        );
    }


    elements.globalSearchResultsContent
        .appendChild(fragment);
}


function bindGlobalSearch() {
    elements.globalSearchInput
        ?.addEventListener(
            "input",
            () => {
                renderGlobalSearch(
                    elements.globalSearchInput
                        .value
                );
            }
        );


    elements.globalSearchInput
        ?.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Escape"
                ) {
                    hideGlobalSearch();

                    elements.globalSearchInput
                        .blur();
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

            hideGlobalSearch();
        }
    );
}


/* ============================================================
   SIDEBAR
   ============================================================ */

function openSidebar() {
    elements.sidebar
        ?.classList.add(
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


function closeSidebar() {
    elements.sidebar
        ?.classList.remove(
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


function bindSidebar() {
    elements.mobileMenuButton
        ?.addEventListener(
            "click",
            () => {
                if (
                    elements.sidebar
                        ?.classList
                        .contains(
                            "is-open"
                        )
                ) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            }
        );

    elements.sidebarOverlay
        ?.addEventListener(
            "click",
            closeSidebar
        );

    window.addEventListener(
        "resize",
        () => {
            if (
                window.innerWidth >
                900
            ) {
                closeSidebar();
            }
        }
    );
}


/* ============================================================
   LOGOUT
   ============================================================ */

function bindLogout() {
    elements.logoutButton
        ?.addEventListener(
            "click",
            async () => {
                try {
                    await signOut(auth);
                } catch (error) {
                    console.error(
                        "Logout failed:",
                        error
                    );
                } finally {
                    window.location.replace(
                        "/login"
                    );
                }
            }
        );
}


/* ============================================================
   SNAPSHOT MAPPER
   ============================================================ */

function mapSnapshot(snapshot) {
    return snapshot.docs.map(
        (documentSnapshot) => ({
            id:
                documentSnapshot.id,

            ...documentSnapshot.data()
        })
    );
}


/* ============================================================
   REALTIME ERRORS
   ============================================================ */

function handleRealtimeError(
    source,
    error
) {
    console.error(
        `${source} listener failed:`,
        error
    );

    if (
        error?.code ===
        "permission-denied"
    ) {
        signOut(auth)
            .finally(
                () => {
                    window.location.replace(
                        "/login"
                    );
                }
            );
    }
}


/* ============================================================
   REALTIME LISTENERS
   ============================================================ */

function startRealtimeListeners() {
    if (
        state.listenersStarted
    ) {
        return;
    }

    state.listenersStarted =
        true;


    /* --------------------------------------------------------
       Exact customer document
       -------------------------------------------------------- */

    state.unsubscribeCustomer =
        onSnapshot(
            customerDocument(
                state.customerId
            ),

            (snapshot) => {
                state.customerResolved =
                    true;

                if (
                    !snapshot.exists()
                ) {
                    state.customer =
                        null;

                    showCustomerNotFound();

                    return;
                }

                state.customer = {
                    id:
                        snapshot.id,

                    ...snapshot.data()
                };

                hideCustomerNotFound();

                renderPage();
            },

            (error) => {
                handleRealtimeError(
                    "Customer",
                    error
                );
            }
        );


    /* --------------------------------------------------------
       Customers for global search
       -------------------------------------------------------- */

    const customersQuery =
        query(
            businessCollection(
                "customers"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(
                MAX_CUSTOMERS
            )
        );


    state.unsubscribeCustomers =
        onSnapshot(
            customersQuery,

            (snapshot) => {
                state.customers =
                    mapSnapshot(
                        snapshot
                    );

                if (
                    elements.globalSearchInput
                        ?.value
                ) {
                    renderGlobalSearch(
                        elements.globalSearchInput
                            .value
                    );
                }
            },

            (error) => {
                handleRealtimeError(
                    "Customers",
                    error
                );
            }
        );


    /* --------------------------------------------------------
       Sales

       We intentionally read the business sales collection
       here and filter by customerId in memory.

       Later, once indexes and production query patterns are
       finalized, this can be tightened to customer-specific
       Firestore queries.
       -------------------------------------------------------- */

    const salesQuery =
    query(
        businessCollection(
            "sales"
        ),

        where(
            "customerId",
            "==",
            state.customerId
        ),

        orderBy(
            "createdAt",
            "desc"
        ),

        limit(
            MAX_SALES
        )
    );


    state.unsubscribeSales =
        onSnapshot(
            salesQuery,

            (snapshot) => {
                state.sales =
                    mapSnapshot(
                        snapshot
                    );

                renderPage();
            },

            (error) => {
                handleRealtimeError(
                    "Sales",
                    error
                );
            }
        );


    /* --------------------------------------------------------
       Sale payments
       -------------------------------------------------------- */

    const paymentsQuery =
        query(
            businessCollection(
                "salePayments"
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(
                MAX_PAYMENTS
            )
        );


    state.unsubscribePayments =
        onSnapshot(
            paymentsQuery,

            (snapshot) => {
                state.salePayments =
                    mapSnapshot(
                        snapshot
                    );

                renderPage();
            },

            (error) => {
                handleRealtimeError(
                    "Sale payments",
                    error
                );
            }
        );
}


/* ============================================================
   AUTH
   ============================================================ */

function initializeAuthentication() {
    onAuthStateChanged(
        auth,

        async (user) => {
            state.authResolved =
                true;

            if (!user) {
                window.location.replace(
                    "/login"
                );

                return;
            }


            const customerNumber =
                readCustomerNumber();

            if (!customerNumber) {
                showCustomerNotFound();
                return;
            }


            try {
                const resolvedCustomerId =
                    await resolveCustomerIdByNumber(
                        customerNumber
                    );

                if (!resolvedCustomerId) {
                    showCustomerNotFound();
                    return;
                }


                state.customerId =
                    resolvedCustomerId;

                startRealtimeListeners();

            } catch (error) {
                console.error(
                    "Customer resolution failed:",
                    error?.code ||
                    error?.message ||
                    "unknown-error"
                );

                if (
                    error?.code ===
                    "permission-denied"
                ) {
                    await signOut(auth);

                    window.location.replace(
                        "/login"
                    );

                    return;
                }

                showCustomerNotFound();
            }
        },

        (error) => {
            console.error(
                "Authentication state error:",
                error
            );

            window.location.replace(
                "/login"
            );
        }
    );
}

/* ============================================================
   CLEANUP
   ============================================================ */

function cleanup() {
    state.unsubscribeCustomer?.();
    state.unsubscribeCustomers?.();
    state.unsubscribeSales?.();
    state.unsubscribePayments?.();

    state.unsubscribeCustomer =
        null;

    state.unsubscribeCustomers =
        null;

    state.unsubscribeSales =
        null;

    state.unsubscribePayments =
        null;

    state.listenersStarted =
        false;
}


window.addEventListener(
    "pagehide",
    cleanup
);


/* ============================================================
   INITIALIZATION
   ============================================================ */

function initializeCustomerPage() {
    renderCurrentDate();

    initializeDateFilter();

    bindDateFilter();
    bindTabs();

    bindNewSaleButtons();

    bindReceiptModal();
    bindReceiptForm();

    bindPrint();

    bindGlobalSearch();
    bindSidebar();
    bindLogout();


    activateTab("sales");

    initializeAuthentication();
}


initializeCustomerPage();
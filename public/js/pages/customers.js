/* ============================================================
   OM MARUTI DIAMOND
   CUSTOMERS PAGE
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

const MAX_CUSTOMERS = 1000;
const MAX_SALES = 1500;
const MAX_PAYMENTS = 2500;

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
    customers: [],
    sales: [],
    salePayments: [],

    dateRange: DEFAULT_DATE_RANGE,

    customStartDate: null,
    customEndDate: null,

    customerSearch: "",
    customerStatus: "all",

    listenersStarted: false,

    unsubscribeCustomers: null,
    unsubscribeSales: null,
    unsubscribePayments: null
};


/* ============================================================
   DOM REFERENCES
   ============================================================ */

const elements = {
    currentDate:
        document.getElementById("currentDate"),

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

    totalCustomersValue:
        document.getElementById("totalCustomersValue"),

    totalCustomersMeta:
        document.getElementById("totalCustomersMeta"),

    activeCustomersValue:
        document.getElementById("activeCustomersValue"),

    activeCustomersMeta:
        document.getElementById("activeCustomersMeta"),

    customerReceivableValue:
        document.getElementById("customerReceivableValue"),

    customerReceivableMeta:
        document.getElementById("customerReceivableMeta"),

    customerOverdueValue:
        document.getElementById("customerOverdueValue"),

    customerOverdueMeta:
        document.getElementById("customerOverdueMeta"),


    /* Customer directory */

    customerSearchInput:
        document.getElementById("customerSearchInput"),

    customerStatusFilter:
        document.getElementById("customerStatusFilter"),

    customersTableBody:
        document.getElementById("customersTableBody"),

    customersEmptyState:
        document.getElementById("customersEmptyState"),


    /* Add customer */

    addCustomerButton:
        document.getElementById("addCustomerButton"),

    mobileAddCustomerButton:
        document.getElementById("mobileAddCustomerButton"),

    addCustomerModal:
        document.getElementById("addCustomerModal"),

    closeAddCustomerModal:
        document.getElementById("closeAddCustomerModal"),

    cancelAddCustomerButton:
        document.getElementById("cancelAddCustomerButton"),

    addCustomerForm:
        document.getElementById("addCustomerForm"),

    customerName:
        document.getElementById("customerName"),

    customerMobile:
        document.getElementById("customerMobile"),

    customerEmail:
        document.getElementById("customerEmail"),

    customerGstin:
        document.getElementById("customerGstin"),

    customerAddress:
        document.getElementById("customerAddress"),

    customerNameError:
        document.getElementById("customerNameError"),

    customerMobileError:
        document.getElementById("customerMobileError"),

    customerEmailError:
        document.getElementById("customerEmailError"),

    customerGstinError:
        document.getElementById("customerGstinError"),

    customerAddressError:
        document.getElementById("customerAddressError"),

    customerFormMessage:
        document.getElementById("customerFormMessage"),

    saveCustomerButton:
        document.getElementById("saveCustomerButton"),

    saveCustomerButtonText:
        document.getElementById("saveCustomerButtonText"),

    saveCustomerSpinner:
        document.getElementById("saveCustomerSpinner"),


    /* Global search */

    globalSearchInput:
        document.getElementById("globalSearchInput"),

    globalSearchResults:
        document.getElementById("globalSearchResults"),

    globalSearchResultsContent:
        document.getElementById("globalSearchResultsContent"),


    /* Navigation */

    sidebar:
        document.getElementById("sidebar"),

    sidebarOverlay:
        document.getElementById("sidebarOverlay"),

    mobileMenuButton:
        document.getElementById("mobileMenuButton"),

    logoutButton:
        document.getElementById("logoutButton")
};


/* ============================================================
   FIRESTORE PATH
   ============================================================ */

function getBusinessSubcollection(collectionName) {
    return collection(
        db,
        "businesses",
        BUSINESS_ID,
        collectionName
    );
}


/* ============================================================
   GENERAL HELPERS
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


function safeInteger(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.trunc(number);
}


function positivePaise(value) {
    return Math.max(
        0,
        safeInteger(value)
    );
}


function formatMoney(paise) {
    const safePaise = safeInteger(paise);

    return CURRENCY_FORMATTER.format(
        safePaise / 100
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


/* ============================================================
   FIRESTORE TIMESTAMP HELPERS
   ============================================================ */

function timestampToDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : value;
    }

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {
        const date = value.toDate();

        return Number.isNaN(date.getTime())
            ? null
            : date;
    }

    if (
        typeof value === "object" &&
        Number.isFinite(value.seconds)
    ) {
        const date = new Date(
            value.seconds * 1000
        );

        return Number.isNaN(date.getTime())
            ? null
            : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}


function formatDate(value) {
    const date = timestampToDate(value);

    if (!date) {
        return "—";
    }

    return DATE_FORMATTER.format(date);
}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function startOfDay(date) {
    const result = new Date(date);

    result.setHours(
        0,
        0,
        0,
        0
    );

    return result;
}


function endOfDay(date) {
    const result = new Date(date);

    result.setHours(
        23,
        59,
        59,
        999
    );

    return result;
}


function addDays(date, days) {
    const result = new Date(date);

    result.setDate(
        result.getDate() + days
    );

    return result;
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

    const date = new Date(
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


function dateToInputValue(date) {
    const year =
        String(date.getFullYear());

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function calculateDateRange(rangeName) {
    const now = new Date();

    switch (rangeName) {
        case "today":
            return {
                start: startOfDay(now),
                end: endOfDay(now)
            };

        case "yesterday": {
            const yesterday =
                addDays(now, -1);

            return {
                start: startOfDay(yesterday),
                end: endOfDay(yesterday)
            };
        }

        case "7days":
            return {
                start:
                    startOfDay(
                        addDays(now, -6)
                    ),

                end:
                    endOfDay(now)
            };

        case "30days":
            return {
                start:
                    startOfDay(
                        addDays(now, -29)
                    ),

                end:
                    endOfDay(now)
            };

        case "custom": {
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
                start: startOfDay(now),
                end: endOfDay(now)
            };
        }

        case "all":
        default:
            return {
                start: null,
                end: null
            };
    }
}


function isDateInSelectedRange(value) {
    const date =
        timestampToDate(value);

    if (!date) {
        return false;
    }

    const {
        start,
        end
    } = calculateDateRange(
        state.dateRange
    );

    if (!start || !end) {
        return true;
    }

    return (
        date >= start &&
        date <= end
    );
}


/* ============================================================
   CURRENT DATE
   ============================================================ */

function renderCurrentDate() {
    if (!elements.currentDate) {
        return;
    }

    const now = new Date();

    elements.currentDate.dateTime =
        dateToInputValue(now);

    elements.currentDate.textContent =
        CURRENT_DATE_FORMATTER.format(now);
}


/* ============================================================
   BUSINESS STATUS HELPERS
   ============================================================ */

function isDraftSale(sale) {
    return normalizeText(sale?.status) ===
        "draft";
}


function isCancelledSale(sale) {
    const status =
        normalizeText(sale?.status);

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


function getSaleBalancePaise(sale) {
    if (!sale) {
        return 0;
    }

    if (
        Number.isFinite(
            Number(sale.balancePaise)
        )
    ) {
        return positivePaise(
            sale.balancePaise
        );
    }

    return Math.max(
        0,
        positivePaise(
            sale.grandTotalPaise
        ) -
        positivePaise(
            sale.receivedPaise
        )
    );
}


function getSaleTotalPaise(sale) {
    return positivePaise(
        sale?.grandTotalPaise
    );
}


function getSaleReceivedPaise(sale) {
    return positivePaise(
        sale?.receivedPaise
    );
}


function isCustomerActive(customer) {
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


/* ============================================================
   OVERDUE

   A bill due today is NOT overdue.
   It becomes overdue only after the due date has passed.
   ============================================================ */

function isSaleOverdue(sale) {
    if (
        !isActiveSale(sale) ||
        getSaleBalancePaise(sale) <= 0
    ) {
        return false;
    }

    const dueDate =
        timestampToDate(
            sale.dueDate
        );

    if (!dueDate) {
        return false;
    }

    return (
        startOfDay(dueDate) <
        startOfDay(new Date())
    );
}


/* ============================================================
   CUSTOMER RELATION HELPERS
   ============================================================ */

function getCustomerIdFromSale(sale) {
    return String(
        sale?.customerId ??
        sale?.customer?.id ??
        sale?.customerSnapshot?.id ??
        ""
    ).trim();
}


function getCustomerIdFromPayment(payment) {
    return String(
        payment?.customerId ??
        payment?.customer?.id ??
        ""
    ).trim();
}


function getCustomerName(customer) {
    return String(
        customer?.name ??
        customer?.customerName ??
        "Unnamed Customer"
    ).trim();
}


function getCustomerMobile(customer) {
    return String(
        customer?.mobile ??
        customer?.phone ??
        ""
    ).trim();
}


function getCustomerEmail(customer) {
    return String(
        customer?.email ??
        ""
    ).trim();
}


function getCustomerGstin(customer) {
    return String(
        customer?.gstin ??
        customer?.gstNumber ??
        ""
    ).trim();
}


/* ============================================================
   CUSTOMER FINANCIAL SUMMARY
   ============================================================ */

function buildCustomerSummary(customer) {
    const customerId =
        String(customer.id);

    const customerSales =
        state.sales.filter((sale) => {
            return (
                isActiveSale(sale) &&
                getCustomerIdFromSale(sale) ===
                    customerId
            );
        });


    /*
     * Total Sell shown in the customer table obeys the
     * selected date range.
     */

    const selectedSales =
        customerSales.filter((sale) => {
            return isDateInSelectedRange(
                sale.invoiceDate ??
                sale.saleDate ??
                sale.createdAt
            );
        });


    const totalSellPaise =
        selectedSales.reduce(
            (total, sale) => {
                return (
                    total +
                    getSaleTotalPaise(sale)
                );
            },
            0
        );


    /*
     * Received also obeys selected payment date.
     *
     * Prefer salePayments because multiple / partial receipts
     * are separate payment records.
     */

    const selectedPayments =
        state.salePayments.filter(
            (payment) => {
                if (
                    getCustomerIdFromPayment(
                        payment
                    ) !== customerId
                ) {
                    return false;
                }

                return isDateInSelectedRange(
                    payment.paymentDate ??
                    payment.receivedDate ??
                    payment.date ??
                    payment.createdAt
                );
            }
        );


    const receivedPaise =
        selectedPayments.reduce(
            (total, payment) => {
                return (
                    total +
                    positivePaise(
                        payment.amountPaise
                    )
                );
            },
            0
        );


    /*
     * Receivable is CURRENT outstanding.
     * It intentionally does not disappear when the user
     * switches the date filter.
     */

    const receivablePaise =
        customerSales.reduce(
            (total, sale) => {
                return (
                    total +
                    getSaleBalancePaise(sale)
                );
            },
            0
        );


    const overdueSales =
        customerSales.filter(
            isSaleOverdue
        );

    const overduePaise =
        overdueSales.reduce(
            (total, sale) => {
                return (
                    total +
                    getSaleBalancePaise(sale)
                );
            },
            0
        );


    const lastSale =
        customerSales
            .map((sale) => {
                return {
                    sale,
                    date:
                        timestampToDate(
                            sale.invoiceDate ??
                            sale.saleDate ??
                            sale.createdAt
                        )
                };
            })
            .filter(
                (entry) => entry.date
            )
            .sort(
                (a, b) =>
                    b.date.getTime() -
                    a.date.getTime()
            )[0] ?? null;


    return {
        customer,

        totalSellPaise,
        receivedPaise,

        receivablePaise,
        overduePaise,

        overdueCount:
            overdueSales.length,

        lastSaleDate:
            lastSale?.date ?? null,

        active:
            isCustomerActive(customer)
    };
}


/* ============================================================
   PAGE SUMMARY
   ============================================================ */

function renderSummary() {
    const summaries =
        state.customers.map(
            buildCustomerSummary
        );

    const totalCustomers =
        summaries.length;

    const activeCustomers =
        summaries.filter(
            (summary) => summary.active
        ).length;

    const receivablePaise =
        summaries.reduce(
            (total, summary) => {
                return (
                    total +
                    summary.receivablePaise
                );
            },
            0
        );

    const overduePaise =
        summaries.reduce(
            (total, summary) => {
                return (
                    total +
                    summary.overduePaise
                );
            },
            0
        );

    const overdueCount =
        state.sales.filter(
            isSaleOverdue
        ).length;


    if (
        elements.totalCustomersValue
    ) {
        elements.totalCustomersValue.textContent =
            String(totalCustomers);
    }

    if (
        elements.totalCustomersMeta
    ) {
        elements.totalCustomersMeta.textContent =
            `${totalCustomers} ${pluralize(
                totalCustomers,
                "customer"
            )}`;
    }


    if (
        elements.activeCustomersValue
    ) {
        elements.activeCustomersValue.textContent =
            String(activeCustomers);
    }

    if (
        elements.activeCustomersMeta
    ) {
        elements.activeCustomersMeta.textContent =
            `${activeCustomers} active ${pluralize(
                activeCustomers,
                "account"
            )}`;
    }


    if (
        elements.customerReceivableValue
    ) {
        elements.customerReceivableValue.textContent =
            formatMoney(
                receivablePaise
            );
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
            formatMoney(
                overduePaise
            );
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
}


/* ============================================================
   TABLE FILTERING
   ============================================================ */

function customerMatchesSearch(summary) {
    const search =
        normalizeText(
            state.customerSearch
        );

    if (!search) {
        return true;
    }

    const compactSearch =
        normalizeCompactText(search);

    const customer =
        summary.customer;

    const searchableValues = [
        getCustomerName(customer),
        getCustomerMobile(customer),
        getCustomerEmail(customer),
        getCustomerGstin(customer),
        formatMoney(
            summary.totalSellPaise
        ),
        formatMoney(
            summary.receivedPaise
        ),
        formatMoney(
            summary.receivablePaise
        )
    ];


    return searchableValues.some(
        (value) => {
            const normal =
                normalizeText(value);

            const compact =
                normalizeCompactText(value);

            return (
                normal.includes(search) ||
                compact.includes(
                    compactSearch
                )
            );
        }
    );
}


function customerMatchesStatus(summary) {
    switch (
        state.customerStatus
    ) {
        case "active":
            return summary.active;

        case "inactive":
            return !summary.active;

        case "receivable":
            return (
                summary.receivablePaise > 0
            );

        case "overdue":
            return (
                summary.overduePaise > 0
            );

        case "all":
        default:
            return true;
    }
}


/* ============================================================
   SAFE DOM HELPERS
   ============================================================ */

function createElement(
    tagName,
    className = ""
) {
    const element =
        document.createElement(
            tagName
        );

    if (className) {
        element.className =
            className;
    }

    return element;
}


function appendText(
    parent,
    tagName,
    textValue,
    className = ""
) {
    const element =
        createElement(
            tagName,
            className
        );

    element.textContent =
        String(
            textValue ?? ""
        );

    parent.appendChild(
        element
    );

    return element;
}


/* ============================================================
   CUSTOMER INITIALS
   ============================================================ */

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
   CUSTOMER ROW
   ============================================================ */

function createCustomerRow(summary) {
    const {
        customer,
        totalSellPaise,
        receivedPaise,
        receivablePaise,
        overduePaise,
        lastSaleDate,
        active
    } = summary;

    const row =
        document.createElement("tr");


    /* --------------------------------------------------------
       CUSTOMER
       -------------------------------------------------------- */

    const customerCell =
        createElement(
            "td",
            "customer-cell"
        );

    const identity =
        createElement(
            "div",
            "customer-identity"
        );

    const avatar =
        createElement(
            "span",
            "customer-avatar"
        );

    avatar.textContent =
        getInitials(
            getCustomerName(customer)
        );

    const identityContent =
        createElement(
            "div",
            "customer-identity-content"
        );

    appendText(
        identityContent,
        "strong",
        getCustomerName(customer),
        "customer-name"
    );

    const email =
        getCustomerEmail(customer);

    if (email) {
        appendText(
            identityContent,
            "span",
            email,
            "customer-secondary"
        );
    }

    identity.append(
        avatar,
        identityContent
    );

    customerCell.appendChild(
        identity
    );

    row.appendChild(
        customerCell
    );


    /* --------------------------------------------------------
       MOBILE
       -------------------------------------------------------- */

    appendText(
        row,
        "td",
        getCustomerMobile(customer) ||
            "—"
    );


    /* --------------------------------------------------------
       GSTIN
       -------------------------------------------------------- */

    appendText(
        row,
        "td",
        getCustomerGstin(customer) ||
            "—"
    );


    /* --------------------------------------------------------
       TOTAL SELL
       -------------------------------------------------------- */

    appendText(
        row,
        "td",
        formatMoney(totalSellPaise),
        "customer-money"
    );


    /* --------------------------------------------------------
       RECEIVED
       -------------------------------------------------------- */

    appendText(
        row,
        "td",
        formatMoney(receivedPaise),
        "customer-money"
    );


    /* --------------------------------------------------------
       RECEIVABLE
       -------------------------------------------------------- */

    appendText(
        row,
        "td",
        formatMoney(receivablePaise),
        "customer-money customer-receivable"
    );


    /* --------------------------------------------------------
       LAST SELL
       -------------------------------------------------------- */

    appendText(
        row,
        "td",
        lastSaleDate
            ? formatDate(lastSaleDate)
            : "—"
    );


    /* --------------------------------------------------------
       STATUS
       -------------------------------------------------------- */

    const statusCell =
        document.createElement("td");

    const statusBadge =
        createElement(
            "span",
            "customer-status"
        );

    if (overduePaise > 0) {
        statusBadge.classList.add(
            "customer-status-overdue"
        );

        statusBadge.textContent =
            "Overdue";
    } else if (!active) {
        statusBadge.classList.add(
            "customer-status-inactive"
        );

        statusBadge.textContent =
            "Inactive";
    } else {
        statusBadge.classList.add(
            "customer-status-active"
        );

        statusBadge.textContent =
            "Active";
    }

    statusCell.appendChild(
        statusBadge
    );

    row.appendChild(
        statusCell
    );


    /* --------------------------------------------------------
       ACTION
       -------------------------------------------------------- */

    const actionCell =
        document.createElement("td");

    const actionLink =
        createElement(
            "a",
            "customer-action-link"
        );

    actionLink.textContent =
        "View";

    const customerNumber =
        String(
            customer.customerNumber ?? ""
        )
            .trim()
            .toUpperCase();

    if (customerNumber) {
        actionLink.href =
            `/customers/${encodeURIComponent(
                customerNumber
            )}`;
    } else {
        actionLink.href =
            "/customers";

        actionLink.setAttribute(
            "aria-disabled",
            "true"
        );
    }

    actionLink.setAttribute(
        "aria-label",
        `View ${getCustomerName(
            customer
        )}`
    );

    actionCell.appendChild(
        actionLink
    );

    row.appendChild(
        actionCell
    );


    return row;
}


/* ============================================================
   CUSTOMER TABLE
   ============================================================ */

function renderCustomers() {
    if (
        !elements.customersTableBody
    ) {
        return;
    }

    const summaries =
        state.customers
            .map(
                buildCustomerSummary
            )
            .filter(
                customerMatchesSearch
            )
            .filter(
                customerMatchesStatus
            )
            .sort(
                (a, b) => {
                    return getCustomerName(
                        a.customer
                    ).localeCompare(
                        getCustomerName(
                            b.customer
                        ),
                        "en-IN",
                        {
                            sensitivity: "base"
                        }
                    );
                }
            );


    /*
     * XSS-safe:
     * remove existing nodes and rebuild using textContent.
     */

    elements.customersTableBody.replaceChildren();


    if (
        elements.customersEmptyState
    ) {
        elements.customersEmptyState.hidden =
            summaries.length !== 0;
    }


    if (
        summaries.length === 0
    ) {
        if (
            elements.customersEmptyState
        ) {
            const hasCustomers =
                state.customers.length > 0;

            const title =
                elements.customersEmptyState
                    .querySelector("strong");

            const description =
                elements.customersEmptyState
                    .querySelector("span");

            if (title) {
                title.textContent =
                    hasCustomers
                        ? "No matching customers"
                        : "No customers yet";
            }

            if (description) {
                description.textContent =
                    hasCustomers
                        ? "Try changing the search or customer filter."
                        : "Add your first customer to start creating Sell invoices.";
            }
        }

        return;
    }


    const fragment =
        document.createDocumentFragment();

    for (
        const summary of summaries
    ) {
        fragment.appendChild(
            createCustomerRow(
                summary
            )
        );
    }

    elements.customersTableBody.appendChild(
        fragment
    );
}


/* ============================================================
   COMPLETE PAGE RENDER
   ============================================================ */

function renderPage() {
    renderSummary();
    renderCustomers();
}


/* ============================================================
   DATE FILTER
   ============================================================ */

function initializeDateFilter() {
    if (
        elements.billingDateFilter
    ) {
        const hasToday =
            Array.from(
                elements.billingDateFilter
                    .options
            ).some(
                (option) =>
                    option.value ===
                    DEFAULT_DATE_RANGE
            );

        if (hasToday) {
            elements.billingDateFilter.value =
                DEFAULT_DATE_RANGE;
        }
    }


    const today =
        new Date();

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


function bindDateFilterEvents() {
    elements.billingDateFilter
        ?.addEventListener(
            "change",
            () => {
                const selectedValue =
                    elements.billingDateFilter
                        .value;

                if (
                    selectedValue ===
                    "custom"
                ) {
                    if (
                        elements.customDatePanel
                    ) {
                        elements.customDatePanel.hidden =
                            false;
                    }

                    return;
                }

                if (
                    elements.customDatePanel
                ) {
                    elements.customDatePanel.hidden =
                        true;
                }

                state.dateRange =
                    selectedValue;

                renderPage();
            }
        );


    elements.applyCustomDateButton
        ?.addEventListener(
            "click",
            () => {
                const startDate =
                    parseDateInput(
                        elements.customStartDate
                            ?.value ?? ""
                    );

                const endDate =
                    parseDateInput(
                        elements.customEndDate
                            ?.value ?? ""
                    );

                if (
                    !startDate ||
                    !endDate
                ) {
                    window.alert(
                        "Please select both custom dates."
                    );

                    return;
                }

                if (
                    startDate >
                    endDate
                ) {
                    window.alert(
                        "Start date cannot be after end date."
                    );

                    return;
                }

                state.customStartDate =
                    startDate;

                state.customEndDate =
                    endDate;

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
   LOCAL CUSTOMER FILTERS
   ============================================================ */

function bindCustomerFilters() {
    elements.customerSearchInput
        ?.addEventListener(
            "input",
            () => {
                state.customerSearch =
                    elements.customerSearchInput
                        .value;

                renderCustomers();
            }
        );


    elements.customerStatusFilter
        ?.addEventListener(
            "change",
            () => {
                state.customerStatus =
                    elements.customerStatusFilter
                        .value;

                renderCustomers();
            }
        );
}


/* ============================================================
   MODAL
   ============================================================ */

function clearCustomerErrors() {
    const errorElements = [
        elements.customerNameError,
        elements.customerMobileError,
        elements.customerEmailError,
        elements.customerGstinError,
        elements.customerAddressError
    ];

    for (
        const errorElement of errorElements
    ) {
        if (errorElement) {
            errorElement.textContent =
                "";
        }
    }
}


function hideCustomerFormMessage() {
    if (
        !elements.customerFormMessage
    ) {
        return;
    }

    elements.customerFormMessage.hidden =
        true;

    elements.customerFormMessage.textContent =
        "";
}


function showCustomerFormMessage(
    message
) {
    if (
        !elements.customerFormMessage
    ) {
        return;
    }

    elements.customerFormMessage.textContent =
        message;

    elements.customerFormMessage.hidden =
        false;
}


function openAddCustomerModal() {
    if (
        !elements.addCustomerModal
    ) {
        return;
    }

    clearCustomerErrors();
    hideCustomerFormMessage();

    elements.addCustomerModal.hidden =
        false;

    document.body.classList.add(
        "modal-open"
    );

    requestAnimationFrame(
        () => {
            elements.customerName
                ?.focus();
        }
    );
}


function closeAddCustomerModal() {
    if (
        !elements.addCustomerModal
    ) {
        return;
    }

    elements.addCustomerModal.hidden =
        true;

    document.body.classList.remove(
        "modal-open"
    );

    clearCustomerErrors();
    hideCustomerFormMessage();
}


function bindCustomerModal() {
    elements.addCustomerButton
        ?.addEventListener(
            "click",
            openAddCustomerModal
        );


    elements.mobileAddCustomerButton
        ?.addEventListener(
            "click",
            openAddCustomerModal
        );


    elements.closeAddCustomerModal
        ?.addEventListener(
            "click",
            closeAddCustomerModal
        );


    elements.cancelAddCustomerButton
        ?.addEventListener(
            "click",
            closeAddCustomerModal
        );


    elements.addCustomerModal
        ?.addEventListener(
            "click",
            (event) => {
                if (
                    event.target ===
                    elements.addCustomerModal
                ) {
                    closeAddCustomerModal();
                }
            }
        );


    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape" &&
                elements.addCustomerModal &&
                !elements.addCustomerModal.hidden
            ) {
                closeAddCustomerModal();
            }
        }
    );
}


/* ============================================================
   CUSTOMER FORM VALIDATION
   ============================================================ */

function validateCustomerForm() {
    clearCustomerErrors();
    hideCustomerFormMessage();

    let valid = true;


    const name =
        elements.customerName
            ?.value
            .trim() ?? "";

    const mobile =
        elements.customerMobile
            ?.value
            .trim() ?? "";

    const email =
        elements.customerEmail
            ?.value
            .trim() ?? "";

    const gstin =
        elements.customerGstin
            ?.value
            .trim()
            .toUpperCase() ?? "";

    const address =
        elements.customerAddress
            ?.value
            .trim() ?? "";


    /* Name */

    if (!name) {
        if (
            elements.customerNameError
        ) {
            elements.customerNameError.textContent =
                "Customer name is required.";
        }

        valid = false;
    } else if (
        name.length > 120
    ) {
        if (
            elements.customerNameError
        ) {
            elements.customerNameError.textContent =
                "Customer name is too long.";
        }

        valid = false;
    }


    /* Mobile */

    if (mobile) {
        const normalizedMobile =
            mobile.replace(
                /[\s()+-]/g,
                ""
            );

        if (
            !/^\d{7,15}$/.test(
                normalizedMobile
            )
        ) {
            if (
                elements.customerMobileError
            ) {
                elements.customerMobileError.textContent =
                    "Enter a valid mobile number.";
            }

            valid = false;
        }
    }


    /* Email */

    if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        )
    ) {
        if (
            elements.customerEmailError
        ) {
            elements.customerEmailError.textContent =
                "Enter a valid email address.";
        }

        valid = false;
    }


    /* GSTIN */

    if (
        gstin &&
        !/^[0-9A-Z]{15}$/.test(
            gstin
        )
    ) {
        if (
            elements.customerGstinError
        ) {
            elements.customerGstinError.textContent =
                "GSTIN must contain 15 letters/numbers.";
        }

        valid = false;
    }


    /* Address */

    if (
        address.length > 500
    ) {
        if (
            elements.customerAddressError
        ) {
            elements.customerAddressError.textContent =
                "Address is too long.";
        }

        valid = false;
    }


    if (!valid) {
        return null;
    }


    return {
        name,
        mobile,
        email,
        gstin,
        address
    };
}


/* ============================================================
   FORM LOADING
   ============================================================ */

function setCustomerFormLoading(
    loading
) {
    if (
        elements.saveCustomerButton
    ) {
        elements.saveCustomerButton.disabled =
            loading;
    }

    if (
        elements.cancelAddCustomerButton
    ) {
        elements.cancelAddCustomerButton.disabled =
            loading;
    }

    if (
        elements.saveCustomerButtonText
    ) {
        elements.saveCustomerButtonText.textContent =
            loading
                ? "Saving..."
                : "Save Customer";
    }

    if (
        elements.saveCustomerSpinner
    ) {
        elements.saveCustomerSpinner.hidden =
            !loading;
    }
}


/* ============================================================
   CREATE CUSTOMER

   IMPORTANT:
   No direct browser Firestore write.

   The callable Cloud Function is the trusted write boundary.
   ============================================================ */

async function createCustomer(
    customerData
) {
    const createCustomerCallable =
        httpsCallable(
            functions,
            "createCustomer"
        );

    return createCustomerCallable(
        customerData
    );
}


/* ============================================================
   FORM SUBMIT
   ============================================================ */

async function handleCustomerSubmit(
    event
) {
    event.preventDefault();

    const customerData =
        validateCustomerForm();

    if (!customerData) {
        return;
    }


    setCustomerFormLoading(true);


    try {
        const result =
            await createCustomer(
                customerData
            );

        if (
            result?.data?.success ===
            false
        ) {
            throw new Error(
                "Customer creation failed."
            );
        }


        elements.addCustomerForm
            ?.reset();


        /*
         * Firestore onSnapshot will update the table
         * automatically after the callable writes the customer.
         */

        closeAddCustomerModal();

    } catch (error) {
        console.error(
            "Create customer failed:",
            error
        );


        let message =
            "Unable to save customer. Please try again.";


        switch (error?.code) {
            case "functions/unauthenticated":
                message =
                    "Your session has expired. Please sign in again.";
                break;

            case "functions/permission-denied":
                message =
                    "You are not authorized to add customers.";
                break;

            case "functions/invalid-argument":
                message =
                    error?.message ||
                    "Please check the customer details.";
                break;

            case "functions/already-exists":
                message =
                    error?.message ||
                    "This customer already exists.";
                break;

            default:
                break;
        }


        showCustomerFormMessage(
            message
        );

    } finally {
        setCustomerFormLoading(false);
    }
}


function bindCustomerForm() {
    elements.addCustomerForm
        ?.addEventListener(
            "submit",
            handleCustomerSubmit
        );


    elements.customerGstin
        ?.addEventListener(
            "input",
            () => {
                const currentValue =
                    elements.customerGstin
                        .value;

                elements.customerGstin.value =
                    currentValue
                        .toUpperCase()
                        .replace(
                            /[^0-9A-Z]/g,
                            ""
                        )
                        .slice(0, 15);
            }
        );
}


/* ============================================================
   GLOBAL SEARCH
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
        elements.globalSearchResultsContent
            .replaceChildren();
    }
}


function buildGlobalSearchResults(
    searchValue
) {
    const search =
        normalizeText(searchValue);

    const compactSearch =
        normalizeCompactText(
            searchValue
        );

    if (!search) {
        return [];
    }


    const results = [];


    /* Customers */

    for (
        const customer of state.customers
    ) {
        const summary =
            buildCustomerSummary(
                customer
            );

        const values = [
            getCustomerName(customer),
            getCustomerMobile(customer),
            getCustomerEmail(customer),
            getCustomerGstin(customer),
            formatMoney(
                summary.receivablePaise
            )
        ];

        const matches =
            values.some(
                (value) => {
                    return (
                        normalizeText(value)
                            .includes(search) ||
                        normalizeCompactText(value)
                            .includes(
                                compactSearch
                            )
                    );
                }
            );

        if (matches) {
            results.push({
                type: "Customer",
                title:
                    getCustomerName(
                        customer
                    ),
                subtitle:
                    getCustomerMobile(
                        customer
                    ) ||
                    getCustomerEmail(
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


    /* Sales */

    for (
        const sale of state.sales
    ) {
        const invoiceNumber =
            String(
                sale.invoiceNumber ??
                ""
            );

        const customerName =
            String(
                sale.customerSnapshot
                    ?.name ??
                sale.customerName ??
                ""
            );

        const status =
            String(
                sale.status ??
                ""
            );

        const amount =
            formatMoney(
                getSaleTotalPaise(
                    sale
                )
            );

        const values = [
            invoiceNumber,
            customerName,
            status,
            amount
        ];

        const matches =
            values.some(
                (value) => {
                    return (
                        normalizeText(value)
                            .includes(search) ||
                        normalizeCompactText(value)
                            .includes(
                                compactSearch
                            )
                    );
                }
            );

        if (matches) {
            results.push({
                type: "Sell",
                title:
                    invoiceNumber ||
                    "Sell Invoice",

                subtitle:
                    customerName ||
                    amount,

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


    return results.slice(
        0,
        8
    );
}


function renderGlobalSearchResults(
    searchValue
) {
    if (
        !elements.globalSearchResults ||
        !elements.globalSearchResultsContent
    ) {
        return;
    }


    const results =
        buildGlobalSearchResults(
            searchValue
        );


    elements.globalSearchResultsContent
        .replaceChildren();


    if (
        !normalizeText(searchValue)
    ) {
        hideGlobalSearchResults();
        return;
    }


    elements.globalSearchResults.hidden =
        false;


    if (
        results.length === 0
    ) {
        const empty =
            createElement(
                "div",
                "search-result-empty"
            );

        empty.textContent =
            "No matching customers or Sell records.";

        elements.globalSearchResultsContent
            .appendChild(empty);

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


        const type =
            createElement(
                "span",
                "search-result-type"
            );

        type.textContent =
            result.type;


        link.append(
            content,
            type
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
                renderGlobalSearchResults(
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
                    event.key ===
                    "Escape"
                ) {
                    elements.globalSearchInput
                        .blur();

                    hideGlobalSearchResults();
                }
            }
        );


    document.addEventListener(
        "click",
        (event) => {
            if (
                !elements.globalSearchResults ||
                !elements.globalSearchInput
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

            const clickedSearch =
                elements.globalSearchInput
                    .contains(target);

            const clickedResults =
                elements.globalSearchResults
                    .contains(target);

            if (
                !clickedSearch &&
                !clickedResults
            ) {
                hideGlobalSearchResults();
            }
        }
    );
}


/* ============================================================
   SIDEBAR
   ============================================================ */

function openSidebar() {
    if (
        !elements.sidebar
    ) {
        return;
    }

    elements.sidebar.classList.add(
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
    if (
        !elements.sidebar
    ) {
        return;
    }

    elements.sidebar.classList.remove(
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

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error(
            "Logout failed:",
            error
        );
    } finally {
        window.location.replace(
            "./login"
        );
    }
}


function bindLogout() {
    elements.logoutButton
        ?.addEventListener(
            "click",
            handleLogout
        );
}


/* ============================================================
   REAL-TIME FIRESTORE
   ============================================================ */

function mapSnapshot(snapshot) {
    return snapshot.docs.map(
        (documentSnapshot) => {
            return {
                id:
                    documentSnapshot.id,

                ...documentSnapshot.data()
            };
        }
    );
}


function handleRealtimeError(
    source,
    error
) {
    console.error(
        `${source} realtime listener failed:`,
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
                        "./login"
                    );
                }
            );
    }
}


function startRealtimeListeners() {
    if (
        state.listenersStarted
    ) {
        return;
    }

    state.listenersStarted =
        true;


    /* Customers */

    const customersQuery =
        query(
            getBusinessSubcollection(
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

                renderPage();
            },

            (error) => {
                handleRealtimeError(
                    "Customers",
                    error
                );
            }
        );


    /* Sales */

    const salesQuery =
        query(
            getBusinessSubcollection(
                "sales"
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


    /* Sale payments */

    const paymentsQuery =
        query(
            getBusinessSubcollection(
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
   AUTHENTICATION
   ============================================================ */

function initializeAuthentication() {
    onAuthStateChanged(
        auth,
        (user) => {
            if (!user) {
                window.location.replace(
                    "./login"
                );

                return;
            }

            startRealtimeListeners();
        },

        (error) => {
            console.error(
                "Authentication state error:",
                error
            );

            window.location.replace(
                "./login"
            );
        }
    );
}


/* ============================================================
   CLEANUP
   ============================================================ */

function cleanup() {
    state.unsubscribeCustomers?.();
    state.unsubscribeSales?.();
    state.unsubscribePayments?.();

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
   INITIALIZE
   ============================================================ */

function initializeCustomersPage() {
    /*
     * This does not depend on Firebase, so the date appears
     * immediately instead of waiting for authentication.
     */

    renderCurrentDate();

    initializeDateFilter();

    bindDateFilterEvents();
    bindCustomerFilters();

    bindCustomerModal();
    bindCustomerForm();

    bindGlobalSearch();
    bindSidebar();
    bindLogout();

    /*
     * Initial zero/empty render.
     */

    renderPage();

    /*
     * Authenticated realtime data starts after Firebase Auth
     * resolves the current session.
     */

    initializeAuthentication();
}


initializeCustomersPage();
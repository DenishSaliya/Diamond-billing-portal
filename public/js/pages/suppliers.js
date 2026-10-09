/* ============================================================
   OM MARUTI DIAMOND
   SUPPLIERS PAGE
   ------------------------------------------------------------
   - Supplier directory
   - Buy / payment aggregation
   - Current payable + overdue
   - Date-filtered supplier activity
   - Secure supplier creation via Cloud Function
   - Dashboard-style global search
   - Responsive sidebar / mobile navigation

   SECURITY:
   - Auth required
   - Supplier creation uses createSupplier callable
   - Financial data is READ ONLY here
   - DOM values use textContent / createElement
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

const MAX_SEARCH_RESULTS = 12;


/* ============================================================
   FIRESTORE REFERENCES
   ============================================================ */

const businessCollection = (
    collectionName
) => collection(
    db,
    "businesses",
    BUSINESS_ID,
    collectionName
);


/* ============================================================
   STATE
   ============================================================ */

const state = {

    authenticated: false,
    submitting: false,
    listenersStarted: false,

    suppliers: [],
    purchases: [],
    purchasePayments: [],

    customers: [],
    sales: [],

    dateRange: {
        type: "today",
        start: null,
        end: null
    },

    unsubscribers: []
};


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


    /* Date filter */

    billingDateFilter:
        document.getElementById(
            "billingDateFilter"
        ),

    customDatePanel:
        document.getElementById(
            "customDatePanel"
        ),

    customStartDate:
        document.getElementById(
            "customStartDate"
        ),

    customEndDate:
        document.getElementById(
            "customEndDate"
        ),

    cancelCustomDateButton:
        document.getElementById(
            "cancelCustomDateButton"
        ),

    applyCustomDateButton:
        document.getElementById(
            "applyCustomDateButton"
        ),


    /* Summary */

    totalSuppliersValue:
        document.getElementById(
            "totalSuppliersValue"
        ),

    totalSuppliersMeta:
        document.getElementById(
            "totalSuppliersMeta"
        ),

    activeSuppliersValue:
        document.getElementById(
            "activeSuppliersValue"
        ),

    activeSuppliersMeta:
        document.getElementById(
            "activeSuppliersMeta"
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


    /* Supplier directory */

    supplierSearchInput:
        document.getElementById(
            "supplierSearchInput"
        ),

    supplierStatusFilter:
        document.getElementById(
            "supplierStatusFilter"
        ),

    suppliersTableBody:
        document.getElementById(
            "suppliersTableBody"
        ),

    suppliersMobileList:
        document.getElementById(
            "suppliersMobileList"
        ),

    suppliersLoadingState:
        document.getElementById(
            "suppliersLoadingState"
        ),

    suppliersEmptyState:
        document.getElementById(
            "suppliersEmptyState"
        ),


    /* Add Supplier */

    addSupplierButton:
        document.getElementById(
            "addSupplierButton"
        ),

    addSupplierModal:
        document.getElementById(
            "addSupplierModal"
        ),

    closeAddSupplierModalButton:
        document.getElementById(
            "closeAddSupplierModalButton"
        ),

    cancelAddSupplierButton:
        document.getElementById(
            "cancelAddSupplierButton"
        ),

    addSupplierForm:
        document.getElementById(
            "addSupplierForm"
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

    supplierGstin:
        document.getElementById(
            "supplierGstin"
        ),

    supplierPan:
        document.getElementById(
            "supplierPan"
        ),

    supplierAddress:
        document.getElementById(
            "supplierAddress"
        ),

    supplierNameError:
        document.getElementById(
            "supplierNameError"
        ),

    supplierMobileError:
        document.getElementById(
            "supplierMobileError"
        ),

    supplierEmailError:
        document.getElementById(
            "supplierEmailError"
        ),

    supplierGstinError:
        document.getElementById(
            "supplierGstinError"
        ),

    supplierPanError:
        document.getElementById(
            "supplierPanError"
        ),

    supplierAddressError:
        document.getElementById(
            "supplierAddressError"
        ),

    addSupplierFormMessage:
        document.getElementById(
            "addSupplierFormMessage"
        ),

    saveSupplierButton:
        document.getElementById(
            "saveSupplierButton"
        ),

    saveSupplierButtonText:
        document.getElementById(
            "saveSupplierButtonText"
        ),

    saveSupplierSpinner:
        document.getElementById(
            "saveSupplierSpinner"
        ),


    /* Mobile create */

    mobileNewTransactionButton:
        document.getElementById(
            "mobileNewTransactionButton"
        )



    


        
};


/* ============================================================
   GENERIC HELPERS
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

function formatMoney(paise) {
    const safe =
        Number.isFinite(
            Number(paise)
        )
            ? Number(paise)
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
        safe / 100
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


function startOfDay(date) {

    const result =
        new Date(date);

    result.setHours(
        0,
        0,
        0,
        0
    );

    return result;
}


function endOfDay(date) {

    const result =
        new Date(date);

    result.setHours(
        23,
        59,
        59,
        999
    );

    return result;
}


function addDays(
    date,
    days
) {

    const result =
        new Date(date);

    result.setDate(
        result.getDate() +
        days
    );

    return result;
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
   DATE FILTER
   ============================================================ */

function calculateDateRange(
    type,
    customStart = "",
    customEnd = ""
) {

    const now =
        new Date();


    switch (type) {

        case "today":

            return {
                type,
                start:
                    startOfDay(now),
                end:
                    endOfDay(now)
            };


        case "yesterday": {

            const yesterday =
                addDays(
                    now,
                    -1
                );

            return {
                type,
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


        case "7days":

            return {
                type,
                start:
                    startOfDay(
                        addDays(
                            now,
                            -6
                        )
                    ),
                end:
                    endOfDay(now)
            };


        case "30days":

            return {
                type,
                start:
                    startOfDay(
                        addDays(
                            now,
                            -29
                        )
                    ),
                end:
                    endOfDay(now)
            };


        case "custom": {

            const start =
                timestampToDate(
                    customStart
                );

            const end =
                timestampToDate(
                    customEnd
                );

            if (
                !start ||
                !end
            ) {
                return null;
            }

            return {
                type,
                start:
                    startOfDay(start),
                end:
                    endOfDay(end)
            };
        }


        case "all":
        default:

            return {
                type: "all",
                start: null,
                end: null
            };
    }
}


function dateMatchesRange(
    value,
    range = state.dateRange
) {

    if (
        range.type === "all"
    ) {
        return true;
    }


    const date =
        timestampToDate(
            value
        );

    if (!date) {
        return false;
    }


    return (
        date >= range.start &&
        date <= range.end
    );
}


/* ============================================================
   PURCHASE STATUS HELPERS
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


    const total =
        Math.max(
            0,
            safePaise(
                purchase.grandTotalPaise
            )
        );

    const paid =
        Math.max(
            0,
            safePaise(
                purchase.paidPaise
            )
        );


    return Math.max(
        0,
        total - paid
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
        endOfDay(dueDate) <
        startOfDay(
            new Date()
        )
    );
}


/* ============================================================
   SUPPLIER LOOKUPS
   ============================================================ */

function findSupplier(
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


/* ============================================================
   HISTORICAL PARTY NAMES
   ============================================================ */

function getPurchaseSupplierName(
    purchase
) {

    const snapshot =
        purchase.supplierSnapshot;

    const snapshotName =
        cleanText(
            snapshot?.name ||
            snapshot?.businessName ||
            snapshot?.companyName
        );


    if (snapshotName) {
        return snapshotName;
    }


    const supplier =
        findSupplier(
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
        sale.billTo;

    const snapshotName =
        cleanText(
            snapshot?.name ||
            snapshot?.businessName ||
            snapshot?.companyName
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
   SUPPLIER PURCHASES
   ============================================================ */

function getSupplierPurchases(
    supplierId
) {

    return state.purchases.filter(
        (purchase) =>
            purchase.supplierId ===
            supplierId &&
            isFinancialPurchase(
                purchase
            )
    );
}


function getSupplierPurchasesForSelectedPeriod(
    supplierId
) {

    return getSupplierPurchases(
        supplierId
    ).filter(
        (purchase) =>
            dateMatchesRange(
                purchase.purchaseDate
            )
    );
}


/* ============================================================
   PAYMENT AGGREGATION

   Payment-date based so "Paid" follows the selected date range.
   ============================================================ */

function getSupplierPaymentsForSelectedPeriod(
    supplierId
) {

    return state.purchasePayments.filter(
        (payment) => {

            if (
                payment.supplierId !==
                supplierId
            ) {
                return false;
            }


            return dateMatchesRange(
                payment.paymentDate
            );
        }
    );
}


function sumPaymentAmount(
    payments
) {

    return payments.reduce(
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
}


/* ============================================================
   SUPPLIER FINANCIAL SUMMARY
   ============================================================ */

function calculateSupplierStats(
    supplier
) {

    const purchases =
        getSupplierPurchases(
            supplier.id
        );

    const periodPurchases =
        getSupplierPurchasesForSelectedPeriod(
            supplier.id
        );

    const periodPayments =
        getSupplierPaymentsForSelectedPeriod(
            supplier.id
        );


    let totalBuyPaise = 0;

    let payablePaise = 0;

    let overduePaise = 0;

    let overdueCount = 0;

    let lastPurchase = null;


    for (
        const purchase of purchases
    ) {

        const balance =
            getPurchaseBalance(
                purchase
            );


        payablePaise +=
            balance;


        if (
            isPurchaseOverdue(
                purchase
            )
        ) {

            overduePaise +=
                balance;

            overdueCount += 1;
        }


        const purchaseDate =
            timestampToDate(
                purchase.purchaseDate
            );


        if (
            purchaseDate &&
            (
                !lastPurchase ||
                purchaseDate >
                lastPurchase.date
            )
        ) {

            lastPurchase = {
                date: purchaseDate,
                purchase
            };
        }
    }


    for (
        const purchase of periodPurchases
    ) {

        totalBuyPaise +=
            Math.max(
                0,
                safePaise(
                    purchase.grandTotalPaise
                )
            );
    }


    const paidPaise =
        sumPaymentAmount(
            periodPayments
        );


    return {
        totalBuyPaise,
        paidPaise,

        payablePaise,
        overduePaise,
        overdueCount,

        lastPurchase:
            lastPurchase?.purchase ||
            null
    };
}


/* ============================================================
   SUPPLIER ACTIVE STATUS
   ============================================================ */

function supplierIsActive(
    supplier
) {

    /*
     * Explicit inactive status wins.
     * Existing records without a status remain active.
     */

    const status =
        normalizeSearchText(
            supplier.status
        );


    return (
        status !== "inactive" &&
        supplier.active !== false
    );
}


/* ============================================================
   SUMMARY CARDS
   ============================================================ */

function renderSummary() {

    const totalSuppliers =
        state.suppliers.length;

    const activeSuppliers =
        state.suppliers.filter(
            supplierIsActive
        ).length;


    let payablePaise = 0;

    let overduePaise = 0;

    let overduePurchases = 0;


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


        const balance =
            getPurchaseBalance(
                purchase
            );


        payablePaise +=
            balance;


        if (
            isPurchaseOverdue(
                purchase
            )
        ) {

            overduePaise +=
                balance;

            overduePurchases +=
                1;
        }
    }


    if (
        elements.totalSuppliersValue
    ) {
        elements.totalSuppliersValue
            .textContent =
            String(
                totalSuppliers
            );
    }


    if (
        elements.totalSuppliersMeta
    ) {
        elements.totalSuppliersMeta
            .textContent =
            totalSuppliers === 1
                ? "1 supplier account"
                : `${totalSuppliers} supplier accounts`;
    }


    if (
        elements.activeSuppliersValue
    ) {
        elements.activeSuppliersValue
            .textContent =
            String(
                activeSuppliers
            );
    }


    if (
        elements.activeSuppliersMeta
    ) {
        elements.activeSuppliersMeta
            .textContent =
            activeSuppliers === 1
                ? "1 active account"
                : `${activeSuppliers} active accounts`;
    }


    if (
        elements.supplierPayableValue
    ) {
        elements.supplierPayableValue
            .textContent =
            formatMoney(
                payablePaise
            );
    }


    if (
        elements.supplierPayableMeta
    ) {
        elements.supplierPayableMeta
            .textContent =
            "Current outstanding";
    }


    if (
        elements.supplierOverdueValue
    ) {
        elements.supplierOverdueValue
            .textContent =
            formatMoney(
                overduePaise
            );
    }


    if (
        elements.supplierOverdueMeta
    ) {
        elements.supplierOverdueMeta
            .textContent =
            overduePurchases === 1
                ? "1 overdue purchase"
                : `${overduePurchases} overdue purchases`;
    }
}


/* ============================================================
   SUPPLIER DISPLAY STATUS
   ============================================================ */

function getSupplierDisplayStatus(
    supplier,
    stats
) {

    if (
        !supplierIsActive(
            supplier
        )
    ) {

        return {
            key: "inactive",
            label: "Inactive"
        };
    }


    if (
        stats.overduePaise > 0
    ) {

        return {
            key: "overdue",
            label: "Overdue"
        };
    }


    if (
        stats.payablePaise > 0
    ) {

        return {
            key: "payable",
            label: "Payable"
        };
    }


    return {
        key: "active",
        label: "Active"
    };
}


/* ============================================================
   LOCAL SUPPLIER FILTER
   ============================================================ */

function supplierMatchesSearch(
    supplier,
    search
) {

    if (!search) {
        return true;
    }


    return containsSearch(
        search,
        
        supplier.supplierNumber,
        supplier.name,
        supplier.mobile,
        supplier.email,
        supplier.gstin,
        supplier.pan,
        supplier.address
    );
}


function supplierMatchesStatus(
    supplier,
    stats,
    filter
) {

    if (
        !filter ||
        filter === "all"
    ) {
        return true;
    }


    if (
        filter === "active"
    ) {
        return supplierIsActive(
            supplier
        );
    }


    if (
        filter === "inactive"
    ) {
        return !supplierIsActive(
            supplier
        );
    }


    if (
        filter === "payable"
    ) {
        return (
            stats.payablePaise >
            0
        );
    }


    if (
        filter === "overdue"
    ) {
        return (
            stats.overduePaise >
            0
        );
    }


    return true;
}


function getFilteredSuppliers() {

    const search =
        normalizeSearchText(
            elements
                .supplierSearchInput
                ?.value
        );

    const status =
        normalizeSearchText(
            elements
                .supplierStatusFilter
                ?.value ||
            "all"
        );


    return state.suppliers
        .map(
            (supplier) => ({
                supplier,

                stats:
                    calculateSupplierStats(
                        supplier
                    )
            })
        )
        .filter(
            ({
                supplier,
                stats
            }) =>
                supplierMatchesSearch(
                    supplier,
                    search
                ) &&
                supplierMatchesStatus(
                    supplier,
                    stats,
                    status
                )
        )
        .sort(
            (a, b) => {

                if (
                    b.stats.payablePaise !==
                    a.stats.payablePaise
                ) {

                    return (
                        b.stats.payablePaise -
                        a.stats.payablePaise
                    );
                }


                return cleanText(
                    a.supplier.name
                ).localeCompare(
                    cleanText(
                        b.supplier.name
                    ),
                    "en",
                    {
                        sensitivity:
                            "base"
                    }
                );
            }
        );
}


/* ============================================================
   SUPPLIER ROUTE
   ============================================================ */

function openSupplier(
    supplier
) {

    const supplierNumber =
        cleanText(
            supplier?.supplierNumber
        ).toUpperCase();

    if (!supplierNumber) {
        return;
    }

    window.location.href =
        `/suppliers/${encodeURIComponent(
            supplierNumber
        )}`;
}


/* ============================================================
   TABLE HELPERS
   ============================================================ */

function createTableCell(
    value,
    className = ""
) {

    const cell =
        createElement(
            "td",
            className,
            value
        );

    return cell;
}


function createSupplierIdentity(
    supplier
) {

    const wrapper =
        createElement(
            "div",
            "supplier-cell"
        );


    const avatar =
        createElement(
            "span",
            "supplier-avatar",
            getInitials(
                supplier.name
            )
        );


    const content =
        createElement(
            "div",
            "supplier-cell-content"
        );


    const name =
        createElement(
            "strong",
            "supplier-name",
            cleanText(
                supplier.name
            ) ||
            "Unnamed Supplier"
        );


    const email =
        createElement(
            "span",
            "supplier-email",
            cleanText(
                supplier.email
            ) ||
            "No email"
        );


    content.append(
        name,
        email
    );


    wrapper.append(
        avatar,
        content
    );


    return wrapper;
}


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
                word.charAt(0)
                    .toUpperCase()
        )
        .join("");
}


function createStatusBadge(
    status
) {

    const badge =
        createElement(
            "span",
            "supplier-status-badge",
            status.label
        );


    badge.dataset.status =
        status.key;


    return badge;
}


/* ============================================================
   DESKTOP TABLE
   ============================================================ */

function renderSupplierTable(
    suppliers
) {

    const body =
        elements.suppliersTableBody;

    if (!body) {
        return;
    }


    body.replaceChildren();


    const fragment =
        document.createDocumentFragment();


    for (
        const {
            supplier,
            stats
        } of suppliers
    ) {

        const row =
            document.createElement(
                "tr"
            );


        row.tabIndex = 0;

        row.dataset.supplierId =
            supplier.id;


        row.addEventListener(
            "click",
            () =>
                openSupplier(
                    supplier
                )
        );


        row.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                        "Enter" ||
                    event.key ===
                        " "
                ) {

                    event.preventDefault();

                   openSupplier(
                        supplier
                    );
                }
            }
        );


        /* Supplier */

        const supplierCell =
            document.createElement(
                "td"
            );

        supplierCell.appendChild(
            createSupplierIdentity(
                supplier
            )
        );

        row.appendChild(
            supplierCell
        );


        /* Mobile */

        row.appendChild(
            createTableCell(
                cleanText(
                    supplier.mobile
                ) ||
                "—"
            )
        );


        /* GSTIN */

        row.appendChild(
            createTableCell(
                cleanText(
                    supplier.gstin
                ) ||
                "—"
            )
        );


        /* Total Buy */

        row.appendChild(
            createTableCell(
                formatMoney(
                    stats.totalBuyPaise
                ),
                "supplier-money"
            )
        );


        /* Paid */

        row.appendChild(
            createTableCell(
                formatMoney(
                    stats.paidPaise
                ),
                "supplier-money"
            )
        );


        /* Payable */

        row.appendChild(
            createTableCell(
                formatMoney(
                    stats.payablePaise
                ),
                "supplier-money supplier-payable"
            )
        );


        /* Last Buy */

        row.appendChild(
            createTableCell(
                stats.lastPurchase
                    ? formatDate(
                        stats
                            .lastPurchase
                            .purchaseDate
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
            createStatusBadge(
                getSupplierDisplayStatus(
                    supplier,
                    stats
                )
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


        const actionButton =
            createElement(
                "button",
                "supplier-view-button",
                "View"
            );

        actionButton.type =
            "button";


        actionButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                openSupplier(supplier);
            }
        );


        actionCell.appendChild(
            actionButton
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
   MOBILE SUPPLIER CARDS
   ============================================================ */

function createMobileMeta(
    label,
    value,
    className = ""
) {

    const item =
        createElement(
            "div",
            `supplier-mobile-meta-item ${className}`
                .trim()
        );


    const labelElement =
        createElement(
            "span",
            "supplier-mobile-meta-label",
            label
        );


    const valueElement =
        createElement(
            "strong",
            "supplier-mobile-meta-value",
            value
        );


    item.append(
        labelElement,
        valueElement
    );


    return item;
}


function renderSupplierMobileList(
    suppliers
) {

    const container =
        elements.suppliersMobileList;

    if (!container) {
        return;
    }


    container.replaceChildren();


    const fragment =
        document.createDocumentFragment();


    for (
        const {
            supplier,
            stats
        } of suppliers
    ) {

        const status =
            getSupplierDisplayStatus(
                supplier,
                stats
            );


        const card =
            createElement(
                "article",
                "supplier-mobile-card"
            );


        card.tabIndex = 0;


        card.addEventListener(
            "click",
            () =>
              openSupplier(supplier)
        );


        card.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                        "Enter" ||
                    event.key ===
                        " "
                ) {

                    event.preventDefault();

                    openSupplier(supplier);
                }
            }
        );


        /* Header */

        const header =
            createElement(
                "div",
                "supplier-mobile-card-header"
            );


        const identity =
            createElement(
                "div",
                "supplier-mobile-identity"
            );


        const avatar =
            createElement(
                "span",
                "supplier-avatar",
                getInitials(
                    supplier.name
                )
            );


        const title =
            createElement(
                "div",
                "supplier-mobile-title"
            );


        title.append(
            createElement(
                "strong",
                "",
                cleanText(
                    supplier.name
                ) ||
                "Unnamed Supplier"
            ),

            createElement(
                "span",
                "",
                cleanText(
                    supplier.mobile
                ) ||
                "No mobile"
            )
        );


        identity.append(
            avatar,
            title
        );


        header.append(
            identity,
            createStatusBadge(
                status
            )
        );


        /* Financial grid */

        const financials =
            createElement(
                "div",
                "supplier-mobile-financials"
            );


        financials.append(
            createMobileMeta(
                "Total Buy",
                formatMoney(
                    stats.totalBuyPaise
                )
            ),

            createMobileMeta(
                "Paid",
                formatMoney(
                    stats.paidPaise
                )
            ),

            createMobileMeta(
                "Payable",
                formatMoney(
                    stats.payablePaise
                ),
                "supplier-mobile-payable"
            ),

            createMobileMeta(
                "Last Buy",
                stats.lastPurchase
                    ? formatDate(
                        stats
                            .lastPurchase
                            .purchaseDate
                    )
                    : "—"
            )
        );


        const footer =
            createElement(
                "div",
                "supplier-mobile-card-footer"
            );


        footer.appendChild(
            createElement(
                "span",
                "",
                cleanText(
                    supplier.gstin
                )
                    ? `GSTIN ${cleanText(
                        supplier.gstin
                    )}`
                    : "GSTIN —"
            )
        );


        const view =
            createElement(
                "span",
                "supplier-mobile-view",
                "View account →"
            );


        footer.appendChild(
            view
        );


        card.append(
            header,
            financials,
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


/* ============================================================
   DIRECTORY RENDER
   ============================================================ */

function renderSupplierDirectory() {

    const filtered =
        getFilteredSuppliers();


    renderSupplierTable(
        filtered
    );

    renderSupplierMobileList(
        filtered
    );


    if (
        elements.suppliersLoadingState
    ) {
        elements.suppliersLoadingState
            .hidden =
            true;
    }


    if (
        elements.suppliersEmptyState
    ) {

        elements.suppliersEmptyState
            .hidden =
            filtered.length !==
            0;
    }
}


/* ============================================================
   MAIN RENDER
   ============================================================ */

function renderPage() {

    renderSummary();

    renderSupplierDirectory();

    refreshSearchIfOpen();
}


/* ============================================================
   ADD SUPPLIER MODAL
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


function clearSupplierFormErrors() {

    clearFieldError(
        elements.supplierNameError
    );

    clearFieldError(
        elements.supplierMobileError
    );

    clearFieldError(
        elements.supplierEmailError
    );

    clearFieldError(
        elements.supplierGstinError
    );

    clearFieldError(
        elements.supplierPanError
    );

    clearFieldError(
        elements.supplierAddressError
    );


    hideSupplierFormMessage();
}


function showSupplierFormMessage(
    message,
    type = "error"
) {

    const target =
        elements.addSupplierFormMessage;

    if (!target) {
        return;
    }


    target.textContent =
        message;

    target.dataset.type =
        type;

    target.hidden =
        false;
}


function hideSupplierFormMessage() {

    const target =
        elements.addSupplierFormMessage;

    if (!target) {
        return;
    }


    target.textContent =
        "";

    target.removeAttribute(
        "data-type"
    );

    target.hidden =
        true;
}


function resetSupplierForm() {

    elements.addSupplierForm
        ?.reset();

    clearSupplierFormErrors();
}


function openAddSupplierModal() {

    if (
        !elements.addSupplierModal
    ) {
        return;
    }


    resetSupplierForm();


    elements.addSupplierModal.hidden =
        false;


    document.body.classList.add(
        "modal-open"
    );


    window.setTimeout(
        () => {
            elements.supplierName
                ?.focus();
        },
        0
    );
}


function closeAddSupplierModal() {

    if (
        state.submitting
    ) {
        return;
    }


    if (
        elements.addSupplierModal
    ) {
        elements.addSupplierModal.hidden =
            true;
    }


    document.body.classList.remove(
        "modal-open"
    );


    resetSupplierForm();
}


/* ============================================================
   SUPPLIER VALIDATION
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


function validateSupplierForm() {

    clearSupplierFormErrors();


    const name =
        cleanText(
            elements.supplierName
                ?.value
        );

    const mobile =
        cleanText(
            elements.supplierMobile
                ?.value
        );

    const email =
        cleanText(
            elements.supplierEmail
                ?.value
        );

    const gstin =
        normalizeGstin(
            elements.supplierGstin
                ?.value
        );

    const pan =
        normalizePan(
            elements.supplierPan
                ?.value
        );

    const address =
        cleanText(
            elements.supplierAddress
                ?.value
        );


    let valid = true;


    if (!name) {

        showFieldError(
            elements.supplierNameError,
            "Supplier name is required."
        );

        valid = false;
    }


    if (
        email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email)
    ) {

        showFieldError(
            elements.supplierEmailError,
            "Enter a valid email address."
        );

        valid = false;
    }


    /*
     * GSTIN format:
     * 2 digits + PAN + entity + Z + checksum.
     *
     * Backend remains authoritative.
     */

    if (
        gstin &&
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
            .test(gstin)
    ) {

        showFieldError(
            elements.supplierGstinError,
            "Enter a valid 15-character GSTIN."
        );

        valid = false;
    }


    if (
        pan &&
        !/^[A-Z]{5}[0-9]{4}[A-Z]$/
            .test(pan)
    ) {

        showFieldError(
            elements.supplierPanError,
            "Enter a valid PAN."
        );

        valid = false;
    }


    return {
        valid,

        data: {
            name,
            mobile,
            email,
            gstin,
            pan,
            address
        }
    };
}


/* ============================================================
   SUBMIT STATE
   ============================================================ */

function setSupplierSubmitting(
    submitting
) {

    state.submitting =
        submitting;


    if (
        elements.saveSupplierButton
    ) {
        elements.saveSupplierButton
            .disabled =
            submitting;
    }


    if (
        elements.cancelAddSupplierButton
    ) {
        elements.cancelAddSupplierButton
            .disabled =
            submitting;
    }


    if (
        elements.closeAddSupplierModalButton
    ) {
        elements.closeAddSupplierModalButton
            .disabled =
            submitting;
    }


    if (
        elements.saveSupplierButtonText
    ) {
        elements.saveSupplierButtonText
            .textContent =
            submitting
                ? "Adding..."
                : "Add Supplier";
    }


    if (
        elements.saveSupplierSpinner
    ) {
        elements.saveSupplierSpinner
            .hidden =
            !submitting;
    }
}


/* ============================================================
   CREATE SUPPLIER

   IMPORTANT:
   Browser does NOT write supplier documents directly.
   ============================================================ */

async function handleAddSupplierSubmit(
    event
) {

    event.preventDefault();


    if (
        state.submitting
    ) {
        return;
    }


    const validation =
        validateSupplierForm();


    if (
        !validation.valid
    ) {

        showSupplierFormMessage(
            "Please correct the highlighted supplier details."
        );

        return;
    }


    setSupplierSubmitting(
        true
    );


    hideSupplierFormMessage();


    try {

        const createSupplier =
            httpsCallable(
                functions,
                "createSupplier"
            );


        const response =
            await createSupplier(
                validation.data
            );


        const result =
            response.data || {};


        if (
            result.success ===
            false
        ) {

            throw new Error(
                result.message ||
                "Supplier could not be created."
            );
        }


        showSupplierFormMessage(
            "Supplier added successfully.",
            "success"
        );


        window.setTimeout(
            () => {

                window.location.href =
                    "/suppliers";

            },
            350
        );

    } catch (error) {

        console.error(
            "Create supplier failed:",
            error
        );


        const message =
            cleanText(
                error?.message
            ) ||
            "Supplier could not be created. Please try again.";


        showSupplierFormMessage(
            message
        );

    } finally {

        setSupplierSubmitting(
            false
        );
    }
}


/* ============================================================
   DATE FILTER EVENTS
   ============================================================ */

function handleDateFilterChange() {

    const value =
        elements.billingDateFilter
            ?.value ||
        "today";


    if (
        value === "custom"
    ) {

        if (
            elements.customDatePanel
        ) {
            elements.customDatePanel
                .hidden =
                false;
        }

        return;
    }


    if (
        elements.customDatePanel
    ) {
        elements.customDatePanel
            .hidden =
            true;
    }


    state.dateRange =
        calculateDateRange(
            value
        );


    renderPage();
}


function handleApplyCustomDate() {

    const start =
        cleanText(
            elements.customStartDate
                ?.value
        );

    const end =
        cleanText(
            elements.customEndDate
                ?.value
        );


    if (
        !start ||
        !end
    ) {
        return;
    }


    const startDate =
        timestampToDate(
            start
        );

    const endDate =
        timestampToDate(
            end
        );


    if (
        !startDate ||
        !endDate ||
        startDate > endDate
    ) {
        return;
    }


    const range =
        calculateDateRange(
            "custom",
            start,
            end
        );


    if (!range) {
        return;
    }


    state.dateRange =
        range;


    if (
        elements.customDatePanel
    ) {
        elements.customDatePanel
            .hidden =
            true;
    }


    renderPage();
}


function handleCancelCustomDate() {

    if (
        elements.customDatePanel
    ) {
        elements.customDatePanel
            .hidden =
            true;
    }


    if (
        elements.billingDateFilter
    ) {

        elements.billingDateFilter
            .value =
            state.dateRange.type ===
                "custom"
                ? "today"
                : state.dateRange.type;
    }


    if (
        state.dateRange.type ===
        "custom"
    ) {

        state.dateRange =
            calculateDateRange(
                "today"
            );

        renderPage();
    }
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
            type: "Customer",

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
            type: "Supplier",

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
            type: "Sell",

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
        state.purchases
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
            type: "Buy",

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
        elements.globalSearchResults
            .hidden =
            true;
    }


    if (
        elements
            .globalSearchResultsContent
    ) {
        elements
            .globalSearchResultsContent
            .replaceChildren();
    }
}


function renderGlobalSearchResults() {

    const input =
        elements.globalSearchInput;

    const container =
        elements
            .globalSearchResultsContent;

    const panel =
        elements.globalSearchResults;


    if (
        !input ||
        !container ||
        !panel
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

        const empty =
            createElement(
                "div",
                "search-result-empty",
                "No matching customers, suppliers, Sell or Buy records."
            );


        container.appendChild(
            empty
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


        const title =
            createElement(
                "strong",
                "",
                result.title
            );


        const subtitle =
            createElement(
                "span",
                "",
                result.subtitle
            );


        content.append(
            title,
            subtitle
        );


        const type =
            createElement(
                "span",
                "search-result-type",
                result.type
            );


        anchor.append(
            content,
            type
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

    const sidebar =
        elements.sidebar;

    if (!sidebar) {
        return;
    }


    const isOpen =
        sidebar.classList.contains(
            "open"
        ) ||
        sidebar.classList.contains(
            "is-open"
        );


    if (isOpen) {

        closeMobileSidebar();

        return;
    }


    sidebar.classList.add(
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
   MOBILE CREATE
   ============================================================ */

function handleMobileCreate() {

    window.location.href =
        "/purchases/new";
}


/* ============================================================
   LOGOUT
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
   REALTIME LISTENERS
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


    state.unsubscribers = [];

    state.listenersStarted =
        false;
}


/* ============================================================
   SUPPLIERS LISTENER
   ============================================================ */

function startSuppliersListener() {

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


                renderPage();
            },

            (error) => {

                console.error(
                    "Suppliers listener failed:",
                    error
                );


                if (
                    elements
                        .suppliersLoadingState
                ) {

                    elements
                        .suppliersLoadingState
                        .hidden =
                        true;
                }
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


/* ============================================================
   PURCHASES LISTENER
   ============================================================ */

function startPurchasesListener() {

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

                state.purchases =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );


                renderPage();
            },

            (error) => {

                console.error(
                    "Purchases listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


/* ============================================================
   PURCHASE PAYMENTS LISTENER
   ============================================================ */

function startPurchasePaymentsListener() {

    const paymentsQuery =
        query(
            businessCollection(
                "purchasePayments"
            ),
            orderBy(
                "paymentDate",
                "desc"
            ),
            limit(1000)
        );


    const unsubscribe =
        onSnapshot(
            paymentsQuery,

            (snapshot) => {

                state.purchasePayments =
                    snapshot.docs.map(
                        (document) => ({
                            id:
                                document.id,

                            ...document.data()
                        })
                    );


                renderPage();
            },

            (error) => {

                console.error(
                    "Purchase payments listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


/* ============================================================
   CUSTOMERS LISTENER
   Global search only.
   ============================================================ */

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
                    "Customers search listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


/* ============================================================
   SALES LISTENER
   Global search only.
   ============================================================ */

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
                    "Sales search listener failed:",
                    error
                );
            }
        );


    registerUnsubscriber(
        unsubscribe
    );
}


/* ============================================================
   START DATA
   ============================================================ */

function startDataListeners() {

    if (
        state.listenersStarted
    ) {
        return;
    }


    state.listenersStarted =
        true;


    startSuppliersListener();

    startPurchasesListener();

    startPurchasePaymentsListener();

    startCustomersListener();

    startSalesListener();
}


/* ============================================================
   EVENTS
   ============================================================ */

function bindEvents() {

    /* Supplier directory */

    elements.supplierSearchInput
        ?.addEventListener(
            "input",
            renderSupplierDirectory
        );


    elements.supplierStatusFilter
        ?.addEventListener(
            "change",
            renderSupplierDirectory
        );


    /* Add Supplier */

    elements.addSupplierButton
        ?.addEventListener(
            "click",
            openAddSupplierModal
        );


    elements.closeAddSupplierModalButton
        ?.addEventListener(
            "click",
            closeAddSupplierModal
        );


    elements.cancelAddSupplierButton
        ?.addEventListener(
            "click",
            closeAddSupplierModal
        );


    elements.addSupplierForm
        ?.addEventListener(
            "submit",
            handleAddSupplierSubmit
        );


    elements.addSupplierModal
        ?.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    elements.addSupplierModal
                ) {

                    closeAddSupplierModal();
                }
            }
        );


    /* Date */

    elements.billingDateFilter
        ?.addEventListener(
            "change",
            handleDateFilterChange
        );


    elements.applyCustomDateButton
        ?.addEventListener(
            "click",
            handleApplyCustomDate
        );


    elements.cancelCustomDateButton
        ?.addEventListener(
            "click",
            handleCancelCustomDate
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


    /* Mobile center + */

    elements.mobileNewTransactionButton
        ?.addEventListener(
            "click",
            handleMobileCreate
        );


    /* Logout */

    elements.logoutButton
        ?.addEventListener(
            "click",
            handleLogout
        );


    /* Keyboard */

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
                elements.addSupplierModal &&
                !elements
                    .addSupplierModal
                    .hidden
            ) {

                closeAddSupplierModal();
            }
        }
    );


    /* Cleanup */

    window.addEventListener(
        "beforeunload",
        cleanupListeners
    );
}


/* ============================================================
   DEFAULTS
   ============================================================ */

function initializeDefaults() {

    formatCurrentDate();


    state.dateRange =
        calculateDateRange(
            elements.billingDateFilter
                ?.value ||
            "today"
        );


    const today =
        new Date();


    const yyyy =
        today.getFullYear();

    const mm =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const dd =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    const todayValue =
        `${yyyy}-${mm}-${dd}`;


    if (
        elements.customStartDate
    ) {
        elements.customStartDate.value =
            todayValue;
    }


    if (
        elements.customEndDate
    ) {
        elements.customEndDate.value =
            todayValue;
    }
}


/* ============================================================
   AUTH
   ============================================================ */

function startAuthentication() {

    onAuthStateChanged(
        auth,

        (user) => {

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


            startDataListeners();
        },

        (error) => {

            console.error(
                "Supplier page auth failed:",
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

    bindEvents();

    initializeDefaults();

    startAuthentication();
}


initialize();